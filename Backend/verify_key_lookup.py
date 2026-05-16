import sqlite3
import hashlib
import os

# Replicate the EXACT lookup from api_key_service.py
pepper = os.getenv("SENTINELAI_KEY_PEPPER", "")
raw_key = 'sk_sentinel_1I0sD34kbspbiteumwM2OMbKO2wc3KpkQ03IoU'
value = f"{pepper}{raw_key}".encode("utf-8")
key_hash = hashlib.sha256(value).hexdigest()

print(f"Looking up key: {raw_key[:20]}...")
print(f"Hash: {key_hash}")

conn = sqlite3.connect('sentinel_ai.db')
c = conn.cursor()

# Check if key exists
c.execute('SELECT id, org_id, name, prefix, status FROM api_keys WHERE key_hash = ?', (key_hash,))
row = c.fetchone()
if row:
    print(f"✅ Key FOUND: id={row[0]}, org_id={row[1]}, name={row[2]}, prefix={row[3]}, status={row[4]}")
else:
    print(f"❌ Key NOT FOUND in DB")
    
    # Check all keys for org 27
    c.execute('SELECT id, org_id, name, prefix FROM api_keys WHERE org_id = 27')
    rows = c.fetchall()
    print(f"Keys for org 27: {len(rows)}")
    for r in rows:
        print(f"  ID={r[0]}, name={r[2]}, prefix={r[3]}")

conn.close()
