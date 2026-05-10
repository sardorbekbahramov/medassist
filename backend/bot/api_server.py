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
            "sleep_hours": a.sleep_hours,       # ← QO'SHILDI
            "walking_steps": a.walking_steps,   # ← QO'SHILDI
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
        from models.analytics import ProfileAuditLog

        audit_logs = []

        # 1. Full Name o'zgarishini tekshirish
        if "full_name" in body:
            name = str(body["full_name"]).strip()
            if 2 <= len(name) <= 128:
                if name != user.full_name:
                    audit_logs.append(ProfileAuditLog(
                        user_id=user.id, field_name="full_name",
                        old_value=str(user.full_name), new_value=name
                    ))
                user.full_name = name

        # 2. Age o'zgarishini tekshirish
        if "age" in body:
            age = int(body["age"])
            if 1 <= age <= 120:
                if age != user.age:
                    audit_logs.append(ProfileAuditLog(
                        user_id=user.id, field_name="age",
                        old_value=str(user.age), new_value=str(age)
                    ))
                user.age = age

        # 3. Weight o'zgarishini tekshirish
        if "weight_kg" in body:
            w = float(body["weight_kg"])
            if 1.0 <= w <= 500.0:
                if w != user.weight_kg:
                    audit_logs.append(ProfileAuditLog(
                        user_id=user.id, field_name="weight_kg",
                        old_value=str(user.weight_kg), new_value=str(w)
                    ))
                user.weight_kg = w

        # 4. Height o'zgarishini tekshirish
        if "height_cm" in body:
            h = float(body["height_cm"])
            if 50.0 <= h <= 300.0:
                if h != user.height_cm:
                    audit_logs.append(ProfileAuditLog(
                        user_id=user.id, field_name="height_cm",
                        old_value=str(user.height_cm), new_value=str(h)
                    ))
                user.height_cm = h

        # 5. Gender o'zgarishini tekshirish
        if "gender" in body and body["gender"] in ("male", "female", "other"):
            current_gender = user.gender.value if user.gender else None
            if body["gender"] != current_gender:
                audit_logs.append(ProfileAuditLog(
                    user_id=user.id, field_name="gender",
                    old_value=str(current_gender), new_value=body["gender"]
                ))
            user.gender = Gender(body["gender"])

        # 6. Language o'zgarishini tekshirish
        if "language" in body and body["language"] in ("en", "ru", "uz"):
            current_lang = user.language.value if user.language else None
            if body["language"] != current_lang:
                audit_logs.append(ProfileAuditLog(
                    user_id=user.id, field_name="language",
                    old_value=str(current_lang), new_value=body["language"]
                ))
            user.language = Language(body["language"])

        # Maqsadli ko'rsatkichlarni qayta hisoblash
        user.daily_water_goal_ml = user.compute_water_goal()
        user.daily_calories_goal = user.compute_calorie_goal()
        user.updated_at = datetime.utcnow()

        async with AsyncSessionLocal() as session:
            session.add(user)
            # Audit loglarni bazaga qo'shish (commit'dan oldin)
            for log in audit_logs:
                session.add(log)
            
            await session.commit()
            await session.refresh(user)

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
    except Exception as e:
        return web.json_response({"error": str(e)}, status=500)

async def handle_log_goal(request: web.Request) -> web.Response:
    """Uyqu yoki yurish ma'lumotini saqlash."""
    user = await get_user_from_request(request)
    if not user:
        return web.json_response({"error": "Unauthorized"}, status=401)
    try:
        body = await request.json()
        goal_type = body.get("type")  # "sleep" yoki "walking"
        value = float(body.get("value", 0))
        log_date = body.get("date")   # "YYYY-MM-DD"

        if goal_type not in ("sleep", "walking") or value <= 0 or not log_date:
            return web.json_response({"error": "Invalid data"}, status=400)

        from datetime import date as date_type
        parsed_date = date_type.fromisoformat(log_date)

        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(DailyAnalytics).where(
                    DailyAnalytics.user_id == user.id,
                    DailyAnalytics.log_date == parsed_date,
                )
            )
            analytics = result.scalar_one_or_none()
            if not analytics:
                analytics = DailyAnalytics(user_id=user.id, log_date=parsed_date)
                session.add(analytics)

            if goal_type == "sleep":
                analytics.sleep_hours = value
            else:
                analytics.walking_steps = int(value)

            await session.commit()
            await session.refresh(analytics)

        return web.json_response({
            "date": str(analytics.log_date),
            "sleep_hours": analytics.sleep_hours,
            "walking_steps": analytics.walking_steps,
        })
    except Exception as e:
        return web.json_response({"error": str(e)}, status=500)


async def handle_get_goals(request: web.Request) -> web.Response:
    """Oxirgi 7 kunlik goals statistikasi."""
    user = await get_user_from_request(request)
    if not user:
        return web.json_response({"error": "Unauthorized"}, status=401)

    async with AsyncSessionLocal() as session:
        from datetime import date as date_type, timedelta
        cutoff = date_type.today() - timedelta(days=6)
        result = await session.execute(
            select(DailyAnalytics).where(
                DailyAnalytics.user_id == user.id,
                DailyAnalytics.log_date >= cutoff,
            ).order_by(DailyAnalytics.log_date)
        )
        rows = result.scalars().all()

    return web.json_response([{
        "date": str(r.log_date),
        "sleep_hours": r.sleep_hours,
        "walking_steps": r.walking_steps,
    } for r in rows])

async def handle_get_stats(request: web.Request) -> web.Response:
    from sqlalchemy import func
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(func.count(User.id)))
        count = result.scalar()
    return web.json_response({"total_users": count})

ADMIN_TOKEN = settings.secret_key


def check_admin(request: web.Request) -> bool:
    token = request.headers.get("X-Admin-Token", "")
    return token == ADMIN_TOKEN


async def handle_admin_users(request: web.Request) -> web.Response:
    if not check_admin(request):
        return web.json_response({"error": "Forbidden"}, status=403)
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(User).order_by(User.created_at.desc())
        )
        users = result.scalars().all()
    return web.json_response([{
        "id": u.id, "telegram_id": u.telegram_id,
        "username": u.username, "full_name": u.full_name,
        "age": u.age, "weight_kg": u.weight_kg, "height_cm": u.height_cm,
        "gender": u.gender.value if u.gender else None,
        "language": u.language.value if u.language else None,
        "is_active": u.is_active, "is_admin": u.is_admin,
        "onboarding_complete": u.onboarding_complete,
        "created_at": str(u.created_at),
        "updated_at": str(u.updated_at),
    } for u in users])


async def handle_admin_user_detail(request: web.Request) -> web.Response:
    if not check_admin(request):
        return web.json_response({"error": "Forbidden"}, status=403)
    user_id = int(request.match_info["user_id"])
    async with AsyncSessionLocal() as session:
        user_result = await session.execute(select(User).where(User.id == user_id))
        user = user_result.scalar_one_or_none()
        if not user:
            return web.json_response({"error": "Not found"}, status=404)
        from models.analytics import ProfileAuditLog, DailyAnalytics
        logs_result = await session.execute(
            select(ProfileAuditLog)
            .where(ProfileAuditLog.user_id == user_id)
            .order_by(ProfileAuditLog.changed_at.desc())
        )
        logs = logs_result.scalars().all()
        analytics_result = await session.execute(
            select(DailyAnalytics)
            .where(DailyAnalytics.user_id == user_id)
            .order_by(DailyAnalytics.log_date.desc())
            .limit(30)
        )
        analytics = analytics_result.scalars().all()
    return web.json_response({
        "user": {
            "id": user.id, "telegram_id": user.telegram_id,
            "username": user.username, "full_name": user.full_name,
            "age": user.age, "weight_kg": user.weight_kg,
            "height_cm": user.height_cm,
            "gender": user.gender.value if user.gender else None,
            "language": user.language.value if user.language else None,
            "is_active": user.is_active, "is_admin": user.is_admin,
            "onboarding_complete": user.onboarding_complete,
            "phone_number": user.phone_number,
            "created_at": str(user.created_at),
        },
        "audit_logs": [{
            "field": l.field_name, "old": l.old_value,
            "new": l.new_value, "at": str(l.changed_at)
        } for l in logs],
        "analytics": [{
            "date": str(a.log_date),
            "water_ml": a.water_ml,
            "calories": a.calories_consumed,
            "ai_count": a.text_analyses_count + a.vision_analyses_count,
            "sleep_hours": a.sleep_hours,       # ← QO'SHILDI
            "walking_steps": a.walking_steps,   # ← QO'SHILDI
        } for a in analytics],
    })


async def handle_admin_block(request: web.Request) -> web.Response:
    if not check_admin(request):
        return web.json_response({"error": "Forbidden"}, status=403)
    user_id = int(request.match_info["user_id"])
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            return web.json_response({"error": "Not found"}, status=404)
        user.is_active = not user.is_active
        session.add(user)
        await session.commit()
    return web.json_response({"is_active": user.is_active})


async def handle_admin_delete(request: web.Request) -> web.Response:
    if not check_admin(request):
        return web.json_response({"error": "Forbidden"}, status=403)
    user_id = int(request.match_info["user_id"])
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            return web.json_response({"error": "Not found"}, status=404)
        await session.delete(user)
        await session.commit()
    return web.json_response({"deleted": True})


async def handle_admin_broadcast(request: web.Request) -> web.Response:
    if not check_admin(request):
        return web.json_response({"error": "Forbidden"}, status=403)
    body = await request.json()
    text = body.get("text", "").strip()
    if not text:
        return web.json_response({"error": "Empty message"}, status=400)
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(User).where(User.is_active == True, User.onboarding_complete == True)
        )
        users = result.scalars().all()
    from aiogram import Bot
    from core.config import settings as cfg
    bot = Bot(token=cfg.bot_token)
    sent, failed = 0, 0
    for user in users:
        try:
            await bot.send_message(user.telegram_id, text, parse_mode="HTML")
            sent += 1
        except Exception:
            failed += 1
    await bot.session.close()
    return web.json_response({"sent": sent, "failed": failed})


async def handle_admin_stats(request: web.Request) -> web.Response:
    if not check_admin(request):
        return web.json_response({"error": "Forbidden"}, status=403)
    from sqlalchemy import func
    from models.analytics import DailyAnalytics
    async with AsyncSessionLocal() as session:
        total = (await session.execute(select(func.count(User.id)))).scalar()
        active = (await session.execute(
            select(func.count(User.id)).where(User.is_active == True)
        )).scalar()
        onboarded = (await session.execute(
            select(func.count(User.id)).where(User.onboarding_complete == True)
        )).scalar()
        total_analyses = (await session.execute(
            select(func.sum(DailyAnalytics.text_analyses_count + DailyAnalytics.vision_analyses_count))
        )).scalar() or 0
    return web.json_response({
        "total_users": total,
        "active_users": active,
        "onboarded_users": onboarded,
        "total_ai_analyses": total_analyses,
    })

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
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, X-Telegram-Init-Data, X-Admin-Token"
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
    app.router.add_get("/admin/users", handle_admin_users)
    app.router.add_get("/admin/users/{user_id}", handle_admin_user_detail)
    app.router.add_post("/admin/users/{user_id}/block", handle_admin_block)
    app.router.add_delete("/admin/users/{user_id}", handle_admin_delete)
    app.router.add_post("/admin/broadcast", handle_admin_broadcast)
    app.router.add_get("/admin/stats", handle_admin_stats)
    app.router.add_post("/api/user/goals/log", handle_log_goal)
    app.router.add_get("/api/user/goals/week", handle_get_goals)

    # Serve Mini App static files (if built)
    import os
    dist_dir = os.path.join(os.path.dirname(__file__), "../../frontend/dist")
    if os.path.isdir(dist_dir):
        app.router.add_static("/app", dist_dir, name="webapp")