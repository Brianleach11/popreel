from pydantic import BaseModel
from datetime import datetime

class UserBase(BaseModel):
    id: str
    username: str
    email: str

class UserCreate(UserBase):
    pass

class UserResponse(UserBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True  # Enable ORM mode for SQLAlchemy models