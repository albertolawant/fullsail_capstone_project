from app.db.database import Base, engine
from app.models import project_activity


def migrate():
    Base.metadata.create_all(bind=engine)
    print("Project activity table migration complete.")


if __name__ == "__main__":
    migrate()