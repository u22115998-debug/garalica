import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.models import Attachment, Issue, User
from app.schemas import AttachmentOut
from app.auth import get_current_user
from app.config import get_settings

router = APIRouter(prefix="/api", tags=["uploads"])

ALLOWED_IMAGE_TYPES = {
    "image/jpeg", "image/png", "image/gif", "image/webp"
}
ALLOWED_VIDEO_TYPES = {
    "video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"
}
ALLOWED_TYPES = ALLOWED_IMAGE_TYPES | ALLOWED_VIDEO_TYPES


@router.post(
    "/issues/{issue_key}/attachments",
    response_model=AttachmentOut,
    status_code=status.HTTP_201_CREATED,
)
async def upload_attachment(
    issue_key: str,
    file: UploadFile = File(...),
    comment_id: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    settings = get_settings()

    issue = db.query(Issue).filter(Issue.key == issue_key.upper()).first()
    if issue is None:
        raise HTTPException(status_code=404, detail="Issue not found")

    # Validate mime type
    content_type = file.content_type or "application/octet-stream"
    if content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type '{content_type}' is not allowed",
        )

    # Read file and check size
    data = await file.read()
    size = len(data)

    if content_type in ALLOWED_IMAGE_TYPES and size > settings.MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Image exceeds {settings.MAX_IMAGE_SIZE // (1024*1024)} MB limit",
        )
    if content_type in ALLOWED_VIDEO_TYPES and size > settings.MAX_VIDEO_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Video exceeds {settings.MAX_VIDEO_SIZE // (1024*1024)} MB limit",
        )

    # Save file
    # Sanitize and safely truncate the filename
    original_filename = file.filename or "file"
    # Extract extension safely
    ext = os.path.splitext(original_filename)[1] or ".bin"
    # Limit filename length and remove null bytes or extremely weird chars if any
    safe_filename = "".join(c for c in original_filename if c.isprintable())
    if len(safe_filename) > 250:
        safe_filename = safe_filename[:200] + "..." + ext
    
    unique_name = f"{uuid.uuid4().hex}{ext}"
    issue_dir = os.path.join(settings.UPLOAD_DIR, issue.key)
    os.makedirs(issue_dir, exist_ok=True)
    file_path = os.path.join(issue_dir, unique_name)

    with open(file_path, "wb") as f:
        f.write(data)

    # Save to database
    relative_path = f"/uploads/{issue.key}/{unique_name}"
    attachment = Attachment(
        issue_id=issue.id,
        comment_id=comment_id,
        uploader_id=current_user.id,
        filename=safe_filename or unique_name,
        filepath=relative_path,
        mime_type=content_type[:128],  # also ensure mime_type fits in DB

        size_bytes=size,
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)
    return attachment


@router.get("/uploads/{issue_key}/{filename}")
def serve_upload(issue_key: str, filename: str):
    settings = get_settings()
    file_path = os.path.join(settings.UPLOAD_DIR, issue_key, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path)


@router.get("/issues/{issue_key}/attachments", response_model=list[AttachmentOut])
def list_attachments(
    issue_key: str,
    db: Session = Depends(get_db),
):
    issue = db.query(Issue).filter(Issue.key == issue_key.upper()).first()
    if issue is None:
        raise HTTPException(status_code=404, detail="Issue not found")

    attachments = (
        db.query(Attachment)
        .filter(Attachment.issue_id == issue.id)
        .order_by(Attachment.created_at.desc())
        .all()
    )
    return attachments


@router.delete("/attachments/{attachment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_attachment(
    attachment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    attachment = db.query(Attachment).filter(Attachment.id == attachment_id).first()
    if attachment is None:
        raise HTTPException(status_code=404, detail="Attachment not found")

    if attachment.uploader_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Delete file from disk
    settings = get_settings()
    full_path = os.path.join(
        settings.UPLOAD_DIR,
        attachment.filepath.lstrip("/uploads/")
    )
    if os.path.exists(full_path):
        os.remove(full_path)

    db.delete(attachment)
    db.commit()
