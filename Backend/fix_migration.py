import sqlite3
import os

# Path to your SQLite database
db_path = "./sentinel_ai.db"

if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Check current columns
cursor.execute("PRAGMA table_info('risk_logs')")
columns = [row[1] for row in cursor.fetchall()]
print(f"Current columns: {columns}")

# Add missing columns
if "org_id" not in columns:
    cursor.execute("ALTER TABLE risk_logs ADD COLUMN org_id INTEGER")
    print("Added org_id column")
else:
    print("org_id already exists")

if "workspace_id" not in columns:
    cursor.execute("ALTER TABLE risk_logs ADD COLUMN workspace_id INTEGER")
    print("Added workspace_id column")
else:
    print("workspace_id already exists")

conn.commit()
conn.close()
print("Migration complete!")
