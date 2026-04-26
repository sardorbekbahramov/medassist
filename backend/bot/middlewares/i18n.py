from typing import Callable, Dict, Any, Awaitable
from aiogram import BaseMiddleware
from aiogram.types import TelegramObject
from services.i18n_service import t as translate


class I18nMiddleware(BaseMiddleware):
    """Injects a `t(key, **kwargs)` callable into handler data, pre-bound to user language."""

    async def __call__(
        self,
        handler: Callable[[TelegramObject, Dict[str, Any]], Awaitable[Any]],
        event: TelegramObject,
        data: Dict[str, Any],
    ) -> Any:
        user = data.get("db_user")
        lang = user.language.value if user and user.language else "en"

        def t(key: str, **kwargs) -> str:
            return translate(key, lang=lang, **kwargs)

        data["t"] = t
        data["lang"] = lang
        return await handler(event, data)
