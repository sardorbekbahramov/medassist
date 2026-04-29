from aiogram import Router, F
from aiogram.types import Message
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup

from services.user_service import UserService
from services import ai_engine
from services.i18n_service import t as translate

router = Router()


class DailyLogFSM(StatesGroup):
    waiting_for_log = State()


# ── Help ──────────────────────────────────────────────────────────────────────

@router.message(F.text.in_(["❓ Help", "❓ Помощь", "❓ Yordam"]))
@router.message(Command("help"))
async def cmd_help(message: Message, t):
    help_text = (
        "📋 <b>Available Commands:</b>\n\n"
        "/start — Restart bot / onboarding\n"
        "/dashboard — Today's health summary\n"
        "/nearby — Find nearby pharmacies & hospitals\n"
        "/profile — View your profile\n"
        "/analyze — AI health analysis mode\n"
        "/help — Show this message\n\n"
        "📌 <b>Menu buttons:</b>\n"
        "🔬 Analyze — Send text or photo for AI analysis\n"
        "📊 Dashboard — Health stats summary\n"
        "🗺 Nearby — Find medical facilities near you\n"
        "👤 Profile — View your health profile\n"
        "📝 Daily Log — Log today's food & drinks\n"
        "❓ Help — Show this help message"
    )
    await message.answer(help_text, parse_mode="HTML")


# ── Profile ───────────────────────────────────────────────────────────────────

@router.message(F.text.in_(["👤 Profile", "👤 Профиль", "👤 Profil"]))
@router.message(Command("profile"))
async def cmd_profile(message: Message, db_user, t, lang):
    if not db_user.onboarding_complete:
        await message.answer(t("welcome"), parse_mode="HTML")
        return

    gender_labels = {"male": "♂ Male", "female": "♀ Female", "other": "⚥ Other"}
    lang_labels = {"en": "🇬🇧 English", "ru": "🇷🇺 Русский", "uz": "🇺🇿 O'zbek"}

    bmi = db_user.weight_kg / ((db_user.height_cm / 100) ** 2)
    bmi_label = (
        "Underweight" if bmi < 18.5
        else "Normal ✅" if bmi < 25
        else "Overweight ⚠️" if bmi < 30
        else "Obese ❗"
    )

    text = (
        f"👤 <b>Your Profile</b>\n\n"
        f"🪪 Name: <b>{db_user.full_name}</b>\n"
        f"🎂 Age: <b>{db_user.age}</b> years\n"
        f"⚖️ Weight: <b>{db_user.weight_kg}</b> kg\n"
        f"📏 Height: <b>{db_user.height_cm}</b> cm\n"
        f"📊 BMI: <b>{bmi:.1f}</b> — {bmi_label}\n"
        f"🚻 Gender: <b>{gender_labels.get(db_user.gender.value, db_user.gender.value)}</b>\n"
        f"🌐 Language: <b>{lang_labels.get(db_user.language.value, db_user.language.value)}</b>\n\n"
        f"💧 Daily water goal: <b>{db_user.daily_water_goal_ml} ml</b>\n"
        f"🔥 Daily calorie goal: <b>{db_user.daily_calories_goal} kcal</b>\n\n"
        f"<i>To update profile, use /start</i>"
    )
    await message.answer(text, parse_mode="HTML")


# ── Daily Log ─────────────────────────────────────────────────────────────────

@router.message(F.text.in_(["📝 Daily Log", "📝 Дневник", "📝 Kunlik jurnal"]))
async def cmd_daily_log(message: Message, state: FSMContext, t):
    await state.set_state(DailyLogFSM.waiting_for_log)
    await message.answer(
        "📝 <b>Daily Food Log</b>\n\n"
        "Tell me what you ate and drank today.\n\n"
        "<i>Example: Breakfast - 2 eggs, toast, tea. Lunch - rice with chicken 200g, salad. "
        "Dinner - soup. Drank 1.5L water.</i>",
        parse_mode="HTML"
    )


@router.message(DailyLogFSM.waiting_for_log)
async def handle_daily_log(
    message: Message,
    state: FSMContext,
    db_user,
    user_service: UserService,
    t,
    lang,
    db_session,
):
    await state.clear()
    processing_msg = await message.answer("⏳ Analyzing your nutrition...")

    prompt = (
        f"User profile: Age {db_user.age}, Weight {db_user.weight_kg}kg, "
        f"Height {db_user.height_cm}cm, Gender {db_user.gender.value}.\n"
        f"Daily calorie goal: {db_user.daily_calories_goal} kcal.\n"
        f"Daily water goal: {db_user.daily_water_goal_ml} ml.\n\n"
        f"User's food log for today:\n{message.text}\n\n"
        "Please analyze this food log and:\n"
        "1. Estimate total calories consumed\n"
        "2. Estimate protein (g), fat (g), carbs (g)\n"
        "3. Estimate water intake (ml)\n"
        "4. Give a brief health tip\n\n"
        "IMPORTANT: Respond with JSON first, then your health tip:\n"
        '{"calories": 0, "protein": 0, "fat": 0, "carbs": 0, "water_ml": 0}\n'
        "Then your analysis in the user's language."
    )

    try:
        result = await ai_engine.analyze_text(prompt, lang=lang)

        # Extract JSON from response
        import json, re
        json_match = re.search(r'\{[^}]+\}', result)
        if json_match:
            try:
                nutrition = json.loads(json_match.group())
                analytics = await user_service.get_or_create_today_analytics(db_user)

                # Update analytics
                analytics.calories_consumed += int(nutrition.get("calories", 0))
                analytics.protein_g += float(nutrition.get("protein", 0))
                analytics.fat_g += float(nutrition.get("fat", 0))
                analytics.carbs_g += float(nutrition.get("carbs", 0))
                analytics.water_ml += int(nutrition.get("water_ml", 0))
                analytics.text_analyses_count += 1

                from datetime import datetime
                analytics.updated_at = datetime.utcnow()
                db_session.add(analytics)
                await db_session.commit()

                # Remove JSON from response text
                clean_result = result.replace(json_match.group(), "").strip()
            except:
                clean_result = result
        else:
            clean_result = result

        disclaimer = "⚠️ <b>Medical Disclaimer:</b> AI-generated info for educational purposes only.\n\n"
        await processing_msg.edit_text(
            disclaimer + clean_result,
            parse_mode="HTML"
        )

    except Exception as e:
        await processing_msg.edit_text("❌ Analysis failed. Please try again.")
