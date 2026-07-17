from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import Comment, Issue, User
from app.schemas import CommentCreate, CommentUpdate, CommentOut, UserOut
from app.auth import get_current_user
from app.email_utils import send_comment_notification, send_admin_notification

router = APIRouter(prefix="/api/issues/{issue_key}/comments", tags=["comments"])


def _comment_to_out(comment: Comment) -> CommentOut:
    return CommentOut(
        id=comment.id,
        issue_id=comment.issue_id,
        author=UserOut.model_validate(comment.author),
        body=comment.body,
        created_at=comment.created_at,
        updated_at=comment.updated_at,
        attachments=[],
    )


@router.get("", response_model=list[CommentOut])
def list_comments(
    issue_key: str,
    db: Session = Depends(get_db),
):
    issue = db.query(Issue).filter(Issue.key == issue_key.upper()).first()
    if issue is None:
        raise HTTPException(status_code=404, detail="Issue not found")

    comments = (
        db.query(Comment)
        .options(joinedload(Comment.author))
        .filter(Comment.issue_id == issue.id)
        .order_by(Comment.created_at.asc())
        .all()
    )
    return [_comment_to_out(c) for c in comments]


@router.post("", response_model=CommentOut, status_code=status.HTTP_201_CREATED)
def create_comment(
    issue_key: str,
    req: CommentCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    issue = db.query(Issue).options(joinedload(Issue.reporter)).filter(Issue.key == issue_key.upper()).first()
    if issue is None:
        raise HTTPException(status_code=404, detail="Issue not found")

    comment = Comment(
        issue_id=issue.id,
        author_id=current_user.id,
        body=req.body,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)

    comment = (
        db.query(Comment)
        .options(joinedload(Comment.author))
        .filter(Comment.id == comment.id)
        .first()
    )

    if issue.reporter_id != current_user.id:
        background_tasks.add_task(
            send_comment_notification,
            issue.reporter.email,
            issue.key,
            current_user.display_name,
            comment.body
        )

    # Notify admins
    admins = db.query(User.email).filter(User.is_admin == True).all()
    admin_emails = [admin[0] for admin in admins]
    background_tasks.add_task(
        send_admin_notification,
        admin_emails,
        f"New Comment on {issue.key}",
        f"<p><strong>{current_user.display_name}</strong> commented on <strong>{issue.key}</strong>:</p><blockquote style='border-left: 4px solid #ddd; padding-left: 10px; color: #555;'>{comment.body}</blockquote>"
    )

    return _comment_to_out(comment)


@router.patch("/{comment_id}", response_model=CommentOut)
def update_comment(
    issue_key: str,
    comment_id: str,
    req: CommentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    comment = (
        db.query(Comment)
        .options(joinedload(Comment.author))
        .filter(Comment.id == comment_id)
        .first()
    )
    if comment is None:
        raise HTTPException(status_code=404, detail="Comment not found")

    if comment.author_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")

    comment.body = req.body
    db.commit()
    db.refresh(comment)
    return _comment_to_out(comment)


@router.delete("/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_comment(
    issue_key: str,
    comment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if comment is None:
        raise HTTPException(status_code=404, detail="Comment not found")

    if comment.author_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")

    db.delete(comment)
    db.commit()
