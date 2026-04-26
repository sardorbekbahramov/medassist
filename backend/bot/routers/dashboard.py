from aiogram import Router, F
from aiogram.types import Message
from aiogram.filters import Command

from services.user_service import UserService
from core.config import settings

router = Router()


@router.message(Command("dashboard"))
@router.message(F.text.in_(["📊 Dashboard", "📊 Статистика", "📊 Statistika"]))
async def cmd_dashboard(message: Message, db_user, user_service: UserService, t, lang):
    if not db_user.onboarding_complete:
        return

    analytics = await user_service.get_analytics_last_7_days(db_user)

    if not analytics:
        await message.answer("📊 No data yet. Start logging your health data!")
        return

    # Build a simple text summary
    latest = analytics[-1]
    water_pct = int((latest.water_ml / db_user.daily_water_goal_ml) * 100) if db_user.daily_water_goal_ml else 0
    cal_pct = int((latest.calories_consumed / db_user.daily_calories_goal) * 100) if db_user.daily_calories_goal else 0

    water_bar = _progress_bar(water_pct)
    cal_bar = _progress_bar(cal_pct)

    text = (
        f"📊 <b>Today's Health Summary</b>\n\n"
        f"💧 <b>Water</b>: {latest.water_ml}/{db_user.daily_water_goal_ml} ml\n"
        f"{water_bar} {water_pct}%\n\n"
        f"🔥 <b>Calories</b>: {latest.calories_consumed}/{db_user.daily_calories_goal} kcal\n"
        f"{cal_bar} {cal_pct}%\n\n"
        f"🥩 Protein: {latest.protein_g:.1f}g | 🧈 Fat: {latest.fat_g:.1f}g | 🍞 Carbs: {latest.carbs_g:.1f}g\n\n"
        f"🔬 AI analyses today: {latest.text_analyses_count + latest.vision_analyses_count}"
    )

    # If WebApp URL is configured, add button
    if settings.webapp_url:
        from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton
        from aiogram.utils.keyboard import InlineKeyboardBuilder
        from bot.keyboards.inline import build_webapp_keyboard
        await message.answer(
            text,
            parse_mode="HTML",
            reply_markup=build_webapp_keyboard(settings.webapp_url, lang),
        )
    else:
        await message.answer(text, parse_mode="HTML")


def _progress_bar(pct: int, length: int = 10) -> str:
    filled = min(int((pct / 100) * length), length)
    return "█" * filled + "░" * (length - filled)
