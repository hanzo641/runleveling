from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime
import math

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Constants for progression system
BASE_XP = 100  # Base XP needed for level 1->2
XP_GROWTH_RATE = 1.15  # XP requirement increases by 15% each level
XP_PER_SESSION_BASE = 50  # Base XP per completed session
SESSION_TIME_BONUS = 10  # Extra XP per minute of activity

# Rank thresholds
RANK_THRESHOLDS = {
    'E': 1,
    'D': 11,
    'C': 21,
    'B': 36,
    'A': 51,
    'S': 71
}

def get_rank_for_level(level: int) -> str:
    """Get rank based on level"""
    if level >= 71:
        return 'S'
    elif level >= 51:
        return 'A'
    elif level >= 36:
        return 'B'
    elif level >= 21:
        return 'C'
    elif level >= 11:
        return 'D'
    else:
        return 'E'

def get_xp_for_level(level: int) -> int:
    """Calculate XP needed to reach next level"""
    return int(BASE_XP * (XP_GROWTH_RATE ** (level - 1)))

def calculate_session_xp(duration_minutes: int) -> int:
    """Calculate XP earned from a session based on duration"""
    return XP_PER_SESSION_BASE + (duration_minutes * SESSION_TIME_BONUS)

# Models
class UserProgress(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    device_id: str
    level: int = 1
    current_xp: int = 0
    total_xp: int = 0
    rank: str = 'E'
    sessions_completed: int = 0
    total_duration_minutes: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class UserProgressResponse(BaseModel):
    id: str
    device_id: str
    level: int
    current_xp: int
    xp_for_next_level: int
    total_xp: int
    rank: str
    next_rank: Optional[str]
    next_rank_level: Optional[int]
    sessions_completed: int
    total_duration_minutes: int
    progress_percentage: float

class Session(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    device_id: str
    duration_minutes: int
    xp_earned: int
    level_before: int
    level_after: int
    leveled_up: bool
    rank_before: str
    rank_after: str
    ranked_up: bool
    started_at: datetime
    completed_at: datetime = Field(default_factory=datetime.utcnow)

class StartSessionInput(BaseModel):
    device_id: str

class CompleteSessionInput(BaseModel):
    device_id: str
    duration_minutes: int

class SessionResponse(BaseModel):
    session: Session
    xp_earned: int
    leveled_up: bool
    levels_gained: int
    ranked_up: bool
    old_rank: str
    new_rank: str
    progress: UserProgressResponse

def get_next_rank_info(rank: str) -> tuple:
    """Get next rank and level needed to reach it"""
    rank_order = ['E', 'D', 'C', 'B', 'A', 'S']
    current_index = rank_order.index(rank)
    if current_index >= len(rank_order) - 1:
        return None, None
    next_rank = rank_order[current_index + 1]
    return next_rank, RANK_THRESHOLDS[next_rank]

def create_progress_response(progress: UserProgress) -> UserProgressResponse:
    xp_needed = get_xp_for_level(progress.level)
    next_rank, next_rank_level = get_next_rank_info(progress.rank)
    return UserProgressResponse(
        id=progress.id,
        device_id=progress.device_id,
        level=progress.level,
        current_xp=progress.current_xp,
        xp_for_next_level=xp_needed,
        total_xp=progress.total_xp,
        rank=progress.rank,
        next_rank=next_rank,
        next_rank_level=next_rank_level,
        sessions_completed=progress.sessions_completed,
        total_duration_minutes=progress.total_duration_minutes,
        progress_percentage=min(100, (progress.current_xp / xp_needed) * 100)
    )

# Routes
@api_router.get("/")
async def root():
    return {"message": "RunQuest API - Level up your running!"}

@api_router.get("/progress/{device_id}", response_model=UserProgressResponse)
async def get_progress(device_id: str):
    """Get or create user progress for a device"""
    progress = await db.user_progress.find_one({"device_id": device_id})
    
    if not progress:
        # Create new progress for this device
        new_progress = UserProgress(device_id=device_id)
        await db.user_progress.insert_one(new_progress.dict())
        return create_progress_response(new_progress)
    
    return create_progress_response(UserProgress(**progress))

@api_router.post("/session/complete", response_model=SessionResponse)
async def complete_session(input: CompleteSessionInput):
    """Complete a running session and award XP"""
    # Get or create progress
    progress_doc = await db.user_progress.find_one({"device_id": input.device_id})
    
    if not progress_doc:
        new_progress = UserProgress(device_id=input.device_id)
        await db.user_progress.insert_one(new_progress.dict())
        progress_doc = new_progress.dict()
    
    progress = UserProgress(**progress_doc)
    
    # Calculate XP earned
    xp_earned = calculate_session_xp(input.duration_minutes)
    
    # Store old values
    level_before = progress.level
    rank_before = progress.rank
    
    # Add XP
    progress.current_xp += xp_earned
    progress.total_xp += xp_earned
    progress.total_duration_minutes += input.duration_minutes
    progress.sessions_completed += 1
    
    # Check for level ups
    levels_gained = 0
    while progress.current_xp >= get_xp_for_level(progress.level):
        progress.current_xp -= get_xp_for_level(progress.level)
        progress.level += 1
        levels_gained += 1
    
    # Update rank
    progress.rank = get_rank_for_level(progress.level)
    progress.updated_at = datetime.utcnow()
    
    # Save session
    session = Session(
        device_id=input.device_id,
        duration_minutes=input.duration_minutes,
        xp_earned=xp_earned,
        level_before=level_before,
        level_after=progress.level,
        leveled_up=levels_gained > 0,
        rank_before=rank_before,
        rank_after=progress.rank,
        ranked_up=rank_before != progress.rank,
        started_at=datetime.utcnow()
    )
    await db.sessions.insert_one(session.dict())
    
    # Update progress in database
    await db.user_progress.update_one(
        {"device_id": input.device_id},
        {"$set": progress.dict()}
    )
    
    return SessionResponse(
        session=session,
        xp_earned=xp_earned,
        leveled_up=levels_gained > 0,
        levels_gained=levels_gained,
        ranked_up=rank_before != progress.rank,
        old_rank=rank_before,
        new_rank=progress.rank,
        progress=create_progress_response(progress)
    )

@api_router.get("/sessions/{device_id}", response_model=List[Session])
async def get_sessions(device_id: str, limit: int = 20):
    """Get recent sessions for a device"""
    sessions = await db.sessions.find(
        {"device_id": device_id}
    ).sort("completed_at", -1).limit(limit).to_list(limit)
    return [Session(**s) for s in sessions]

@api_router.get("/rank-info")
async def get_rank_info():
    """Get information about all ranks"""
    return {
        "ranks": [
            {"rank": "E", "min_level": 1, "name": "Débutant", "color": "#6B7280"},
            {"rank": "D", "min_level": 11, "name": "Amateur", "color": "#10B981"},
            {"rank": "C", "min_level": 21, "name": "Intermédiaire", "color": "#3B82F6"},
            {"rank": "B", "min_level": 36, "name": "Confirmé", "color": "#8B5CF6"},
            {"rank": "A", "min_level": 51, "name": "Expert", "color": "#F59E0B"},
            {"rank": "S", "min_level": 71, "name": "Légende", "color": "#EF4444"}
        ],
        "base_xp": BASE_XP,
        "xp_growth_rate": XP_GROWTH_RATE
    }

@api_router.delete("/progress/{device_id}")
async def reset_progress(device_id: str):
    """Reset progress for a device (for testing)"""
    await db.user_progress.delete_one({"device_id": device_id})
    await db.sessions.delete_many({"device_id": device_id})
    return {"message": "Progress reset successfully"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
