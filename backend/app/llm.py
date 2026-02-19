import os
import httpx
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY")
MISTRAL_MODEL = os.getenv("MISTRAL_MODEL", "mistral-small-latest")

async def generate_health_report(readings):
    if not MISTRAL_API_KEY:
        return {"error": "Mistral API Key not configured"}

    if not readings:
        return {"error": "No data points provided for analysis"}

    # Format the data for the prompt
    latest = readings[0]
    history_summary = "\n".join([
        f"- Time: {r.get('created_at')}, Gas: {r.get('gas_ppm')} PPM, Temp: {r.get('temperature')}°C, Hum: {r.get('humidity')}%"
        for r in readings[:10] # Use last 10 points
    ])

    prompt = f"""
    Environmental Metrics:
    - Gas: {latest.get('gas_ppm', 'N/A')} PPM
    - Temp: {latest.get('temperature', 'N/A')}°C
    - Humidity: {latest.get('humidity', 'N/A')}%
    
    Instruction: Provide a natural 2-line health assessment.
    If Gas < 700 PPM: Use phrases like "not harmful" and "air is breathable".
    If Gas > 700 PPM: State clearly that the air is "poor" or "harmful".
    
    Format:
    Line 1: Mention current gas level and if it is harmful/breathable.
    Line 2: Mention Temp/Humidity and final Good/Poor status.
    
    Keep it conversational, short, and sweet. No bullet points. Max 45 words.
    """

    headers = {
        "Authorization": f"Bearer {MISTRAL_API_KEY}",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }

    payload = {
        "model": MISTRAL_MODEL,
        "messages": [
            {"role": "system", "content": "You are an AI environmental health analyst. Provide medical-based assessments of indoor air quality."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.7,
        "max_tokens": 300
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.mistral.ai/v1/chat/completions",
                json=payload,
                headers=headers,
                timeout=30.0
            )
            response.raise_for_status()
            result = response.json()
            return {"report": result['choices'][0]['message']['content'], "timestamp": datetime.now().isoformat()}
            
    except Exception as e:
        print(f"Error calling Mistral API: {e}")
        return {"error": "Failed to generate health report", "details": str(e)}
