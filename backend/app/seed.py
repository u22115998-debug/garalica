import logging
from sqlalchemy.orm import Session
from app.models import User, IssueCounter
from app.auth import hash_password
from app.config import get_settings

logger = logging.getLogger(__name__)


def seed_admin(db: Session) -> None:
    """Create admin user and issue counter if they don't exist."""
    settings = get_settings()

    # Seed issue counter
    counter = db.query(IssueCounter).first()
    if counter is None:
        counter = IssueCounter(id=1, next_number=1)
        db.add(counter)
        db.commit()
        logger.info("Issue counter initialized")

    # Seed admin user
    existing = db.query(User).filter(User.username == settings.ADMIN_USERNAME).first()
    if existing is not None:
        logger.info("Admin user already exists, skipping seed")
        return

    admin = User(
        username=settings.ADMIN_USERNAME,
        email=settings.ADMIN_EMAIL,
        display_name=settings.ADMIN_USERNAME,
        hashed_password=hash_password(settings.ADMIN_PASSWORD),
        is_admin=True,
    )
    db.add(admin)
    db.commit()
    logger.info(f"Admin user '{settings.ADMIN_USERNAME}' created")
