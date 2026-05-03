from aiogram import Router, F
from aiogram.types import Message, InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.filters import Command
from aiogram.utils.keyboard import InlineKeyboardBuilder

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

    emoji_map = {
        "pharmacy": "💊",
        "hospital": "🏥",
        "clinic": "🏥",
        "doctors": "👨‍⚕️",
    }

    # Har bir joy uchun inline button bilan xabar yuborish
    for place in places[:10]:
        emoji = emoji_map.get(place["amenity"], "🏥")
        dist = place["distance_m"]
        dist_str = f"{dist}m" if dist < 1000 else f"{dist / 1000:.1f}km"

        # Matn qismi
        lines = [f"{emoji} <b>{place['name']}</b> — {dist_str}"]
        if place.get("opening_hours"):
            lines.append(f"🕐 {place['opening_hours']}")
        if place.get("phone"):
            lines.append(f"📞 {place['phone']}")

        text = "\n".join(lines)

        # Google Maps va Yandex Maps linklari
        place_lat = place["lat"]
        place_lon = place["lon"]
        name_encoded = place["name"].replace(" ", "+")

        google_url = (
            f"https://www.google.com/maps/search/?api=1"
            f"&query={place_lat},{place_lon}"
        )
        yandex_url = (
            f"https://yandex.com/maps/?pt={place_lon},{place_lat}"
            f"&z=17&l=map"
        )
        twogis_url = (
            f"https://2gis.com/geo/{place_lon},{place_lat}"
        )

        # Inline keyboard
        builder = InlineKeyboardBuilder()
        builder.row(
            InlineKeyboardButton(text="🗺 Google Maps", url=google_url),
            InlineKeyboardButton(text="🗺 Yandex Maps", url=yandex_url),
        )
        builder.row(
            InlineKeyboardButton(text="🗺 2GIS", url=twogis_url),
        )

        await message.answer(
            text,
            parse_mode="HTML",
            reply_markup=builder.as_markup(),
        )

    # Asosiy keyboardni qaytarish
    await message.answer(
        f"✅ {t('location_found', count=len(places[:10]))}",
        reply_markup=main_kb,
    )