import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

db_url = settings.DATABASE_URL
if db_url.startswith("sqlite"):
    # Convert relative sqlite URLs to absolute path relative to the backend directory
    # e.g., sqlite:///ghrce_v2.db -> sqlite:///C:/absolute/path/to/backend/ghrce_v2.db
    # This prevents issues when running scripts or servers from different directories.
    sqlite_prefix = "sqlite:///"
    db_relative_path = db_url[len(sqlite_prefix):]
    if not os.path.isabs(db_relative_path) and not db_relative_path.startswith("/"):
        backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        db_abs_path = os.path.abspath(os.path.join(backend_dir, db_relative_path))
        db_url = f"sqlite:///{db_abs_path.replace('\\', '/')}"

    engine = create_engine(
        db_url,
        connect_args={"check_same_thread": False}
    )
else:
    engine = create_engine(
        settings.DATABASE_URL,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

