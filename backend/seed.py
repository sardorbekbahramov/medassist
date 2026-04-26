"""
Seed the database with default FAQ items.
Run: python seed.py
"""
import asyncio
from core.database import create_db_and_tables, AsyncSessionLocal
from models.analytics import FAQItem

DEFAULT_FAQ = [
    {
        "position": 0,
        "label_en": "💊 Pill Info",
        "label_ru": "💊 О таблетке",
        "label_uz": "💊 Dori haqida",
        "answer_en": "Send me a photo of the pill or its packaging and I'll analyze it for you. ⚠️ Always consult your doctor before taking any medication.",
        "answer_ru": "Отправьте мне фото таблетки или упаковки, и я проанализирую её. ⚠️ Всегда консультируйтесь с врачом перед приёмом любых лекарств.",
        "answer_uz": "Dori yoki uning qadoqining rasmini yuboring, men uni tahlil qilaman. ⚠️ Har qanday dori qabul qilishdan oldin doktoringiz bilan maslahatlashing.",
    },
    {
        "position": 1,
        "label_en": "💧 Water Reminder",
        "label_ru": "💧 Напоминание о воде",
        "label_uz": "💧 Suv eslatmasi",
        "answer_en": "💧 Remember to drink water regularly!\n\nYour daily goal is shown in /dashboard. Tip: drink a glass after waking up, before meals, and before bed.",
        "answer_ru": "💧 Не забывайте пить воду регулярно!\n\nВаша дневная цель показана в /dashboard. Совет: пейте стакан воды после пробуждения, перед едой и перед сном.",
        "answer_uz": "💧 Muntazam suv ichishni unutmang!\n\nKunlik maqsadingiz /dashboard da ko'rsatilgan. Maslahat: uyg'ongandan keyin, ovqatdan oldin va uxlashdan oldin bir stakan suv iching.",
    },
    {
        "position": 2,
        "label_en": "🏥 Emergency",
        "label_ru": "🏥 Скорая помощь",
        "label_uz": "🏥 Tez yordam",
        "answer_en": "🚨 <b>Emergency Numbers:</b>\n\n🇺🇿 Uzbekistan: 103 (Ambulance)\n🇷🇺 Russia: 112 (Unified)\n🇬🇧 UK: 999\n🇺🇸 USA: 911\n\nFor nearby hospitals, tap 🗺 Nearby.",
        "answer_ru": "🚨 <b>Номера экстренных служб:</b>\n\n🇺🇿 Узбекистан: 103 (Скорая)\n🇷🇺 Россия: 112 (Единый)\n🇬🇧 Великобритания: 999\n🇺🇸 США: 911\n\nДля поиска ближайших больниц нажмите 🗺 Рядом.",
        "answer_uz": "🚨 <b>Favqulodda raqamlar:</b>\n\n🇺🇿 O'zbekiston: 103 (Tez yordam)\n🇷🇺 Rossiya: 112 (Yagona)\n🇬🇧 UK: 999\n🇺🇸 AQSh: 911\n\nYaqin kasalxonalarni topish uchun 🗺 Yaqin atrofda tugmasini bosing.",
    },
    {
        "position": 3,
        "label_en": "🥗 Nutrition Tips",
        "label_ru": "🥗 Советы по питанию",
        "label_uz": "🥗 Ovqatlanish maslahatlari",
        "answer_en": "🥗 <b>Quick Nutrition Tips:</b>\n\n• Eat 5 servings of fruit/vegetables daily\n• Choose whole grains over refined\n• Limit processed foods and added sugars\n• Include lean protein in every meal\n• Don't skip breakfast\n\nSend me what you ate today for a personalized analysis! 🔬",
        "answer_ru": "🥗 <b>Советы по питанию:</b>\n\n• Ешьте 5 порций фруктов/овощей ежедневно\n• Выбирайте цельнозерновые продукты\n• Ограничьте обработанные продукты\n• Включайте белок в каждый приём пищи\n• Не пропускайте завтрак\n\nОтправьте, что вы ели сегодня, для персонального анализа! 🔬",
        "answer_uz": "🥗 <b>Ovqatlanish maslahatlari:</b>\n\n• Har kuni 5 ta meva/sabzavot iste'mol qiling\n• Tabiiy don mahsulotlarini tanlang\n• Qayta ishlangan oziq-ovqatlarni kamaytiring\n• Har bir ovqatda oqsil kiriting\n• Nonushtani o'tkazib yubormang\n\nBugun nima yegandikingizni yuboring — shaxsiy tahlil qilaman! 🔬",
    },
    {
        "position": 4,
        "label_en": "📊 My Stats",
        "label_ru": "📊 Моя статистика",
        "label_uz": "📊 Mening statistikam",
        "answer_en": "📊 View your full health dashboard in the Mini App!\n\nTap the button below or use /dashboard for a quick summary.",
        "answer_ru": "📊 Просмотрите полную статистику в мини-приложении!\n\nНажмите кнопку ниже или используйте /dashboard для быстрого обзора.",
        "answer_uz": "📊 To'liq sog'liq statistikangizni Mini App da ko'ring!\n\nQuyidagi tugmani bosing yoki tezkor xulosani ko'rish uchun /dashboard dan foydalaning.",
    },
]


async def seed():
    await create_db_and_tables()
    async with AsyncSessionLocal() as session:
        for item_data in DEFAULT_FAQ:
            from sqlmodel import select
            result = await session.execute(
                select(FAQItem).where(FAQItem.position == item_data["position"])
            )
            existing = result.scalar_one_or_none()
            if not existing:
                session.add(FAQItem(**item_data))
                print(f"  ✅ Added FAQ [{item_data['position']}]: {item_data['label_en']}")
            else:
                print(f"  ⏭  FAQ [{item_data['position']}] already exists, skipping.")
        await session.commit()
    print("\nSeed complete!")


if __name__ == "__main__":
    asyncio.run(seed())
