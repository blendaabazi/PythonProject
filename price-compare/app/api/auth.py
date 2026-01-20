from fastapi import APIRouter, Depends, HTTPException, status

from ..dependencies import get_user_repo
from ..domain.models import User
from ..domain.repositories import RepositoryError
from ..schemas.auth import LoginRequest, RegisterRequest, UserResponse
from ..services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


def _to_user_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id or "",
        email=user.email,
        name=user.name,
        created_at=user.created_at,
    )


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, user_repo=Depends(get_user_repo)):
    service = AuthService(user_repo)
    try:
        user = service.register(payload.email, payload.password, payload.name)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except RepositoryError as exc:
        detail = str(exc) or "Failed to register user"
        status_code = 409 if "exists" in detail.lower() else 500
        raise HTTPException(status_code=status_code, detail=detail) from exc
    return _to_user_response(user)


@router.post("/login", response_model=UserResponse)
def login(payload: LoginRequest, user_repo=Depends(get_user_repo)):
    service = AuthService(user_repo)
    user = service.authenticate(payload.email, payload.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return _to_user_response(user)
