"""Migration script to convert organization members to workspace system."""

import sqlite3
import sys
from datetime import datetime


def migrate_org_members_to_workspaces():
    """Migrate existing organization members to default workspace."""
    
    print("🔄 Starting migration from org members to workspaces...")
    
    try:
        conn = sqlite3.connect('sentinel_ai.db')
        cursor = conn.cursor()
        
        # Get all organizations
        cursor.execute('SELECT id, name FROM organizations ORDER BY id')
        orgs = cursor.fetchall()
        print(f"📋 Found {len(orgs)} organizations")
        
        # Check if workspaces table exists
        cursor.execute('SELECT name FROM sqlite_master WHERE type="table" AND name="workspaces"')
        workspaces_table_exists = cursor.fetchone() is not None
        
        if not workspaces_table_exists:
            print("❌ Workspaces table not found. Please run database migrations first.")
            return False
        
        # Create/find default workspace and roles, then migrate members for EACH org
        for org_id, org_name in orgs:
            # Ensure exactly one default workspace per org
            cursor.execute(
                'SELECT id FROM workspaces WHERE org_id = ? AND is_default = 1 ORDER BY id LIMIT 1',
                (org_id,),
            )
            row = cursor.fetchone()
            if row:
                workspace_id = row[0]
            else:
                print(f"🏗️ Creating default workspace for org {org_id} ({org_name})")
                cursor.execute(
                    '''
                    INSERT INTO workspaces (
                        org_id, name, slug, description, is_default, created_by_user_id, created_at, updated_at, settings
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''',
                    (
                        org_id,
                        org_name,
                        f'workspace-{org_id}',
                        f'Default workspace for {org_name}',
                        1,
                        None,
                        datetime.now(),
                        datetime.now(),
                        '{}',
                    ),
                )
                workspace_id = cursor.lastrowid

            # Ensure default workspace roles exist for this workspace
            default_roles = [
                ("VIEWER", 1, "Can view workspace content"),
                ("DEVELOPER", 2, "Can access workspace tools and modify content"),
                ("ADMIN", 3, "Can manage workspace members and settings"),
                ("OWNER", 4, "Full control over workspace"),
            ]
            for role_name, level, description in default_roles:
                cursor.execute(
                    'SELECT id FROM workspace_roles WHERE workspace_id = ? AND name = ? LIMIT 1',
                    (workspace_id, role_name),
                )
                if cursor.fetchone() is None:
                    cursor.execute(
                        '''
                        INSERT INTO workspace_roles (
                            workspace_id, name, description, level, created_at, updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?)
                        ''',
                        (workspace_id, role_name, description, level, datetime.now(), datetime.now()),
                    )

            # Build mapping from role name -> workspace_roles.id
            cursor.execute(
                'SELECT id, name FROM workspace_roles WHERE workspace_id = ?',
                (workspace_id,),
            )
            role_id_by_name = {name.upper(): role_id for role_id, name in cursor.fetchall()}

            print(f"🔄 Migrating members to default workspace for org {org_id}")
            cursor.execute(
                '''
                SELECT 
                    om.user_id, u.email, om.joined_at,
                    wr.name as role_name
                FROM org_memberships om
                JOIN rbac_roles wr ON om.role_id = wr.id
                JOIN users u ON om.user_id = u.id
                WHERE om.org_id = ?
                ''',
                (org_id,),
            )
            org_members = cursor.fetchall()
            print(f"📊 Found {len(org_members)} org members to migrate")

            migrated_count = 0
            for user_id, email, joined_at, role_name in org_members:
                target_role_id = role_id_by_name.get((role_name or "VIEWER").upper(), role_id_by_name.get("VIEWER"))
                if not target_role_id:
                    continue

                # Idempotent insert into workspace_members
                cursor.execute(
                    'SELECT 1 FROM workspace_members WHERE workspace_id = ? AND user_id = ? LIMIT 1',
                    (workspace_id, user_id),
                )
                if cursor.fetchone() is None:
                    cursor.execute(
                        '''
                        INSERT INTO workspace_members (
                            workspace_id, user_id, role_id, joined_at, is_active
                        ) VALUES (?, ?, ?, ?, ?)
                        ''',
                        (workspace_id, user_id, target_role_id, joined_at, 1),
                    )
                    migrated_count += 1

            print(f"✅ Migrated {migrated_count} members to workspace {workspace_id} (org {org_id})")
        
        conn.commit()
        print("🎉 Migration completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Migration failed: {str(e)}")
        return False
    finally:
        if 'conn' in locals():
            conn.close()


if __name__ == "__main__":
    success = migrate_org_members_to_workspaces()
    if success:
        print("✅ Migration completed! You can now start the backend.")
    else:
        print("❌ Migration failed! Please check the error above.")
        sys.exit(1)
