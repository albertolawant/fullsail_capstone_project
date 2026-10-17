import sqlite3
from datetime import datetime
from pathlib import Path


DB_PATH = Path(__file__).resolve().parent / "tanio.db"


def migrate():
    if not DB_PATH.is_file():
        raise FileNotFoundError(
            f"Database not found: {DB_PATH}"
        )

    with sqlite3.connect(DB_PATH) as connection:
        columns = {
            row[1]
            for row in connection.execute("PRAGMA table_info(users)")
        }

        if not columns:
            raise RuntimeError(
                "The users table was not found. No changes were made."
            )

        if "module_colors" in columns:
            print("module_colors column already exists.")
            return

        timestamp = datetime.now().strftime("%Y%m%d-%H%M%S-%f")
        backup_path = DB_PATH.with_name(
            f"tanio-backup-before-module-colors-{timestamp}.db"
        )

        with sqlite3.connect(backup_path) as backup:
            connection.backup(backup)

        print(f"Backup created: {backup_path.name}")

        connection.execute(
            "ALTER TABLE users ADD COLUMN module_colors JSON"
        )

    print("Added module_colors column to users.")
    print("Module color migration complete.")


if __name__ == "__main__":
    migrate()