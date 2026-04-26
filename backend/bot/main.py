import asyncio
import logging
import sys

from aiohttp import web
from aiogram import Bot, Dispatcher
from aiogram.enums import ParseMode
from aiogram.client.default import DefaultBotProperties
from aiogram.fsm.storage.redis import RedisStorage
from aiogram.webhook.aiohttp_server import SimpleRequestHandler, setup_application

from core.config import settings
from core.database import create_db_and_tables
from core.redis import get_redis, close_redis
from services.i18n_service import load_locales
from bot.middlewares import AuthMiddleware, I18nMiddleware, AntiAbuseMiddleware
from bot.routers import (
    start_router,
    analysis_router,
    location_router,
    dashboard_router,
    admin_router,
)
from bot.api_server import setup_api_routes

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger(__name__)


async def on_startup(bot: Bot, dp: Dispatcher):
    logger.info("Starting MedAssist bot...")
    load_locales()
    await create_db_and_tables()
    logger.info("Database tables created.")

    if settings.use_webhook:
        await bot.set_webhook(
            url=settings.webhook_url,
            drop_pending_updates=True,
            allowed_updates=dp.resolve_used_update_types(),
        )
        logger.info(f"Webhook set: {settings.webhook_url}")
    else:
        await bot.delete_webhook(drop_pending_updates=True)
        logger.info("Running in polling mode.")


async def on_shutdown(bot: Bot):
    logger.info("Shutting down...")
    await close_redis()
    if settings.use_webhook:
        await bot.delete_webhook()


def create_dispatcher() -> Dispatcher:
    """Build and configure the Aiogram dispatcher."""
    # Redis-backed FSM storage
    storage = None  # will be set async in main
    dp = Dispatcher()

    # Register middlewares (order matters: Auth → i18n → AntiAbuse)
    dp.update.outer_middleware(AuthMiddleware())
    dp.message.middleware(I18nMiddleware())
    dp.callback_query.middleware(I18nMiddleware())
    dp.message.middleware(AntiAbuseMiddleware())

    # Register routers
    dp.include_router(start_router)
    dp.include_router(dashboard_router)
    dp.include_router(location_router)
    dp.include_router(admin_router)
    dp.include_router(analysis_router)  # analysis last (catch-all text handler)

    return dp


async def main():
    bot = Bot(
        token=settings.bot_token,
        default=DefaultBotProperties(parse_mode=ParseMode.HTML),
    )

    redis = await get_redis()
    storage = RedisStorage(redis=redis)
    dp = Dispatcher(storage=storage)

    # Register middlewares
    dp.update.outer_middleware(AuthMiddleware())
    dp.message.middleware(I18nMiddleware())
    dp.callback_query.middleware(I18nMiddleware())
    dp.message.middleware(AntiAbuseMiddleware())

    # Register routers
    dp.include_router(start_router)
    dp.include_router(dashboard_router)
    dp.include_router(location_router)
    dp.include_router(admin_router)
    dp.include_router(analysis_router)

    await on_startup(bot, dp)

    if settings.use_webhook:
        app = web.Application()
        handler = SimpleRequestHandler(dispatcher=dp, bot=bot)
        handler.register(app, path=settings.webhook_path)
        setup_application(app, dp, bot=bot)
        runner = web.AppRunner(app)
        await runner.setup()
        site = web.TCPSite(runner, "0.0.0.0", settings.webapp_port)
        await site.start()
        logger.info(f"Webhook server started on port {settings.webapp_port}")
        try:
            await asyncio.Event().wait()
        finally:
            await on_shutdown(bot)
            await runner.cleanup()
    else:
        app = web.Application()
        setup_api_routes(app)
        runner = web.AppRunner(app)
        await runner.setup()
        site = web.TCPSite(runner, "0.0.0.0", settings.webapp_port)
        await site.start()
        logger.info(f"API server on http://localhost:{settings.webapp_port}")
        try:
            await dp.start_polling(bot, allowed_updates=dp.resolve_used_update_types())
        finally:
            await on_shutdown(bot)
            await runner.cleanup()
            await bot.session.close()


if __name__ == "__main__":
    asyncio.run(main())
