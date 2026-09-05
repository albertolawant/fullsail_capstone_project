import sqlite3

DB_PATH = "tanio.db"

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

cursor.execute("PRAGMA foreign_keys=OFF")

cursor.execute(
    """
    CREATE TABLE generated_content_new (
        id INTEGER NOT NULL PRIMARY KEY,
        title VARCHAR NOT NULL,
        content_type VARCHAR NOT NULL,
        body TEXT NOT NULL,
        project_id INTEGER,
        owner_id INTEGER NOT NULL,
        FOREIGN KEY(project_id) REFERENCES projects (id),
        FOREIGN KEY(owner_id) REFERENCES users (id)
    )
    """
)

cursor.execute(
    """
    INSERT INTO generated_content_new (
        id,
        title,
        content_type,
        body,
        project_id,
        owner_id
    )
    SELECT
        id,
        title,
        content_type,
        body,
        project_id,
        owner_id
    FROM generated_content
    """
)

cursor.execute("DROP TABLE generated_content")

cursor.execute(
    "ALTER TABLE generated_content_new RENAME TO generated_content"
)

cursor.execute("PRAGMA foreign_keys=ON")

conn.commit()
conn.close()

print(
    "Migration complete: generated_content.project_id now allows NULL."
)