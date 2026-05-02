from aiogram import Router, F
from aiogram.types import Message, CallbackQuery
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.filters import CommandStart, Command
from sqlmodel import select, func

from models.user import Gender, Language, User
from services.user_service import UserService
from bot.keyboards.inline import build_language_keyboard, build_gender_keyboard
from bot.keyboards.reply import build_main_keyboard
from core.database import AsyncSessionLocal

router = Router()


class OnboardingFSM(StatesGroup):
    wait_name = State()
    wait_age = State()
    wait_weight = State()
    wait_height = State()
    wait_gender = State()
    wait_language = State()


async def get_total_users() -> int:
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(func.count(User.id)))
        return result.scalar() or 0


@router.message(CommandStart())
async def cmd_start(message: Message, state: FSMContext, db_user, user_service: UserService, t, lang):
    if db_user.onboarding_complete:
        total = await get_total_users()
        faq_items = await user_service.get_active_faq_items()
        await message.answer(
            f"👋 Welcome back, <b>{db_user.full_name}</b>!\n\n"
            f"👥 Total users: <b>{total}</b>",
            parse_mode="HTML",
            reply_markup=build_main_keyboard(lang, faq_items),
        )
        return

    await state.set_state(OnboardingFSM.wait_name)
    await message.answer(t("welcome"), parse_mode="HTML")
    await message.answer(t("onboarding_name"), parse_mode="HTML")


@router.message(OnboardingFSM.wait_name)
async def onboarding_name(message: Message, state: FSMContext, t):
    name = message.text.strip()
    if len(name) < 2 or len(name) > 128:
        await message.answer("❌ Name must be 2–128 characters.")
        return
    await state.update_data(full_name=name)
    await state.set_state(OnboardingFSM.wait_age)
    await message.answer(t("onboarding_age", name=name), parse_mode="HTML")


@router.message(OnboardingFSM.wait_age)
async def onboarding_age(message: Message, state: FSMContext, t):
    try:
        age = int(message.text.strip())
        assert 1 <= age <= 120
    except (ValueError, AssertionError):
        await message.answer(t("invalid_age"))
        return
    await state.update_data(age=age)
    await state.set_state(OnboardingFSM.wait_weight)
    await message.answer(t("onboarding_weight"), parse_mode="HTML")


@router.message(OnboardingFSM.wait_weight)
async def onboarding_weight(message: Message, state: FSMContext, t):
    try:
        weight = float(message.text.strip().replace(",", "."))
        assert 1.0 <= weight <= 500.0
    except (ValueError, AssertionError):
        await message.answer(t("invalid_weight"))
        return
    await state.update_data(weight_kg=weight)
    await state.set_state(OnboardingFSM.wait_height)
    await message.answer(t("onboarding_height"), parse_mode="HTML")


@router.message(OnboardingFSM.wait_height)
async def onboarding_height(message: Message, state: FSMContext, t):
    try:
        height = float(message.text.strip().replace(",", "."))
        assert 50.0 <= height <= 300.0
    except (ValueError, AssertionError):
        await message.answer(t("invalid_height"))
        return
    await state.update_data(height_cm=height)
    await state.set_state(OnboardingFSM.wait_gender)
    await message.answer(
        t("onboarding_gender"),
        parse_mode="HTML",
        reply_markup=build_gender_keyboard()
    )


@router.callback_query(F.data.startswith("gender:"), OnboardingFSM.wait_gender)
async def onboarding_gender(callback: CallbackQuery, state: FSMContext, t):
    gender_str = callback.data.split(":")[1]
    await state.update_data(gender=gender_str)
    await state.set_state(OnboardingFSM.wait_language)
    await callback.message.edit_text(
        t("onboarding_language"),
        parse_mode="HTML",
        reply_markup=build_language_keyboard()
    )
    await callback.answer()


@router.callback_query(F.data.startswith("lang:"), OnboardingFSM.wait_language)
async def onboarding_language(
    callback: CallbackQuery,
    state: FSMContext,
    db_user,
    user_service: UserService,
    t,
    lang,
    db_session,
):
    lang_str = callback.data.split(":")[1]
    data = await state.get_data()

    updated_user = await user_service.update_profile(
        user=db_user,
        full_name=data["full_name"],
        age=data["age"],
        weight_kg=data["weight_kg"],
        height_cm=data["height_cm"],
        gender=Gender(data["gender"]),
        language=Language(lang_str),
    )
    await db_session.commit()
    await state.clear()

    from services.i18n_service import t as translate
    new_t = lambda key, **kwargs: translate(key, lang=lang_str, **kwargs)

    total = await get_total_users()
    faq_items = await user_service.get_active_faq_items()

    await callback.message.edit_text(
        new_t(
            "onboarding_complete",
            water_ml=updated_user.daily_water_goal_ml,
            calories=updated_user.daily_calories_goal,
        ) + f"\n\n👥 Total users: <b>{total}</b>",
        parse_mode="HTML",
    )
    await callback.message.answer(
        "✅",
        reply_markup=build_main_keyboard(lang_str, faq_items),
    )
    await callback.answer()


@router.message(Command("profile"))
async def cmd_profile(message: Message, db_user, t):
    if not db_user.onboarding_complete:
        await message.answer(t("welcome"), parse_mode="HTML")
        return

    await message.answer(
        t(
            "profile_info",
            name=db_user.full_name,
            age=db_user.age,
            weight_kg=db_user.weight_kg,
            height_cm=db_user.height_cm,
            gender=db_user.gender.value,
            language=db_user.language.value,
            water_ml=db_user.daily_water_goal_ml,
            calories=db_user.daily_calories_goal,
        ),
        parse_mode="HTML",
    )