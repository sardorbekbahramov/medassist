from typing import List
from aiogram.types import ReplyKeyboardMarkup, KeyboardButton
from models.analytics import FAQItem


def build_main_keyboard(lang: str, faq_items: List[FAQItem]) -> ReplyKeyboardMarkup:
    """Build the persistent 5-button reply keyboard with FAQ items."""
    buttons = []

    # Add FAQ items (up to 5)
    for item in faq_items[:5]:
        label = getattr(item, f"label_{lang}", item.label_en)
        buttons.append([KeyboardButton(text=label)])

    # Default fallback buttons if no FAQ configured
    if not buttons:
        defaults = {
            "en": ["🔬 Analyze", "📊 Dashboard", "🗺 Nearby", "👤 Profile", "❓ Help"],
            "ru": ["🔬 Анализ", "📊 Статистика", "🗺 Рядом", "👤 Профиль", "❓ Помощь"],
            "uz": ["🔬 Tahlil", "📊 Statistika", "🗺 Yaqin atrofda", "👤 Profil", "❓ Yordam"],
        }
        for label in defaults.get(lang, defaults["en"]):
            buttons.append([KeyboardButton(text=label)])

    return ReplyKeyboardMarkup(
        keyboard=buttons,
        resize_keyboard=True,
        persistent=True,
    )


def build_location_keyboard(lang: str) -> ReplyKeyboardMarkup:
    labels = {"en": "📍 Share Location", "ru": "📍 Поделиться локацией", "uz": "📍 Joylashuvni ulashish"}
    return ReplyKeyboardMarkup(
        keyboard=[[KeyboardButton(text=labels.get(lang, labels["en"]), request_location=True)]],
        resize_keyboard=True,
        one_time_keyboard=True,
    )
