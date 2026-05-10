from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy import text
from sqlmodel import SQLModel
from core.config import settings

engine = create_async_engine(
    settings.database_url,
    echo=False,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)


async def create_db_and_tables():
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
        await conn.execute(text("""
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20) DEFAULT NULL;
        """))
        await conn.execute(text("""
            ALTER TABLE daily_analytics
            ADD COLUMN IF NOT EXISTS sleep_hours FLOAT DEFAULT 0.0;
        """))
        await conn.execute(text("""
            ALTER TABLE daily_analytics
            ADD COLUMN IF NOT EXISTS walking_steps INTEGER DEFAULT 0;
        """))


async def get_session() -> AsyncSession:
    """Dependency for getting async DB session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()