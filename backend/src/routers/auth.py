from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from src.config import settings
from src.database import get_db
from src.dependencies.auth import get_current_user
from src.models.user import User
from src.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserResponse
from src.services.auth_service import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

_REFRESH_COOKIE = "refresh_token"
_REFRESH_MAX_AGE = 7 * 24 * 60 * 60  # 7 days in seconds


def _set_refresh_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=_REFRESH_COOKIE,
        value=token,
        httponly=True,
        samesite="lax",
        secure=settings.is_production,
        max_age=_REFRESH_MAX_AGE,
        path="/api/v1/auth/refresh",
    )


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == body.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="E-mail já cadastrado")

    user = User(email=body.email, hashed_password=hash_password(body.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email, User.is_active == True).first()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-mail ou senha incorretos",
        )

    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)
    _set_refresh_cookie(response, refresh_token)
    return TokenResponse(access_token=access_token)


@router.post("/refresh", response_model=TokenResponse)
def refresh(request: Request, response: Response, db: Session = Depends(get_db)):
    token = request.cookies.get(_REFRESH_COOKIE)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sessão expirada")

    from jose import JWTError

    try:
        payload = decode_token(token)
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")
        user_id = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sessão expirada")

    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuário não encontrado")

    new_access = create_access_token(user.id)
    new_refresh = create_refresh_token(user.id)
    _set_refresh_cookie(response, new_refresh)
    return TokenResponse(access_token=new_access)


@router.post("/logout", status_code=status.HTTP_200_OK)
def logout(response: Response):
    response.delete_cookie(key=_REFRESH_COOKIE, path="/api/v1/auth/refresh")
    return {"message": "Sessão encerrada"}


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return current_user
