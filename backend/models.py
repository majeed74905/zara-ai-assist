from sqlalchemy import Column, Integer, String, Boolean, DateTime
from database import Base
import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class OTPVerification(Base):
    __tablename__ = "otp_verification"

    email = Column(String, primary_key=True, index=True) # One OTP per email
    otp_hash = Column(String)
    expires_at = Column(DateTime)
    attempts = Column(Integer, default=0)
