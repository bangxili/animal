from uuid import uuid4

import bcrypt
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import PetProfile, User

router = APIRouter(prefix="/api/auth", tags=["auth"])


# ── Pydantic 模型 ─────────────────────────────────────────────

class RegisterIn(BaseModel):
    username: str
    password: str


class LoginIn(BaseModel):
    username: str
    password: str


class AuthOut(BaseModel):
    user_id: str
    username: str
    has_pets: bool   # 前端根据此字段决定跳转 /home 还是 /setup


# ── 工具函数 ──────────────────────────────────────────────────

def _hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")


def _verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def _has_pets(user_id: str, db: Session) -> bool:
    return db.query(PetProfile).filter(PetProfile.user_id == user_id).first() is not None


# ── 路由 ─────────────────────────────────────────────────────

@router.post("/register", response_model=AuthOut)
def register(payload: RegisterIn, db: Session = Depends(get_db)):
    """注册新用户（账号密码）"""
    username = payload.username.strip()
    password = payload.password

    if not username or len(username) < 2:
        raise HTTPException(status_code=400, detail="用户名至少需要2个字符")
    if len(username) > 32:
        raise HTTPException(status_code=400, detail="用户名不能超过32个字符")
    if not password or len(password) < 6:
        raise HTTPException(status_code=400, detail="密码至少需要6位")

    # 检查用户名是否已存在
    existing = db.query(User).filter(User.username == username).first()
    if existing:
        raise HTTPException(status_code=409, detail="该用户名已被注册，请换一个试试")

    user_id = str(uuid4())
    user = User(
        id=user_id,
        username=username,
        hashed_password=_hash_password(password),
    )
    db.add(user)
    db.commit()

    return AuthOut(user_id=user_id, username=username, has_pets=False)


@router.post("/login", response_model=AuthOut)
def login(payload: LoginIn, db: Session = Depends(get_db)):
    """用户登录"""
    username = payload.username.strip()
    password = payload.password

    user = db.query(User).filter(User.username == username).first()
    if not user or not _verify_password(password, user.hashed_password):
        raise HTTPException(status_code=401, detail="用户名或密码错误")

    has_pets = _has_pets(user.id, db)
    return AuthOut(user_id=user.id, username=username, has_pets=has_pets)
