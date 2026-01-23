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
from datetime import datetime, timedelta
import math
import random

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

# ============== CONSTANTS ==============

# XP System - More challenging progression
BASE_XP = 150  # Base XP needed for level 1->2
XP_GROWTH_RATE = 1.25  # XP requirement increases by 25% each level

# Intensity multipliers
INTENSITY_MULTIPLIERS = {
    'light': 0.5,      # Léger - walking/easy jog
    'moderate': 1.0,   # Modéré - comfortable run
    'intense': 1.5,    # Intense - hard effort
    'extreme': 2.0     # Extrême - all out
}

INTENSITY_NAMES = {
    'light': 'Léger',
    'moderate': 'Modéré',
    'intense': 'Intense',
    'extreme': 'Extrême'
}

# XP per minute based on duration tiers (longer = more XP per minute)
def get_duration_multiplier(minutes: int) -> float:
    if minutes < 10:
        return 0.8  # Short sessions less rewarding
    elif minutes < 20:
        return 1.0
    elif minutes < 30:
        return 1.2
    elif minutes < 45:
        return 1.4
    elif minutes < 60:
        return 1.6
    else:
        return 1.8  # Long sessions more rewarding

# Running/Sports themed ranks
RANKS = [
    {'id': 'debutant', 'name': 'Débutant', 'min_level': 1, 'color': '#6B7280', 'icon': '🏃'},
    {'id': 'jogger', 'name': 'Jogger', 'min_level': 11, 'color': '#10B981', 'icon': '🏃‍♂️'},
    {'id': 'coureur', 'name': 'Coureur', 'min_level': 26, 'color': '#3B82F6', 'icon': '🏅'},
    {'id': 'athlete', 'name': 'Athlète', 'min_level': 46, 'color': '#8B5CF6', 'icon': '💪'},
    {'id': 'champion', 'name': 'Champion', 'min_level': 71, 'color': '#F59E0B', 'icon': '🏆'},
    {'id': 'maitre', 'name': 'Maître', 'min_level': 91, 'color': '#EF4444', 'icon': '👑'},
]

# Trophy definitions
TROPHIES = [
    # Session trophies
    {'id': 'first_step', 'name': 'Premier Pas', 'description': 'Complète ta première session', 'condition': 'sessions_1', 'xp_reward': 50, 'icon': '👟'},
    {'id': 'regular', 'name': 'Régulier', 'description': 'Complète 10 sessions', 'condition': 'sessions_10', 'xp_reward': 200, 'icon': '📅'},
    {'id': 'dedicated', 'name': 'Dévoué', 'description': 'Complète 50 sessions', 'condition': 'sessions_50', 'xp_reward': 500, 'icon': '🎯'},
    {'id': 'machine', 'name': 'Machine', 'description': 'Complète 100 sessions', 'condition': 'sessions_100', 'xp_reward': 1000, 'icon': '🤖'},
    
    # Level trophies
    {'id': 'level_10', 'name': 'Progression', 'description': 'Atteins le niveau 10', 'condition': 'level_10', 'xp_reward': 100, 'icon': '⬆️'},
    {'id': 'level_25', 'name': 'En Route', 'description': 'Atteins le niveau 25', 'condition': 'level_25', 'xp_reward': 300, 'icon': '🚀'},
    {'id': 'level_50', 'name': 'Vétéran', 'description': 'Atteins le niveau 50', 'condition': 'level_50', 'xp_reward': 750, 'icon': '⭐'},
    {'id': 'level_100', 'name': 'Légende', 'description': 'Atteins le niveau 100', 'condition': 'level_100', 'xp_reward': 2000, 'icon': '🌟'},
    
    # Rank trophies
    {'id': 'rank_jogger', 'name': 'Jogger Certifié', 'description': 'Atteins le rang Jogger', 'condition': 'rank_jogger', 'xp_reward': 150, 'icon': '🏃‍♂️'},
    {'id': 'rank_coureur', 'name': 'Vrai Coureur', 'description': 'Atteins le rang Coureur', 'condition': 'rank_coureur', 'xp_reward': 400, 'icon': '🏅'},
    {'id': 'rank_athlete', 'name': 'Athlète Accompli', 'description': 'Atteins le rang Athlète', 'condition': 'rank_athlete', 'xp_reward': 800, 'icon': '💪'},
    {'id': 'rank_champion', 'name': 'Champion Ultime', 'description': 'Atteins le rang Champion', 'condition': 'rank_champion', 'xp_reward': 1500, 'icon': '🏆'},
    {'id': 'rank_maitre', 'name': 'Maître Suprême', 'description': 'Atteins le rang Maître', 'condition': 'rank_maitre', 'xp_reward': 3000, 'icon': '👑'},
    
    # Duration trophies
    {'id': 'hour_1', 'name': 'Première Heure', 'description': 'Cours 1 heure au total', 'condition': 'total_minutes_60', 'xp_reward': 100, 'icon': '⏱️'},
    {'id': 'hour_10', 'name': 'Endurant', 'description': 'Cours 10 heures au total', 'condition': 'total_minutes_600', 'xp_reward': 500, 'icon': '🕐'},
    {'id': 'hour_50', 'name': 'Marathonien', 'description': 'Cours 50 heures au total', 'condition': 'total_minutes_3000', 'xp_reward': 1500, 'icon': '🏃‍♀️'},
    
    # Intensity trophies
    {'id': 'first_intense', 'name': 'Guerrier', 'description': 'Complète une session intense', 'condition': 'intensity_intense', 'xp_reward': 75, 'icon': '🔥'},
    {'id': 'first_extreme', 'name': 'Sans Limite', 'description': 'Complète une session extrême', 'condition': 'intensity_extreme', 'xp_reward': 150, 'icon': '💥'},
    
    # Streak trophies
    {'id': 'streak_7', 'name': 'Semaine Parfaite', 'description': '7 jours de suite', 'condition': 'streak_7', 'xp_reward': 300, 'icon': '🔥'},
    {'id': 'streak_30', 'name': 'Mois de Fer', 'description': '30 jours de suite', 'condition': 'streak_30', 'xp_reward': 1000, 'icon': '💎'},
]

# Quest templates
QUEST_TEMPLATES = [
    {'id': 'complete_1', 'name': 'En Mouvement', 'description': 'Complète 1 session', 'type': 'sessions', 'target': 1, 'xp_reward': 30},
    {'id': 'complete_2', 'name': 'Double Effort', 'description': 'Complète 2 sessions', 'type': 'sessions', 'target': 2, 'xp_reward': 75},
    {'id': 'run_15', 'name': 'Quart d\'Heure', 'description': 'Cours 15 minutes au total', 'type': 'duration', 'target': 15, 'xp_reward': 40},
    {'id': 'run_30', 'name': 'Demi-Heure', 'description': 'Cours 30 minutes au total', 'type': 'duration', 'target': 30, 'xp_reward': 80},
    {'id': 'run_60', 'name': 'L\'Heure Complète', 'description': 'Cours 60 minutes au total', 'type': 'duration', 'target': 60, 'xp_reward': 150},
    {'id': 'intense_1', 'name': 'Pousse Toi', 'description': 'Complète une session intense ou extrême', 'type': 'intensity', 'target': 'intense', 'xp_reward': 60},
    {'id': 'long_20', 'name': 'Longue Sortie', 'description': 'Fais une session de 20+ minutes', 'type': 'single_duration', 'target': 20, 'xp_reward': 50},
    {'id': 'long_45', 'name': 'Ultra Session', 'description': 'Fais une session de 45+ minutes', 'type': 'single_duration', 'target': 45, 'xp_reward': 120},
]

# ============== HELPER FUNCTIONS ==============

def get_rank_for_level(level: int) -> dict:
    """Get rank based on level"""
    current_rank = RANKS[0]
    for rank in RANKS:
        if level >= rank['min_level']:
            current_rank = rank
    return current_rank

def get_next_rank(current_rank_id: str) -> Optional[dict]:
    """Get next rank after current"""
    for i, rank in enumerate(RANKS):
        if rank['id'] == current_rank_id:
            if i < len(RANKS) - 1:
                return RANKS[i + 1]
    return None

def get_xp_for_level(level: int) -> int:
    """Calculate XP needed to reach next level"""
    return int(BASE_XP * (XP_GROWTH_RATE ** (level - 1)))

def calculate_session_xp(duration_minutes: int, intensity: str) -> int:
    """Calculate XP earned from a session based on duration and intensity"""
    base_xp_per_minute = 8  # Base XP per minute
    intensity_mult = INTENSITY_MULTIPLIERS.get(intensity, 1.0)
    duration_mult = get_duration_multiplier(duration_minutes)
    
    xp = int(duration_minutes * base_xp_per_minute * intensity_mult * duration_mult)
    return max(10, xp)  # Minimum 10 XP

def generate_daily_quests() -> List[dict]:
    """Generate 3 random daily quests"""
    selected = random.sample(QUEST_TEMPLATES, 3)
    quests = []
    for quest in selected:
        quests.append({
            'id': quest['id'],
            'name': quest['name'],
            'description': quest['description'],
            'type': quest['type'],
            'target': quest['target'],
            'xp_reward': quest['xp_reward'],
            'progress': 0,
            'completed': False,
            'claimed': False
        })
    return quests

def check_trophy_condition(trophy: dict, progress: dict) -> bool:
    """Check if a trophy condition is met"""
    condition = trophy['condition']
    
    if condition.startswith('sessions_'):
        target = int(condition.split('_')[1])
        return progress['sessions_completed'] >= target
    elif condition.startswith('level_'):
        target = int(condition.split('_')[1])
        return progress['level'] >= target
    elif condition.startswith('rank_'):
        rank_id = condition.split('_')[1]
        return progress['rank_id'] == rank_id or RANKS.index(next(r for r in RANKS if r['id'] == progress['rank_id'])) >= RANKS.index(next(r for r in RANKS if r['id'] == rank_id))
    elif condition.startswith('total_minutes_'):
        target = int(condition.split('_')[2])
        return progress['total_duration_minutes'] >= target
    elif condition.startswith('intensity_'):
        intensity = condition.split('_')[1]
        return intensity in progress.get('intensities_completed', [])
    elif condition.startswith('streak_'):
        target = int(condition.split('_')[1])
        return progress.get('current_streak', 0) >= target
    return False

# ============== MODELS ==============

class UserProgress(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    device_id: str
    username: str = "Runner"
    level: int = 1
    current_xp: int = 0
    total_xp: int = 0
    rank_id: str = 'debutant'
    sessions_completed: int = 0
    total_duration_minutes: int = 0
    current_streak: int = 0
    best_streak: int = 0
    last_session_date: Optional[str] = None
    trophies_unlocked: List[str] = Field(default_factory=list)
    intensities_completed: List[str] = Field(default_factory=list)
    daily_quests: List[dict] = Field(default_factory=list)
    quests_last_reset: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class UserProgressResponse(BaseModel):
    id: str
    device_id: str
    username: str
    level: int
    current_xp: int
    xp_for_next_level: int
    total_xp: int
    rank: dict
    next_rank: Optional[dict]
    sessions_completed: int
    total_duration_minutes: int
    current_streak: int
    best_streak: int
    progress_percentage: float
    trophies_unlocked: List[str]
    daily_quests: List[dict]

class Session(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    device_id: str
    duration_minutes: int
    intensity: str
    intensity_name: str
    xp_earned: int
    level_before: int
    level_after: int
    leveled_up: bool
    rank_before: str
    rank_after: str
    ranked_up: bool
    started_at: datetime
    completed_at: datetime = Field(default_factory=datetime.utcnow)

class CompleteSessionInput(BaseModel):
    device_id: str
    duration_minutes: int
    intensity: str = 'moderate'

class SessionResponse(BaseModel):
    session: Session
    xp_earned: int
    leveled_up: bool
    levels_gained: int
    ranked_up: bool
    old_rank: dict
    new_rank: dict
    progress: UserProgressResponse
    trophies_earned: List[dict]
    quests_completed: List[dict]

class LeaderboardEntry(BaseModel):
    rank: int
    username: str
    level: int
    total_xp: int
    player_rank: dict
    sessions_completed: int
    is_current_user: bool = False

class UpdateUsernameInput(BaseModel):
    device_id: str
    username: str

# ============== HELPER TO CREATE RESPONSE ==============

def create_progress_response(progress: UserProgress) -> UserProgressResponse:
    xp_needed = get_xp_for_level(progress.level)
    current_rank = get_rank_for_level(progress.level)
    next_rank = get_next_rank(current_rank['id'])
    
    return UserProgressResponse(
        id=progress.id,
        device_id=progress.device_id,
        username=progress.username,
        level=progress.level,
        current_xp=progress.current_xp,
        xp_for_next_level=xp_needed,
        total_xp=progress.total_xp,
        rank=current_rank,
        next_rank=next_rank,
        sessions_completed=progress.sessions_completed,
        total_duration_minutes=progress.total_duration_minutes,
        current_streak=progress.current_streak,
        best_streak=progress.best_streak,
        progress_percentage=min(100, (progress.current_xp / xp_needed) * 100),
        trophies_unlocked=progress.trophies_unlocked,
        daily_quests=progress.daily_quests
    )

# ============== ROUTES ==============

@api_router.get("/")
async def root():
    return {"message": "RunLeveling API - Dépasse tes limites!"}

@api_router.get("/progress/{device_id}", response_model=UserProgressResponse)
async def get_progress(device_id: str):
    """Get or create user progress for a device"""
    progress_doc = await db.user_progress.find_one({"device_id": device_id})
    
    if not progress_doc:
        # Create new progress for this device
        new_progress = UserProgress(device_id=device_id)
        new_progress.daily_quests = generate_daily_quests()
        new_progress.quests_last_reset = datetime.utcnow().strftime('%Y-%m-%d')
        await db.user_progress.insert_one(new_progress.dict())
        return create_progress_response(new_progress)
    
    progress = UserProgress(**progress_doc)
    
    # Check if daily quests need reset
    today = datetime.utcnow().strftime('%Y-%m-%d')
    if progress.quests_last_reset != today:
        progress.daily_quests = generate_daily_quests()
        progress.quests_last_reset = today
        await db.user_progress.update_one(
            {"device_id": device_id},
            {"$set": {"daily_quests": progress.daily_quests, "quests_last_reset": today}}
        )
    
    return create_progress_response(progress)

@api_router.post("/session/complete", response_model=SessionResponse)
async def complete_session(input: CompleteSessionInput):
    """Complete a running session and award XP"""
    # Validate intensity
    if input.intensity not in INTENSITY_MULTIPLIERS:
        raise HTTPException(status_code=400, detail="Invalid intensity level")
    
    # Get or create progress
    progress_doc = await db.user_progress.find_one({"device_id": input.device_id})
    
    if not progress_doc:
        new_progress = UserProgress(device_id=input.device_id)
        new_progress.daily_quests = generate_daily_quests()
        new_progress.quests_last_reset = datetime.utcnow().strftime('%Y-%m-%d')
        await db.user_progress.insert_one(new_progress.dict())
        progress_doc = new_progress.dict()
    
    progress = UserProgress(**progress_doc)
    
    # Check if daily quests need reset
    today = datetime.utcnow().strftime('%Y-%m-%d')
    if progress.quests_last_reset != today:
        progress.daily_quests = generate_daily_quests()
        progress.quests_last_reset = today
    
    # Calculate XP earned
    xp_earned = calculate_session_xp(input.duration_minutes, input.intensity)
    
    # Store old values
    level_before = progress.level
    rank_before = get_rank_for_level(progress.level)
    
    # Update streak
    if progress.last_session_date:
        last_date = datetime.strptime(progress.last_session_date, '%Y-%m-%d')
        today_date = datetime.strptime(today, '%Y-%m-%d')
        days_diff = (today_date - last_date).days
        
        if days_diff == 1:
            progress.current_streak += 1
        elif days_diff > 1:
            progress.current_streak = 1
        # Same day - don't change streak
    else:
        progress.current_streak = 1
    
    progress.best_streak = max(progress.best_streak, progress.current_streak)
    progress.last_session_date = today
    
    # Track intensity completed
    if input.intensity not in progress.intensities_completed:
        progress.intensities_completed.append(input.intensity)
    
    # Update quest progress
    quests_completed = []
    for quest in progress.daily_quests:
        if quest['completed']:
            continue
            
        if quest['type'] == 'sessions':
            quest['progress'] += 1
        elif quest['type'] == 'duration':
            quest['progress'] += input.duration_minutes
        elif quest['type'] == 'intensity' and input.intensity in ['intense', 'extreme']:
            quest['progress'] = 1
        elif quest['type'] == 'single_duration' and input.duration_minutes >= quest['target']:
            quest['progress'] = quest['target']
        
        if quest['progress'] >= quest['target'] and not quest['completed']:
            quest['completed'] = True
            quests_completed.append(quest)
            xp_earned += quest['xp_reward']  # Add quest reward to XP
    
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
    new_rank = get_rank_for_level(progress.level)
    progress.rank_id = new_rank['id']
    progress.updated_at = datetime.utcnow()
    
    # Check for new trophies
    trophies_earned = []
    for trophy in TROPHIES:
        if trophy['id'] not in progress.trophies_unlocked:
            if check_trophy_condition(trophy, progress.dict()):
                progress.trophies_unlocked.append(trophy['id'])
                trophies_earned.append(trophy)
                progress.current_xp += trophy['xp_reward']
                progress.total_xp += trophy['xp_reward']
    
    # Save session
    session = Session(
        device_id=input.device_id,
        duration_minutes=input.duration_minutes,
        intensity=input.intensity,
        intensity_name=INTENSITY_NAMES[input.intensity],
        xp_earned=xp_earned,
        level_before=level_before,
        level_after=progress.level,
        leveled_up=levels_gained > 0,
        rank_before=rank_before['id'],
        rank_after=new_rank['id'],
        ranked_up=rank_before['id'] != new_rank['id'],
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
        ranked_up=rank_before['id'] != new_rank['id'],
        old_rank=rank_before,
        new_rank=new_rank,
        progress=create_progress_response(progress),
        trophies_earned=trophies_earned,
        quests_completed=quests_completed
    )

@api_router.get("/sessions/{device_id}", response_model=List[Session])
async def get_sessions(device_id: str, limit: int = 50):
    """Get recent sessions for a device"""
    sessions = await db.sessions.find(
        {"device_id": device_id}
    ).sort("completed_at", -1).limit(limit).to_list(limit)
    return [Session(**s) for s in sessions]

@api_router.get("/trophies")
async def get_all_trophies():
    """Get all available trophies"""
    return {"trophies": TROPHIES}

@api_router.get("/trophies/{device_id}")
async def get_user_trophies(device_id: str):
    """Get user's trophy progress"""
    progress_doc = await db.user_progress.find_one({"device_id": device_id})
    if not progress_doc:
        return {"unlocked": [], "locked": TROPHIES}
    
    progress = UserProgress(**progress_doc)
    unlocked = [t for t in TROPHIES if t['id'] in progress.trophies_unlocked]
    locked = [t for t in TROPHIES if t['id'] not in progress.trophies_unlocked]
    
    return {"unlocked": unlocked, "locked": locked}

@api_router.post("/quests/claim/{device_id}/{quest_id}")
async def claim_quest_reward(device_id: str, quest_id: str):
    """Claim reward for a completed quest"""
    progress_doc = await db.user_progress.find_one({"device_id": device_id})
    if not progress_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    progress = UserProgress(**progress_doc)
    
    quest_found = None
    for quest in progress.daily_quests:
        if quest['id'] == quest_id:
            quest_found = quest
            break
    
    if not quest_found:
        raise HTTPException(status_code=404, detail="Quest not found")
    
    if not quest_found['completed']:
        raise HTTPException(status_code=400, detail="Quest not completed yet")
    
    if quest_found['claimed']:
        raise HTTPException(status_code=400, detail="Quest already claimed")
    
    quest_found['claimed'] = True
    
    await db.user_progress.update_one(
        {"device_id": device_id},
        {"$set": {"daily_quests": progress.daily_quests}}
    )
    
    return {"message": "Quest reward claimed", "xp_reward": quest_found['xp_reward']}

@api_router.get("/leaderboard", response_model=List[LeaderboardEntry])
async def get_leaderboard(device_id: Optional[str] = None, limit: int = 50):
    """Get global leaderboard"""
    users = await db.user_progress.find().sort("total_xp", -1).limit(limit).to_list(limit)
    
    leaderboard = []
    for i, user_doc in enumerate(users):
        user = UserProgress(**user_doc)
        rank = get_rank_for_level(user.level)
        leaderboard.append(LeaderboardEntry(
            rank=i + 1,
            username=user.username,
            level=user.level,
            total_xp=user.total_xp,
            player_rank=rank,
            sessions_completed=user.sessions_completed,
            is_current_user=device_id == user.device_id if device_id else False
        ))
    
    return leaderboard

@api_router.get("/rank-info")
async def get_rank_info():
    """Get information about all ranks"""
    return {
        "ranks": RANKS,
        "base_xp": BASE_XP,
        "xp_growth_rate": XP_GROWTH_RATE,
        "intensities": [
            {"id": k, "name": v, "multiplier": INTENSITY_MULTIPLIERS[k]} 
            for k, v in INTENSITY_NAMES.items()
        ]
    }

@api_router.put("/username")
async def update_username(input: UpdateUsernameInput):
    """Update user's display name"""
    if len(input.username) < 2 or len(input.username) > 20:
        raise HTTPException(status_code=400, detail="Username must be 2-20 characters")
    
    result = await db.user_progress.update_one(
        {"device_id": input.device_id},
        {"$set": {"username": input.username}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "Username updated", "username": input.username}

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
