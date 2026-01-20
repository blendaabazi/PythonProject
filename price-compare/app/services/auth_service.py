import base64
import hashlib
import hmac
import os
from typing import Optional

from ..config import settings
from ..domain.models import User
from ..domain.repositories import UserRepository

HASH_ALGORITHM = "pbkdf2_sha256"
ADMIN_EMAIL = "admin@gmail.com"
ADMIN_PASSWORD = "Admin123-"


def _b64encode(data: bytes) -> str:
    return base64.b64encode(data).decode("ascii")


def _b64decode(data: str) -> bytes:
    return base64.b64decode(data.encode("ascii"))


def hash_password(password: str, iterations: Optional[int] = None) -> str:
    if not password:
        raise ValueError("Password required")
    iterations = iterations or settings.auth_password_iterations
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        iterations,
    )
    return f"{HASH_ALGORITHM}${iterations}${_b64encode(salt)}${_b64encode(digest)}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        algorithm, iterations_str, salt_b64, digest_b64 = stored_hash.split("$", 3)
    except ValueError:
        return False
    if algorithm != HASH_ALGORITHM:
        return False
    try:
        iterations = int(iterations_str)
    except ValueError:
        return False
    salt = _b64decode(salt_b64)
    expected = _b64decode(digest_b64)
    candidate = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        iterations,
    )
    return hmac.compare_digest(candidate, expected)


class AuthService:
    def __init__(self, user_repo: UserRepository):
        self._user_repo = user_repo
        self._ensure_admin_seeded()

    def _ensure_admin_seeded(self) -> None:
        existing = self._user_repo.get_by_email(ADMIN_EMAIL)
        if existing:
            return
        admin_user = User(
            email=ADMIN_EMAIL,
            name="Admin",
            role="admin",
            password_hash=hash_password(ADMIN_PASSWORD),
        )
        admin_user.id = self._user_repo.create(admin_user)

    def register(self, email: str, password: str, name: Optional[str] = None) -> User:
        normalized_email = email.strip().lower()
        normalized_name = name.strip() if name else None
        if normalized_name == "":
            normalized_name = None
        if normalized_email == ADMIN_EMAIL:
            raise ValueError("Admin account is predefined")
        if self._user_repo.get_by_email(normalized_email):
            raise ValueError("User already exists")
        password_hash = hash_password(password)
        user = User(
            email=normalized_email,
            name=normalized_name,
            role="user",
            password_hash=password_hash,
        )
        user.id = self._user_repo.create(user)
        return user

    def authenticate(self, email: str, password: str) -> Optional[User]:
        normalized_email = email.strip().lower()
        user = self._user_repo.get_by_email(normalized_email)
        if not user:
            return None
        if not verify_password(password, user.password_hash):
            return None
        return user

    def update_profile(
        self,
        current_email: str,
        current_password: str,
        email: str,
        name: Optional[str] = None,
        new_password: Optional[str] = None,
    ) -> User:
        normalized_current = current_email.strip().lower()
        user = self._user_repo.get_by_email(normalized_current)
        if not user:
            raise ValueError("User not found")
        if not verify_password(current_password, user.password_hash):
            raise ValueError("Invalid credentials")
        normalized_email = email.strip().lower()
        if not normalized_email:
            raise ValueError("Email required")
        if user.email == ADMIN_EMAIL and normalized_email != ADMIN_EMAIL:
            raise ValueError("Admin account is predefined")
        if normalized_email != user.email:
            if normalized_email == ADMIN_EMAIL:
                raise ValueError("Admin account is predefined")
            if self._user_repo.get_by_email(normalized_email):
                raise ValueError("User already exists")
            user.email = normalized_email
        normalized_name = name.strip() if name else None
        if normalized_name == "":
            normalized_name = None
        user.name = normalized_name
        if new_password:
            user.password_hash = hash_password(new_password)
        return self._user_repo.update(user)
