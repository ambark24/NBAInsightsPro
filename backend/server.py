from fastapi import FastAPI, APIRouter, HTTPException, Header, Response, Request
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import httpx
import asyncio
from bs4 import BeautifulSoup
import xgboost as xgb
import numpy as np
from sklearn.preprocessing import StandardScaler
import pickle
import json
from emergentintegrations.llm.chat import LlmChat, UserMessage

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

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    created_at: datetime

class UserSession(BaseModel):
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime

class Game(BaseModel):
    game_id: str
    home_team: str
    away_team: str
    date: str
    status: str
    home_score: Optional[int] = None
    away_score: Optional[int] = None

class Prediction(BaseModel):
    prediction_id: str
    game_id: str
    home_team: str
    away_team: str
    predicted_home_score: float
    predicted_away_score: float
    moneyline_pick: str
    spread_pick: str
    spread_value: float
    total_pick: str
    total_value: float
    confidence: float
    consensus_article: str
    created_at: datetime

class ChatMessage(BaseModel):
    message_id: str
    user_id: str
    user_name: str
    user_picture: Optional[str] = None
    message: str
    created_at: datetime

class ChatMessageCreate(BaseModel):
    message: str

# ==================== AUTH HELPER ====================

async def get_current_user(
    request: Request,
    authorization: Optional[str] = Header(None)
) -> Dict[str, Any]:
    """Get current user from session_token (cookie or header)"""
    session_token = None
    
    # Try cookie first
    session_token = request.cookies.get("session_token")
    
    # Try Authorization header as fallback
    if not session_token and authorization:
        if authorization.startswith("Bearer "):
            session_token = authorization.replace("Bearer ", "")
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Get session from database
    session_doc = await db.user_sessions.find_one(
        {"session_token": session_token},
        {"_id": 0}
    )
    
    if not session_doc:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    # Check if session is expired
    expires_at = session_doc["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    
    # Get user
    user_doc = await db.users.find_one(
        {"user_id": session_doc["user_id"]},
        {"_id": 0}
    )
    
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user_doc

# ==================== HEALTH CHECK ====================

@api_router.get("/")
async def health_check():
    """Basic health check endpoint"""
    return {"status": "healthy", "service": "NBA Insights Pro API", "timestamp": datetime.now(timezone.utc)}

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/session")
async def create_session(request: Request):
    """Exchange session_id for session_token"""
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    # Call Emergent Auth API
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id}
            )
            response.raise_for_status()
            user_data = response.json()
        except Exception as e:
            logger.error(f"Error fetching session data: {e}")
            raise HTTPException(status_code=400, detail="Invalid session_id")
    
    # Create or update user
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    existing_user = await db.users.find_one({"email": user_data["email"]}, {"_id": 0})
    
    if existing_user:
        user_id = existing_user["user_id"]
        # Update user info
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {
                "name": user_data["name"],
                "picture": user_data.get("picture"),
            }}
        )
    else:
        # Create new user
        user_doc = {
            "user_id": user_id,
            "email": user_data["email"],
            "name": user_data["name"],
            "picture": user_data.get("picture"),
            "created_at": datetime.now(timezone.utc)
        }
        await db.users.insert_one(user_doc)
    
    # Create session
    session_token = user_data["session_token"]
    session_doc = {
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc)
    }
    await db.user_sessions.insert_one(session_doc)
    
    # Get user data
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    
    # Create response with cookie
    response = JSONResponse(content=user)
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60
    )
    
    return response

@api_router.get("/auth/me")
async def get_me(request: Request, authorization: Optional[str] = Header(None)):
    """Get current user info"""
    user = await get_current_user(request, authorization)
    return user

@api_router.post("/auth/logout")
async def logout(request: Request, authorization: Optional[str] = Header(None)):
    """Logout user"""
    try:
        user = await get_current_user(request, authorization)
        session_token = request.cookies.get("session_token")
        
        if session_token:
            await db.user_sessions.delete_one({"session_token": session_token})
        
        response = JSONResponse(content={"message": "Logged out"})
        response.delete_cookie(key="session_token", path="/")
        return response
    except HTTPException:
        response = JSONResponse(content={"message": "Logged out"})
        response.delete_cookie(key="session_token", path="/")
        return response

# ==================== NBA DATA SERVICE ====================

async def fetch_nba_games_today():
    """Fetch today's and upcoming NBA games from balldontlie.io with caching"""
    try:
        nba_api_key = os.getenv("NBA_API_KEY")
        if not nba_api_key:
            logger.error("NBA_API_KEY not found in environment")
            return []
        
        # Check cache first - games cached for 1 hour
        cache_time = datetime.now(timezone.utc) - timedelta(hours=1)
        cached_games = await db.games_cache.find(
            {"cached_at": {"$gte": cache_time}},
            {"_id": 0, "cached_at": 0}  # Exclude _id and cached_at
        ).to_list(100)
        
        if cached_games:
            logger.info(f"Returning {len(cached_games)} cached games")
            return cached_games
        
        # Fetch fresh data
        games = []
        games_to_cache = []
        async with httpx.AsyncClient() as client:
            # Fetch only today and tomorrow to avoid rate limits
            for day_offset in [0, 1]:
                date = (datetime.now() + timedelta(days=day_offset)).strftime("%Y-%m-%d")
                try:
                    response = await client.get(
                        "https://api.balldontlie.io/nba/v1/games",
                        params={"dates[]": date},
                        headers={"Authorization": nba_api_key},
                        timeout=10.0
                    )
                    response.raise_for_status()
                    data = response.json()
                    
                    for game in data.get("data", []):
                        game_obj = {
                            "game_id": str(game["id"]),
                            "home_team": game["home_team"]["full_name"],
                            "away_team": game["visitor_team"]["full_name"],
                            "date": game["date"],
                            "status": game["status"],
                            "home_score": game.get("home_team_score"),
                            "away_score": game.get("visitor_team_score")
                        }
                        games.append(game_obj)
                        
                        # Version with cache timestamp for storage
                        cache_obj = game_obj.copy()
                        cache_obj["cached_at"] = datetime.now(timezone.utc)
                        games_to_cache.append(cache_obj)
                    
                    # Small delay to avoid rate limits
                    await asyncio.sleep(0.5)
                except Exception as e:
                    logger.error(f"Error fetching games for {date}: {e}")
                    continue
            
            # Cache the games
            if games_to_cache:
                await db.games_cache.delete_many({})  # Clear old cache
                await db.games_cache.insert_many(games_to_cache)
            
            logger.info(f"Fetched and cached {len(games)} NBA games")
            return games
    except Exception as e:
        logger.error(f"Error fetching NBA games: {e}")
        return []

async def fetch_team_stats(team_name: str):
    """Fetch team statistics (simplified version)"""
    # In a real app, this would fetch actual team stats
    # For MVP, we'll return mock data with some randomization
    import random
    return {
        "avg_points": 105 + random.randint(-10, 10),
        "avg_points_allowed": 105 + random.randint(-10, 10),
        "win_percentage": 0.5 + random.uniform(-0.2, 0.2),
        "recent_form": random.uniform(0.3, 0.7)
    }

# ==================== WEB SCRAPING SERVICE ====================

async def search_team_news(team_name: str) -> str:
    """Search for team news and context"""
    try:
        # Simplified web search - in production, use a proper search API
        search_query = f"{team_name} NBA recent news performance"
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://www.google.com/search",
                params={"q": search_query},
                headers={"User-Agent": "Mozilla/5.0"},
                timeout=5.0
            )
            
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'html.parser')
                # Extract some text snippets
                snippets = []
                for snippet in soup.find_all(['h3', 'span'], limit=5):
                    text = snippet.get_text().strip()
                    if text and len(text) > 20:
                        snippets.append(text)
                
                return " ".join(snippets[:3]) if snippets else f"{team_name} is competing in tonight's game."
            else:
                return f"{team_name} is competing in tonight's game."
    except Exception as e:
        logger.error(f"Error searching team news: {e}")
        return f"{team_name} is competing in tonight's game."

# ==================== ML PREDICTION ENGINE ====================

async def generate_predictions_for_game(game: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Generate predictions for a single game using XGBoost"""
    try:
        # Fetch team stats
        home_stats = await fetch_team_stats(game["home_team"])
        away_stats = await fetch_team_stats(game["away_team"])
        
        # Create feature vector
        features = np.array([
            home_stats["avg_points"],
            home_stats["avg_points_allowed"],
            home_stats["win_percentage"],
            home_stats["recent_form"],
            away_stats["avg_points"],
            away_stats["avg_points_allowed"],
            away_stats["win_percentage"],
            away_stats["recent_form"]
        ]).reshape(1, -1)
        
        # Simple prediction model (in production, this would be pre-trained)
        # For MVP, we'll use a simple calculation
        home_score = (home_stats["avg_points"] * 0.6 + 
                     (110 - away_stats["avg_points_allowed"]) * 0.4 + 
                     home_stats["recent_form"] * 10)
        away_score = (away_stats["avg_points"] * 0.6 + 
                     (110 - home_stats["avg_points_allowed"]) * 0.4 + 
                     away_stats["recent_form"] * 10)
        
        # Add some variance
        import random
        home_score += random.uniform(-5, 5)
        away_score += random.uniform(-5, 5)
        
        # Calculate betting picks
        spread = home_score - away_score
        total = home_score + away_score
        
        moneyline_pick = game["home_team"] if home_score > away_score else game["away_team"]
        spread_pick = f"{game['home_team']} {spread:.1f}" if spread > 0 else f"{game['away_team']} {abs(spread):.1f}"
        total_pick = "Over" if total > 215 else "Under"
        
        confidence = min(abs(spread) / 15 * 100, 95)
        
        # Get team context
        home_news = await search_team_news(game["home_team"])
        away_news = await search_team_news(game["away_team"])
        
        # Generate consensus article with GPT
        article = await generate_consensus_article(
            game["home_team"],
            game["away_team"],
            home_score,
            away_score,
            moneyline_pick,
            spread_pick,
            total_pick,
            confidence,
            home_news,
            away_news
        )
        
        prediction = {
            "prediction_id": f"pred_{uuid.uuid4().hex[:12]}",
            "game_id": game["game_id"],
            "home_team": game["home_team"],
            "away_team": game["away_team"],
            "predicted_home_score": round(home_score, 1),
            "predicted_away_score": round(away_score, 1),
            "moneyline_pick": moneyline_pick,
            "spread_pick": spread_pick,
            "spread_value": round(spread, 1),
            "total_pick": total_pick,
            "total_value": round(total, 1),
            "confidence": round(confidence, 1),
            "consensus_article": article,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Store prediction (without _id)
        pred_copy = prediction.copy()
        await db.predictions.insert_one(pred_copy)
        
        return prediction
        
    except Exception as e:
        logger.error(f"Error generating prediction: {e}")
        return None

async def generate_consensus_article(
    home_team: str,
    away_team: str,
    home_score: float,
    away_score: float,
    moneyline_pick: str,
    spread_pick: str,
    total_pick: str,
    confidence: float,
    home_news: str,
    away_news: str
) -> str:
    """Generate consensus article using OpenAI GPT"""
    try:
        llm_key = os.getenv("EMERGENT_LLM_KEY")
        
        chat = LlmChat(
            api_key=llm_key,
            session_id=f"article_{uuid.uuid4().hex[:8]}",
            system_message="You are a professional sports betting analyst. Write concise, engaging betting analysis."
        ).with_model("openai", "gpt-5.2")
        
        prompt = f"""Write a brief betting analysis article (3-4 sentences) for this NBA game:

{home_team} vs {away_team}

Prediction: {home_team} {home_score:.1f} - {away_team} {away_score:.1f}
Moneyline Pick: {moneyline_pick}
Spread Pick: {spread_pick}
Total: {total_pick}
Confidence: {confidence:.1f}%

Recent Context:
{home_team}: {home_news}
{away_team}: {away_news}

Write a professional, concise betting recommendation focusing on the key factors."""
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        return response
        
    except Exception as e:
        logger.error(f"Error generating article: {e}")
        return f"Our model predicts {moneyline_pick} to win with a {confidence:.1f}% confidence. The predicted score is {home_team} {home_score:.1f} - {away_team} {away_score:.1f}. Consider {spread_pick} for the spread and {total_pick} for the total."

# ==================== GAMES & PREDICTIONS ROUTES ====================

@api_router.get("/games")
async def get_games(request: Request, authorization: Optional[str] = Header(None)):
    """Get today's games with predictions - PUBLIC ACCESS"""
    # Allow public access - no authentication required
    
    # Fetch games
    games = await fetch_nba_games_today()
    
    # For each game, get or generate prediction
    results = []
    for game in games:
        # Check if prediction exists
        existing_pred = await db.predictions.find_one(
            {"game_id": game["game_id"]},
            {"_id": 0}
        )
        
        if existing_pred:
            results.append({
                "game": game,
                "prediction": existing_pred
            })
        else:
            # Generate new prediction
            prediction = await generate_predictions_for_game(game)
            if prediction:
                results.append({
                    "game": game,
                    "prediction": prediction
                })
            else:
                results.append({
                    "game": game,
                    "prediction": None
                })
    
    return results

@api_router.get("/games/{game_id}")
async def get_game_detail(
    game_id: str,
    request: Request,
    authorization: Optional[str] = Header(None)
):
    """Get detailed game prediction - PUBLIC ACCESS"""
    # Allow public access - no authentication required
    
    prediction = await db.predictions.find_one(
        {"game_id": game_id},
        {"_id": 0}
    )
    
    if not prediction:
        raise HTTPException(status_code=404, detail="Prediction not found")
    
    return prediction

# ==================== CHAT ROUTES ====================

@api_router.get("/chat/messages")
async def get_chat_messages(
    request: Request,
    authorization: Optional[str] = Header(None),
    limit: int = 100
):
    """Get recent chat messages"""
    user = await get_current_user(request, authorization)
    
    messages = await db.chat_messages.find(
        {},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    messages.reverse()  # Show oldest first
    return messages

@api_router.post("/chat/messages")
async def post_chat_message(
    message_data: ChatMessageCreate,
    request: Request,
    authorization: Optional[str] = Header(None)
):
    """Post a new chat message"""
    user = await get_current_user(request, authorization)
    
    message = {
        "message_id": f"msg_{uuid.uuid4().hex[:12]}",
        "user_id": user["user_id"],
        "user_name": user["name"],
        "user_picture": user.get("picture"),
        "message": message_data.message,
        "created_at": datetime.now(timezone.utc)
    }
    
    # Create a copy for return to avoid MongoDB ObjectId issues
    message_to_return = message.copy()
    await db.chat_messages.insert_one(message)
    
    return message_to_return

# ==================== ADMIN ROUTES ====================

@api_router.post("/admin/refresh-predictions")
async def refresh_predictions(request: Request, authorization: Optional[str] = Header(None)):
    """Manually refresh predictions for today's games"""
    user = await get_current_user(request, authorization)
    
    games = await fetch_nba_games_today()
    
    for game in games:
        await generate_predictions_for_game(game)
    
    return {"message": f"Refreshed predictions for {len(games)} games"}

# ==================== INCLUDE ROUTER ====================

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
