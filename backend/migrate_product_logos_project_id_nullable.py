import sqlite3

DB_PATH = "tanio.db"

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

try:
    table_info = cursor.execute(
        "PRAGMA table_info(product_logos)"
    ).fetchall()

    project_id_column = next(
        (column for column in table_info if column[1] == "project_id"),
        None,
    )

    if project_id_column is None:
        raise RuntimeError(
            "product_logos.project_id could not be found."
        )

    # PRAGMA table_info: index 3 is the NOT NULL flag.
    if project_id_column[3] == 0:
        print(
            "No migration needed: product_logos.project_id already allows NULL."
        )
    else:
        cursor.execute("PRAGMA foreign_keys=OFF")

        cursor.execute(
            """
            CREATE TABLE product_logos_new (
                id INTEGER NOT NULL PRIMARY KEY,
                project_id INTEGER,
                owner_id INTEGER NOT NULL,
                image_base64 TEXT NOT NULL,
                style VARCHAR NOT NULL,
                preferred_colors VARCHAR NOT NULL,
                logo_ideas VARCHAR NOT NULL,
                branding_direction VARCHAR NOT NULL,
                created_at DATETIME NOT NULL,
                FOREIGN KEY(project_id) REFERENCES projects (id),
                FOREIGN KEY(owner_id) REFERENCES users (id)
            )
            """
        )

        cursor.execute(
            """
            INSERT INTO product_logos_new (
                id,
                project_id,
                owner_id,
                image_base64,
                style,
                preferred_colors,
                logo_ideas,
                branding_direction,
                created_at
            )
            SELECT
                id,
                project_id,
                owner_id,
                image_base64,
                style,
                preferred_colors,
                logo_ideas,
                branding_direction,
                created_at
            FROM product_logos
            """
        )

        cursor.execute("DROP TABLE product_logos")
        cursor.execute(
            "ALTER TABLE product_logos_new RENAME TO product_logos"
        )

        cursor.execute(
            "CREATE INDEX IF NOT EXISTS ix_product_logos_id "
            "ON product_logos (id)"
        )
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS ix_product_logos_project_id "
            "ON product_logos (project_id)"
        )
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS ix_product_logos_owner_id "
            "ON product_logos (owner_id)"
        )

        conn.commit()
        cursor.execute("PRAGMA foreign_keys=ON")

        print(
            "Migration complete: product_logos.project_id now allows NULL."
        )
finally:
    conn.close()
