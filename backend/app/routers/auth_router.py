from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
import secrets
import hashlib
from datetime import datetime, timezone, timedelta

from app.database import get_db
from app.models import User
from app.schemas import (
    RegisterRequest, LoginRequest, TokenResponse,
    RefreshRequest, UserOut, VerifyEmailRequest,
)
from app.auth import (
    hash_password, verify_password,
    create_access_token, create_refresh_token,
    decode_token, get_current_user,
)
from app.email_utils import send_verification_email

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(req: RegisterRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    if req.password != req.password_confirm:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match",
        )

    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    if db.query(User).filter(User.username == req.username).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username already taken",
        )

    user = User(
        username=req.username,
        email=req.email,
        display_name=req.display_name,
        hashed_password=hash_password(req.password),
    )

    # Generate 6-digit code for auto-verification
    code = "".join([str(secrets.randbelow(10)) for _ in range(6)])
    code_hash = hashlib.sha256(code.encode()).hexdigest()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)
    
    user.verification_code_hash = code_hash
    user.verification_code_expires_at = expires_at

    db.add(user)
    db.commit()
    db.refresh(user)
    
    background_tasks.add_task(send_verification_email, user.email, code)
    
    return user


@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if user is None or not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    return TokenResponse(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh(req: RefreshRequest, db: Session = Depends(get_db)):
    payload = decode_token(req.refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
        )
    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    return TokenResponse(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
    )


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/send-verification-code", status_code=status.HTTP_200_OK)
def send_verification_code(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.is_verified:
        raise HTTPException(status_code=400, detail="User is already verified")

    if current_user.verification_code_expires_at:
        time_left = current_user.verification_code_expires_at - datetime.now(timezone.utc)
        if time_left.total_seconds() > 13 * 60:
            raise HTTPException(status_code=400, detail="Please wait 2 minutes before requesting a new code")

    # Generate 6-digit code
    code = "".join([str(secrets.randbelow(10)) for _ in range(6)])
    
    # Hash it for DB
    code_hash = hashlib.sha256(code.encode()).hexdigest()
    
    # Set expiration (15 mins)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)
    
    current_user.verification_code_hash = code_hash
    current_user.verification_code_expires_at = expires_at
    db.commit()

    # Send email in background
    background_tasks.add_task(send_verification_email, current_user.email, code)
    
    return {"message": "Verification code sent"}

@router.post("/verify-email", status_code=status.HTTP_200_OK)
def verify_email(
    req: VerifyEmailRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.is_verified:
        raise HTTPException(status_code=400, detail="User is already verified")
        
    if not current_user.verification_code_hash or not current_user.verification_code_expires_at:
        raise HTTPException(status_code=400, detail="No verification code requested")
        
    if datetime.now(timezone.utc) > current_user.verification_code_expires_at:
        raise HTTPException(status_code=400, detail="Verification code expired")
        
    # Check hash
    req_hash = hashlib.sha256(req.code.encode()).hexdigest()
    if not secrets.compare_digest(req_hash, current_user.verification_code_hash):
        raise HTTPException(status_code=400, detail="Invalid verification code")
        
    # Success
    current_user.is_verified = True
    current_user.verification_code_hash = None
    current_user.verification_code_expires_at = None
    db.commit()
    
    return {"message": "Email verified successfully"}
