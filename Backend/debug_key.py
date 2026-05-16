import sqlite3
import hashlib

conn = sqlite3.connect('sentinel_ai.db')
c = conn.cursor()

# Check the key we're using
raw_key = 'sk_sentinel_1I0sD34kbspbiteumwM2OMbKO2wc3KpkQ03IoU'
key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
print(f'Looking for key hash: {key_hash[:20]}...')

# Check all keys in DB
c.execute('SELECT id, org_id, name, key_hash, prefix FROM api_keys')
rows = c.fetchall()
print(f'\nTotal API keys in DB: {len(rows)}')
for row in rows:
    db_hash = row[3]
    match = 'MATCH!' if db_hash == key_hash else ''
    print(f'  ID={row[0]}, org_id={row[1]}, name={row[2]}, prefix={row[4]}, hash={db_hash[:20]}... {match}')

# Direct lookup
c.execute('SELECT id, org_id FROM api_keys WHERE key_hash = ?', (key_hash,))
result = c.fetchone()
if result:
    print(f'\nDirect lookup found: ID={result[0]}, org_id={result[1]}')
else:
    print('\nDirect lookup: NOT FOUND')

conn.close()
