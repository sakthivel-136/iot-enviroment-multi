import pandas as pd
import numpy as np
import httpx
import joblib
from datetime import datetime
from .database import supabase
from .config import THINGSPEAK_READ_API_KEY, THINGSPEAK_CHANNEL_ID
import os

# Load the trained model
MODEL_PATH = os.path.join(os.path.dirname(__file__), '../model/rf_model.pkl')
try:
    rf_model = joblib.load(MODEL_PATH)
except FileNotFoundError:
    print(f"Model file not found at {MODEL_PATH}. generate it first.")
    rf_model = None

ZONES = {
    "A": {"fields": ["field1", "field2", "field3", "field4"]}, # GasPPM, GasDetected, Temp, Humidity (Field 4 per screenshot)
    "B": {"fields": ["field5", "field6", "field7", "field8"]},
    "C": {"fields": ["field9", "field10", "field11", "field12"]},
}

async def fetch_thingspeak_data():
    url = f"https://api.thingspeak.com/channels/{THINGSPEAK_CHANNEL_ID}/feeds.json?api_key={THINGSPEAK_READ_API_KEY}&results=1"
    print(f"Fetching from URL: {url}")
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        print(f"ThingSpeak Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"DEBUG RAW THINGSPEAK: {data}")
            if data['feeds']:
                return data['feeds'][0] # Get the latest feed
    return None

def process_zone_data(feed, zone_id):
    mapping = ZONES[zone_id]["fields"]
    
    try:
        gas_ppm = float(feed.get(mapping[0]) or 0)
        gas_detected = int(float(feed.get(mapping[1]) or 0)) # Sometimes comes as float string '1.0'
        temp = float(feed.get(mapping[2]) or 0)
        
        # DEBUG: Print what we are trying to get for humidity
        raw_hum = feed.get(mapping[3])
        print(f"DEBUG {zone_id} HUMIDITY LOOKUP [{mapping[3]}]: {raw_hum}")
        
        humidity = float(raw_hum or 0)
        
        return {
            "gasPPM": gas_ppm,
            "gasDetected": gas_detected,
            "temperature": temp,
            "humidity": humidity
        }
    except ValueError:
        return None

# State to track last processed record from ThingSpeak
last_processed_time = None

async def run_pipeline():
    global last_processed_time
    print(f"[{datetime.now()}] Starting pipeline execution...")
    
    if rf_model is None:
        print("Model not loaded. Skipping prediction.")
        return

    feed = await fetch_thingspeak_data()
    if not feed:
        print("No data received from ThingSpeak.")
        return

    # De-duplication check: Skip if this specific timestamp has already been processed
    current_feed_time = feed.get("created_at")
    if current_feed_time == last_processed_time:
        print(f"Duplicate feed detected (Time: {current_feed_time}). Skipping update.")
        return
    
    last_processed_time = current_feed_time
    print(f"Processing new feed from: {current_feed_time}")

    for zone_id in ZONES:
        sensor_data = process_zone_data(feed, zone_id)
        if not sensor_data:
            print(f"Skipping Zone {zone_id} due to invalid data.")
            continue

        # 1. Store Sensor Reading
        reading_entry = {
            "zone_id": zone_id,
            "gas_ppm": sensor_data["gasPPM"],
            "gas_detected": bool(sensor_data["gasDetected"]),
            "temperature": sensor_data["temperature"],
            "humidity": sensor_data["humidity"],
            "created_at": current_feed_time # Use actual ThingSpeak timestamp
        }
        supabase.table("sensor_readings").insert(reading_entry).execute()

        # 2. Predict Hazard
        # Feature order: [gasPPM, gasDetected, temperature, humidity]
        
        # VALIDATION: If sensor data is zero (inactive sensor), do NOT predict.
        if sensor_data["gasPPM"] == 0 and sensor_data["temperature"] == 0:
            risk_score = 0.0
            is_anomaly = False
            print(f"Zone {zone_id}: No active sensor data. Risk set to 0.")
        else:
            features = np.array([[
                sensor_data["gasPPM"],
                sensor_data["gasDetected"],
                sensor_data["temperature"],
                sensor_data["humidity"]
            ]])
            
            risk_score = float(rf_model.predict_proba(features)[0][1]) # Probability of class 1 (Hazard)
            
            # CALIBRATION: If the hardware sensor says "CLEAR" (gasDetected=0), 
            # we should skepticism the ML model unless the analog value is very high.
            if sensor_data["gasDetected"] == 0:
                if sensor_data["gasPPM"] < 500:
                    risk_score = risk_score * 0.1
                elif sensor_data["gasPPM"] < 1000:
                    risk_score = risk_score * 0.5
            
            is_anomaly = bool(risk_score > 0.75)
        
        prediction_entry = {
            "zone_id": zone_id,
            "risk_score": risk_score,
            "anomaly": is_anomaly,
            "created_at": current_feed_time # Sync with reading
        }
        supabase.table("predictions").insert(prediction_entry).execute()

        # 3. Create Alert if Anomaly
        if is_anomaly:
            alert_msg = f"⚠ Hazard predicted in Zone {zone_id}. Risk Score: {risk_score:.2f}"
            alert_entry = {
                "zone_id": zone_id,
                "message": alert_msg,
                "created_at": current_feed_time # Sync with hazard event
            }
            supabase.table("alerts").insert(alert_entry).execute()
            print(f"ALERT: {alert_msg}")

    print(f"[{datetime.now()}] Pipeline execution finished.")
