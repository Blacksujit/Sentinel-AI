import sqlite3
import json

conn = sqlite3.connect('sentinel_ai.db')
c = conn.cursor()

# Check risk_logs table
c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='risk_logs'")
if c.fetchone():
    print("risk_logs table exists")
    c.execute('SELECT id, org_id, workspace_id, decision, source, created_at FROM risk_logs ORDER BY id DESC LIMIT 5')
    rows = c.fetchall()
    print(f"\nLast {len(rows)} risk logs:")
    for row in rows:
        print(f"  ID={row[0]}, org_id={row[1]}, workspace_id={row[2]}, decision={row[3]}, source={row[4]}, created_at={row[5]}")
else:
    print("risk_logs table not found!")
    c.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = c.fetchall()
    print(f"Tables: {[t[0] for t in tables]}")

conn.close()
