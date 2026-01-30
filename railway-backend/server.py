from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
import random
import os
from pymongo import MongoClient
import uuid
import httpx

# =============================================================================
# FASTAPI APP INITIALIZATION
# =============================================================================

app = FastAPI(
    title="RunLeveling API",
    description="Backend API for RunLeveling mobile app",
    version="1.0.0"
)

# CORS - Allow all origins for Expo mobile app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =============================================================================
# DATABASE CONNECTION
# =============================================================================

MONGO_URL = os.environ.get("MONGO_URL", os.environ.get("MONGODB_URL", "mongodb://localhost:27017"))

# Lazy connection - don't block startup
try:
    client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000, connectTimeoutMS=5000)
    # Test connection
    client.admin.command('ping')
    print(f"✅ Connected to MongoDB")
except Exception as e:
    print(f"⚠️ MongoDB connection warning: {e}")
    client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000)

db = client["runleveling"]
users_collection = db["users"]
sessions_collection = db["sessions"]
strava_collection = db["strava_tokens"]

# Strava credentials (optional)
STRAVA_CLIENT_ID = os.environ.get("STRAVA_CLIENT_ID")
STRAVA_CLIENT_SECRET = os.environ.get("STRAVA_CLIENT_SECRET")

# =============================================================================
# GAME DATA CONSTANTS
# =============================================================================

# All ranks
ALL_RANKS = [
    {"id": "debutant", "name": "Débutant", "min_level": 1, "color": "#6B7280", "icon": "🏃"},
    {"id": "jogger", "name": "Jogger", "min_level": 11, "color": "#10B981", "icon": "🏃‍♂️"},
    {"id": "coureur", "name": "Coureur", "min_level": 26, "color": "#3B82F6", "icon": "🏅"},
    {"id": "athlete", "name": "Athlète", "min_level": 46, "color": "#8B5CF6", "icon": "💪"},
    {"id": "champion", "name": "Champion", "min_level": 71, "color": "#F59E0B", "icon": "🏆"},
    {"id": "maitre", "name": "Maître", "min_level": 91, "color": "#EF4444", "icon": "👑"},
]

# Daily quests templates
QUEST_TEMPLATES = [
    # Distance quests
    {"type": "distance", "name": "Coureur du jour", "description": "Cours {target} km aujourd'hui", "targets": [1, 2, 3, 5], "xp_base": 30, "icon": "🏃"},
    {"type": "distance", "name": "Explorateur", "description": "Parcours {target} km en une session", "targets": [2, 3, 5, 8], "xp_base": 40, "icon": "🗺️"},
    
    # Duration quests
    {"type": "duration", "name": "Endurance", "description": "Cours pendant {target} minutes", "targets": [10, 15, 20, 30], "xp_base": 25, "icon": "⏱️"},
    {"type": "duration", "name": "Marathon mental", "description": "Accumule {target} min de course", "targets": [20, 30, 45, 60], "xp_base": 35, "icon": "🧠"},
    
    # Session quests
    {"type": "sessions", "name": "Régulier", "description": "Fais {target} session(s) aujourd'hui", "targets": [1, 2, 3], "xp_base": 40, "icon": "📅"},
    {"type": "sessions", "name": "Double dose", "description": "Complète {target} courses", "targets": [2, 3], "xp_base": 50, "icon": "✌️"},
    
    # XP quests
    {"type": "xp", "name": "Chasseur d'XP", "description": "Gagne {target} XP aujourd'hui", "targets": [50, 100, 150, 200], "xp_base": 35, "icon": "⭐"},
    {"type": "xp", "name": "XP Hunter", "description": "Accumule {target} XP", "targets": [75, 125, 200], "xp_base": 45, "icon": "💎"},
    
    # Calories quests
    {"type": "calories", "name": "Brûleur", "description": "Brûle {target} calories", "targets": [100, 200, 300, 500], "xp_base": 30, "icon": "🔥"},
    {"type": "calories", "name": "Fournaise", "description": "Élimine {target} kcal en courant", "targets": [150, 250, 400], "xp_base": 40, "icon": "🌋"},
    
    # Speed/Pace quests
    {"type": "speed", "name": "Accélérateur", "description": "Atteins {target} km/h en pointe", "targets": [8, 10, 12, 15], "xp_base": 35, "icon": "⚡"},
    {"type": "pace", "name": "Tempo", "description": "Maintiens une allure sous {target} min/km", "targets": [7, 6, 5.5, 5], "xp_base": 45, "icon": "🎵"},
]

# All trophies
ALL_TROPHIES = [
    # Sessions milestones
    {"id": "first_run", "name": "Premier Pas", "description": "Complète ta première course", "condition": "sessions >= 1", "xp_reward": 50, "icon": "🎯", "category": "sessions"},
    {"id": "five_sessions", "name": "En Route", "description": "Complète 5 sessions", "condition": "sessions >= 5", "xp_reward": 100, "icon": "🚀", "category": "sessions"},
    {"id": "ten_sessions", "name": "Persévérant", "description": "Complète 10 sessions", "condition": "sessions >= 10", "xp_reward": 150, "icon": "💪", "category": "sessions"},
    {"id": "twenty_five_sessions", "name": "Déterminé", "description": "Complète 25 sessions", "condition": "sessions >= 25", "xp_reward": 250, "icon": "🔥", "category": "sessions"},
    {"id": "fifty_sessions", "name": "Machine", "description": "Complète 50 sessions", "condition": "sessions >= 50", "xp_reward": 500, "icon": "⚡", "category": "sessions"},
    {"id": "hundred_sessions", "name": "Centenaire", "description": "Complète 100 sessions", "condition": "sessions >= 100", "xp_reward": 1000, "icon": "💯", "category": "sessions"},
    {"id": "two_fifty_sessions", "name": "Légende", "description": "Complète 250 sessions", "condition": "sessions >= 250", "xp_reward": 2500, "icon": "🌟", "category": "sessions"},
    
    # Distance milestones
    {"id": "first_5k", "name": "5K Club", "description": "Cours un total de 5 km", "condition": "distance >= 5", "xp_reward": 50, "icon": "🏃", "category": "distance"},
    {"id": "first_10k", "name": "10K Runner", "description": "Cours un total de 10 km", "condition": "distance >= 10", "xp_reward": 100, "icon": "🏃‍♂️", "category": "distance"},
    {"id": "half_marathon", "name": "Semi-Marathonien", "description": "Cours un total de 21 km", "condition": "distance >= 21", "xp_reward": 200, "icon": "🥈", "category": "distance"},
    {"id": "marathon", "name": "Marathonien", "description": "Cours un total de 42 km", "condition": "distance >= 42", "xp_reward": 400, "icon": "🥇", "category": "distance"},
    {"id": "hundred_km", "name": "Centurion", "description": "Cours un total de 100 km", "condition": "distance >= 100", "xp_reward": 750, "icon": "💯", "category": "distance"},
    {"id": "two_hundred_km", "name": "Ultra Runner", "description": "Cours un total de 200 km", "condition": "distance >= 200", "xp_reward": 1200, "icon": "🦸", "category": "distance"},
    {"id": "five_hundred_km", "name": "Nomade", "description": "Cours un total de 500 km", "condition": "distance >= 500", "xp_reward": 2500, "icon": "🌍", "category": "distance"},
    {"id": "thousand_km", "name": "Globetrotter", "description": "Cours un total de 1000 km", "condition": "distance >= 1000", "xp_reward": 5000, "icon": "🌎", "category": "distance"},
    
    # Level milestones
    {"id": "level_5", "name": "Démarrage", "description": "Atteins le niveau 5", "condition": "level >= 5", "xp_reward": 50, "icon": "📊", "category": "level"},
    {"id": "level_10", "name": "Apprenti", "description": "Atteins le niveau 10", "condition": "level >= 10", "xp_reward": 100, "icon": "📈", "category": "level"},
    {"id": "level_25", "name": "Confirmé", "description": "Atteins le niveau 25", "condition": "level >= 25", "xp_reward": 250, "icon": "🎖️", "category": "level"},
    {"id": "level_50", "name": "Expert", "description": "Atteins le niveau 50", "condition": "level >= 50", "xp_reward": 500, "icon": "🏆", "category": "level"},
    {"id": "level_75", "name": "Vétéran", "description": "Atteins le niveau 75", "condition": "level >= 75", "xp_reward": 750, "icon": "⭐", "category": "level"},
    {"id": "level_100", "name": "Maître Absolu", "description": "Atteins le niveau 100", "condition": "level >= 100", "xp_reward": 1500, "icon": "👑", "category": "level"},
    
    # Rank achievements
    {"id": "jogger_rank", "name": "Rang Jogger", "description": "Atteins le rang Jogger", "condition": "rank >= jogger", "xp_reward": 150, "icon": "🏃‍♂️", "category": "rank"},
    {"id": "coureur_rank", "name": "Rang Coureur", "description": "Atteins le rang Coureur", "condition": "rank >= coureur", "xp_reward": 300, "icon": "🏅", "category": "rank"},
    {"id": "athlete_rank", "name": "Rang Athlète", "description": "Atteins le rang Athlète", "condition": "rank >= athlete", "xp_reward": 500, "icon": "💪", "category": "rank"},
    {"id": "champion_rank", "name": "Rang Champion", "description": "Atteins le rang Champion", "condition": "rank >= champion", "xp_reward": 800, "icon": "🏆", "category": "rank"},
    {"id": "maitre_rank", "name": "Rang Maître", "description": "Atteins le rang Maître", "condition": "rank >= maitre", "xp_reward": 1500, "icon": "👑", "category": "rank"},
    
    # Calories
    {"id": "burn_500", "name": "Brûleur", "description": "Brûle 500 calories au total", "condition": "calories >= 500", "xp_reward": 75, "icon": "🔥", "category": "calories"},
    {"id": "burn_2000", "name": "Fournaise", "description": "Brûle 2000 calories au total", "condition": "calories >= 2000", "xp_reward": 200, "icon": "🌋", "category": "calories"},
    {"id": "burn_5000", "name": "Incendie", "description": "Brûle 5000 calories au total", "condition": "calories >= 5000", "xp_reward": 400, "icon": "☄️", "category": "calories"},
    {"id": "burn_10000", "name": "Supernova", "description": "Brûle 10000 calories au total", "condition": "calories >= 10000", "xp_reward": 800, "icon": "💥", "category": "calories"},
    
    # Duration
    {"id": "hour_total", "name": "1 Heure", "description": "Cours 1 heure au total", "condition": "duration >= 60", "xp_reward": 100, "icon": "⏱️", "category": "duration"},
    {"id": "five_hours", "name": "5 Heures", "description": "Cours 5 heures au total", "condition": "duration >= 300", "xp_reward": 300, "icon": "⏰", "category": "duration"},
    {"id": "ten_hours", "name": "10 Heures", "description": "Cours 10 heures au total", "condition": "duration >= 600", "xp_reward": 600, "icon": "🕐", "category": "duration"},
    {"id": "day_runner", "name": "24 Heures", "description": "Cours 24 heures au total", "condition": "duration >= 1440", "xp_reward": 1500, "icon": "📆", "category": "duration"},
    
    # Special
    {"id": "streak_3", "name": "Série de 3", "description": "Cours 3 jours d'affilée", "condition": "streak >= 3", "xp_reward": 100, "icon": "🔗", "category": "special"},
    {"id": "streak_7", "name": "Semaine Parfaite", "description": "Cours 7 jours d'affilée", "condition": "streak >= 7", "xp_reward": 300, "icon": "📅", "category": "special"},
    {"id": "streak_30", "name": "Mois de Feu", "description": "Cours 30 jours d'affilée", "condition": "streak >= 30", "xp_reward": 1000, "icon": "🗓️", "category": "special"},
    {"id": "quest_master", "name": "Maître des Quêtes", "description": "Complète 50 quêtes", "condition": "quests_completed >= 50", "xp_reward": 500, "icon": "📜", "category": "special"},
    {"id": "quest_legend", "name": "Légende des Quêtes", "description": "Complète 200 quêtes", "condition": "quests_completed >= 200", "xp_reward": 1500, "icon": "📚", "category": "special"},
]

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def get_rank_for_level(level: int) -> dict:
    """Get the rank corresponding to a level"""
    current_rank = ALL_RANKS[0]
    for rank in ALL_RANKS:
        if level >= rank["min_level"]:
            current_rank = rank
    return current_rank

def get_next_rank(current_rank_id: str) -> Optional[dict]:
    """Get the next rank after the current one"""
    for i, rank in enumerate(ALL_RANKS):
        if rank["id"] == current_rank_id and i < len(ALL_RANKS) - 1:
            return ALL_RANKS[i + 1]
    return None

def calculate_xp_for_level(level: int) -> int:
    """Calculate XP needed to reach next level"""
    return 100 + (level - 1) * 25

def generate_daily_quests(user_level: int = 1) -> List[dict]:
    """Generate 3 random daily quests based on user level"""
    today = datetime.now().strftime("%Y-%m-%d")
    selected_types = set()
    quests = []
    
    available_templates = QUEST_TEMPLATES.copy()
    random.shuffle(available_templates)
    
    for template in available_templates:
        if len(quests) >= 3:
            break
        if template["type"] in selected_types:
            continue
        selected_types.add(template["type"])
        
        target = random.choice(template["targets"])
        xp_reward = template["xp_base"] + (user_level * 2)
        
        quest = {
            "id": f"{template['type']}_{today}_{len(quests)}",
            "name": template["name"],
            "description": template["description"].format(target=target),
            "type": template["type"],
            "target": target,
            "xp_reward": xp_reward,
            "progress": 0,
            "completed": False,
            "claimed": False,
            "date": today,
            "icon": template.get("icon", "🎯")
        }
        quests.append(quest)
    
    return quests

def check_trophies(user_data: dict) -> List[dict]:
    """Check which trophies the user has newly earned"""
    earned_ids = [t["id"] for t in user_data.get("trophies_earned", [])]
    new_trophies = []
    
    for trophy in ALL_TROPHIES:
        if trophy["id"] in earned_ids:
            continue
            
        condition = trophy["condition"]
        earned = False
        
        # Parse and evaluate conditions
        if "sessions >=" in condition:
            val = int(condition.split(">=")[1].strip())
            earned = user_data.get("sessions_completed", 0) >= val
        elif "distance >=" in condition:
            val = float(condition.split(">=")[1].strip())
            earned = user_data.get("total_distance", 0) >= val
        elif "level >=" in condition:
            val = int(condition.split(">=")[1].strip())
            earned = user_data.get("level", 1) >= val
        elif "calories >=" in condition:
            val = int(condition.split(">=")[1].strip())
            earned = user_data.get("total_calories", 0) >= val
        elif "duration >=" in condition:
            val = int(condition.split(">=")[1].strip())
            earned = (user_data.get("total_duration", 0) / 60) >= val
        elif "streak >=" in condition:
            val = int(condition.split(">=")[1].strip())
            earned = user_data.get("streak", 0) >= val
        elif "quests_completed >=" in condition:
            val = int(condition.split(">=")[1].strip())
            earned = user_data.get("quests_completed", 0) >= val
        elif "rank >=" in condition:
            rank_name = condition.split(">=")[1].strip()
            rank_order = ["debutant", "jogger", "coureur", "athlete", "champion", "maitre"]
            user_rank = user_data.get("rank", {}).get("id", "debutant")
            if rank_name in rank_order and user_rank in rank_order:
                earned = rank_order.index(user_rank) >= rank_order.index(rank_name)
        
        if earned:
            new_trophies.append(trophy)
    
    return new_trophies

# =============================================================================
# HEALTH CHECK ROUTES (Required for Railway)
# =============================================================================

@app.get("/")
async def root():
    """Root endpoint - Returns 200 OK for health checks"""
    return {
        "status": "ok",
        "app": "RunLeveling API",
        "version": "1.0.0"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint for Railway"""
    return {"status": "ok"}

@app.get("/api")
async def api_root():
    """API root endpoint"""
    return {
        "message": "RunLeveling API is running",
        "endpoints": [
            "/api/progress/{device_id}",
            "/api/session/complete",
            "/api/sessions/{device_id}",
            "/api/leaderboard",
            "/api/trophies/{device_id}",
            "/api/quests/claim",
            "/api/username"
        ]
    }

# =============================================================================
# USER PROGRESS ROUTES
# =============================================================================

@app.get("/api/progress/{device_id}")
async def get_progress(device_id: str):
    """Get user progress and stats"""
    user = users_collection.find_one({"device_id": device_id})
    
    if not user:
        # Create new user
        today = datetime.now().strftime("%Y-%m-%d")
        user = {
            "device_id": device_id,
            "username": "Runner",
            "username_set": False,
            "level": 1,
            "current_xp": 0,
            "total_xp": 0,
            "sessions_completed": 0,
            "total_distance": 0,
            "total_duration": 0,
            "total_calories": 0,
            "streak": 0,
            "last_session_date": None,
            "quests_completed": 0,
            "rank": ALL_RANKS[0],
            "trophies_earned": [],
            "daily_quests": generate_daily_quests(1),
            "daily_quests_date": today,
            "created_at": datetime.now().isoformat(),
        }
        users_collection.insert_one(user)
    
    # Check if daily quests need refresh
    today = datetime.now().strftime("%Y-%m-%d")
    if user.get("daily_quests_date") != today:
        new_quests = generate_daily_quests(user.get("level", 1))
        users_collection.update_one(
            {"device_id": device_id},
            {"$set": {"daily_quests": new_quests, "daily_quests_date": today}}
        )
        user["daily_quests"] = new_quests
    
    # Calculate derived values
    level = user.get("level", 1)
    current_xp = user.get("current_xp", 0)
    xp_for_next = calculate_xp_for_level(level)
    rank = get_rank_for_level(level)
    next_rank = get_next_rank(rank["id"])
    
    return {
        "username": user.get("username", "Runner"),
        "username_set": user.get("username_set", False),
        "level": level,
        "current_xp": current_xp,
        "xp_for_next_level": xp_for_next,
        "total_xp": user.get("total_xp", 0),
        "sessions_completed": user.get("sessions_completed", 0),
        "total_distance": round(user.get("total_distance", 0), 2),
        "total_duration": user.get("total_duration", 0),
        "total_calories": user.get("total_calories", 0),
        "streak": user.get("streak", 0),
        "rank": rank,
        "next_rank": next_rank,
        "trophies_earned": user.get("trophies_earned", []),
        "daily_quests": user.get("daily_quests", []),
        "username_set": user.get("username_set", False),
    }

# =============================================================================
# SESSION ROUTES
# =============================================================================

@app.post("/api/session/complete")
async def complete_session(data: dict):
    """Complete a running session and award XP"""
    device_id = data.get("device_id")
    duration = data.get("duration", 0)  # seconds
    distance = data.get("distance", 0)  # km
    calories = data.get("calories", int(duration / 60 * 8))  # Estimate calories
    
    user = users_collection.find_one({"device_id": device_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Calculate XP based on duration and distance
    xp_earned = int((duration / 60) * 2 + distance * 10)
    
    # Minimum XP bonus for completing any session
    min_xp = 5
    if duration >= 10:
        xp_earned = max(xp_earned, min_xp)
    
    # Bonus XP based on duration milestones
    if duration >= 300:  # 5+ minutes
        xp_earned += 10
    if duration >= 600:  # 10+ minutes
        xp_earned += 15
    if duration >= 1200:  # 20+ minutes
        xp_earned += 25
    
    # Update user stats
    new_total_xp = user.get("total_xp", 0) + xp_earned
    new_current_xp = user.get("current_xp", 0) + xp_earned
    new_level = user.get("level", 1)
    new_sessions = user.get("sessions_completed", 0) + 1
    new_distance = user.get("total_distance", 0) + distance
    new_duration = user.get("total_duration", 0) + duration
    new_calories = user.get("total_calories", 0) + calories
    
    # Check for level ups
    level_ups = []
    xp_for_next = calculate_xp_for_level(new_level)
    while new_current_xp >= xp_for_next:
        new_current_xp -= xp_for_next
        new_level += 1
        level_ups.append(new_level)
        xp_for_next = calculate_xp_for_level(new_level)
    
    # Check for rank change
    old_rank = user.get("rank", ALL_RANKS[0])
    new_rank = get_rank_for_level(new_level)
    rank_changed = old_rank.get("id") != new_rank["id"]
    next_rank = get_next_rank(new_rank["id"])
    
    # Update streak
    today = datetime.now().strftime("%Y-%m-%d")
    yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
    last_session = user.get("last_session_date")
    
    if last_session == yesterday:
        new_streak = user.get("streak", 0) + 1
    elif last_session == today:
        new_streak = user.get("streak", 1)
    else:
        new_streak = 1
    
    # Update daily quests progress
    daily_quests = user.get("daily_quests", [])
    for quest in daily_quests:
        if quest.get("completed") or quest.get("claimed"):
            continue
        
        quest_type = quest.get("type")
        target = quest.get("target", 0)
        
        if quest_type == "distance":
            quest["progress"] = min(quest.get("progress", 0) + distance, target)
        elif quest_type == "duration":
            quest["progress"] = min(quest.get("progress", 0) + (duration / 60), target)
        elif quest_type == "sessions":
            quest["progress"] = quest.get("progress", 0) + 1
        elif quest_type == "xp":
            quest["progress"] = min(quest.get("progress", 0) + xp_earned, target)
        elif quest_type == "calories":
            quest["progress"] = min(quest.get("progress", 0) + calories, target)
        
        if quest["progress"] >= target:
            quest["completed"] = True
    
    # Build update data
    update_data = {
        "total_xp": new_total_xp,
        "current_xp": new_current_xp,
        "level": new_level,
        "sessions_completed": new_sessions,
        "total_distance": new_distance,
        "total_duration": new_duration,
        "total_calories": new_calories,
        "rank": new_rank,
        "streak": new_streak,
        "last_session_date": today,
        "daily_quests": daily_quests,
    }
    
    # Check for new trophies
    temp_user = {**user, **update_data}
    new_trophies = check_trophies(temp_user)
    trophy_xp = 0
    
    if new_trophies:
        earned_trophies = user.get("trophies_earned", []) + new_trophies
        update_data["trophies_earned"] = earned_trophies
        
        # Add trophy XP rewards
        for trophy in new_trophies:
            trophy_xp += trophy.get("xp_reward", 0)
        
        if trophy_xp > 0:
            new_total_xp += trophy_xp
            new_current_xp += trophy_xp
            update_data["total_xp"] = new_total_xp
            update_data["current_xp"] = new_current_xp
            
            # Check for additional level ups from trophy XP
            while new_current_xp >= xp_for_next:
                new_current_xp -= xp_for_next
                new_level += 1
                xp_for_next = calculate_xp_for_level(new_level)
                level_ups.append(new_level)
            
            update_data["level"] = new_level
            update_data["current_xp"] = new_current_xp
            
            # Recheck rank
            new_rank = get_rank_for_level(new_level)
            if new_rank["id"] != update_data.get("rank", {}).get("id"):
                rank_changed = True
                old_rank = update_data.get("rank")
            update_data["rank"] = new_rank
    
    users_collection.update_one({"device_id": device_id}, {"$set": update_data})
    
    # Save session
    session_data = {
        "id": str(uuid.uuid4()),
        "device_id": device_id,
        "duration": duration,
        "distance": distance,
        "calories": calories,
        "xp_earned": xp_earned,
        "date": datetime.now().isoformat(),
    }
    sessions_collection.insert_one(session_data)
    
    # Calculate progress percentage
    progress_pct = (new_current_xp / xp_for_next) * 100
    total_xp_earned = xp_earned + trophy_xp
    
    return {
        "xp_earned": total_xp_earned,
        "run_xp": xp_earned,
        "trophy_xp": trophy_xp,
        "leveled_up": len(level_ups) > 0,
        "levels_gained": len(level_ups),
        "ranked_up": rank_changed,
        "old_rank": old_rank if rank_changed else None,
        "new_rank": new_rank,
        "trophies_earned": new_trophies,
        "quests_completed": [q for q in daily_quests if q.get("completed") and not q.get("claimed")],
        "progress": {
            "level": new_level,
            "current_xp": new_current_xp,
            "xp_for_next_level": xp_for_next,
            "total_xp": new_total_xp,
            "progress_percentage": progress_pct,
            "rank": new_rank,
            "next_rank": next_rank,
            "sessions_completed": new_sessions,
            "total_distance": new_distance,
            "total_duration": new_duration,
        }
    }

@app.get("/api/sessions/{device_id}")
async def get_sessions(device_id: str, limit: int = 20):
    """Get user's session history"""
    sessions = list(sessions_collection.find({"device_id": device_id}).sort("date", -1).limit(limit))
    result = []
    
    for s in sessions:
        duration = s.get("duration", 0)
        distance = s.get("distance", 0)
        duration_min = int(duration // 60)
        duration_sec = int(duration % 60)
        
        # Calculate pace (min/km)
        if distance > 0:
            pace_seconds = duration / distance
            pace_min = int(pace_seconds // 60)
            pace_sec = int(pace_seconds % 60)
            avg_pace = f"{pace_min}:{str(pace_sec).zfill(2)}"
        else:
            avg_pace = "--:--"
        
        result.append({
            "id": s.get("id", str(s.get("_id", ""))),
            "completed_at": s.get("date"),
            "duration": duration,
            "duration_minutes": duration_min,
            "duration_seconds": duration_sec,
            "distance": distance,
            "distance_km": round(distance, 2),
            "xp_earned": s.get("xp_earned", 0),
            "avg_pace": avg_pace,
            "intensity": s.get("intensity", "moderate"),
            "intensity_name": s.get("intensity_name", "Modéré"),
            "calories": s.get("calories", int(duration / 60 * 8)),
            "leveled_up": s.get("leveled_up", False),
            "level_after": s.get("level_after"),
        })
    
    return result

# =============================================================================
# QUEST ROUTES
# =============================================================================

@app.post("/api/quests/claim")
async def claim_quest(data: dict):
    """Claim a completed quest reward"""
    device_id = data.get("device_id")
    quest_id = data.get("quest_id")
    
    user = users_collection.find_one({"device_id": device_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    daily_quests = user.get("daily_quests", [])
    quest = None
    
    for q in daily_quests:
        if q["id"] == quest_id:
            quest = q
            break
    
    if not quest:
        raise HTTPException(status_code=404, detail="Quest not found")
    
    if not quest.get("completed"):
        raise HTTPException(status_code=400, detail="Quest not completed")
    
    if quest.get("claimed"):
        raise HTTPException(status_code=400, detail="Quest already claimed")
    
    # Award XP
    xp_reward = quest.get("xp_reward", 0)
    new_current_xp = user.get("current_xp", 0) + xp_reward
    new_total_xp = user.get("total_xp", 0) + xp_reward
    new_level = user.get("level", 1)
    new_quests_completed = user.get("quests_completed", 0) + 1
    
    # Check for level ups
    level_ups = []
    xp_for_next = calculate_xp_for_level(new_level)
    while new_current_xp >= xp_for_next:
        new_current_xp -= xp_for_next
        new_level += 1
        level_ups.append(new_level)
        xp_for_next = calculate_xp_for_level(new_level)
    
    # Mark quest as claimed
    for q in daily_quests:
        if q["id"] == quest_id:
            q["claimed"] = True
            break
    
    new_rank = get_rank_for_level(new_level)
    
    users_collection.update_one(
        {"device_id": device_id},
        {"$set": {
            "current_xp": new_current_xp,
            "total_xp": new_total_xp,
            "level": new_level,
            "rank": new_rank,
            "daily_quests": daily_quests,
            "quests_completed": new_quests_completed,
        }}
    )
    
    return {
        "success": True,
        "xp_earned": xp_reward,
        "new_level": new_level,
        "level_ups": level_ups,
        "rank": new_rank,
    }

# =============================================================================
# TROPHY ROUTES
# =============================================================================

@app.get("/api/trophies/{device_id}")
async def get_trophies(device_id: str):
    """Get user's trophies (earned and locked)"""
    user = users_collection.find_one({"device_id": device_id})
    earned_ids = []
    
    if user:
        earned_ids = [t["id"] for t in user.get("trophies_earned", [])]
    
    unlocked = [t for t in ALL_TROPHIES if t["id"] in earned_ids]
    locked = [t for t in ALL_TROPHIES if t["id"] not in earned_ids]
    
    return {
        "unlocked": unlocked,
        "locked": locked
    }

# =============================================================================
# LEADERBOARD ROUTES
# =============================================================================

@app.get("/api/leaderboard")
async def get_leaderboard(device_id: str = None, limit: int = 50, rank_id: str = None):
    """Get global leaderboard, optionally filtered by rank"""
    query = {}
    if rank_id:
        query["rank.id"] = rank_id
    
    users = list(users_collection.find(query).sort("total_xp", -1).limit(limit))
    
    leaderboard = []
    for i, user in enumerate(users):
        leaderboard.append({
            "position": i + 1,
            "username": user.get("username", "Runner"),
            "level": user.get("level", 1),
            "total_xp": user.get("total_xp", 0),
            "rank": user.get("rank", ALL_RANKS[0]),
            "is_current_user": user.get("device_id") == device_id,
        })
    
    return leaderboard

# =============================================================================
# USER SETTINGS ROUTES
# =============================================================================

@app.put("/api/username")
async def update_username(data: dict):
    """Update user's username (one-time only)"""
    device_id = data.get("device_id")
    username = data.get("username", "Runner")
    
    user = users_collection.find_one({"device_id": device_id})
    if user and user.get("username_set"):
        return {"success": False, "error": "Le pseudo a déjà été défini et ne peut plus être changé."}
    
    users_collection.update_one(
        {"device_id": device_id},
        {"$set": {"username": username, "username_set": True}}
    )
    return {"success": True}

@app.put("/api/notifications")
async def update_notifications(data: dict):
    """Update notification settings"""
    device_id = data.get("device_id")
    enabled = data.get("enabled", True)
    time = data.get("time", "19:00")
    
    users_collection.update_one(
        {"device_id": device_id},
        {"$set": {"notification_enabled": enabled, "notification_time": time}}
    )
    return {"success": True}

# =============================================================================
# STRAVA INTEGRATION ROUTES
# =============================================================================

@app.get("/api/strava/status/{device_id}")
async def get_strava_status(device_id: str):
    """Check if user has connected Strava"""
    token = strava_collection.find_one({"device_id": device_id})
    return {"connected": token is not None}

@app.post("/api/strava/connect")
async def connect_strava(data: dict):
    """Connect Strava account with authorization code"""
    device_id = data.get("device_id")
    code = data.get("code")
    
    if not STRAVA_CLIENT_ID or not STRAVA_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="Strava not configured")
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://www.strava.com/oauth/token",
            data={
                "client_id": STRAVA_CLIENT_ID,
                "client_secret": STRAVA_CLIENT_SECRET,
                "code": code,
                "grant_type": "authorization_code",
            }
        )
    
    if response.status_code != 200:
        raise HTTPException(status_code=400, detail="Failed to connect Strava")
    
    tokens = response.json()
    
    strava_collection.update_one(
        {"device_id": device_id},
        {"$set": {
            "device_id": device_id,
            "access_token": tokens["access_token"],
            "refresh_token": tokens["refresh_token"],
            "expires_at": tokens["expires_at"],
            "athlete_id": tokens["athlete"]["id"],
        }},
        upsert=True
    )
    
    return {"success": True, "athlete": tokens.get("athlete", {}).get("firstname")}

@app.post("/api/strava/disconnect")
async def disconnect_strava(data: dict):
    """Disconnect Strava account"""
    device_id = data.get("device_id")
    strava_collection.delete_one({"device_id": device_id})
    return {"success": True}

@app.post("/api/strava/sync")
async def sync_strava(data: dict):
    """Sync recent Strava activities"""
    device_id = data.get("device_id")
    
    token_data = strava_collection.find_one({"device_id": device_id})
    if not token_data:
        raise HTTPException(status_code=400, detail="Strava not connected")
    
    # Refresh token if needed
    if token_data.get("expires_at", 0) < datetime.now().timestamp():
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://www.strava.com/oauth/token",
                data={
                    "client_id": STRAVA_CLIENT_ID,
                    "client_secret": STRAVA_CLIENT_SECRET,
                    "refresh_token": token_data["refresh_token"],
                    "grant_type": "refresh_token",
                }
            )
        
        if response.status_code == 200:
            new_tokens = response.json()
            strava_collection.update_one(
                {"device_id": device_id},
                {"$set": {
                    "access_token": new_tokens["access_token"],
                    "refresh_token": new_tokens["refresh_token"],
                    "expires_at": new_tokens["expires_at"],
                }}
            )
            token_data["access_token"] = new_tokens["access_token"]
    
    # Fetch recent activities
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://www.strava.com/api/v3/athlete/activities",
            headers={"Authorization": f"Bearer {token_data['access_token']}"},
            params={"per_page": 10}
        )
    
    if response.status_code != 200:
        raise HTTPException(status_code=400, detail="Failed to fetch Strava activities")
    
    activities = response.json()
    synced = 0
    
    for activity in activities:
        if activity.get("type") != "Run":
            continue
        
        # Check if already synced
        activity_id = str(activity["id"])
        existing = sessions_collection.find_one({"strava_id": activity_id})
        if existing:
            continue
        
        # Create session from Strava activity
        duration = activity.get("moving_time", 0)
        distance = activity.get("distance", 0) / 1000  # Convert to km
        
        # Calculate XP
        xp_earned = int((duration / 60) * 2 + distance * 10)
        if duration >= 300:
            xp_earned += 10
        if duration >= 600:
            xp_earned += 15
        
        session_data = {
            "id": str(uuid.uuid4()),
            "strava_id": activity_id,
            "device_id": device_id,
            "duration": duration,
            "distance": distance,
            "xp_earned": xp_earned,
            "date": activity.get("start_date"),
            "name": activity.get("name"),
        }
        sessions_collection.insert_one(session_data)
        
        # Update user stats
        user = users_collection.find_one({"device_id": device_id})
        if user:
            new_total_xp = user.get("total_xp", 0) + xp_earned
            new_current_xp = user.get("current_xp", 0) + xp_earned
            new_level = user.get("level", 1)
            
            xp_for_next = calculate_xp_for_level(new_level)
            while new_current_xp >= xp_for_next:
                new_current_xp -= xp_for_next
                new_level += 1
                xp_for_next = calculate_xp_for_level(new_level)
            
            users_collection.update_one(
                {"device_id": device_id},
                {"$set": {
                    "total_xp": new_total_xp,
                    "current_xp": new_current_xp,
                    "level": new_level,
                    "sessions_completed": user.get("sessions_completed", 0) + 1,
                    "total_distance": user.get("total_distance", 0) + distance,
                    "total_duration": user.get("total_duration", 0) + duration,
                    "rank": get_rank_for_level(new_level),
                }}
            )
        
        synced += 1
    
    return {"success": True, "synced": synced}

# =============================================================================
# MAIN ENTRY POINT (for Railway)
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("server:app", host="0.0.0.0", port=port, reload=False)
