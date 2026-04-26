from datetime import datetime
from enum import Enum
from typing import Optional, List
from sqlmodel import SQLModel, Field, Column, Relationship
import sqlalchemy as sa


class Gender(str, Enum):
    male = "male"
    female = "female"
    other = "other"


class Language(str, Enum):
    en = "en"
    ru = "ru"
    uz = "uz"


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: Optional[int] = Field(default=None, primary_key=True)
    telegram_id: int = Field(
        sa_column=Column(sa.BigInteger, unique=True, index=True, nullable=False)
    )
    username: Optional[str] = Field(default=None, max_length=64)
    full_name: str = Field(max_length=128)
    age: int = Field(ge=1, le=120)
    weight_kg: float = Field(ge=1.0, le=500.0)
    height_cm: float = Field(ge=50.0, le=300.0)
    gender: Gender = Field(default=Gender.other)
    language: Language = Field(default=Language.en)

    # Goals (auto-computed on save)
    daily_water_goal_ml: int = Field(default=2000)
    daily_calories_goal: int = Field(default=2000)

    # Flags
    is_active: bool = Field(default=True)
    is_admin: bool = Field(default=False)
    onboarding_complete: bool = Field(default=False)

    created_at: datetime = Field(
        sa_column=Column(sa.DateTime, default=datetime.utcnow, nullable=False)
    )
    updated_at: datetime = Field(
        sa_column=Column(
            sa.DateTime,
            default=datetime.utcnow,
            onupdate=datetime.utcnow,
            nullable=False,
        )
    )

    # Relationships
    analytics: List["DailyAnalytics"] = Relationship(back_populates="user")  # noqa: F821

    def compute_water_goal(self) -> int:
        """30–35 ml per kg body weight."""
        return int(self.weight_kg * 33)

    def compute_calorie_goal(self) -> int:
        """Harris-Benedict BMR × 1.4 sedentary factor."""
        if self.gender == Gender.male:
            bmr = 88.36 + (13.4 * self.weight_kg) + (4.8 * self.height_cm) - (5.7 * self.age)
        else:
            bmr = 447.6 + (9.2 * self.weight_kg) + (3.1 * self.height_cm) - (4.3 * self.age)
        return int(bmr * 1.4)
