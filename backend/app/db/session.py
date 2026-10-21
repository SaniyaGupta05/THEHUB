import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

# Ensure sqlite path is formatted properly
db_url = settings.DATABASE_URL
if db_url.startswith("sqlite") and not db_url.startswith("sqlite:////") and ":/" not in db_url:
    # Resolve relative path to backend directory
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    db_file = os.path.join(base_dir, "hubklub_app.db").replace("\\", "/")
    db_url = f"sqlite:///{db_file}"

engine = create_engine(
    db_url,
    connect_args={"check_same_thread": False} if "sqlite" in db_url else {},
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
