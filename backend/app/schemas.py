from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


# ── Auth ───────────────────────────────────────────────

class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=64)
    email: EmailStr
    display_name: str = Field(..., min_length=1, max_length=128)
    password: str = Field(..., min_length=6)
    password_confirm: str = Field(..., min_length=6)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str

class VerifyEmailRequest(BaseModel):
    code: str = Field(..., min_length=6, max_length=6)


# ── User ───────────────────────────────────────────────

class UserOut(BaseModel):
    id: str
    username: str
    email: str
    display_name: str
    is_admin: bool
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    created_at: datetime
    is_verified: bool

    model_config = {"from_attributes": True}


class ProfileOut(BaseModel):
    id: str
    username: str
    email: str
    display_name: str
    is_admin: bool
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    readme: Optional[str] = None
    website_url: Optional[str] = None
    github_url: Optional[str] = None
    twitter_url: Optional[str] = None
    created_at: datetime
    issue_count: int = 0
    comment_count: int = 0
    is_verified: bool

    model_config = {"from_attributes": True}


class ProfileUpdate(BaseModel):
    display_name: Optional[str] = Field(None, min_length=1, max_length=128)
    bio: Optional[str] = Field(None, max_length=512)
    readme: Optional[str] = None
    website_url: Optional[str] = Field(None, max_length=512)
    github_url: Optional[str] = Field(None, max_length=512)
    twitter_url: Optional[str] = Field(None, max_length=512)


# ── Issue ──────────────────────────────────────────────

class IssueCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=512)
    description: Optional[str] = None
    priority: str = "medium"
    issue_type: str = "bug"
    assignee_id: Optional[str] = None


class IssueUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    issue_type: Optional[str] = None
    assignee_id: Optional[str] = None


class IssueOut(BaseModel):
    id: str
    issue_number: int
    key: str
    title: str
    description: Optional[str] = None
    status: str
    priority: str
    issue_type: str
    reporter: UserOut
    assignee: Optional[UserOut] = None
    created_at: datetime
    updated_at: datetime
    attachment_count: int = 0
    comment_count: int = 0

    model_config = {"from_attributes": True}


class IssueListOut(BaseModel):
    issues: list[IssueOut]
    total: int
    page: int
    page_size: int


# ── Comment ────────────────────────────────────────────

class CommentCreate(BaseModel):
    body: str = Field(..., min_length=1)


class CommentUpdate(BaseModel):
    body: str = Field(..., min_length=1)


class CommentOut(BaseModel):
    id: str
    issue_id: str
    author: UserOut
    body: str
    created_at: datetime
    updated_at: datetime
    attachments: list["AttachmentOut"] = []

    model_config = {"from_attributes": True}


# ── Attachment ─────────────────────────────────────────

class AttachmentOut(BaseModel):
    id: str
    issue_id: str
    comment_id: Optional[str] = None
    filename: str
    filepath: str
    mime_type: str
    size_bytes: int
    created_at: datetime

    model_config = {"from_attributes": True}
