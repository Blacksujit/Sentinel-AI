from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session
from app.storage.user_models import User

class UserService:
    @staticmethod
    def get_or_create_user(db: Session, clerk_user_id: str, email: str, name: Optional[str] = None) -> User:
        """Get existing user by clerk_user_id or create one."""
        user = db.query(User).filter(User.clerk_user_id == clerk_user_id).first()
        if not user:
            user = User(
                clerk_user_id=clerk_user_id,
                email=email,
                name=name or email.split("@")[0]
            )
            db.add(user)
            db.commit()  # Commit to persist the user
            db.refresh(user)  # Refresh to get the generated ID
        return user

    @staticmethod
    def update_last_login(db: Session, clerk_user_id: str) -> None:
        """Update last_login_at for a user."""
        user = db.query(User).filter(User.clerk_user_id == clerk_user_id).first()
        if user:
            user.last_login_at = datetime.now(timezone.utc)
            db.add(user)
            db.commit()
