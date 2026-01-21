import secrets
import hashlib
import smtplib
import os
from email.message import EmailMessage
from dotenv import load_dotenv
from passlib.context import CryptContext

load_dotenv()

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def generate_otp() -> str:
    # Generate a secure 4-digit OTP
    return str(secrets.randbelow(10000)).zfill(4)

def hash_otp(otp: str) -> str:
    return hashlib.sha256(otp.encode()).hexdigest()

def send_email_otp(to_email: str, otp: str):
    smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", 587))
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")

    if not smtp_user or not smtp_password:
        print(f"[WARNING] SMTP credentials not set. OTP for {to_email} is: {otp}")
        return # For testing without real email

    msg = EmailMessage()
    msg.set_content(f"""
    Hello,
    
    Your verification code for Zara AI Assist is: {otp}
    
    This code will expire in 5 minutes.
    
    If you did not request this code, please ignore this email.
    
    Best regards,
    Zara AI Assist Team
    """)
    
    msg['Subject'] = '🔐 Zara AI Assist – Your Login Verification Code'
    msg['From'] = smtp_user
    msg['To'] = to_email

    try:
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(smtp_user, smtp_password)
        server.send_message(msg)
        server.quit()
        print(f"Email sent to {to_email}")
    except Exception as e:
        print(f"Failed to send email: {e}")
        print(f"FALLBACK: OTP for {to_email} is {otp}")
        # Don't raise, allow login to proceed with console OTP
        pass
