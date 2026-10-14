import sqlite3

DB_PATH = "tanio.db"

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

try:
    existing_table = cursor.execute(
        """
        SELECT name
        FROM sqlite_master
        WHERE type='table' AND name='project_members'
        """
    ).fetchone()

    if existing_table:
        print(
            "No migration needed: project_members table already exists."
        )
    else:
        cursor.execute(
            """
            CREATE TABLE project_members (
                id INTEGER NOT NULL PRIMARY KEY,
                project_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                role VARCHAR(20) NOT NULL DEFAULT 'viewer',
                created_at DATETIME NOT NULL,
                FOREIGN KEY(project_id) REFERENCES projects (id),
                FOREIGN KEY(user_id) REFERENCES users (id),
                UNIQUE(project_id, user_id),
                CHECK(role IN ('editor', 'viewer'))
            )
            """
        )

        cursor.execute(
            """
            CREATE INDEX IF NOT EXISTS ix_project_members_id
            ON project_members (id)
            """
        )

        cursor.execute(
            """
            CREATE INDEX IF NOT EXISTS ix_project_members_project_id
            ON project_members (project_id)
            """
        )

        cursor.execute(
            """
            CREATE INDEX IF NOT EXISTS ix_project_members_user_id
            ON project_members (user_id)
            """
        )

        conn.commit()

        print(
            "Migration complete: project_members table created."
        )
finally:
    conn.close()