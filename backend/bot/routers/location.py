from aiogram import Router, F
from aiogram.types import Message
from aiogram.filters import Command

from services.location_service import find_nearby_medical
from services.user_service import UserService
from bot.keyboards.reply import build_location_keyboard, build_main_keyboard

router = Router()


@router.message(Command("nearby"))
@router.message(F.text.in_(["🗺 Nearby", "🗺 Рядом", "🗺 Yaqin atrofda"]))
async def cmd_nearby(message: Message, t, lang):
    await message.answer(
        t("location_request"),
        reply_markup=build_location_keyboard(lang),
    )


@router.message(F.location)
async def handle_location(message: Message, t, lang, db_user, user_service: UserService):
    lat = message.location.latitude
    lon = message.location.longitude

    searching_msg = await message.answer(t("location_searching"))
    places = await find_nearby_medical(lat, lon)

    # Asosiy keyboardni qaytarish
    faq_items = await user_service.get_active_faq_items()
    main_kb = build_main_keyboard(lang, faq_items)

    if not places:
        await searching_msg.edit_text(t("location_none"))
        await message.answer("🏠", reply_markup=main_kb)
        return

    lines = [t("location_found", count=len(places)), ""]
    emoji_map = {
        "pharmacy": "💊",
        "hospital": "🏥",
        "clinic": "🏥",
        "doctors": "👨‍⚕️",
    }

    for place in places[:10]:
        emoji = emoji_map.get(place["amenity"], "🏥")
        dist = place["distance_m"]
        dist_str = f"{dist}m" if dist < 1000 else f"{dist/1000:.1f}km"
        line = f"{emoji} <b>{place['name']}</b> — {dist_str}"
        if place.get("opening_hours"):
            line += f"\n    🕐 {place['opening_hours']}"
        if place.get("phone"):
            line += f"\n    📞 {place['phone']}"
        lines.append(line)

    await searching_msg.edit_text("\n".join(lines), parse_mode="HTML")
    await message.answer("✅", reply_markup=main_kb)