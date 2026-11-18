from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.config import settings

engine = create_engine(
    settings.DB_URL,
    connect_args={"check_same_thread": False},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    # Import models so they register with Base metadata
    from app.models import user, document, conversation  # noqa: F401
    Base.metadata.create_all(bind=engine)

    # Check if user_id column exists in conversations & documents table, add if missing
    try:
        with engine.connect() as conn:
            conv_cols = [row[1] for row in conn.exec_driver_sql("PRAGMA table_info(conversations)").fetchall()]
            if "user_id" not in conv_cols:
                conn.exec_driver_sql("ALTER TABLE conversations ADD COLUMN user_id VARCHAR")
                conn.commit()

            doc_cols = [row[1] for row in conn.exec_driver_sql("PRAGMA table_info(documents)").fetchall()]
            if "user_id" not in doc_cols:
                conn.exec_driver_sql("ALTER TABLE documents ADD COLUMN user_id VARCHAR")
                conn.commit()
    except Exception as e:
        print(f"Migration note: {e}")
