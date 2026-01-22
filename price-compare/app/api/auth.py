from fastapi import APIRouter, Depends, HTTPException, status, Request, Response

from ..dependencies import get_user_repo, get_email_service, get_current_user
from ..config import settings
from ..domain.models import User
from ..domain.repositories import RepositoryError
from ..schemas.auth import (
    LoginRequest,
    RegisterRequest,
    UpdateProfileRequest,
    UserResponse,
    AuthResponse,
    ForgotPasswordRequest,
    ResetPasswordRequest,
)
from ..services.auth_service import AuthService
from ..security.jwt import create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])


def _to_user_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id or "",
        email=user.email,
        name=user.name,
        role=user.role,
        created_at=user.created_at,
    )


def _to_auth_response(user: User) -> AuthResponse:
    token, expires_in = create_access_token(
        user.email,
        user.role,
        secret=settings.jwt_secret,
        issuer=settings.jwt_issuer,
        ttl_minutes=settings.jwt_access_ttl_min,
        algorithm=settings.jwt_algorithm,
    )
    return AuthResponse(
        **_to_user_response(user).model_dump(),
        access_token=token,
        token_type="bearer",
        expires_in=expires_in,
    )


def _set_auth_cookie(response: Response, token: str, max_age: int) -> None:
    response.set_cookie(
        key=settings.jwt_cookie_name,
        value=token,
        httponly=True,
        secure=settings.jwt_cookie_secure,
        samesite=settings.jwt_cookie_samesite,
        max_age=max_age,
        path="/",
    )


def _clear_auth_cookie(response: Response) -> None:
    response.set_cookie(
        key=settings.jwt_cookie_name,
        value="",
        max_age=0,
        expires=0,
        path="/",
        httponly=True,
        secure=settings.jwt_cookie_secure,
        samesite=settings.jwt_cookie_samesite,
    )


def _set_refresh_cookie(response: Response, token: str, max_age: int) -> None:
    response.set_cookie(
        key=settings.jwt_refresh_cookie_name,
        value=token,
        httponly=True,
        secure=settings.jwt_refresh_cookie_secure,
        samesite=settings.jwt_refresh_cookie_samesite,
        max_age=max_age,
        path="/",
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.set_cookie(
        key=settings.jwt_refresh_cookie_name,
        value="",
        max_age=0,
        expires=0,
        path="/",
        httponly=True,
        secure=settings.jwt_refresh_cookie_secure,
        samesite=settings.jwt_refresh_cookie_samesite,
    )


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(
    payload: RegisterRequest,
    user_repo=Depends(get_user_repo),
    email_service=Depends(get_email_service),
):
    service = AuthService(user_repo, email_service)
    try:
        user = service.register(payload.email, payload.password, payload.name)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except RepositoryError as exc:
        detail = str(exc) or "Failed to register user"
        status_code = 409 if "exists" in detail.lower() else 500
        raise HTTPException(status_code=status_code, detail=detail) from exc
    return _to_user_response(user)


@router.post("/login", response_model=AuthResponse)
def login(
    payload: LoginRequest,
    response: Response,
    user_repo=Depends(get_user_repo),
    email_service=Depends(get_email_service),
):
    service = AuthService(user_repo, email_service)
    user = service.authenticate(payload.email, payload.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    auth_response = _to_auth_response(user)
    refresh_token, refresh_ttl = service.issue_refresh_token(user)
    _set_auth_cookie(response, auth_response.access_token, auth_response.expires_in)
    _set_refresh_cookie(response, refresh_token, refresh_ttl)
    return auth_response


@router.put("/profile", response_model=AuthResponse)
def update_profile(
    payload: UpdateProfileRequest,
    response: Response,
    current_user: User = Depends(get_current_user),
    user_repo=Depends(get_user_repo),
    email_service=Depends(get_email_service),
):
    service = AuthService(user_repo, email_service)
    try:
        user = service.update_profile(
            current_email=current_user.email,
            current_password=payload.current_password,
            email=payload.email,
            name=payload.name,
            new_password=payload.new_password,
        )
    except ValueError as exc:
        detail = str(exc) or "Failed to update profile"
        detail_lower = detail.lower()
        if "credential" in detail_lower:
            raise HTTPException(status_code=401, detail=detail) from exc
        if "not found" in detail_lower:
            raise HTTPException(status_code=404, detail=detail) from exc
        if "exists" in detail_lower or "admin" in detail_lower:
            raise HTTPException(status_code=409, detail=detail) from exc
        raise HTTPException(status_code=400, detail=detail) from exc
    except RepositoryError as exc:
        detail = str(exc) or "Failed to update profile"
        status_code = 409 if "exists" in detail.lower() else 500
        raise HTTPException(status_code=status_code, detail=detail) from exc
    auth_response = _to_auth_response(user)
    refresh_token, refresh_ttl = service.issue_refresh_token(user)
    _set_auth_cookie(response, auth_response.access_token, auth_response.expires_in)
    _set_refresh_cookie(response, refresh_token, refresh_ttl)
    return auth_response


@router.post("/refresh", response_model=AuthResponse)
def refresh_token(
    request: Request,
    response: Response,
    user_repo=Depends(get_user_repo),
    email_service=Depends(get_email_service),
):
    service = AuthService(user_repo, email_service)
    refresh_cookie = request.cookies.get(settings.jwt_refresh_cookie_name, "")
    if not refresh_cookie:
        raise HTTPException(status_code=401, detail="Missing refresh token")
    try:
        user, new_refresh, refresh_ttl = service.refresh_access_token(refresh_cookie)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    auth_response = _to_auth_response(user)
    _set_auth_cookie(response, auth_response.access_token, auth_response.expires_in)
    _set_refresh_cookie(response, new_refresh, refresh_ttl)
    return auth_response


@router.post("/logout")
def logout(
    request: Request,
    response: Response,
    user_repo=Depends(get_user_repo),
    email_service=Depends(get_email_service),
):
    service = AuthService(user_repo, email_service)
    refresh_cookie = request.cookies.get(settings.jwt_refresh_cookie_name, "")
    if refresh_cookie:
        service.revoke_refresh_token(refresh_cookie)
    _clear_auth_cookie(response)
    _clear_refresh_cookie(response)
    response.headers["Clear-Site-Data"] = "\"cookies\""
    return {"status": "ok"}


@router.post("/forgot")
def forgot_password(
    payload: ForgotPasswordRequest,
    request: Request,
    user_repo=Depends(get_user_repo),
    email_service=Depends(get_email_service),
):
    service = AuthService(user_repo, email_service)
    base_url = settings.app_base_url or str(request.base_url).rstrip("/")
    try:
        service.request_password_reset(payload.email, base_url)
    except RepositoryError as exc:
        detail = str(exc) or "Failed to start reset"
        raise HTTPException(status_code=500, detail=detail) from exc
    return {"status": "ok"}


@router.post("/reset")
def reset_password(
    payload: ResetPasswordRequest,
    user_repo=Depends(get_user_repo),
    email_service=Depends(get_email_service),
):
    service = AuthService(user_repo, email_service)
    try:
        service.reset_password(payload.token, payload.new_password)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RepositoryError as exc:
        detail = str(exc) or "Failed to reset password"
        raise HTTPException(status_code=500, detail=detail) from exc
    return {"status": "ok"}
