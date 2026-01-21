from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import User, OTPVerification
from schemas import UserCreate, UserLogin, OTPVerify, ResendOTP, TokenResponse
from utils import generate_otp, hash_otp, send_email_otp, get_password_hash, verify_password
import datetime

router = APIRouter()

OTP_EXPIRY_MINUTES = 5
MAX_ATTEMPTS = 3

@router.post("/register")
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    email = user_data.email
    
    # Check existing user
    existing_user = db.query(User).filter(User.email == email).first()
    
    if existing_user:
        if existing_user.is_verified:
            raise HTTPException(status_code=400, detail="Email already registered and verified. Please login.")
        else:
            # Update password for unverified user
            existing_user.password_hash = get_password_hash(user_data.password)
    else:
        # Create new unverified user
        new_user = User(
            email=email,
            password_hash=get_password_hash(user_data.password),
            is_verified=False
        )
        db.add(new_user)
        db.commit() # Commit to get ID (though not used directly here)

    # Generate and Store OTP
    otp = generate_otp()
    otp_hashed = hash_otp(otp)
    expires_at = datetime.datetime.utcnow() + datetime.timedelta(minutes=OTP_EXPIRY_MINUTES)

    # Check/Create OTP record
    otp_record = db.query(OTPVerification).filter(OTPVerification.email == email).first()
    if otp_record:
        otp_record.otp_hash = otp_hashed
        otp_record.expires_at = expires_at
        otp_record.attempts = 0
    else:
        otp_record = OTPVerification(
            email=email,
            otp_hash=otp_hashed,
            expires_at=expires_at,
            attempts=0
        )
        db.add(otp_record)
    
    db.commit()

    # Send OTP
    send_email_otp(email, otp)

    return {"message": "Registration successful. Please verify your email with the OTP sent."}

@router.post("/verify-otp", response_model=TokenResponse)
def verify_otp(request: OTPVerify, db: Session = Depends(get_db)):
    email = request.email
    otp = request.otp
    
    otp_record = db.query(OTPVerification).filter(OTPVerification.email == email).first()
    user = db.query(User).filter(User.email == email).first()

    if not otp_record or not user:
        raise HTTPException(status_code=400, detail="Invalid request")

    if datetime.datetime.utcnow() > otp_record.expires_at:
        raise HTTPException(status_code=400, detail="OTP has expired. Please request a new one.")
    
    if otp_record.attempts >= MAX_ATTEMPTS:
        raise HTTPException(status_code=400, detail="Too many failed attempts. Please request a new OTP.")

    if otp_record.otp_hash != hash_otp(otp):
        otp_record.attempts += 1
        db.commit()
        raise HTTPException(status_code=400, detail="Invalid OTP")

    # Success
    user.is_verified = True
    
    # Delete OTP record after successful verification
    db.delete(otp_record)
    db.commit()

    # Generate Token (Mock for now)
    fake_token = f"jwt-token-for-{email}"

    return {
        "access_token": fake_token,
        "token_type": "bearer",
        "message": "Account verified successfully"
    }

@router.post("/login", response_model=TokenResponse)
def login(user_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_data.email).first()

    if not user or not verify_password(user_data.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Invalid email or password")

    if not user.is_verified:
        raise HTTPException(status_code=400, detail="Email not verified. Please verify your account.")

    # In real app: Generate JWT here
    fake_token = f"jwt-token-for-{user.email}"
    
    return {
        "access_token": fake_token,
        "token_type": "bearer",
        "message": "Login successful"
    }

@router.post("/resend-otp")
def resend_otp(request: ResendOTP, db: Session = Depends(get_db)):
    email = request.email
    
    user = db.query(User).filter(User.email == email).first()
    if not user:
         raise HTTPException(status_code=400, detail="User not found")
    
    if user.is_verified:
        raise HTTPException(status_code=400, detail="User already verified")

    # Rate Limit Logic Check (Simple timestamp check could be added here if we stored last_sent)
    # For now ensuring standard regeneration logic
    
    otp = generate_otp()
    otp_hashed = hash_otp(otp)
    expires_at = datetime.datetime.utcnow() + datetime.timedelta(minutes=OTP_EXPIRY_MINUTES)
    
    otp_record = db.query(OTPVerification).filter(OTPVerification.email == email).first()
    if otp_record:
        otp_record.otp_hash = otp_hashed
        otp_record.expires_at = expires_at
        otp_record.attempts = 0 # Reset attempts
    else:
        otp_record = OTPVerification(
            email=email,
            otp_hash=otp_hashed,
            expires_at=expires_at,
            attempts=0
        )
        db.add(otp_record)
        
    db.commit()
    
    send_email_otp(email, otp)
    
    return {"message": "OTP resent successfully"}
