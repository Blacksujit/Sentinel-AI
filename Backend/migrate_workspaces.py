"""Simple migration script using the app context to avoid circular imports."""

import sys
import os

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import after adding to path
from app.storage.db import SessionLocal
from app.services.workspace_service import WorkspaceService

def migrate():
    """Add default workspaces to organizations that don't have any."""
    db = SessionLocal()
    
    try:
        print("Starting migration: Adding default workspaces to existing organizations...")
        
        # Import models after session is created to avoid circular import issues
        from app.storage.org_models import Organization, OrgMembership
        from app.storage.workspace_models import Workspace, WorkspaceMember, WorkspaceRole
        from app.storage.user_models import User
        
        # Get all organizations
        orgs = db.query(Organization).all()
        print(f"Found {len(orgs)} organizations")
        
        for org in orgs:
            # Check if org already has workspaces
            existing_workspaces = db.query(Workspace).filter(Workspace.org_id == org.id).all()
            
            if existing_workspaces:
                print(f"  Org {org.id} ({org.name}): Already has {len(existing_workspaces)} workspace(s) - skipping")
                continue
            
            print(f"  Org {org.id} ({org.name}): No workspaces found - creating default workspace")
            
            # Create default workspace
            workspace = WorkspaceService.create_workspace(
                db=db,
                org_id=org.id,
                name="Default Workspace",
                created_by_user_id=org.owner_user_id
            )
            workspace.is_default = True
            
            # Create default roles for the workspace
            WorkspaceService.create_default_workspace_roles(db, workspace.id)
            
            # Get the OWNER role for the workspace
            workspace_owner_role = db.query(WorkspaceRole).filter(
                WorkspaceRole.workspace_id == workspace.id,
                WorkspaceRole.name == "OWNER"
            ).first()
            
            if workspace_owner_role:
                # Add the owner as a workspace member with OWNER role
                WorkspaceService.add_workspace_member(
                    db=db,
                    workspace_id=workspace.id,
                    user_id=org.owner_user_id,
                    role_id=workspace_owner_role.id
                )
                print(f"    Created default workspace '{workspace.name}' (ID: {workspace.id})")
            else:
                print(f"    ERROR: Failed to create workspace owner role")
        
        db.commit()
        print("\nMigration completed successfully!")
        
        # Verify
        print("\nVerification:")
        all_workspaces = db.query(Workspace).all()
        print(f"Total workspaces in database: {len(all_workspaces)}")
        for ws in all_workspaces:
            print(f"  - {ws.name} (ID: {ws.id}, Org ID: {ws.org_id}, Default: {ws.is_default})")
        
    except Exception as e:
        print(f"\nERROR during migration: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    migrate()
