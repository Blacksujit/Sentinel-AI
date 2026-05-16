import sqlite3
from datetime import datetime
import hashlib
import sys

def insert_api_key():
    conn = sqlite3.connect('sentinel_ai.db')
    c = conn.cursor()

    # Check if table exists
    c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='api_keys'")
    if not c.fetchone():
        print('api_keys table not found - checking available tables')
        c.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = c.fetchall()
        print(f'Tables: {tables}')
        conn.close()
        return

    # Check existing keys
    c.execute('SELECT id, key_hash, org_id FROM api_keys')
    existing = c.fetchall()
    print(f'Existing API keys: {len(existing)}')
    for row in existing:
        print(f'  ID {row[0]}: org_id={row[2]}')

    # Insert the key
    raw_key = 'sk_sentinel_1I0sD34kbspbiteumwM2OMbKO2wc3KpkQ03IoU'
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()

    # Check if key already exists
    c.execute('SELECT id, org_id FROM api_keys WHERE key_hash = ?', (key_hash,))
    row = c.fetchone()
    if row:
        print(f'Key already exists: ID={row[0]}, org_id={row[1]}')
        if row[1] != 27:
            c.execute('UPDATE api_keys SET org_id = ? WHERE id = ?', (27, row[0]))
            conn.commit()
            print(f'Updated org_id to 27')
    else:
        # Insert new key
        permissions = '{"analyze": true}'
        now = datetime.utcnow().isoformat()
        prefix = raw_key[:15]

        c.execute('''
            INSERT INTO api_keys (org_id, name, key_hash, prefix, permissions, created_at, last_used_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (27, 'External Test Key', key_hash, prefix, permissions, now, None))
        conn.commit()
        print(f'Inserted API key with ID: {c.lastrowid}, org_id: 27')

    # Verify
    c.execute('SELECT id, org_id, name, prefix FROM api_keys WHERE key_hash = ?', (key_hash,))
    row = c.fetchone()
    if row:
        print(f'Verified: ID={row[0]}, org_id={row[1]}, name={row[2]}, prefix={row[3]}')

    conn.close()

if __name__ == '__main__':
    insert_api_key()
