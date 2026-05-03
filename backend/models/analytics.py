from datetime import date, datetime
from typing import Optional, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Column, Relationship
import sqlalchemy as sa

if TYPE_CHECKING:
    from models.user import User


class DailyAnalytics(SQLModel, table=True):
    __tablename__ = "daily_analytics"
    __table_args__ = (
        sa.UniqueConstraint("user_id", "date", name="uq_user_date"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    log_date: date = Field(sa_column=Column("date", sa.Date, index=True, nullable=False))

    water_ml: int = Field(default=0)
    calories_consumed: int = Field(default=0)
    protein_g: float = Field(default=0.0)
    fat_g: float = Field(default=0.0)
    carbs_g: float = Field(default=0.0)
    text_analyses_count: int = Field(default=0)
    vision_analyses_count: int = Field(default=0)
    ai_summary: Optional[str] = Field(default=None, max_length=2048)

    created_at: datetime = Field(
        sa_column=Column(sa.DateTime, default=datetime.utcnow, nullable=False)
    )
    updated_at: datetime = Field(
        sa_column=Column(sa.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    )

    user: Optional["User"] = Relationship(back_populates="analytics")


class FAQItem(SQLModel, table=True):
    __tablename__ = "faq_items"
    id: Optional[int] = Field(default=None, primary_key=True)
    position: int = Field(default=0)
    label_en: str = Field(max_length=64)
    label_ru: str = Field(max_length=64)
    label_uz: str = Field(max_length=64)
    answer_en: str = Field(max_length=1024)
    answer_ru: str = Field(max_length=1024)
    answer_uz: str = Field(max_length=1024)
    is_active: bool = Field(default=True)

class ProfileAuditLog(SQLModel, table=True):
    __tablename__ = "profile_audit_logs"
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    changed_at: datetime = Field(
        sa_column=Column(sa.DateTime, default=datetime.utcnow, nullable=False)
    )
    field_name: str = Field(max_length=64)
    old_value: Optional[str] = Field(default=None, max_length=256)
    new_value: Optional[str] = Field(default=None, max_length=256)