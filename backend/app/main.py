from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from contextlib import asynccontextmanager
from .tasks import run_pipeline, fetch_thingspeak_data 
from .database import supabase
import asyncio

scheduler = AsyncIOScheduler()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start the scheduler on startup
    # Polling every 15 seconds for near real-time responsiveness (ThingSpeak limit is ~15s)
    scheduler.add_job(run_pipeline, 'interval', seconds=15)
    scheduler.start()
    print("Scheduler started. Pipeline running every 15 seconds.")
    yield
    # Shutdown logic
    scheduler.shutdown()

app = FastAPI(lifespan=lifespan, title="Multi-Zone Env Monitor API")

# Configure CORS
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Multi-Zone Environment Monitor Backend Running"}

@app.api_route("/api/trigger-update", methods=["GET", "POST"])
async def trigger_update(background_tasks: BackgroundTasks):
    """
    Manually trigger the data fetch and prediction pipeline.
    """
    background_tasks.add_task(run_pipeline)
    return {"status": "triggered", "message": "Pipeline execution started in background."}

from .llm import generate_health_report

@app.post("/api/health-report/{zone_id}")
async def get_health_report(zone_id: str):
    """
    Generate an AI-powered health impact report for a specific zone based on latest trends.
    """
    # 1. Get latest 10 readings
    readings = supabase.table("sensor_readings").select("*").eq("zone_id", zone_id).order("created_at", desc=True).limit(10).execute()
    
    if not readings.data:
        return {"error": "No data available for this zone to generate report"}
        
    # 2. Call Mistral LLM with historical data
    report = await generate_health_report(readings.data)
    
    return report

@app.get("/api/forecast/{zone_id}")
def get_zone_forecast(zone_id: str):
    """
    Generate a 60-minute forecast for environmental conditions and risk.
    Simulates future trends based on current sensor readings.
    """
    # 1. Get latest reading to start the projection
    latest = supabase.table("sensor_readings").select("*").eq("zone_id", zone_id).order("created_at", desc=True).limit(1).execute()
    
    if not latest.data:
        return {"error": "No data available for this zone to generate forecast"}
    
    current = latest.data[0]
    
    # Load model
    from .tasks import rf_model
    if rf_model is None:
        return {"error": "Model not loaded"}
    
    forecast_data = []
    
    # Initial values
    current_gas = current['gas_ppm']
    current_temp = current['temperature']
    current_humidity = current['humidity']
    gas_detected = current['gas_detected']
    
    # Load models
    from .tasks import rf_model # Classifier for Risk
    import joblib
    import os
    import numpy as np
    from datetime import datetime, timedelta

    # Load Forecast Regressor
    model_path = os.path.join(os.path.dirname(__file__), "../model/forecast_model.pkl")
    try:
        forecast_model = joblib.load(model_path)
    except Exception as e:
        return {"error": f"Forecast model not found: {e}"}
    
    if rf_model is None:
        return {"error": "Risk model not loaded"}
    
    forecast_data = []
    
    # If recent data is basically empty (likely sensor offline), return empty forecast
    if current_gas == 0 and current_temp == 0:
        return []

    # Simulate 60 minutes into the future using the Regressor
    start_time = datetime.now()
    
    # State vector for simulation: [gas, temp, humidity]
    # We assume humidity stays roughly constant or slowly varies as we didn't train specific transitions for it deeply
    sim_gas = current_gas
    sim_temp = current_temp
    sim_hum = current_humidity
    
    for minute in range(1, 61):
        # Prepare input for Regressor: [gas, temp, humidity]
        input_features = np.array([[sim_gas, sim_temp, sim_hum]])
        
        # Predict Next State (Gas, Temp)
        # The model was trained to predict next_gas, next_temp from current state
        prediction = forecast_model.predict(input_features)[0]
        next_gas = prediction[0]
        next_temp = prediction[1]
        
        # Add some very small organic noise so it doesn't look like a computer line
        sim_gas = max(0, next_gas + np.random.normal(0, 2)) 
        sim_temp = next_temp + np.random.normal(0, 0.05)
        # Simulate humidity drift (since not in regressor output)
        sim_hum = max(0, min(100, sim_hum + np.random.normal(0, 0.1)))
        
        # Feed this simulated state into the Risk Classifier
        # Order: [gasPPM, gasDetected, temperature, humidity]
        sim_gas_detected = 1 if sim_gas > 400 else 0
        risk_features = np.array([[
            sim_gas,
            sim_gas_detected, 
            sim_temp,
            sim_hum
        ]])
        
        risk_score = float(rf_model.predict_proba(risk_features)[0][1])
        
        # CALIBRATION: Prevent high risk scores for moderate gas levels where gas_detected is 0
        if sim_gas < 500:
             risk_score = risk_score * 0.1
        elif sim_gas < 1000:
             risk_score = risk_score * 0.5
             
        is_anomaly = bool(risk_score > 0.75)
        
        future_time = start_time + timedelta(minutes=minute)
        
        forecast_data.append({
            "minute": minute,
            "timestamp": future_time.strftime("%H:%M"),
            "gas_ppm": round(sim_gas, 2),
            "temperature": round(sim_temp, 2),
            "humidity": round(sim_hum, 1),
            "risk_score": round(risk_score, 4),
            "anomaly": is_anomaly
        })
        
    return forecast_data
        
    return forecast_data

@app.get("/api/history/{zone_id}")
def get_zone_history(zone_id: str):
    """
    Get historical data for a specific zone.
    """
    response = supabase.table("sensor_readings").select("*").eq("zone_id", zone_id).order("created_at", desc=True).limit(50).execute()
    return response.data
