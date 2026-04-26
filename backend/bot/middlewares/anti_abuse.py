import time
from typing import Callable, Dict, Any, Awaitable
from collections import defaultdict
from aiogram import BaseMiddleware
from aiogram.types import TelegramObject, Message

# Simple in-memory rate limiter: max 30 messages per user per minute
_rate_data: Dict[int, list] = defaultdict(list)
MAX_MESSAGES = 30
WINDOW_SECONDS = 60


class AntiAbuseMiddleware(BaseMiddleware):
    async def __call__(
        self,
        handler: Callable[[TelegramObject, Dict[str, Any]], Awaitable[Any]],
        event: TelegramObject,
        data: Dict[str, Any],
    ) -> Any:
        user = data.get("db_user")
        if user is None:
            return await handler(event, data)

        now = time.time()
        user_id = user.telegram_id
        _rate_data[user_id] = [t for t in _rate_data[user_id] if now - t < WINDOW_SECONDS]

        if len(_rate_data[user_id]) >= MAX_MESSAGES:
            if isinstance(event, Message):
                await event.answer("⏳ Too many requests. Please slow down.")
            return None

        _rate_data[user_id].append(now)
        return await handler(event, data)
