"""
Lightweight demo authentication.

For hackathon-scope purposes this uses a small in-memory user table instead
of a full identity provider. Passwords are bcrypt-hashed and sessions are
signed JWTs, so the mechanics are production-shaped even though the user
store itself is intentionally minimal. Swap `USERS` for a real database /
SSO provider before using this outside a demo.
"""
import os
from datetime import datetime, timedelta, timezone

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt

SECRET_KEY = os.environ.get("SBOM_JWT_SECRET", "dev-only-secret-change-me-please")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 8

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def _hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def _verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))


USERS = {
    "admin": {
        "username": "admin",
        "name": "Alex Rivera",
        "role": "Security Lead",
        "access_level": "admin",
        "password_hash": _hash_password("admin123"),
    },
    "demo": {
        "username": "demo",
        "name": "Demo User",
        "role": "Viewer",
        "access_level": "viewer",
        "password_hash": _hash_password("demo123"),
    },
}


def authenticate_user(username: str, password: str):
    user = USERS.get(username)
    if not user or not _verify_password(password, user["password_hash"]):
        return None
    return user


def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if username is None or username not in USERS:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = USERS[username]
    return {
        "username": user["username"],
        "name": user["name"],
        "role": user["role"],
        "access_level": user["access_level"],
    }


async def require_admin(current_user: dict = Depends(get_current_user)):
    if current_user["access_level"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This action requires admin access. Your account is view-only.",
        )
    return current_user
