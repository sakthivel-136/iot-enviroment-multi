from fastapi import FastAPI, BackgroundTasks
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from contextlib import asynccontextmanager
from .tasks import run_pipeline, fetch_thingspeak_data 
from .database import supabase
import asyncio

scheduler = AsyncIOScheduler()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start the scheduler on startup
    scheduler.add_job(run_pipeline, 'interval', minutes=3)
    scheduler.start()
    print("Scheduler started. Pipeline running every 3 minutes.")
    yield
    # Shutdown logic
    scheduler.shutdown()

app = FastAPI(lifespan=lifespan, title="Multi-Zone Env Monitor API")

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Multi-Zone Environment Monitor Backend Running"}

@app.post("/api/trigger-update")
async def trigger_update(background_tasks: BackgroundTasks):
    """
    Manually trigger the data fetch and prediction pipeline.
    """
    background_tasks.add_task(run_pipeline)
    return {"status": "triggered", "message": "Pipeline execution started in background."}

@app.get("/api/zones")
def get_zones_status():
    """
    Get the latest status for all zones.
    """
    response = supabase.table("sensor_readings").select("*").order("created_at", desc=True).limit(3).execute()
    return response.data

@app.get("/api/history/{zone_id}")
def get_zone_history(zone_id: str):
    """
    Get historical data for a specific zone.
    """
    response = supabase.table("sensor_readings").select("*").eq("zone_id", zone_id).order("created_at", desc=True).limit(50).execute()
    return response.data
