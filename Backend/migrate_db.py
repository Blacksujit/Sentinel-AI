"""
Database migration script to add audit logging columns to risk_logs table.

Run this script to update the database schema with new audit columns:
- decision
- decision_reason  
- signals
"""

import sqlite3
import sys
import os

def migrate_database():
    """Add audit logging columns to risk_logs table and create workspace tables."""
    
    # Database path
    db_path = "sentinel_ai.db"
    
    if not os.path.exists(db_path):
        print(f"Database file not found at {db_path}")
        print("Please ensure the database exists before running migration.")
        return False
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if columns already exist
        cursor.execute("PRAGMA table_info(risk_logs)")
        columns = [row[1] for row in cursor.fetchall()]
        
        # Columns to add
        migrations = []
        
        if "decision" not in columns:
            migrations.append("ADD COLUMN decision TEXT NOT NULL DEFAULT 'unknown'")
        
        if "decision_reason" not in columns:
            migrations.append("ADD COLUMN decision_reason TEXT NOT NULL DEFAULT 'No reason provided'")
        
        if "signals" not in columns:
            migrations.append("ADD COLUMN signals TEXT NOT NULL DEFAULT '[]'")
        
        # Add workspace tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='workspaces'")
        workspaces_exists = cursor.fetchone() is not None
        
        if not workspaces_exists:
            print("Creating workspaces table...")
            cursor.execute("""
                CREATE TABLE workspaces (
                    id INTEGER PRIMARY KEY,
                    org_id INTEGER NOT NULL,
                    name VARCHAR(255) NOT NULL,
                    slug VARCHAR(255) UNIQUE NOT NULL,
                    description TEXT,
                    is_default BOOLEAN DEFAULT 1,
                    created_by_user_id INTEGER,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    settings TEXT DEFAULT '{}'
                )
            """)
            print("Creating workspace_roles table...")
            cursor.execute("""
                CREATE TABLE workspace_roles (
                    id INTEGER PRIMARY KEY,
                    workspace_id INTEGER NOT NULL,
                    name VARCHAR(255) NOT NULL,
                    description TEXT,
                    level INTEGER NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            print("Creating workspace_members table...")
            cursor.execute("""
                CREATE TABLE workspace_members (
                    workspace_id INTEGER NOT NULL,
                    user_id INTEGER NOT NULL,
                    role_id INTEGER NOT NULL,
                    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    is_active BOOLEAN DEFAULT 1
                )
            """)
            print("Creating workspace_invites table...")
            cursor.execute("""
                CREATE TABLE workspace_invites (
                    id INTEGER PRIMARY KEY,
                    workspace_id INTEGER NOT NULL,
                    email VARCHAR(255) NOT NULL,
                    role_id INTEGER NOT NULL,
                    invited_by_user_id INTEGER NOT NULL,
                    token VARCHAR(64) UNIQUE NOT NULL,
                    status VARCHAR(50) DEFAULT 'pending',
                    expires_at DATETIME NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    accepted_at DATETIME,
                    accepted_by_user_id INTEGER
                )
            """)
        
        # Execute migrations
        for migration in migrations:
            alter_sql = f"ALTER TABLE risk_logs {migration}"
            print(f"Executing: {alter_sql}")
            cursor.execute(alter_sql)
        
        # Commit changes
        conn.commit()
        
        # Verify the changes
        cursor.execute("PRAGMA table_info(risk_logs)")
        updated_columns = [row[1] for row in cursor.fetchall()]
        
        print(f"Migration completed successfully!")
        print(f"Updated columns: {updated_columns}")
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"Migration failed: {e}")
        return False

if __name__ == "__main__":
    print("Starting database migration...")
    success = migrate_database()
    
    if success:
        print("✅ Migration completed successfully!")
        print("Restart the SentinelAI server to enable audit logging.")
    else:
        print("❌ Migration failed. Please check the error above.")
        sys.exit(1)
