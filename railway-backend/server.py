from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List
from datetime import datetime, timedelta
import random
import os
import uuid

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
# DATABASE CONNECTION (LAZY - doesn't block startup)
# =============================================================================

db = None
users_collection = None
sessions_collection = None
strava_collection = None

def get_db():
    global db, users_collection, sessions_collection, strava_collection
    if db is None:
        from pymongo import MongoClient
        MONGO_URL = os.environ.get("MONGO_URL", os.environ.get("MONGODB_URL", "mongodb://localhost:27017"))
        client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000)
        db = client["runleveling"]
        users_collection = db["users"]
        sessions_collection = db["sessions"]
        strava_collection = db["strava_tokens"]
    return db, users_collection, sessions_collection, strava_collection

# =============================================================================
# GAME DATA CONSTANTS
# =============================================================================

ALL_RANKS = [
    {"id": "debutant", "name": "Débutant", "min_level": 1, "color": "#6B7280", "icon": "🏃"},
    {"id": "jogger", "name": "Jogger", "min_level": 11, "color": "#10B981", "icon": "🏃‍♂️"},
    {"id": "coureur", "name": "Coureur", "min_level": 26, "color": "#3B82F6", "icon": "🏅"},
    {"id": "athlete", "name": "Athlète", "min_level": 46, "color": "#8B5CF6", "icon": "💪"},
    {"id": "champion", "name": "Champion", "min_level": 71, "color": "#F59E0B", "icon": "🏆"},
    {"id": "maitre", "name": "Maître", "min_level": 91, "color": "#EF4444", "icon": "👑"},
]

QUEST_TEMPLATES = [
    {"type": "distance", "name": "Coureur du jour", "description": "Cours {target} km aujourd'hui", "targets": [1, 2, 3, 5], "xp_base": 30, "icon": "🏃"},
    {"type": "duration", "name": "Endurance", "description": "Cours pendant {target} minutes", "targets": [10, 15, 20, 30], "xp_base": 25, "icon": "⏱️"},
    {"type": "sessions", "name": "Régulier", "description": "Fais {target} session(s) aujourd'hui", "targets": [1, 2, 3], "xp_base": 40, "icon": "📅"},
    {"type": "xp", "name": "Chasseur d'XP", "description": "Gagne {target} XP aujourd'hui", "targets": [50, 100, 150, 200], "xp_base": 35, "icon": "⭐"},
    {"type": "calories", "name": "Brûleur", "description": "Brûle {target} calories", "targets": [100, 200, 300, 500], "xp_base": 30, "icon": "🔥"},
]

ALL_TROPHIES = [
    {"id": "first_run", "name": "Premier Pas", "description": "Complète ta première course", "condition": "sessions >= 1", "xp_reward": 50, "icon": "🎯", "category": "sessions"},
    {"id": "five_sessions", "name": "En Route", "description": "Complète 5 sessions", "condition": "sessions >= 5", "xp_reward": 100, "icon": "🚀", "category": "sessions"},
    {"id": "ten_sessions", "name": "Persévérant", "description": "Complète 10 sessions", "condition": "sessions >= 10", "xp_reward": 150, "icon": "💪", "category": "sessions"},
    {"id": "first_5k", "name": "5K Club", "description": "Cours un total de 5 km", "condition": "distance >= 5", "xp_reward": 50, "icon": "🏃", "category": "distance"},
    {"id": "first_10k", "name": "10K Runner", "description": "Cours un total de 10 km", "condition": "distance >= 10", "xp_reward": 100, "icon": "🏃‍♂️", "category": "distance"},
    {"id": "marathon", "name": "Marathonien", "description": "Cours un total de 42 km", "condition": "distance >= 42", "xp_reward": 400, "icon": "🥇", "category": "distance"},
    {"id": "hundred_km", "name": "Centurion", "description": "Cours un total de 100 km", "condition": "distance >= 100", "xp_reward": 750, "icon": "💯", "category": "distance"},
    {"id": "level_10", "name": "Apprenti", "description": "Atteins le niveau 10", "condition": "level >= 10", "xp_reward": 100, "icon": "📈", "category": "level"},
    {"id": "level_25", "name": "Confirmé", "description": "Atteins le niveau 25", "condition": "level >= 25", "xp_reward": 250, "icon": "🎖️", "category": "level"},
    {"id": "level_50", "name": "Expert", "description": "Atteins le niveau 50", "condition": "level >= 50", "xp_reward": 500, "icon": "🏆", "category": "level"},
    {"id": "jogger_rank", "name": "Rang Jogger", "description": "Atteins le rang Jogger", "condition": "rank >= jogger", "xp_reward": 150, "icon": "🏃‍♂️", "category": "rank"},
    {"id": "coureur_rank", "name": "Rang Coureur", "description": "Atteins le rang Coureur", "condition": "rank >= coureur", "xp_reward": 300, "icon": "🏅", "category": "rank"},
    {"id": "athlete_rank", "name": "Rang Athlète", "description": "Atteins le rang Athlète", "condition": "rank >= athlete", "xp_reward": 500, "icon": "💪", "category": "rank"},
    {"id": "burn_500", "name": "Brûleur", "description": "Brûle 500 calories au total", "condition": "calories >= 500", "xp_reward": 75, "icon": "🔥", "category": "calories"},
    {"id": "hour_total", "name": "1 Heure", "description": "Cours 1 heure au total", "condition": "duration >= 60", "xp_reward": 100, "icon": "⏱️", "category": "duration"},
]

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def get_rank_for_level(level: int) -> dict:
    current_rank = ALL_RANKS[0]
    for rank in ALL_RANKS:
        if level >= rank["min_level"]:
            current_rank = rank
    return current_rank

def get_next_rank(current_rank_id: str) -> Optional[dict]:
    for i, rank in enumerate(ALL_RANKS):
        if rank["id"] == current_rank_id and i < len(ALL_RANKS) - 1:
            return ALL_RANKS[i + 1]
    return None

def calculate_xp_for_level(level: int) -> int:
    return 100 + (level - 1) * 25

def generate_daily_quests(user_level: int = 1) -> List[dict]:
    today = datetime.now().strftime("%Y-%m-%d")
    quests = []
    used_types = set()
    templates = QUEST_TEMPLATES.copy()
    random.shuffle(templates)
    
    for template in templates:
        if len(quests) >= 3 or template["type"] in used_types:
            continue
        used_types.add(template["type"])
        target = random.choice(template["targets"])
        quests.append({
            "id": f"{template['type']}_{today}_{len(quests)}",
            "name": template["name"],
            "description": template["description"].format(target=target),
            "type": template["type"],
            "target": target,
            "xp_reward": template["xp_base"] + (user_level * 2),
            "progress": 0,
            "completed": False,
            "claimed": False,
            "date": today,
            "icon": template.get("icon", "🎯")
        })
    return quests

def check_trophies(user_data: dict) -> List[dict]:
    earned_ids = [t["id"] for t in user_data.get("trophies_earned", [])]
    new_trophies = []
    for trophy in ALL_TROPHIES:
        if trophy["id"] in earned_ids:
            continue
        condition = trophy["condition"]
        earned = False
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
# HEALTH CHECK ROUTES
# =============================================================================

@app.get("/")
async def root():
    return {"status": "ok", "app": "RunLeveling API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "ok"}

@app.get("/api")
async def api_root():
    return {"message": "RunLeveling API is running"}

# =============================================================================
# USER PROGRESS
# =============================================================================

@app.get("/api/progress/{device_id}")
async def get_progress(device_id: str):
    _, users_col, _, _ = get_db()
    user = users_col.find_one({"device_id": device_id})
    
    if not user:
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
            "rank": ALL_RANKS[0],
            "trophies_earned": [],
            "daily_quests": generate_daily_quests(1),
            "daily_quests_date": today,
        }
        users_col.insert_one(user)
    
    today = datetime.now().strftime("%Y-%m-%d")
    if user.get("daily_quests_date") != today:
        new_quests = generate_daily_quests(user.get("level", 1))
        users_col.update_one({"device_id": device_id}, {"$set": {"daily_quests": new_quests, "daily_quests_date": today}})
        user["daily_quests"] = new_quests
    
    level = user.get("level", 1)
    rank = get_rank_for_level(level)
    
    return {
        "username": user.get("username", "Runner"),
        "username_set": user.get("username_set", False),
        "level": level,
        "current_xp": user.get("current_xp", 0),
        "xp_for_next_level": calculate_xp_for_level(level),
        "total_xp": user.get("total_xp", 0),
        "sessions_completed": user.get("sessions_completed", 0),
        "total_distance": round(user.get("total_distance", 0), 2),
        "total_duration": user.get("total_duration", 0),
        "total_calories": user.get("total_calories", 0),
        "streak": user.get("streak", 0),
        "rank": rank,
        "next_rank": get_next_rank(rank["id"]),
        "trophies_earned": user.get("trophies_earned", []),
        "daily_quests": user.get("daily_quests", []),
    }

# =============================================================================
# SESSION COMPLETE
# =============================================================================

@app.post("/api/session/complete")
async def complete_session(data: dict):
    _, users_col, sessions_col, _ = get_db()
    device_id = data.get("device_id")
    duration = data.get("duration", 0)
    distance = data.get("distance", 0)
    calories = data.get("calories", int(duration / 60 * 8))
    
    user = users_col.find_one({"device_id": device_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    xp_earned = max(5, int((duration / 60) * 2 + distance * 10))
    if duration >= 300: xp_earned += 10
    if duration >= 600: xp_earned += 15
    
    new_total_xp = user.get("total_xp", 0) + xp_earned
    new_current_xp = user.get("current_xp", 0) + xp_earned
    new_level = user.get("level", 1)
    new_sessions = user.get("sessions_completed", 0) + 1
    
    level_ups = []
    xp_for_next = calculate_xp_for_level(new_level)
    while new_current_xp >= xp_for_next:
        new_current_xp -= xp_for_next
        new_level += 1
        level_ups.append(new_level)
        xp_for_next = calculate_xp_for_level(new_level)
    
    new_rank = get_rank_for_level(new_level)
    old_rank = user.get("rank", ALL_RANKS[0])
    rank_changed = old_rank.get("id") != new_rank["id"]
    
    daily_quests = user.get("daily_quests", [])
    for quest in daily_quests:
        if quest.get("completed") or quest.get("claimed"):
            continue
        qt = quest.get("type")
        target = quest.get("target", 0)
        if qt == "distance":
            quest["progress"] = min(quest.get("progress", 0) + distance, target)
        elif qt == "duration":
            quest["progress"] = min(quest.get("progress", 0) + (duration / 60), target)
        elif qt == "sessions":
            quest["progress"] = quest.get("progress", 0) + 1
        elif qt == "xp":
            quest["progress"] = min(quest.get("progress", 0) + xp_earned, target)
        elif qt == "calories":
            quest["progress"] = min(quest.get("progress", 0) + calories, target)
        if quest["progress"] >= target:
            quest["completed"] = True
    
    update_data = {
        "total_xp": new_total_xp,
        "current_xp": new_current_xp,
        "level": new_level,
        "sessions_completed": new_sessions,
        "total_distance": user.get("total_distance", 0) + distance,
        "total_duration": user.get("total_duration", 0) + duration,
        "total_calories": user.get("total_calories", 0) + calories,
        "rank": new_rank,
        "daily_quests": daily_quests,
    }
    
    temp_user = {**user, **update_data}
    new_trophies = check_trophies(temp_user)
    trophy_xp = 0
    if new_trophies:
        update_data["trophies_earned"] = user.get("trophies_earned", []) + new_trophies
        for t in new_trophies:
            trophy_xp += t.get("xp_reward", 0)
        if trophy_xp > 0:
            new_total_xp += trophy_xp
            new_current_xp += trophy_xp
            update_data["total_xp"] = new_total_xp
            update_data["current_xp"] = new_current_xp
    
    users_col.update_one({"device_id": device_id}, {"$set": update_data})
    sessions_col.insert_one({
        "id": str(uuid.uuid4()),
        "device_id": device_id,
        "duration": duration,
        "distance": distance,
        "calories": calories,
        "xp_earned": xp_earned,
        "date": datetime.now().isoformat(),
    })
    
    return {
        "xp_earned": xp_earned + trophy_xp,
        "leveled_up": len(level_ups) > 0,
        "ranked_up": rank_changed,
        "new_rank": new_rank,
        "trophies_earned": new_trophies,
        "progress": {
            "level": new_level,
            "current_xp": new_current_xp,
            "xp_for_next_level": xp_for_next,
            "total_xp": new_total_xp,
            "rank": new_rank,
            "next_rank": get_next_rank(new_rank["id"]),
        }
    }

# =============================================================================
# SESSIONS HISTORY
# =============================================================================

@app.get("/api/sessions/{device_id}")
async def get_sessions(device_id: str, limit: int = 20):
    _, _, sessions_col, _ = get_db()
    sessions = list(sessions_col.find({"device_id": device_id}).sort("date", -1).limit(limit))
    result = []
    for s in sessions:
        duration = s.get("duration", 0)
        distance = s.get("distance", 0)
        pace = f"{int((duration/distance)//60)}:{int((duration/distance)%60):02d}" if distance > 0 else "--:--"
        result.append({
            "id": s.get("id", str(s.get("_id", ""))),
            "completed_at": s.get("date"),
            "duration_minutes": int(duration // 60),
            "duration_seconds": int(duration % 60),
            "distance_km": round(distance, 2),
            "xp_earned": s.get("xp_earned", 0),
            "avg_pace": pace,
            "calories": s.get("calories", 0),
        })
    return result

# =============================================================================
# QUESTS
# =============================================================================

@app.post("/api/quests/claim")
async def claim_quest(data: dict):
    _, users_col, _, _ = get_db()
    device_id = data.get("device_id")
    quest_id = data.get("quest_id")
    
    user = users_col.find_one({"device_id": device_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    daily_quests = user.get("daily_quests", [])
    quest = next((q for q in daily_quests if q["id"] == quest_id), None)
    
    if not quest or not quest.get("completed") or quest.get("claimed"):
        raise HTTPException(status_code=400, detail="Cannot claim quest")
    
    xp_reward = quest.get("xp_reward", 0)
    new_current_xp = user.get("current_xp", 0) + xp_reward
    new_total_xp = user.get("total_xp", 0) + xp_reward
    new_level = user.get("level", 1)
    
    xp_for_next = calculate_xp_for_level(new_level)
    while new_current_xp >= xp_for_next:
        new_current_xp -= xp_for_next
        new_level += 1
        xp_for_next = calculate_xp_for_level(new_level)
    
    for q in daily_quests:
        if q["id"] == quest_id:
            q["claimed"] = True
    
    users_col.update_one({"device_id": device_id}, {"$set": {
        "current_xp": new_current_xp,
        "total_xp": new_total_xp,
        "level": new_level,
        "rank": get_rank_for_level(new_level),
        "daily_quests": daily_quests,
    }})
    
    return {"success": True, "xp_earned": xp_reward, "new_level": new_level}

# =============================================================================
# TROPHIES
# =============================================================================

@app.get("/api/trophies/{device_id}")
async def get_trophies(device_id: str):
    _, users_col, _, _ = get_db()
    user = users_col.find_one({"device_id": device_id})
    earned_ids = [t["id"] for t in user.get("trophies_earned", [])] if user else []
    return {
        "unlocked": [t for t in ALL_TROPHIES if t["id"] in earned_ids],
        "locked": [t for t in ALL_TROPHIES if t["id"] not in earned_ids]
    }

# =============================================================================
# LEADERBOARD
# =============================================================================

@app.get("/api/leaderboard")
async def get_leaderboard(device_id: str = None, limit: int = 50, rank_id: str = None):
    _, users_col, _, _ = get_db()
    query = {"rank.id": rank_id} if rank_id else {}
    users = list(users_col.find(query).sort("total_xp", -1).limit(limit))
    return [{
        "position": i + 1,
        "username": u.get("username", "Runner"),
        "level": u.get("level", 1),
        "total_xp": u.get("total_xp", 0),
        "rank": u.get("rank", ALL_RANKS[0]),
        "is_current_user": u.get("device_id") == device_id,
    } for i, u in enumerate(users)]

# =============================================================================
# USERNAME
# =============================================================================

@app.put("/api/username")
async def update_username(data: dict):
    _, users_col, _, _ = get_db()
    device_id = data.get("device_id")
    username = data.get("username", "Runner")
    user = users_col.find_one({"device_id": device_id})
    if user and user.get("username_set"):
        return {"success": False, "error": "Username already set"}
    users_col.update_one({"device_id": device_id}, {"$set": {"username": username, "username_set": True}})
    return {"success": True}

# =============================================================================
# STRAVA
# =============================================================================

@app.get("/api/strava/status/{device_id}")
async def get_strava_status(device_id: str):
    _, _, _, strava_col = get_db()
    token = strava_col.find_one({"device_id": device_id})
    return {"connected": token is not None}

# =============================================================================
# MAIN
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("server:app", host="0.0.0.0", port=port)
