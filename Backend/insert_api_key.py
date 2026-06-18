"""
Insert an API key into the sentinel_ai.db database.
Usage: python insert_api_key.py <raw_key> [org_id]
   or: python insert_api_key.py  (reads from SENTINELAI_INSERT_KEY env var, org_id defaults to 1)
"""

import sqlite3
from datetime import datetime
import hashlib
import os
import sys


def insert_api_key(raw_key: str, org_id: int = 1):
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

    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()

    # Check if key already exists
    c.execute('SELECT id, org_id FROM api_keys WHERE key_hash = ?', (key_hash,))
    row = c.fetchone()
    if row:
        print(f'Key already exists: ID={row[0]}, org_id={row[1]}')
        if row[1] != org_id:
            c.execute('UPDATE api_keys SET org_id = ? WHERE id = ?', (org_id, row[0]))
            conn.commit()
            print(f'Updated org_id to {org_id}')
    else:
        # Insert new key
        permissions = '{"analyze": true}'
        now = datetime.utcnow().isoformat()
        prefix = raw_key[:15]

        c.execute('''
            INSERT INTO api_keys (org_id, name, key_hash, prefix, permissions, created_at, last_used_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (org_id, 'External Test Key', key_hash, prefix, permissions, now, None))
        conn.commit()
        print(f'Inserted API key with ID: {c.lastrowid}, org_id: {org_id}')

    # Verify
    c.execute('SELECT id, org_id, name, prefix FROM api_keys WHERE key_hash = ?', (key_hash,))
    row = c.fetchone()
    if row:
        print(f'Verified: ID={row[0]}, org_id={row[1]}, name={row[2]}, prefix={row[3]}')

    conn.close()


if __name__ == '__main__':
    raw_key = os.getenv("SENTINELAI_INSERT_KEY", "")
    org_id = 1
    if len(sys.argv) >= 2:
        raw_key = sys.argv[1]
    if len(sys.argv) >= 3:
        org_id = int(sys.argv[2])

    if not raw_key:
        print("ERROR: No API key provided.")
        print("Usage: python insert_api_key.py <raw_key> [org_id]")
        print("   or: set SENTINELAI_INSERT_KEY environment variable")
        sys.exit(1)

    insert_api_key(raw_key, org_id)
