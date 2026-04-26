from aiogram import Router
from aiogram.types import Message
from aiogram.filters import Command
from sqlmodel import select

from bot.filters.admin import AdminFilter
from models.analytics import FAQItem
from core.database import AsyncSessionLocal

router = Router()
router.message.filter(AdminFilter())


@router.message(Command("admin"))
async def cmd_admin_help(message: Message):
    help_text = (
        "🛡 <b>Admin Commands</b>\n\n"
        "/set_faq &lt;pos&gt; &lt;label_en&gt;|&lt;label_ru&gt;|&lt;label_uz&gt;|&lt;ans_en&gt;|&lt;ans_ru&gt;|&lt;ans_uz&gt;\n"
        "  Set FAQ button at position 0-4\n\n"
        "/list_faq — Show all FAQ items\n\n"
        "/del_faq &lt;pos&gt; — Deactivate FAQ at position\n"
    )
    await message.answer(help_text, parse_mode="HTML")


@router.message(Command("list_faq"))
async def cmd_list_faq(message: Message):
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(FAQItem).order_by(FAQItem.position))
        items = result.scalars().all()

    if not items:
        await message.answer("No FAQ items yet.")
        return

    lines = ["<b>FAQ Items:</b>"]
    for item in items:
        status = "✅" if item.is_active else "❌"
        lines.append(f"{status} [{item.position}] EN: {item.label_en}")
    await message.answer("\n".join(lines), parse_mode="HTML")


@router.message(Command("set_faq"))
async def cmd_set_faq(message: Message, t):
    """Usage: /set_faq 0 Label EN|Label RU|Label UZ|Answer EN|Answer RU|Answer UZ"""
    parts = message.text.split(" ", 2)
    if len(parts) < 3:
        await message.answer("Usage: /set_faq <pos 0-4> <label_en>|<label_ru>|<label_uz>|<ans_en>|<ans_ru>|<ans_uz>")
        return

    try:
        pos = int(parts[1])
        assert 0 <= pos <= 4
    except (ValueError, AssertionError):
        await message.answer("Position must be 0–4.")
        return

    fields = parts[2].split("|")
    if len(fields) < 6:
        await message.answer("Need exactly 6 pipe-separated values.")
        return

    label_en, label_ru, label_uz, ans_en, ans_ru, ans_uz = (f.strip() for f in fields[:6])

    async with AsyncSessionLocal() as session:
        result = await session.execute(select(FAQItem).where(FAQItem.position == pos))
        item = result.scalar_one_or_none()
        if item:
            item.label_en = label_en
            item.label_ru = label_ru
            item.label_uz = label_uz
            item.answer_en = ans_en
            item.answer_ru = ans_ru
            item.answer_uz = ans_uz
            item.is_active = True
        else:
            item = FAQItem(
                position=pos,
                label_en=label_en,
                label_ru=label_ru,
                label_uz=label_uz,
                answer_en=ans_en,
                answer_ru=ans_ru,
                answer_uz=ans_uz,
            )
            session.add(item)
        await session.commit()

    await message.answer(t("faq_updated"))


@router.message(Command("del_faq"))
async def cmd_del_faq(message: Message):
    parts = message.text.split()
    if len(parts) < 2:
        await message.answer("Usage: /del_faq <pos>")
        return
    try:
        pos = int(parts[1])
    except ValueError:
        await message.answer("Invalid position.")
        return

    async with AsyncSessionLocal() as session:
        result = await session.execute(select(FAQItem).where(FAQItem.position == pos))
        item = result.scalar_one_or_none()
        if item:
            item.is_active = False
            await session.commit()
            await message.answer(f"✅ FAQ item at position {pos} deactivated.")
        else:
            await message.answer("No FAQ item at that position.")
