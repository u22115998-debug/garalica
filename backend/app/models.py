import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Text, Boolean, Integer, DateTime,
    ForeignKey, BigInteger, Enum as SAEnum
)
from sqlalchemy.orm import relationship
import enum
from app.database import Base


# ── Enums ──────────────────────────────────────────────

class IssueStatus(str, enum.Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"


class IssuePriority(str, enum.Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class IssueType(str, enum.Enum):
    BUG = "bug"
    FEATURE = "feature"
    TASK = "task"


# ── Helpers ────────────────────────────────────────────

def _uuid() -> str:
    return str(uuid.uuid4())


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


# ── Models ─────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=_uuid)
    username = Column(String(64), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    display_name = Column(String(128), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_admin = Column(Boolean, default=False, nullable=False)
    avatar_url = Column(String(512), nullable=True)
    bio = Column(String(512), nullable=True)
    readme = Column(Text, nullable=True)
    website_url = Column(String(512), nullable=True)
    github_url = Column(String(512), nullable=True)
    twitter_url = Column(String(512), nullable=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    
    is_verified = Column(Boolean, default=False, nullable=False)
    verification_code_hash = Column(String(64), nullable=True)
    verification_code_expires_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    reported_issues = relationship(
        "Issue", back_populates="reporter", foreign_keys="Issue.reporter_id"
    )
    assigned_issues = relationship(
        "Issue", back_populates="assignee", foreign_keys="Issue.assignee_id"
    )
    comments = relationship("Comment", back_populates="author")


class IssueCounter(Base):
    """Singleton row to track the next issue number."""
    __tablename__ = "issue_counter"

    id = Column(Integer, primary_key=True, default=1)
    next_number = Column(Integer, default=1, nullable=False)


class Issue(Base):
    __tablename__ = "issues"

    id = Column(String(36), primary_key=True, default=_uuid)
    issue_number = Column(Integer, unique=True, nullable=False, index=True)
    key = Column(String(32), unique=True, nullable=False, index=True)  # e.g. BUG-123
    title = Column(String(512), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(
        SAEnum(IssueStatus, values_callable=lambda x: [e.value for e in x]),
        default=IssueStatus.OPEN,
        nullable=False,
        index=True,
    )
    priority = Column(
        SAEnum(IssuePriority, values_callable=lambda x: [e.value for e in x]),
        default=IssuePriority.MEDIUM,
        nullable=False,
    )
    issue_type = Column(
        SAEnum(IssueType, values_callable=lambda x: [e.value for e in x]),
        default=IssueType.BUG,
        nullable=False,
    )
    reporter_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    assignee_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at = Column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False
    )

    # Relationships
    reporter = relationship("User", back_populates="reported_issues", foreign_keys=[reporter_id])
    assignee = relationship("User", back_populates="assigned_issues", foreign_keys=[assignee_id])
    comments = relationship("Comment", back_populates="issue", cascade="all, delete-orphan")
    attachments = relationship(
        "Attachment", back_populates="issue", cascade="all, delete-orphan"
    )


class Comment(Base):
    __tablename__ = "comments"

    id = Column(String(36), primary_key=True, default=_uuid)
    issue_id = Column(String(36), ForeignKey("issues.id", ondelete="CASCADE"), nullable=False)
    author_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    body = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at = Column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False
    )

    # Relationships
    issue = relationship("Issue", back_populates="comments")
    author = relationship("User", back_populates="comments")
    attachments = relationship(
        "Attachment", back_populates="comment", cascade="all, delete-orphan"
    )


class Attachment(Base):
    __tablename__ = "attachments"

    id = Column(String(36), primary_key=True, default=_uuid)
    issue_id = Column(String(36), ForeignKey("issues.id", ondelete="CASCADE"), nullable=False)
    comment_id = Column(
        String(36), ForeignKey("comments.id", ondelete="CASCADE"), nullable=True
    )
    uploader_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    filename = Column(String(512), nullable=False)
    filepath = Column(String(1024), nullable=False)
    mime_type = Column(String(128), nullable=False)
    size_bytes = Column(BigInteger, nullable=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)

    # Relationships
    issue = relationship("Issue", back_populates="attachments")
    comment = relationship("Comment", back_populates="attachments")
    uploader = relationship("User")
