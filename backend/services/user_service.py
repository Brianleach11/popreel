from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from models.user import User
from schemas.user import UserCreate
import asyncpg


async def create_user(db_pool: asyncpg.Pool, user: UserCreate):
    db_user = User(
        id=user.id,
        username=user.username,
        email=user.email
    )
    await db_pool.execute(
        "INSERT INTO users (id, username, email) VALUES ($1, $2, $3)", 
        user.id, 
        user.username, 
        user.email)
    return db_user

async def get_user(db_pool: asyncpg.Pool, user_id: str):
    result = await db_pool.fetchrow(
        "SELECT * FROM users WHERE id = $1", 
        user_id)
    return result

async def delete_user(db_pool: asyncpg.Pool, user_id: str):
    db_user = await get_user(db_pool, user_id)
    if db_user:
        await db_pool.execute(
            "DELETE FROM users WHERE id = $1", 
            user_id)
    return db_user

async def update_user(db_pool: asyncpg.Pool, user_id: str, username: str):
    db_user = await get_user(db_pool, user_id)
    if db_user:
        await db_pool.execute(
            "UPDATE users SET username = $1 WHERE id = $2", 
            username, 
            user_id)
    return db_user