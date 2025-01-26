import asyncpg
from typing import Optional
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is required")
    
DIRECT_URL = os.getenv('DIRECT_URL', DATABASE_URL)

conn_pool: Optional[asyncpg.Pool] = None

async def init_postgres() -> None:
    global conn_pool
    try:
        conn_pool = await asyncpg.create_pool(
            dsn=DATABASE_URL,
            min_size=1,
            max_size=10,
            max_inactive_connection_lifetime=300,
        )
    except Exception as e:
        print(f"Error initializing PostgreSQL connection pool: {e}")
        raise

async def get_db() -> asyncpg.Pool:
    global conn_pool
    if conn_pool is None:
        print("CONN POOL IS NONE")
    try:
        return conn_pool
    except Exception as e:
        print(f"Error getting database connection: {e}")
        raise
