import io
from aiogram import Router, F
from aiogram.types import Message
from aiogram.filters import Command

from services import ai_engine
from services.user_service import UserService

router = Router()

MAX_DAILY_AI = 20  # per user per day


async def _check_rate_limit(user, user_service: UserService) -> bool:
    count = await user_service.get_daily_ai_count(user)
    return count < MAX_DAILY_AI


@router.message(Command("analyze"))
@router.message(F.text.in_(["🔬 Analyze", "🔬 Анализ", "🔬 Tahlil"]))
async def cmd_analyze(message: Message, t):
    await message.answer(t("analysis_prompt"), parse_mode="HTML")


@router.message(F.text & ~F.text.startswith("/"))
async def handle_text_analysis(message: Message, db_user, user_service: UserService, t, lang):
    """Handle free-text health log messages from onboarded users."""
    if not db_user.onboarding_complete:
        return  # Onboarding FSM handles this

    # Skip main menu button texts
    menu_texts = {
        "🔬 Analyze", "🔬 Анализ", "🔬 Tahlil",
        "📊 Dashboard", "📊 Статистика", "📊 Statistika",
        "🗺 Nearby", "🗺 Рядом", "🗺 Yaqin atrofda",
        "👤 Profile", "👤 Профиль", "👤 Profil",
        "❓ Help", "❓ Помощь", "❓ Yordam",
    }
    if message.text in menu_texts:
        return

    # Check FAQ responses
    faq_items = await user_service.get_active_faq_items()
    for item in faq_items:
        labels = [item.label_en, item.label_ru, item.label_uz]
        if message.text in labels:
            answer = getattr(item, f"answer_{lang}", item.answer_en)
            await message.answer(answer, parse_mode="HTML")
            return

    if not await _check_rate_limit(db_user, user_service):
        await message.answer(t("rate_limit"))
        return

    processing_msg = await message.answer(t("analysis_processing"))

    try:
        disclaimer = t("medical_disclaimer")
        result = await ai_engine.analyze_text(message.text, lang=lang)
        await user_service.increment_text_analysis(db_user)
        await processing_msg.edit_text(
            disclaimer + result,
            parse_mode="HTML",
        )
    except RuntimeError:
        await processing_msg.edit_text(t("analysis_error"))


@router.message(F.photo)
async def handle_photo_analysis(message: Message, db_user, user_service: UserService, t, lang):
    """Handle photo messages for vision analysis."""
    if not db_user.onboarding_complete:
        return

    if not await _check_rate_limit(db_user, user_service):
        await message.answer(t("rate_limit"))
        return

    processing_msg = await message.answer(t("vision_processing"))

    try:
        # Get highest resolution photo
        photo = message.photo[-1]
        file = await message.bot.get_file(photo.file_id)
        buf = io.BytesIO()
        await message.bot.download_file(file.file_path, destination=buf)
        image_bytes = buf.getvalue()

        disclaimer = t("medical_disclaimer")
        result = await ai_engine.analyze_vision(image_bytes, mime_type="image/jpeg", lang=lang)
        await user_service.increment_vision_analysis(db_user)
        await processing_msg.edit_text(
            disclaimer + result,
            parse_mode="HTML",
        )
    except Exception:
        await processing_msg.edit_text(t("analysis_error"))
