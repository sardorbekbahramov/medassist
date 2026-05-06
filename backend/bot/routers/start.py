from aiogram import Router, F
from aiogram.types import Message, CallbackQuery, ReplyKeyboardMarkup, KeyboardButton, ReplyKeyboardRemove
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
    wait_phone = State()        # ← YANGI


async def get_total_users() -> int:
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(func.count(User.id)))
        return result.scalar() or 0


def build_phone_keyboard() -> ReplyKeyboardMarkup:
    """Telefon raqamini ulashish tugmasi."""
    return ReplyKeyboardMarkup(
        keyboard=[[KeyboardButton(text="📱 Share phone number", request_contact=True)]],
        resize_keyboard=True,
        one_time_keyboard=True,
    )


@router.message(CommandStart())
async def cmd_start(message: Message, state: FSMContext, db_user, user_service: UserService, t, lang):
    if db_user.onboarding_complete:
        # Telefon raqam yo'q bo'lsa so'rash
        if not db_user.phone_number:
            await state.set_state(OnboardingFSM.wait_phone)
            await message.answer(
                "📱 Please share your phone number to continue:",
                reply_markup=build_phone_keyboard(),
            )
            return

        total = await get_total_users()
        faq_items = await user_service.get_active_faq_items()
        await message.answer(
            f"Welcome back dear, <b>{db_user.full_name}</b>!\n\n"
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
async def onboarding_language(callback: CallbackQuery, state: FSMContext, t):
    lang_str = callback.data.split(":")[1]
    await state.update_data(language=lang_str)
    await state.set_state(OnboardingFSM.wait_phone)
    await callback.message.answer(
        "📱 Please share your phone number:",
        reply_markup=build_phone_keyboard(),
    )
    await callback.answer()


@router.message(OnboardingFSM.wait_phone, F.contact)
async def onboarding_phone_contact(
    message: Message,
    state: FSMContext,
    db_user,
    user_service: UserService,
    db_session,
):
    phone = message.contact.phone_number
    await _finish_onboarding(message, state, db_user, user_service, db_session, phone)


@router.message(OnboardingFSM.wait_phone)
async def onboarding_phone_text(
    message: Message,
    state: FSMContext,
    db_user,
    user_service: UserService,
    db_session,
):
    phone = message.text.strip() if message.text else ""
    import re
    if not re.match(r"^\+?\d{7,15}$", phone):
        await message.answer("❌ Invalid phone number. Please share via button or type like +998901234567")
        return
    await _finish_onboarding(message, state, db_user, user_service, db_session, phone)


async def _finish_onboarding(message, state, db_user, user_service, db_session, phone: str):
    data = await state.get_data()
    
    # Eski user (faqat telefon qo'shilayapti)
    if db_user.onboarding_complete:
        db_user.phone_number = phone
        db_session.add(db_user)
        await db_session.commit()
        await state.clear()
        lang_str = db_user.language.value if db_user.language else "en"
        faq_items = await user_service.get_active_faq_items()
        await message.answer(
            "✅ Phone number saved!",
            reply_markup=ReplyKeyboardRemove(),
        )
        await message.answer(
            f"👋 Welcome back, <b>{db_user.full_name}</b>!",
            parse_mode="HTML",
            reply_markup=build_main_keyboard(lang_str, faq_items),
        )
        return

    # Yangi user (to'liq onboarding)
    lang_str = data["language"]
    updated_user = await user_service.update_profile(
        user=db_user,
        full_name=data["full_name"],
        age=data["age"],
        weight_kg=data["weight_kg"],
        height_cm=data["height_cm"],
        gender=Gender(data["gender"]),
        language=Language(lang_str),
        phone_number=phone,
    )
    await db_session.commit()
    await state.clear()

    from services.i18n_service import t as translate
    new_t = lambda key, **kwargs: translate(key, lang=lang_str, **kwargs)

    total = await get_total_users()
    faq_items = await user_service.get_active_faq_items()

    await message.answer(
        new_t(
            "onboarding_complete",
            water_ml=updated_user.daily_water_goal_ml,
            calories=updated_user.daily_calories_goal,
        ) + f"\n\n👥 Total users: <b>{total}</b>",
        parse_mode="HTML",
        reply_markup=ReplyKeyboardRemove(),
    )
    await message.answer(
        "✅",
        reply_markup=build_main_keyboard(lang_str, faq_items),
    )


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