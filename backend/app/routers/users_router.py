import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import User, Issue, Comment
from app.schemas import ProfileOut, ProfileUpdate
from app.auth import get_current_user, get_optional_user
from app.config import get_settings
from typing import Optional

router = APIRouter(prefix="/api/users", tags=["users"])


def _user_to_profile(user: User, db: Session) -> ProfileOut:
    issue_count = db.query(func.count(Issue.id)).filter(Issue.reporter_id == user.id).scalar()
    comment_count = db.query(func.count(Comment.id)).filter(Comment.author_id == user.id).scalar()

    return ProfileOut(
        id=user.id,
        username=user.username,
        email=user.email,
        display_name=user.display_name,
        is_admin=user.is_admin,
        avatar_url=user.avatar_url,
        bio=user.bio,
        readme=user.readme,
        website_url=user.website_url,
        github_url=user.github_url,
        twitter_url=user.twitter_url,
        created_at=user.created_at,
        issue_count=issue_count,
        comment_count=comment_count,
        is_verified=user.is_verified,
    )


@router.get("/{username}", response_model=ProfileOut)
def get_profile(
    username: str,
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return _user_to_profile(user, db)


@router.patch("/{username}", response_model=ProfileOut)
def update_profile(
    username: str,
    req: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    # Only the user themselves or an admin can update
    if user.id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to update this profile")

    update_data = req.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)

    db.commit()
    db.refresh(user)
    return _user_to_profile(user, db)


@router.post("/{username}/avatar", response_model=ProfileOut)
async def upload_avatar(
    username: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    settings = get_settings()

    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    if user.id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Validate
    content_type = file.content_type or ""
    allowed = {"image/jpeg", "image/png", "image/gif", "image/webp"}
    if content_type not in allowed:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, GIF, or WebP images are allowed")

    data = await file.read()
    if len(data) > 5_242_880:  # 5 MB
        raise HTTPException(status_code=413, detail="Avatar must be under 5 MB")

    # Save
    ext = os.path.splitext(file.filename or "avatar")[1] or ".png"
    unique_name = f"{uuid.uuid4().hex}{ext}"
    avatar_dir = os.path.join(settings.UPLOAD_DIR, "avatars")
    os.makedirs(avatar_dir, exist_ok=True)
    file_path = os.path.join(avatar_dir, unique_name)

    # Delete old avatar if exists
    if user.avatar_url:
        old_path = os.path.join(
            settings.UPLOAD_DIR,
            user.avatar_url.lstrip("/uploads/")
        )
        if os.path.exists(old_path):
            os.remove(old_path)

    with open(file_path, "wb") as f:
        f.write(data)

    user.avatar_url = f"/uploads/avatars/{unique_name}"
    db.commit()
    db.refresh(user)
    return _user_to_profile(user, db)
