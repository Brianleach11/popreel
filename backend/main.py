from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.webhook import webhook_router
from routes.kafka_producer import router as kafka_router
from routes.recommendations import router as recommendations_router
from db.connection import get_db, init_postgres
from fastapi import Depends, HTTPException
import asyncpg
import os
from dotenv import load_dotenv
import asyncio
from services.ml_consumer import run_consumers

load_dotenv()

app = FastAPI()

# Frontend URL (in production and development)
FRONTEND_URLS = [
    "http://localhost:3000",  # Local development
    "https://popreel-seven.vercel.app",  # Production on vercel
    "https://popreel.onrender.com" # Production on render
]

@app.on_event("startup")
async def startup_event():
    await init_postgres()
    # Start Kafka consumers in the background
    asyncio.create_task(run_consumers())

# Add CORS middleware with specific configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_URLS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    max_age=3600,  # Cache preflight requests for 1 hour
)

# Include routes
app.include_router(webhook_router)
app.include_router(kafka_router)
app.include_router(recommendations_router)

@app.get("/")
def read_root():
    return {"message": "Welcome to PopReel!"}

@app.get("/ping")
async def ping(db_pool: asyncpg.Pool = Depends(get_db)):
    if db_pool is None:
        raise HTTPException(
            status_code=500,
            detail="Database connection pool not initialized"
        )
    try:
        # Test the connection by executing a simple query
        result = await db_pool.fetchval("SELECT 1")
        return {"status": "success", "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))