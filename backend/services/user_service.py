from datetime import date, datetime
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from models.user import User, Language
from models.analytics import DailyAnalytics, FAQItem


class UserService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_telegram_id(self, telegram_id: int) -> Optional[User]:
        result = await self.session.execute(
            select(User).where(User.telegram_id == telegram_id)
        )
        return result.scalar_one_or_none()

    async def create_user(self, telegram_id: int, username: Optional[str]) -> User:
        user = User(
            telegram_id=telegram_id,
            username=username,
            full_name="",
            age=25,
            weight_kg=70.0,
            height_cm=170.0,
        )
        self.session.add(user)
        await self.session.flush()
        return user

    async def get_or_create(self, telegram_id: int, username: Optional[str]) -> tuple[User, bool]:
        """Returns (user, created). created=True if new user."""
        user = await self.get_by_telegram_id(telegram_id)
        if user:
            return user, False
        user = await self.create_user(telegram_id, username)
        return user, True

    async def update_profile(
        self,
        user: User,
        full_name: str,
        age: int,
        weight_kg: float,
        height_cm: float,
        gender,
        language: Language,
    ) -> User:
        user.full_name = full_name
        user.age = age
        user.weight_kg = weight_kg
        user.height_cm = height_cm
        user.gender = gender
        user.language = language
        user.daily_water_goal_ml = user.compute_water_goal()
        user.daily_calories_goal = user.compute_calorie_goal()
        user.onboarding_complete = True
        user.updated_at = datetime.utcnow()
        self.session.add(user)
        await self.session.flush()
        return user

    async def get_or_create_today_analytics(self, user: User) -> DailyAnalytics:
        today = date.today()
        result = await self.session.execute(
            select(DailyAnalytics).where(
                DailyAnalytics.user_id == user.id,
                DailyAnalytics.log_date == today,
            )
        )
        analytics = result.scalar_one_or_none()
        if not analytics:
            analytics = DailyAnalytics(user_id=user.id, log_date=today)
            self.session.add(analytics)
            await self.session.flush()
        return analytics

    async def increment_text_analysis(self, user: User):
        analytics = await self.get_or_create_today_analytics(user)
        analytics.text_analyses_count += 1
        analytics.updated_at = datetime.utcnow()
        self.session.add(analytics)

    async def increment_vision_analysis(self, user: User):
        analytics = await self.get_or_create_today_analytics(user)
        analytics.vision_analyses_count += 1
        analytics.updated_at = datetime.utcnow()
        self.session.add(analytics)

    async def get_analytics_last_7_days(self, user: User) -> List[DailyAnalytics]:
        from datetime import timedelta
        cutoff = date.today() - timedelta(days=6)
        result = await self.session.execute(
            select(DailyAnalytics)
            .where(DailyAnalytics.user_id == user.id, DailyAnalytics.log_date >= cutoff)
            .order_by(DailyAnalytics.log_date)
        )
        return result.scalars().all()

    async def get_daily_ai_count(self, user: User) -> int:
        analytics = await self.get_or_create_today_analytics(user)
        return analytics.text_analyses_count + analytics.vision_analyses_count

    async def get_active_faq_items(self) -> List[FAQItem]:
        result = await self.session.execute(
            select(FAQItem).where(FAQItem.is_active == True).order_by(FAQItem.position)
        )
        return result.scalars().all()
