import sqlite3

conn = sqlite3.connect('sentinel.db')
cursor = conn.cursor()

# List all tables
cursor.execute('SELECT name FROM sqlite_master WHERE type="table"')
tables = cursor.fetchall()
print('All tables:', [t[0] for t in tables])

# Check each table for org_id and key columns
for t in tables:
    table_name = t[0]
    cursor.execute(f'PRAGMA table_info({table_name})')
    cols = cursor.fetchall()
    col_names = [col[1] for col in cols]
    has_org = 'org_id' in col_names
    key_cols = [cn for cn in col_names if 'key' in cn.lower()]
    if has_org or key_cols:
        print(f'\n{table_name}:')
        if has_org:
            print(f'  -> Has org_id')
        if key_cols:
            print(f'  -> Key cols: {key_cols}')

conn.close()
