from fastapi import APIRouter, HTTPException, Request, Response, status
from services.user_service import create_user, delete_user, update_user
from schemas.user import UserCreate
from svix.webhooks import Webhook, WebhookVerificationError
from db.connection import get_db
from fastapi import Depends
import asyncpg
import os
from dotenv import load_dotenv
from services.ml_processor import delete_from_pinecone

load_dotenv()

WEBHOOK_SECRET = os.getenv('WEBHOOK_SECRET', "whsec_8SXPTXJqi/en1TIU3UbPtklzklkbKlhP")
webhook_router = APIRouter(prefix="/webhook")

@webhook_router.post("")
async def handle_webhook(
    request: Request,
    response: Response,
    db_pool: asyncpg.Pool = Depends(get_db)
):
    headers = request.headers
    payload = await request.body()

    try:
        wh = Webhook(WEBHOOK_SECRET)
        msg = wh.verify(payload, headers)
    except WebhookVerificationError as e:
        print("Caught WebhookVerificationError")
        response.status_code = status.HTTP_400_BAD_REQUEST
        return

    event_type = msg.get("type")
    data = msg.get("data", {})

    async with db_pool.acquire() as db:
        try:
            if event_type == "user.created":
                user_id = data.get("id")
                email_addresses = data.get("email_addresses", [])
                username = data.get("username")
                
                primary_email_id = data.get("primary_email_address_id")
                primary_email = next(
                    (email["email_address"] for email in email_addresses if email["id"] == primary_email_id),
                    None
                )
                
                if not primary_email:
                    print("No primary email found")
                    raise HTTPException(status_code=400, detail="No primary email found")
                
                if not username:
                    username = primary_email.split("@")[0]
                    
                user_data = UserCreate(
                    id=user_id,
                    username=username,
                    email=primary_email
                )
                await create_user(db, user_data)
                return {"status": "success", "message": "User created"}
                
            elif event_type == "user.deleted":
                user_id = data.get("id")
                await delete_user(db, user_id)
                return {"status": "success", "message": "User deleted"}
                
            elif event_type == "user.updated":
                user_id = data.get("id")
                username = data.get("username")
                await update_user(db, user_id, username)
                return {"status": "success", "message": "User updated"}
            
            return {"status": "success", "message": f"Received event: {event_type}"}
        except Exception as e:
            print(f"Error: {e}")
            await db.rollback()
            raise HTTPException(status_code=500, detail=str(e))

@webhook_router.delete("/video/{video_id}")
async def delete_video_embedding(
    video_id: str,
):
    """Delete video embedding from Pinecone"""
    
    try:
        success = await delete_from_pinecone(video_id)
        if success:
            return {"status": "success", "message": "Video embedding deleted"}
        else:
            raise HTTPException(status_code=500, detail="Failed to delete video embedding")
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))