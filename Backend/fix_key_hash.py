import sqlite3
import hashlib
import os

# Get pepper from environment (same as api_key_service.py)
pepper = os.getenv("SENTINELAI_KEY_PEPPER", "")
print(f"Pepper: '{pepper}' (empty={not pepper})")

raw_key = 'sk_sentinel_1I0sD34kbspbiteumwM2OMbKO2wc3KpkQ03IoU'

# Correct hash with pepper
value = f"{pepper}{raw_key}".encode("utf-8")
correct_hash = hashlib.sha256(value).hexdigest()
print(f"Correct hash: {correct_hash[:30]}...")

# Plain hash (what I inserted before)
plain_hash = hashlib.sha256(raw_key.encode()).hexdigest()
print(f"Plain hash:   {plain_hash[:30]}...")

conn = sqlite3.connect('sentinel_ai.db')
c = conn.cursor()

# Check current hash in DB
c.execute('SELECT id, key_hash FROM api_keys WHERE org_id = 27')
row = c.fetchone()
if row:
    print(f"\nCurrent DB hash: {row[1][:30]}...")
    if row[1] == correct_hash:
        print("Hash already correct!")
    else:
        print("Updating hash...")
        c.execute('UPDATE api_keys SET key_hash = ? WHERE id = ?', (correct_hash, row[0]))
        conn.commit()
        print(f"Updated key {row[0]} with correct hash")
        
        # Verify
        c.execute('SELECT key_hash FROM api_keys WHERE id = ?', (row[0],))
        verify = c.fetchone()
        print(f"Verified: {verify[0][:30]}...")
else:
    print("No key found for org_id=27")

conn.close()
