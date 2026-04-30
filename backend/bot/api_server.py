"""
Lightweight REST API consumed by the Telegram Mini App.
Mounted alongside the webhook on the same aiohttp app.
"""
import hashlib
import hmac
import json
import time
from urllib.parse import unquote

from aiohttp import web
from sqlmodel import select

from core.config import settings
from core.database import AsyncSessionLocal
from models.user import User
from models.analytics import DailyAnalytics
from services.user_service import UserService
from services.location_service import find_nearby_medical


# ─── Auth helper ──────────────────────────────────────────────────────────────

def verify_init_data(init_data: str) -> dict | None:
    """Verify Telegram WebApp initData and return parsed values or None."""
    if not init_data:
        return None
    try:
        vals = dict(pair.split("=", 1) for pair in init_data.split("&"))
        received_hash = vals.pop("hash", "")
        data_check = "\n".join(f"{k}={unquote(v)}" for k, v in sorted(vals.items()))
        secret = hmac.new(b"WebAppData", settings.bot_token.encode(), hashlib.sha256).digest()
        computed = hmac.new(secret, data_check.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(computed, received_hash):
            return None
        # Check expiry (1 hour)
        auth_date = int(vals.get("auth_date", 0))
        if time.time() - auth_date > 3600:
            return None
        user_json = vals.get("user", "{}")
        return json.loads(unquote(user_json))
    except Exception:
        return None


async def get_user_from_request(request: web.Request) -> User | None:
    # Try tg_id query param first (always allowed for Mini App)
    tg_id = request.rel_url.query.get("tg_id")
    if tg_id:
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(User).where(User.telegram_id == int(tg_id))
            )
            return result.scalar_one_or_none()
    # Try initData header
    init_data = request.headers.get("X-Telegram-Init-Data", "")
    tg_user = verify_init_data(init_data)
    if not tg_user:
        return None
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(User).where(User.telegram_id == tg_user["id"])
        )
        return result.scalar_one_or_none()


# ─── Routes ───────────────────────────────────────────────────────────────────

async def handle_get_profile(request: web.Request) -> web.Response:
    user = await get_user_from_request(request)
    if not user:
        return web.json_response({"error": "Unauthorized"}, status=401)

    return web.json_response({
        "id": user.id,
        "telegram_id": user.telegram_id,
        "full_name": user.full_name,
        "age": user.age,
        "weight_kg": user.weight_kg,
        "height_cm": user.height_cm,
        "gender": user.gender.value,
        "language": user.language.value,
        "daily_water_goal_ml": user.daily_water_goal_ml,
        "daily_calories_goal": user.daily_calories_goal,
        "onboarding_complete": user.onboarding_complete,
    })


async def handle_get_weekly_analytics(request: web.Request) -> web.Response:
    user = await get_user_from_request(request)
    if not user:
        return web.json_response({"error": "Unauthorized"}, status=401)

    async with AsyncSessionLocal() as session:
        svc = UserService(session)
        analytics = await svc.get_analytics_last_7_days(user)

    return web.json_response([
        {
            "date": str(a.log_date),
            "water_ml": a.water_ml,
            "calories_consumed": a.calories_consumed,
            "protein_g": a.protein_g,
            "fat_g": a.fat_g,
            "carbs_g": a.carbs_g,
            "text_analyses_count": a.text_analyses_count,
            "vision_analyses_count": a.vision_analyses_count,
        }
        for a in analytics
    ])


async def handle_get_nearby(request: web.Request) -> web.Response:
    user = await get_user_from_request(request)
    if not user:
        return web.json_response({"error": "Unauthorized"}, status=401)

    try:
        lat = float(request.rel_url.query["lat"])
        lon = float(request.rel_url.query["lon"])
        assert -90 <= lat <= 90 and -180 <= lon <= 180
    except (KeyError, ValueError, AssertionError):
        return web.json_response({"error": "Invalid coordinates"}, status=400)

    places = await find_nearby_medical(lat, lon)
    return web.json_response(places)

async def handle_update_profile(request: web.Request) -> web.Response:
    user = await get_user_from_request(request)
    if not user:
        return web.json_response({"error": "Unauthorized"}, status=401)
    try:
        body = await request.json()
    except Exception:
        return web.json_response({"error": "Invalid JSON"}, status=400)
    try:
        from datetime import datetime
        from models.user import Gender, Language
        if "full_name" in body:
            name = str(body["full_name"]).strip()
            if 2 <= len(name) <= 128:
                user.full_name = name
        if "age" in body:
            age = int(body["age"])
            if 1 <= age <= 120:
                user.age = age
        if "weight_kg" in body:
            w = float(body["weight_kg"])
            if 1.0 <= w <= 500.0:
                user.weight_kg = w
        if "height_cm" in body:
            h = float(body["height_cm"])
            if 50.0 <= h <= 300.0:
                user.height_cm = h
        if "gender" in body and body["gender"] in ("male", "female", "other"):
            user.gender = Gender(body["gender"])
        if "language" in body and body["language"] in ("en", "ru", "uz"):
            user.language = Language(body["language"])
        user.daily_water_goal_ml = user.compute_water_goal()
        user.daily_calories_goal = user.compute_calorie_goal()
        user.updated_at = datetime.utcnow()
        async with AsyncSessionLocal() as session:
            session.add(user)
            await session.commit()
            await session.refresh(user)
        return web.json_response({
            "id": user.id, "telegram_id": user.telegram_id,
            "full_name": user.full_name, "age": user.age,
            "weight_kg": user.weight_kg, "height_cm": user.height_cm,
            "gender": user.gender.value, "language": user.language.value,
            "daily_water_goal_ml": user.daily_water_goal_ml,
            "daily_calories_goal": user.daily_calories_goal,
            "onboarding_complete": user.onboarding_complete,
        })
    except Exception as e:
        return web.json_response({"error": str(e)}, status=500)


async def handle_get_stats(request: web.Request) -> web.Response:
    from sqlalchemy import func
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(func.count(User.id)))
        count = result.scalar()
    return web.json_response({"total_users": count})

async def handle_health(request: web.Request) -> web.Response:
    return web.json_response({"status": "ok"})


# ─── CORS middleware ───────────────────────────────────────────────────────────

@web.middleware
async def cors_middleware(request: web.Request, handler):
    if request.method == "OPTIONS":
        response = web.Response()
    else:
        response = await handler(request)
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, X-Telegram-Init-Data"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    return response


def setup_api_routes(app: web.Application):
    """Register API routes on the aiohttp app."""
    app.middlewares.append(cors_middleware)
    app.router.add_get("/api/health", handle_health)
    app.router.add_get("/api/user/profile", handle_get_profile)
    app.router.add_get("/api/user/analytics/week", handle_get_weekly_analytics)
    app.router.add_get("/api/location/nearby", handle_get_nearby)
    app.router.add_post("/api/user/profile", handle_update_profile)
    app.router.add_get("/api/stats", handle_get_stats)

    # Serve Mini App static files (if built)
    import os
    dist_dir = os.path.join(os.path.dirname(__file__), "../../frontend/dist")
    if os.path.isdir(dist_dir):
        app.router.add_static("/app", dist_dir, name="webapp")
