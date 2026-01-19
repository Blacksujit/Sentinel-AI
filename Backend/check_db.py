import sqlite3

conn = sqlite3.connect('sentinel_ai.db')
cursor = conn.cursor()

print("=== SETTINGS TABLE ===")
cursor.execute('SELECT * FROM settings ORDER BY version DESC LIMIT 3')
for row in cursor.fetchall():
    print(row)

print("\n=== SETTINGS VERSION LOG ===")
cursor.execute('SELECT * FROM settings_version_log ORDER BY created_at DESC LIMIT 3')
for row in cursor.fetchall():
    print(row)

conn.close()
