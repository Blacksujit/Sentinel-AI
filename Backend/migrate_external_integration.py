"""
Database Migration Script: Add External Integration Fields

This script adds new columns to the risk_logs table to support external client integration:
- source: Source application identifier
- user_id: End user identifier
- session_id: Session identifier for tracking
- client_metadata: Client-specific metadata as JSON

Run this script to update your existing database schema.
"""

import sqlite3
import sys
import os

def migrate_database():
    """Add new columns to the risk_logs table for external integration."""
    
    # Database path
    db_path = os.path.join(os.path.dirname(__file__), 'sentinel_ai.db')
    
    if not os.path.exists(db_path):
        print(f"❌ Database not found at: {db_path}")
        return False
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if columns already exist
        cursor.execute("PRAGMA table_info(risk_logs)")
        columns = [column[1] for column in cursor.fetchall()]
        
        # Columns to add
        new_columns = [
            ("source", "TEXT"),
            ("user_id", "TEXT"), 
            ("session_id", "TEXT"),
            ("client_metadata", "JSON")  # SQLite doesn't have JSON type, will store as TEXT
        ]
        
        added_columns = []
        
        for column_name, column_type in new_columns:
            if column_name not in columns:
                print(f"➕ Adding column: {column_name}")
                cursor.execute(f"ALTER TABLE risk_logs ADD COLUMN {column_name} {column_type}")
                added_columns.append(column_name)
            else:
                print(f"✅ Column already exists: {column_name}")
        
        if added_columns:
            conn.commit()
            print(f"✅ Migration completed! Added {len(added_columns)} new columns:")
            for col in added_columns:
                print(f"   - {col}")
        else:
            print("✅ All columns already exist. No migration needed.")
        
        # Verify the changes
        cursor.execute("PRAGMA table_info(risk_logs)")
        updated_columns = [column[1] for column in cursor.fetchall()]
        print(f"\n📋 Current table structure ({len(updated_columns)} columns):")
        for col in updated_columns:
            print(f"   - {col}")
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        return False

if __name__ == "__main__":
    print("🔄 Starting database migration for external integration...")
    success = migrate_database()
    
    if success:
        print("\n🎉 Migration completed successfully!")
        print("Your SentinelAI database now supports external client integration.")
    else:
        print("\n💥 Migration failed. Please check the error messages above.")
        sys.exit(1)
