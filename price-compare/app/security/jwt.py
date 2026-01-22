import base64
import hashlib
import hmac
import json
from datetime import datetime, timedelta, timezone
from typing import Any


class JWTError(ValueError):
    pass


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(f"{data}{padding}")


def _sign(message: bytes, secret: str) -> bytes:
    return hmac.new(secret.encode("utf-8"), message, hashlib.sha256).digest()


def encode_jwt(payload: dict[str, Any], secret: str, algorithm: str = "HS256") -> str:
    if algorithm != "HS256":
        raise JWTError("Unsupported JWT algorithm")
    header = {"alg": algorithm, "typ": "JWT"}
    header_b64 = _b64url_encode(json.dumps(header, separators=(",", ":"), sort_keys=True).encode("utf-8"))
    payload_b64 = _b64url_encode(json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8"))
    signing_input = f"{header_b64}.{payload_b64}".encode("ascii")
    signature = _b64url_encode(_sign(signing_input, secret))
    return f"{header_b64}.{payload_b64}.{signature}"


def decode_jwt(
    token: str,
    secret: str,
    issuer: str | None = None,
    algorithms: tuple[str, ...] = ("HS256",),
) -> dict[str, Any]:
    parts = token.split(".")
    if len(parts) != 3:
        raise JWTError("Invalid token format")
    header_b64, payload_b64, signature_b64 = parts
    try:
        header = json.loads(_b64url_decode(header_b64))
    except Exception as exc:  # pragma: no cover - defensive
        raise JWTError("Invalid token header") from exc
    algorithm = header.get("alg")
    if algorithm not in algorithms:
        raise JWTError("Unsupported JWT algorithm")
    signing_input = f"{header_b64}.{payload_b64}".encode("ascii")
    expected = _b64url_encode(_sign(signing_input, secret))
    if not hmac.compare_digest(expected, signature_b64):
        raise JWTError("Invalid token signature")
    try:
        payload = json.loads(_b64url_decode(payload_b64))
    except Exception as exc:  # pragma: no cover - defensive
        raise JWTError("Invalid token payload") from exc
    if issuer and payload.get("iss") != issuer:
        raise JWTError("Invalid token issuer")
    exp = payload.get("exp")
    if exp is None:
        raise JWTError("Token missing exp")
    now = datetime.now(timezone.utc).timestamp()
    if now > float(exp):
        raise JWTError("Token expired")
    return payload


def create_access_token(
    subject: str,
    role: str,
    *,
    secret: str,
    issuer: str | None,
    ttl_minutes: int,
    algorithm: str = "HS256",
) -> tuple[str, int]:
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=ttl_minutes)
    payload = {
        "sub": subject,
        "role": role,
        "iat": int(now.timestamp()),
        "exp": int(expires_at.timestamp()),
    }
    if issuer:
        payload["iss"] = issuer
    token = encode_jwt(payload, secret, algorithm=algorithm)
    return token, int((expires_at - now).total_seconds())
