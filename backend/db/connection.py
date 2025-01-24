import asyncpg
from typing import Optional

DATABASE_URL = "postgresql://neondb_owner:npg_BwxgsNJ50Khf@ep-snowy-forest-a8vqjjrr.eastus2.azure.neon.tech/neondb?sslmode=require"
DIRECT_URL = "postgresql://neondb_owner:npg_BwxgsNJ50Khf@ep-snowy-forest-a8vqjjrr.eastus2.azure.neon.tech/neondb?sslmode=require"

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
