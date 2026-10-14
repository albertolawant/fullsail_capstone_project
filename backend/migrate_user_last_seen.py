import sqlite3
from pathlib import Path


DB_PATH = Path(__file__).resolve().parent / "tanio.db"


def migrate():
    connection = sqlite3.connect(DB_PATH)
    cursor = connection.cursor()

    cursor.execute("PRAGMA table_info(users)")
    columns = {
        row[1]
        for row in cursor.fetchall()
    }

    if "last_seen" not in columns:
        cursor.execute(
            """
            ALTER TABLE users
            ADD COLUMN last_seen DATETIME
            """
        )
        print("Added last_seen column to users.")
    else:
        print("last_seen column already exists.")

    connection.commit()
    connection.close()

    print("User last_seen migration complete.")


if __name__ == "__main__":
    migrate()