from typing import Callable, Dict, Any, Awaitable
from aiogram import BaseMiddleware
from aiogram.types import TelegramObject, Update
from core.database import AsyncSessionLocal
from services.user_service import UserService


class AuthMiddleware(BaseMiddleware):
    """
    Runs before every handler.
    - Fetches or creates the User row in DB.
    - Injects `user` and `user_service` into handler data.
    """

    async def __call__(
        self,
        handler: Callable[[TelegramObject, Dict[str, Any]], Awaitable[Any]],
        event: TelegramObject,
        data: Dict[str, Any],
    ) -> Any:
        # Extract from_user from various update types
        from_user = None
        if hasattr(event, "from_user"):
            from_user = event.from_user
        elif isinstance(event, Update):
            for field in ("message", "callback_query", "inline_query"):
                obj = getattr(event, field, None)
                if obj and hasattr(obj, "from_user"):
                    from_user = obj.from_user
                    break

        if from_user is None:
            return await handler(event, data)

        async with AsyncSessionLocal() as session:
            svc = UserService(session)
            user, created = await svc.get_or_create(
                telegram_id=from_user.id,
                username=from_user.username,
            )
            await session.commit()
            data["db_user"] = user
            data["user_service"] = svc
            data["db_session"] = session
            result = await handler(event, data)
            await session.commit()
            return result
