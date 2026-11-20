from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.config import settings

is_sqlite = settings.DB_URL.startswith("sqlite")

engine_kwargs = {}
if is_sqlite:
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    engine_kwargs["pool_pre_ping"] = True

engine = create_engine(
    settings.DB_URL,
    **engine_kwargs,
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

    # Dialect-agnostic automatic schema migration for user_id and session_id columns
    try:
        inspector = inspect(engine)
        table_names = inspector.get_table_names()

        if "conversations" in table_names:
            conv_cols = [c["name"] for c in inspector.get_columns("conversations")]
            with engine.connect() as conn:
                if "user_id" not in conv_cols:
                    conn.exec_driver_sql("ALTER TABLE conversations ADD COLUMN user_id VARCHAR")
                if "session_id" not in conv_cols:
                    conn.exec_driver_sql("ALTER TABLE conversations ADD COLUMN session_id VARCHAR")
                conn.commit()

        if "documents" in table_names:
            doc_cols = [c["name"] for c in inspector.get_columns("documents")]
            with engine.connect() as conn:
                if "user_id" not in doc_cols:
                    conn.exec_driver_sql("ALTER TABLE documents ADD COLUMN user_id VARCHAR")
                if "session_id" not in doc_cols:
                    conn.exec_driver_sql("ALTER TABLE documents ADD COLUMN session_id VARCHAR")
                conn.commit()
    except Exception as e:
        print(f"Migration note: {e}")
