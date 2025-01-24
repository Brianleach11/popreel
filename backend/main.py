from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.webhook import webhook_router
from db.connection import get_db, init_postgres
from fastapi import Depends, HTTPException
import asyncpg
app = FastAPI()

@app.on_event("startup")
async def startup_event():
    await init_postgres()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes
app.include_router(webhook_router)

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