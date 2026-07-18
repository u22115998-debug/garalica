from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status, BackgroundTasks
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, desc, asc, case

from app.database import get_db
from app.models import (
    Issue, IssueCounter, User, Comment, Attachment,
    IssueStatus, IssuePriority, IssueType,
)
from app.schemas import IssueCreate, IssueUpdate, IssueOut, IssueListOut, UserOut
from app.auth import get_current_user, get_optional_user
from app.email_utils import send_admin_notification, send_status_change_notification

router = APIRouter(prefix="/api/issues", tags=["issues"])


def _issue_to_out(issue: Issue, db: Session) -> IssueOut:
    comment_count = db.query(func.count(Comment.id)).filter(Comment.issue_id == issue.id).scalar()
    attachment_count = db.query(func.count(Attachment.id)).filter(Attachment.issue_id == issue.id).scalar()

    return IssueOut(
        id=issue.id,
        issue_number=issue.issue_number,
        key=issue.key,
        title=issue.title,
        description=issue.description,
        status=issue.status.value if isinstance(issue.status, IssueStatus) else issue.status,
        priority=issue.priority.value if isinstance(issue.priority, IssuePriority) else issue.priority,
        issue_type=issue.issue_type.value if isinstance(issue.issue_type, IssueType) else issue.issue_type,
        reporter=UserOut.model_validate(issue.reporter),
        assignee=UserOut.model_validate(issue.assignee) if issue.assignee else None,
        created_at=issue.created_at,
        updated_at=issue.updated_at,
        comment_count=comment_count,
        attachment_count=attachment_count,
    )


@router.get("", response_model=IssueListOut)
def list_issues(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: Optional[str] = Query(None, alias="status"),
    priority: Optional[str] = None,
    issue_type: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: str = Query("created", regex="^(created|updated|priority)$"),
    sort_dir: str = Query("desc", regex="^(asc|desc)$"),
    reporter_id: Optional[str] = None,
    assignee_id: Optional[str] = None,
    db: Session = Depends(get_db),
    _user: Optional[User] = Depends(get_optional_user),
):
    query = db.query(Issue).options(
        joinedload(Issue.reporter),
        joinedload(Issue.assignee),
    )

    # Filters
    if status_filter:
        query = query.filter(Issue.status == status_filter)
    if priority:
        query = query.filter(Issue.priority == priority)
    if issue_type:
        query = query.filter(Issue.issue_type == issue_type)
    if reporter_id:
        query = query.filter(Issue.reporter_id == reporter_id)
    if assignee_id:
        query = query.filter(Issue.assignee_id == assignee_id)
    if search:
        like = f"%{search}%"
        query = query.filter(
            (Issue.title.ilike(like)) | (Issue.key.ilike(like))
        )

    total = query.count()

    # Sorting
    sort_col = {
        "created": Issue.created_at,
        "updated": Issue.updated_at,
        "priority": Issue.priority,
    }.get(sort_by, Issue.created_at)

    direction = desc if sort_dir == "desc" else asc

    # When no status filter is set, keep open/in_progress issues above
    # resolved/closed ones, then apply the user-selected sort within each group.
    if not status_filter:
        status_order = case(
            (Issue.status == IssueStatus.OPEN, 0),
            (Issue.status == IssueStatus.IN_PROGRESS, 1),
            (Issue.status == IssueStatus.RESOLVED, 2),
            (Issue.status == IssueStatus.CLOSED, 3),
            else_=4,
        )
        query = query.order_by(asc(status_order), direction(sort_col))
    else:
        query = query.order_by(direction(sort_col))

    # Pagination
    offset = (page - 1) * page_size
    issues = query.offset(offset).limit(page_size).all()

    return IssueListOut(
        issues=[_issue_to_out(i, db) for i in issues],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{issue_key}", response_model=IssueOut)
def get_issue(
    issue_key: str,
    db: Session = Depends(get_db),
    _user: Optional[User] = Depends(get_optional_user),
):
    issue = (
        db.query(Issue)
        .options(joinedload(Issue.reporter), joinedload(Issue.assignee))
        .filter(Issue.key == issue_key.upper())
        .first()
    )
    if issue is None:
        raise HTTPException(status_code=404, detail="Issue not found")
    return _issue_to_out(issue, db)


@router.post("", response_model=IssueOut, status_code=status.HTTP_201_CREATED)
def create_issue(
    req: IssueCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Get next issue number
    counter = db.query(IssueCounter).with_for_update().first()
    if counter is None:
        counter = IssueCounter(id=1, next_number=1)
        db.add(counter)
        db.flush()

    number = counter.next_number
    counter.next_number = number + 1

    issue = Issue(
        issue_number=number,
        key=f"BUG-{number}",
        title=req.title,
        description=req.description,
        priority=req.priority,
        issue_type=req.issue_type,
        reporter_id=current_user.id,
        assignee_id=req.assignee_id,
    )
    db.add(issue)
    db.commit()
    db.refresh(issue)

    # Reload relationships
    issue = (
        db.query(Issue)
        .options(joinedload(Issue.reporter), joinedload(Issue.assignee))
        .filter(Issue.id == issue.id)
        .first()
    )
    
    # Notify admins
    admins = db.query(User.email).filter(User.is_admin == True).all()
    admin_emails = [admin[0] for admin in admins]
    background_tasks.add_task(
        send_admin_notification,
        admin_emails,
        f"New Issue Created: {issue.key}",
        f"<p><strong>{current_user.display_name}</strong> created a new issue: <strong>{issue.key} - {issue.title}</strong>.</p>"
    )

    return _issue_to_out(issue, db)


@router.patch("/{issue_key}", response_model=IssueOut)
def update_issue(
    issue_key: str,
    req: IssueUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    issue = db.query(Issue).options(joinedload(Issue.reporter)).filter(Issue.key == issue_key.upper()).first()
    if issue is None:
        raise HTTPException(status_code=404, detail="Issue not found")

    # Only reporter or admin can update
    if issue.reporter_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to update this issue")

    update_data = req.model_dump(exclude_unset=True)
    
    old_status = issue.status.value if isinstance(issue.status, IssueStatus) else issue.status
    
    for field, value in update_data.items():
        setattr(issue, field, value)

    db.commit()
    db.refresh(issue)

    issue = (
        db.query(Issue)
        .options(joinedload(Issue.reporter), joinedload(Issue.assignee))
        .filter(Issue.id == issue.id)
        .first()
    )
    
    new_status = issue.status.value if isinstance(issue.status, IssueStatus) else issue.status
    
    if req.status and old_status != new_status:
        # Notify reporter
        if issue.reporter_id != current_user.id:
            background_tasks.add_task(
                send_status_change_notification,
                issue.reporter.email,
                issue.key,
                old_status,
                new_status
            )
        
        # Notify admins
        admins = db.query(User.email).filter(User.is_admin == True).all()
        admin_emails = [admin[0] for admin in admins]
        background_tasks.add_task(
            send_admin_notification,
            admin_emails,
            f"Status Changed: {issue.key}",
            f"<p><strong>{current_user.display_name}</strong> changed the status of <strong>{issue.key}</strong> from <em>{old_status}</em> to <strong>{new_status}</strong>.</p>"
        )
        
    return _issue_to_out(issue, db)


@router.delete("/{issue_key}", status_code=status.HTTP_204_NO_CONTENT)
def delete_issue(
    issue_key: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    issue = db.query(Issue).filter(Issue.key == issue_key.upper()).first()
    if issue is None:
        raise HTTPException(status_code=404, detail="Issue not found")

    if issue.reporter_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to delete this issue")

    db.delete(issue)
    db.commit()
