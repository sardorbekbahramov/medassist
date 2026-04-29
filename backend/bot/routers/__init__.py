from bot.routers.start import router as start_router
from bot.routers.analysis import router as analysis_router
from bot.routers.location import router as location_router
from bot.routers.dashboard import router as dashboard_router
from bot.routers.admin import router as admin_router
from bot.routers.menu import router as menu_router

__all__ = [
    "start_router",
    "analysis_router",
    "location_router",
    "dashboard_router",
    "admin_router",
    "menu_router",
]
