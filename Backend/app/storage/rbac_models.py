from sqlalchemy import Column, DateTime, Integer, String, ForeignKey, Table
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .db import Base

# Association table for role-permission many-to-many
rbac_role_permissions = Table(
    "rbac_role_permissions",
    Base.metadata,
    Column("role_id", Integer, ForeignKey("rbac_roles.id"), primary_key=True),
    Column("permission_id", Integer, ForeignKey("rbac_permissions.id"), primary_key=True),
)

class RbacPermission(Base):
    __tablename__ = "rbac_permissions"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, nullable=False, index=True)
    description = Column(String, nullable=True)

    # Relationships
    roles = relationship("RbacRole", secondary=rbac_role_permissions, back_populates="permissions")

    def __repr__(self):
        return f"<RbacPermission(key={self.key})>"

class RbacRole(Base):
    __tablename__ = "rbac_roles"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=True, index=True)  # nullable for system-wide roles
    name = Column(String, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    organization = relationship("Organization", back_populates="rbac_roles")
    permissions = relationship("RbacPermission", secondary=rbac_role_permissions, back_populates="roles")
    memberships = relationship("OrgMembership", back_populates="role")

    def __repr__(self):
        return f"<RbacRole(id={self.id}, name={self.name})>"
