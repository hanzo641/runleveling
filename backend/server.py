from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
import random
import os
from dotenv import load_dotenv
from pymongo import MongoClient
import uuid
import httpx

load_dotenv()

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
client = MongoClient(MONGO_URL)
db = client["runleveling"]
users_collection = db["users"]
sessions_collection = db["sessions"]
strava_collection = db["strava_tokens"]

# Strava credentials
STRAVA_CLIENT_ID = os.getenv("STRAVA_CLIENT_ID")
STRAVA_CLIENT_SECRET = os.getenv("STRAVA_CLIENT_SECRET")

# All ranks
ALL_RANKS = [
    {"id": "debutant", "name": "Débutant", "min_level": 1, "color": "#6B7280", "icon": "🏃"},
    {"id": "jogger", "name": "Jogger", "min_level": 11, "color": "#10B981", "icon": "🏃‍♂️"},
    {"id": "coureur", "name": "Coureur", "min_level": 26, "color": "#3B82F6", "icon": "🏅"},
    {"id": "athlete", "name": "Athlète", "min_level": 46, "color": "#8B5CF6", "icon": "💪"},
    {"id": "champion", "name": "Champion", "min_level": 71, "color": "#F59E0B", "icon": "🏆"},
    {"id": "maitre", "name": "Maître", "min_level": 91, "color": "#EF4444", "icon": "👑"},
]

# Daily quests templates - Plus variés et motivants
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

# All trophies - Beaucoup plus complet !
ALL_TROPHIES = [
    # === SESSIONS MILESTONES ===
    {"id": "first_run", "name": "Premier Pas", "description": "Complète ta première course", "condition": "sessions >= 1", "xp_reward": 50, "icon": "🎯", "category": "sessions"},
    {"id": "five_sessions", "name": "En Route", "description": "Complète 5 sessions", "condition": "sessions >= 5", "xp_reward": 100, "icon": "🚀", "category": "sessions"},
    {"id": "ten_sessions", "name": "Persévérant", "description": "Complète 10 sessions", "condition": "sessions >= 10", "xp_reward": 150, "icon": "💪", "category": "sessions"},
    {"id": "twenty_five_sessions", "name": "Déterminé", "description": "Complète 25 sessions", "condition": "sessions >= 25", "xp_reward": 250, "icon": "🔥", "category": "sessions"},
    {"id": "fifty_sessions", "name": "Machine", "description": "Complète 50 sessions", "condition": "sessions >= 50", "xp_reward": 500, "icon": "⚡", "category": "sessions"},
    {"id": "hundred_sessions", "name": "Centenaire", "description": "Complète 100 sessions", "condition": "sessions >= 100", "xp_reward": 1000, "icon": "💯", "category": "sessions"},
    {"id": "two_fifty_sessions", "name": "Légende", "description": "Complète 250 sessions", "condition": "sessions >= 250", "xp_reward": 2500, "icon": "🌟", "category": "sessions"},
    
    # === DISTANCE MILESTONES ===
    {"id": "first_5k", "name": "5K Club", "description": "Cours un total de 5 km", "condition": "distance >= 5", "xp_reward": 50, "icon": "🏃", "category": "distance"},
    {"id": "first_10k", "name": "10K Runner", "description": "Cours un total de 10 km", "condition": "distance >= 10", "xp_reward": 100, "icon": "🏃‍♂️", "category": "distance"},
    {"id": "half_marathon", "name": "Semi-Marathonien", "description": "Cours un total de 21 km", "condition": "distance >= 21", "xp_reward": 200, "icon": "🥈", "category": "distance"},
    {"id": "marathon", "name": "Marathonien", "description": "Cours un total de 42 km", "condition": "distance >= 42", "xp_reward": 400, "icon": "🥇", "category": "distance"},
    {"id": "hundred_km", "name": "Centurion", "description": "Cours un total de 100 km", "condition": "distance >= 100", "xp_reward": 750, "icon": "💯", "category": "distance"},
    {"id": "two_hundred_km", "name": "Ultra Runner", "description": "Cours un total de 200 km", "condition": "distance >= 200", "xp_reward": 1200, "icon": "🦸", "category": "distance"},
    {"id": "five_hundred_km", "name": "Nomade", "description": "Cours un total de 500 km", "condition": "distance >= 500", "xp_reward": 2500, "icon": "🌍", "category": "distance"},
    {"id": "thousand_km", "name": "Globetrotter", "description": "Cours un total de 1000 km", "condition": "distance >= 1000", "xp_reward": 5000, "icon": "🌎", "category": "distance"},
    
    # === SPEED/PACE ACHIEVEMENTS ===
    {"id": "sprinter", "name": "Sprinter", "description": "Cours à moins de 5 min/km", "condition": "pace < 5", "xp_reward": 200, "icon": "⚡", "category": "speed"},
    {"id": "fast_runner", "name": "Rapide", "description": "Cours à moins de 4:30 min/km", "condition": "pace < 4.5", "xp_reward": 350, "icon": "🏎️", "category": "speed"},
    {"id": "speed_demon", "name": "Démon de Vitesse", "description": "Cours à moins de 4 min/km", "condition": "pace < 4", "xp_reward": 500, "icon": "👹", "category": "speed"},
    {"id": "lightning", "name": "Éclair", "description": "Atteins 15 km/h", "condition": "max_speed >= 15", "xp_reward": 300, "icon": "⚡", "category": "speed"},
    {"id": "rocket", "name": "Fusée", "description": "Atteins 18 km/h", "condition": "max_speed >= 18", "xp_reward": 500, "icon": "🚀", "category": "speed"},
    
    # === TIME OF DAY ===
    {"id": "early_bird", "name": "Lève-tôt", "description": "Cours avant 7h du matin", "condition": "early_run", "xp_reward": 75, "icon": "🌅", "category": "time"},
    {"id": "dawn_warrior", "name": "Guerrier de l'Aube", "description": "5 courses avant 7h", "condition": "early_runs >= 5", "xp_reward": 200, "icon": "☀️", "category": "time"},
    {"id": "night_owl", "name": "Noctambule", "description": "Cours après 21h", "condition": "night_run", "xp_reward": 75, "icon": "🌙", "category": "time"},
    {"id": "midnight_runner", "name": "Coureur de Minuit", "description": "5 courses après 21h", "condition": "night_runs >= 5", "xp_reward": 200, "icon": "🦉", "category": "time"},
    {"id": "lunch_run", "name": "Pause Active", "description": "Cours entre 12h et 14h", "condition": "lunch_run", "xp_reward": 50, "icon": "🍽️", "category": "time"},
    
    # === LEVEL MILESTONES ===
    {"id": "level_5", "name": "Démarrage", "description": "Atteins le niveau 5", "condition": "level >= 5", "xp_reward": 50, "icon": "📊", "category": "level"},
    {"id": "level_10", "name": "Apprenti", "description": "Atteins le niveau 10", "condition": "level >= 10", "xp_reward": 100, "icon": "📈", "category": "level"},
    {"id": "level_25", "name": "Confirmé", "description": "Atteins le niveau 25", "condition": "level >= 25", "xp_reward": 250, "icon": "🎖️", "category": "level"},
    {"id": "level_50", "name": "Expert", "description": "Atteins le niveau 50", "condition": "level >= 50", "xp_reward": 500, "icon": "🏆", "category": "level"},
    {"id": "level_75", "name": "Vétéran", "description": "Atteins le niveau 75", "condition": "level >= 75", "xp_reward": 750, "icon": "⭐", "category": "level"},
    {"id": "level_100", "name": "Maître Absolu", "description": "Atteins le niveau 100", "condition": "level >= 100", "xp_reward": 1500, "icon": "👑", "category": "level"},
    
    # === RANK ACHIEVEMENTS ===
    {"id": "jogger_rank", "name": "Rang Jogger", "description": "Atteins le rang Jogger", "condition": "rank >= jogger", "xp_reward": 150, "icon": "🏃‍♂️", "category": "rank"},
    {"id": "coureur_rank", "name": "Rang Coureur", "description": "Atteins le rang Coureur", "condition": "rank >= coureur", "xp_reward": 300, "icon": "🏅", "category": "rank"},
    {"id": "athlete_rank", "name": "Rang Athlète", "description": "Atteins le rang Athlète", "condition": "rank >= athlete", "xp_reward": 500, "icon": "💪", "category": "rank"},
    {"id": "champion_rank", "name": "Rang Champion", "description": "Atteins le rang Champion", "condition": "rank >= champion", "xp_reward": 800, "icon": "🏆", "category": "rank"},
    {"id": "maitre_rank", "name": "Rang Maître", "description": "Atteins le rang Maître", "condition": "rank >= maitre", "xp_reward": 1500, "icon": "👑", "category": "rank"},
    
    # === CALORIES ===
    {"id": "burn_500", "name": "Brûleur", "description": "Brûle 500 calories au total", "condition": "calories >= 500", "xp_reward": 75, "icon": "🔥", "category": "calories"},
    {"id": "burn_2000", "name": "Fournaise", "description": "Brûle 2000 calories au total", "condition": "calories >= 2000", "xp_reward": 200, "icon": "🌋", "category": "calories"},
    {"id": "burn_5000", "name": "Incendie", "description": "Brûle 5000 calories au total", "condition": "calories >= 5000", "xp_reward": 400, "icon": "☄️", "category": "calories"},
    {"id": "burn_10000", "name": "Supernova", "description": "Brûle 10000 calories au total", "condition": "calories >= 10000", "xp_reward": 800, "icon": "💥", "category": "calories"},
    
    # === DURATION ===
    {"id": "hour_total", "name": "1 Heure", "description": "Cours 1 heure au total", "condition": "duration >= 60", "xp_reward": 100, "icon": "⏱️", "category": "duration"},
    {"id": "five_hours", "name": "5 Heures", "description": "Cours 5 heures au total", "condition": "duration >= 300", "xp_reward": 300, "icon": "⏰", "category": "duration"},
    {"id": "ten_hours", "name": "10 Heures", "description": "Cours 10 heures au total", "condition": "duration >= 600", "xp_reward": 600, "icon": "🕐", "category": "duration"},
    {"id": "day_runner", "name": "24 Heures", "description": "Cours 24 heures au total", "condition": "duration >= 1440", "xp_reward": 1500, "icon": "📆", "category": "duration"},
    
    # === SPECIAL/FUN ===
    {"id": "streak_3", "name": "Série de 3", "description": "Cours 3 jours d'affilée", "condition": "streak >= 3", "xp_reward": 100, "icon": "🔗", "category": "special"},
    {"id": "streak_7", "name": "Semaine Parfaite", "description": "Cours 7 jours d'affilée", "condition": "streak >= 7", "xp_reward": 300, "icon": "📅", "category": "special"},
    {"id": "streak_30", "name": "Mois de Feu", "description": "Cours 30 jours d'affilée", "condition": "streak >= 30", "xp_reward": 1000, "icon": "🗓️", "category": "special"},
    {"id": "weekend_warrior", "name": "Guerrier du Weekend", "description": "Cours samedi ET dimanche", "condition": "weekend_complete", "xp_reward": 100, "icon": "🦸", "category": "special"},
    {"id": "quest_master", "name": "Maître des Quêtes", "description": "Complète 50 quêtes", "condition": "quests_completed >= 50", "xp_reward": 500, "icon": "📜", "category": "special"},
    {"id": "quest_legend", "name": "Légende des Quêtes", "description": "Complète 200 quêtes", "condition": "quests_completed >= 200", "xp_reward": 1500, "icon": "📚", "category": "special"},
]

def get_rank_for_level(level: int):
    current_rank = ALL_RANKS[0]
    for rank in ALL_RANKS:
        if level >= rank["min_level"]:
            current_rank = rank
    return current_rank

def get_next_rank(current_rank_id: str):
    for i, rank in enumerate(ALL_RANKS):
        if rank["id"] == current_rank_id and i < len(ALL_RANKS) - 1:
            return ALL_RANKS[i + 1]
    return None

def calculate_xp_for_level(level: int) -> int:
    return 100 + (level - 1) * 50

def generate_daily_quests(user_level: int) -> List[dict]:
    today = datetime.now().strftime("%Y-%m-%d")
    quests = []
    used_types = []
    
    for i in range(3):
        available_templates = [t for t in QUEST_TEMPLATES if t["type"] not in used_types]
        if not available_templates:
            available_templates = QUEST_TEMPLATES
        
        template = random.choice(available_templates)
        used_types.append(template["type"])
        
        target = random.choice(template["targets"])
        xp_reward = template["xp_base"] + (user_level * 2)
        
        quest = {
            "id": f"{template['type']}_{today}_{i}",
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
    unlocked = []
    earned_ids = [t["id"] for t in user_data.get("trophies_earned", [])]
    
    sessions = user_data.get("sessions_completed", 0)
    distance = user_data.get("total_distance", 0)
    level = user_data.get("level", 1)
    rank_id = user_data.get("rank", {}).get("id", "debutant")
    
    rank_order = ["debutant", "jogger", "coureur", "athlete", "champion", "maitre"]
    current_rank_idx = rank_order.index(rank_id) if rank_id in rank_order else 0
    
    for trophy in ALL_TROPHIES:
        if trophy["id"] in earned_ids:
            continue
            
        condition = trophy["condition"]
        earned = False
        
        if "sessions >=" in condition:
            target = int(condition.split(">=")[1].strip())
            earned = sessions >= target
        elif "distance >=" in condition:
            target = float(condition.split(">=")[1].strip())
            earned = distance >= target
        elif "level >=" in condition:
            target = int(condition.split(">=")[1].strip())
            earned = level >= target
        elif "rank >=" in condition:
            target_rank = condition.split(">=")[1].strip()
            target_idx = rank_order.index(target_rank) if target_rank in rank_order else 99
            earned = current_rank_idx >= target_idx
            
        if earned:
            unlocked.append(trophy)
    
    return unlocked

@app.get("/api/progress/{device_id}")
async def get_progress(device_id: str):
    user = users_collection.find_one({"device_id": device_id})
    
    if not user:
        # Create new user
        today = datetime.now().strftime("%Y-%m-%d")
        user = {
            "id": str(uuid.uuid4()),
            "device_id": device_id,
            "username": "Runner",
            "level": 1,
            "current_xp": 0,
            "xp_for_next_level": 100,
            "total_xp": 0,
            "rank": ALL_RANKS[0],
            "next_rank": ALL_RANKS[1],
            "sessions_completed": 0,
            "total_distance": 0,
            "total_duration": 0,
            "notification_enabled": False,
            "notification_time": {"hour": 9, "minute": 0},
            "trophies_earned": [],
            "quests_completed": [],
            "daily_quests": generate_daily_quests(1),
            "daily_quests_date": today,
            "created_at": datetime.now().isoformat(),
        }
        users_collection.insert_one(user)
    else:
        # Check if daily quests need refresh
        today = datetime.now().strftime("%Y-%m-%d")
        if user.get("daily_quests_date") != today:
            user["daily_quests"] = generate_daily_quests(user.get("level", 1))
            user["daily_quests_date"] = today
            users_collection.update_one({"device_id": device_id}, {"$set": {"daily_quests": user["daily_quests"], "daily_quests_date": today}})
    
    # Calculate progress percentage
    progress_pct = (user.get("current_xp", 0) / user.get("xp_for_next_level", 100)) * 100
    
    return {
        "id": user.get("id"),
        "device_id": device_id,
        "username": user.get("username", "Runner"),
        "level": user.get("level", 1),
        "current_xp": user.get("current_xp", 0),
        "xp_for_next_level": user.get("xp_for_next_level", 100),
        "total_xp": user.get("total_xp", 0),
        "progress_percentage": progress_pct,
        "rank": user.get("rank", ALL_RANKS[0]),
        "next_rank": user.get("next_rank", ALL_RANKS[1]),
        "sessions_completed": user.get("sessions_completed", 0),
        "total_distance": user.get("total_distance", 0),
        "total_duration": user.get("total_duration", 0),
        "notification_enabled": user.get("notification_enabled", False),
        "notification_time": user.get("notification_time", {"hour": 9, "minute": 0}),
        "trophies_earned": user.get("trophies_earned", []),
        "daily_quests": user.get("daily_quests", []),
        "username_set": user.get("username_set", False),
    }

@app.post("/api/session/complete")
async def complete_session(data: dict):
    device_id = data.get("device_id")
    duration = data.get("duration", 0)  # seconds
    distance = data.get("distance", 0)  # km
    
    user = users_collection.find_one({"device_id": device_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Calculate XP based on duration and distance
    # 2 XP per minute + 10 XP per km
    xp_earned = int((duration / 60) * 2 + distance * 10)
    
    # Minimum XP bonus for completing any session (rewards effort!)
    min_xp = 5  # At least 5 XP for starting a session
    if duration >= 10:  # At least 10 seconds
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
    
    level_ups = []
    xp_for_next = user.get("xp_for_next_level", 100)
    
    # Check for level ups
    while new_current_xp >= xp_for_next:
        new_current_xp -= xp_for_next
        new_level += 1
        xp_for_next = calculate_xp_for_level(new_level)
        level_ups.append(new_level)
    
    # Get new rank
    new_rank = get_rank_for_level(new_level)
    next_rank = get_next_rank(new_rank["id"])
    old_rank = user.get("rank", ALL_RANKS[0])
    rank_changed = old_rank["id"] != new_rank["id"]
    
    # Update quest progress
    daily_quests = user.get("daily_quests", [])
    for quest in daily_quests:
        if quest["completed"]:
            continue
        if quest["type"] == "distance":
            quest["progress"] = min(quest["progress"] + distance, quest["target"])
        elif quest["type"] == "duration":
            quest["progress"] = min(quest["progress"] + (duration / 60), quest["target"])
        elif quest["type"] == "sessions":
            quest["progress"] = min(quest["progress"] + 1, quest["target"])
        elif quest["type"] == "xp":
            quest["progress"] = min(quest["progress"] + xp_earned, quest["target"])
        
        if quest["progress"] >= quest["target"]:
            quest["completed"] = True
    
    # Update user in database
    update_data = {
        "total_xp": new_total_xp,
        "current_xp": new_current_xp,
        "xp_for_next_level": xp_for_next,
        "level": new_level,
        "rank": new_rank,
        "next_rank": next_rank,
        "sessions_completed": new_sessions,
        "total_distance": new_distance,
        "total_duration": new_duration,
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
            # Update XP with trophy rewards
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
            
            # Check if rank changed due to trophy XP level ups
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
        "xp_earned": xp_earned,
        "date": datetime.now().isoformat(),
    }
    sessions_collection.insert_one(session_data)
    
    # Calculate progress percentage
    progress_pct = (new_current_xp / xp_for_next) * 100
    
    # Total XP gained this session (run + trophies)
    total_xp_earned = xp_earned + trophy_xp
    
    return {
        "xp_earned": total_xp_earned,  # Now includes trophy XP
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

@app.post("/api/quests/claim")
async def claim_quest(data: dict):
    device_id = data.get("device_id")
    quest_id = data.get("quest_id")
    
    user = users_collection.find_one({"device_id": device_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    daily_quests = user.get("daily_quests", [])
    quest = next((q for q in daily_quests if q["id"] == quest_id), None)
    
    if not quest:
        raise HTTPException(status_code=404, detail="Quest not found")
    if not quest["completed"]:
        raise HTTPException(status_code=400, detail="Quest not completed")
    if quest["claimed"]:
        raise HTTPException(status_code=400, detail="Quest already claimed")
    
    # Mark as claimed
    quest["claimed"] = True
    
    # Add XP
    xp_reward = quest["xp_reward"]
    new_current_xp = user.get("current_xp", 0) + xp_reward
    new_total_xp = user.get("total_xp", 0) + xp_reward
    new_level = user.get("level", 1)
    xp_for_next = user.get("xp_for_next_level", 100)
    
    level_ups = []
    while new_current_xp >= xp_for_next:
        new_current_xp -= xp_for_next
        new_level += 1
        xp_for_next = calculate_xp_for_level(new_level)
        level_ups.append(new_level)
    
    new_rank = get_rank_for_level(new_level)
    next_rank = get_next_rank(new_rank["id"])
    
    users_collection.update_one(
        {"device_id": device_id},
        {"$set": {
            "daily_quests": daily_quests,
            "current_xp": new_current_xp,
            "total_xp": new_total_xp,
            "level": new_level,
            "xp_for_next_level": xp_for_next,
            "rank": new_rank,
            "next_rank": next_rank,
        }}
    )
    
    return {
        "xp_earned": xp_reward,
        "new_level": new_level,
        "current_xp": new_current_xp,
        "level_ups": level_ups,
        "rank": new_rank,
    }

@app.get("/api/trophies/{device_id}")
async def get_trophies(device_id: str):
    user = users_collection.find_one({"device_id": device_id})
    if not user:
        return {"unlocked": [], "locked": ALL_TROPHIES}
    
    earned_ids = [t["id"] for t in user.get("trophies_earned", [])]
    unlocked = [t for t in ALL_TROPHIES if t["id"] in earned_ids]
    locked = [t for t in ALL_TROPHIES if t["id"] not in earned_ids]
    
    return {"unlocked": unlocked, "locked": locked}

@app.get("/api/leaderboard")
async def get_leaderboard(device_id: str = None, rank_id: str = None, limit: int = 50):
    query = {}
    if rank_id:
        query["rank.id"] = rank_id
    
    users = list(users_collection.find(query).sort("total_xp", -1).limit(limit))
    
    leaderboard = []
    for i, user in enumerate(users):
        entry = {
            "position": i + 1,
            "username": user.get("username", "Runner"),
            "level": user.get("level", 1),
            "total_xp": user.get("total_xp", 0),
            "rank": user.get("rank", ALL_RANKS[0]),
            "is_current_user": user.get("device_id") == device_id,
        }
        leaderboard.append(entry)
    
    return leaderboard

@app.get("/api/sessions/{device_id}")
async def get_sessions(device_id: str, limit: int = 20):
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
            "calories": s.get("calories", int(duration / 60 * 8)),  # Estimate ~8 cal/min
            "leveled_up": s.get("leveled_up", False),
            "level_after": s.get("level_after"),
        })
    return result

@app.post("/api/username")
async def update_username(data: dict):
    device_id = data.get("device_id")
    username = data.get("username", "Runner")
    
    users_collection.update_one({"device_id": device_id}, {"$set": {"username": username}})
    return {"success": True}

@app.post("/api/notifications")
async def update_notifications(data: dict):
    device_id = data.get("device_id")
    enabled = data.get("enabled", False)
    time = data.get("time", {"hour": 9, "minute": 0})
    
    users_collection.update_one(
        {"device_id": device_id},
        {"$set": {"notification_enabled": enabled, "notification_time": time}}
    )
    return {"success": True}

# Strava endpoints
@app.get("/api/strava/status/{device_id}")
async def strava_status(device_id: str):
    token = strava_collection.find_one({"device_id": device_id})
    return {"connected": token is not None}

@app.get("/api/strava/auth")
async def strava_auth(device_id: str, redirect_uri: str):
    auth_url = f"https://www.strava.com/oauth/authorize?client_id={STRAVA_CLIENT_ID}&response_type=code&redirect_uri={redirect_uri}&scope=activity:read_all&state={device_id}"
    return {"auth_url": auth_url}

@app.get("/api/strava/callback")
async def strava_callback(code: str, state: str):
    device_id = state
    
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
            raise HTTPException(status_code=400, detail="Failed to get token")
        
        token_data = response.json()
        
        strava_collection.update_one(
            {"device_id": device_id},
            {"$set": {
                "device_id": device_id,
                "access_token": token_data["access_token"],
                "refresh_token": token_data["refresh_token"],
                "expires_at": token_data["expires_at"],
            }},
            upsert=True
        )
        
        return {"success": True}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
