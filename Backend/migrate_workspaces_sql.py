"""Migration script using raw SQL to avoid circular import issues."""

import sqlite3
import os
from datetime import datetime

def migrate():
    """Add default workspaces to organizations that don't have any using raw SQL."""
    
    # Get database path from environment or use default
    db_path = os.path.join(os.path.dirname(__file__), "sentinel_ai.db")
    
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        print("Starting migration: Adding default workspaces to existing organizations...")
        
        # Get all organizations
        cursor.execute("SELECT id, name, owner_user_id FROM organizations")
        orgs = cursor.fetchall()
        print(f"Found {len(orgs)} organizations")
        
        migrated_count = 0
        
        for org_id, org_name, owner_user_id in orgs:
            # Check if org already has workspaces
            cursor.execute("SELECT id FROM workspaces WHERE org_id = ?", (org_id,))
            existing_workspaces = cursor.fetchall()
            
            if existing_workspaces:
                print(f"  Org {org_id} ({org_name}): Already has {len(existing_workspaces)} workspace(s) - skipping")
                continue
            
            print(f"  Org {org_id} ({org_name}): No workspaces found - creating default workspace")

            # Generate unique slug
            base_slug = f"default-workspace-{org_id}"
            slug = base_slug

            # Create workspace
            cursor.execute(
                "INSERT INTO workspaces (org_id, name, slug, created_by_user_id, is_default, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (org_id, "Default Workspace", slug, owner_user_id, 1, datetime.now(), datetime.now())
            )
            workspace_id = cursor.lastrowid
            print(f"    Created default workspace (ID: {workspace_id})")
            
            # Create default roles for the workspace
            roles = [
                ("VIEWER", 1, "Can view workspace content"),
                ("DEVELOPER", 2, "Can access workspace tools and modify content"),
                ("ADMIN", 3, "Can manage workspace members and settings"),
                ("OWNER", 4, "Full control over workspace"),
            ]
            
            role_ids = {}
            for role_name, level, description in roles:
                cursor.execute(
                    "INSERT INTO workspace_roles (workspace_id, name, level, description) VALUES (?, ?, ?, ?)",
                    (workspace_id, role_name, level, description)
                )
                role_ids[role_name] = cursor.lastrowid
            
            # Add the owner as a workspace member with OWNER role
            cursor.execute(
                "INSERT INTO workspace_members (workspace_id, user_id, role_id, is_active, joined_at) VALUES (?, ?, ?, ?, ?)",
                (workspace_id, owner_user_id, role_ids["OWNER"], 1, datetime.now())
            )
            
            migrated_count += 1
            print(f"    Added owner as workspace member with OWNER role")
        
        conn.commit()
        print(f"\nMigration completed successfully! Migrated {migrated_count} organizations.")
        
        # Verify
        print("\nVerification:")
        cursor.execute("SELECT id, name, org_id, is_default FROM workspaces")
        workspaces = cursor.fetchall()
        print(f"Total workspaces in database: {len(workspaces)}")
        for ws in workspaces:
            print(f"  - {ws[1]} (ID: {ws[0]}, Org ID: {ws[2]}, Default: {ws[3]})")
        
    except Exception as e:
        print(f"\nERROR during migration: {e}")
        import traceback
        traceback.print_exc()
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
