from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.utils.keyboard import InlineKeyboardBuilder


def build_language_keyboard() -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.button(text="🇬🇧 English", callback_data="lang:en")
    builder.button(text="🇷🇺 Русский", callback_data="lang:ru")
    builder.button(text="🇺🇿 O'zbek", callback_data="lang:uz")
    builder.adjust(3)
    return builder.as_markup()


def build_gender_keyboard() -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.button(text="♂ Male", callback_data="gender:male")
    builder.button(text="♀ Female", callback_data="gender:female")
    builder.button(text="⚥ Other", callback_data="gender:other")
    builder.adjust(3)
    return builder.as_markup()


def build_confirm_keyboard(lang: str) -> InlineKeyboardMarkup:
    labels = {
        "en": ("✅ Confirm", "✏️ Edit"),
        "ru": ("✅ Подтвердить", "✏️ Изменить"),
        "uz": ("✅ Tasdiqlash", "✏️ Tahrirlash"),
    }
    confirm, edit = labels.get(lang, labels["en"])
    builder = InlineKeyboardBuilder()
    builder.button(text=confirm, callback_data="confirm:yes")
    builder.button(text=edit, callback_data="confirm:no")
    builder.adjust(2)
    return builder.as_markup()


def build_webapp_keyboard(url: str, lang: str) -> InlineKeyboardMarkup:
    labels = {
        "en": "📊 Open Dashboard",
        "ru": "📊 Открыть статистику",
        "uz": "📊 Statistikani ochish",
    }
    builder = InlineKeyboardBuilder()
    builder.button(
        text=labels.get(lang, labels["en"]),
        web_app={"url": url},
    )
    return builder.as_markup()
