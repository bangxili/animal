"""
管理端 API — /api/admin/*
认证方式：请求头 X-Admin-Token: admin123:123456 (base64 或明文均可)
简单起见使用固定账密校验，后续可升级为 JWT。
"""
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Optional

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import (
    ConsultationMessage,
    ConversationSummary,
    DailyRecipe,
    GeneRecord,
    MealDaySummary,
    MealLog,
    PetProfile,
    PetSocialProfile,
    PhotoAnalysisRecord,
    ToiletRecord,
    User,
    WeightRecord,
)

router = APIRouter(prefix="/api/admin", tags=["admin"])

ADMIN_USERNAME = "admin123"
ADMIN_PASSWORD = "123456"


def _require_admin(x_admin_token: str = Header(default="")):
    """简单认证：Header X-Admin-Token 值为 'admin123:123456'"""
    if x_admin_token != f"{ADMIN_USERNAME}:{ADMIN_PASSWORD}":
        raise HTTPException(status_code=401, detail="Unauthorized")


# ─────────────────────────────────────────────────────────────────────────────
# 登录
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/login")
def admin_login(body: dict[str, str]):
    if body.get("username") == ADMIN_USERNAME and body.get("password") == ADMIN_PASSWORD:
        return {"ok": True, "token": f"{ADMIN_USERNAME}:{ADMIN_PASSWORD}"}
    raise HTTPException(status_code=401, detail="用户名或密码错误")


# ─────────────────────────────────────────────────────────────────────────────
# 面板统计
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/dashboard")
def dashboard(db: Session = Depends(get_db), _=Depends(_require_admin)):
    # SQLite 存储的是本地时间字符串，用 SQLite 内置函数做时间比较最准确
    total_users = db.query(func.count(User.id)).scalar() or 0
    total_pets = db.query(func.count(PetProfile.id)).scalar() or 0

    ACTIVITY_TABLES = [
        ("consultation_messages", "user_id"),
        ("toilet_records", "user_id"),
        ("daily_recipes", "user_id"),
        ("gene_records", "user_id"),
        ("weight_records", "user_id"),
        ("meal_logs", "user_id"),
    ]

    def active_users_since_sql(interval: str) -> int:
        """用 SQLite datetime 函数直接比较，避免 Python 时区偏差"""
        user_ids: set = set()
        for table, uid_col in ACTIVITY_TABLES:
            rows = db.execute(text(
                f"SELECT DISTINCT {uid_col} FROM {table} "
                f"WHERE created_at >= datetime('now', '{interval}')"
            )).fetchall()
            user_ids.update(r[0] for r in rows)
        return len(user_ids)

    # 当前在线：近 15 分钟内有操作记录的用户数
    online_now = active_users_since_sql("-15 minutes")
    day_active = active_users_since_sql("-1 day")
    week_active = active_users_since_sql("-7 days")
    month_active = active_users_since_sql("-30 days")

    # 每日新注册用户（近30天，按日聚合，用本地日期）
    rows = db.execute(text("""
        SELECT date(created_at, 'localtime') as day, count(*) as cnt
        FROM users
        WHERE created_at >= datetime('now', '-30 days')
        GROUP BY day
        ORDER BY day
    """)).fetchall()
    daily_new_users = [{"date": r[0], "count": r[1]} for r in rows]

    # 功能使用次数（全量统计）
    feature_usage = {
        "consultation": db.query(func.count(ConsultationMessage.id))
            .filter(ConsultationMessage.role == "user").scalar() or 0,
        "toilet": db.query(func.count(ToiletRecord.id)).scalar() or 0,
        "recipe": db.query(func.count(DailyRecipe.id)).scalar() or 0,
        "gene": db.query(func.count(GeneRecord.id)).scalar() or 0,
        "health_photo": db.query(func.count(PhotoAnalysisRecord.id)).scalar() or 0,
        "weight": db.query(func.count(WeightRecord.id)).scalar() or 0,
        "meal_log": db.query(func.count(MealLog.id)).scalar() or 0,
    }

    return {
        "total_users": total_users,
        "total_pets": total_pets,
        "online_now": online_now,
        "active_users": {
            "daily": day_active,
            "weekly": week_active,
            "monthly": month_active,
        },
        "daily_new_users": daily_new_users,
        "feature_usage": feature_usage,
        # 支付收款预留
        "revenue": {
            "total": 0,
            "monthly": 0,
            "orders": 0,
        },
    }


# ─────────────────────────────────────────────────────────────────────────────
# 用户列表
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/users")
def list_users(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    _=Depends(_require_admin),
):
    users = db.query(User).order_by(User.created_at.desc()).offset(skip).limit(limit).all()
    total = db.query(func.count(User.id)).scalar() or 0

    result = []
    for u in users:
        pets = db.query(PetProfile).filter(PetProfile.user_id == u.id).all()

        # 最后活跃时间（取各表最新记录）
        last_active = _get_last_active(u.id, db)

        result.append({
            "user_id": u.id,
            "username": u.username,
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "last_active": last_active,
            "pet_count": len(pets),
            "pets": [{"id": p.id, "name": p.name, "pet_type": p.pet_type} for p in pets],
        })

    return {"total": total, "users": result}


def _get_last_active(user_id: str, db: Session):
    """用 SQLite max() 跨多张表取最新活跃时间，返回本地时间字符串"""
    tables = [
        "consultation_messages", "toilet_records", "daily_recipes",
        "gene_records", "weight_records", "meal_logs",
    ]
    candidates = []
    for table in tables:
        row = db.execute(
            text(f"SELECT max(created_at) FROM {table} WHERE user_id = :uid"),
            {"uid": user_id},
        ).scalar()
        if row:
            candidates.append(row)
    if not candidates:
        return None
    latest = max(candidates)  # 字符串 ISO 格式，直接 max 即可
    return latest


# ─────────────────────────────────────────────────────────────────────────────
# 单个用户详情
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/users/{user_id}")
def get_user_detail(
    user_id: str,
    db: Session = Depends(get_db),
    _=Depends(_require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    pets = db.query(PetProfile).filter(PetProfile.user_id == user_id).all()

    # 各功能使用次数
    feature_usage = {
        "consultation": db.query(func.count(ConsultationMessage.id))
            .filter(ConsultationMessage.user_id == user_id, ConsultationMessage.role == "user")
            .scalar() or 0,
        "toilet": db.query(func.count(ToiletRecord.id))
            .filter(ToiletRecord.user_id == user_id).scalar() or 0,
        "recipe": db.query(func.count(DailyRecipe.id))
            .filter(DailyRecipe.user_id == user_id).scalar() or 0,
        "gene": db.query(func.count(GeneRecord.id))
            .filter(GeneRecord.user_id == user_id).scalar() or 0,
        "health_photo": db.query(func.count(PhotoAnalysisRecord.id))
            .filter(PhotoAnalysisRecord.user_id == user_id).scalar() or 0,
        "weight": db.query(func.count(WeightRecord.id))
            .filter(WeightRecord.user_id == user_id).scalar() or 0,
        "meal_log": db.query(func.count(MealLog.id))
            .filter(MealLog.user_id == user_id).scalar() or 0,
    }

    pets_detail = []
    for p in pets:
        social = db.query(PetSocialProfile).filter(PetSocialProfile.pet_id == p.id).first()
        toilet_cnt = db.query(func.count(ToiletRecord.id)).filter(ToiletRecord.pet_id == p.id).scalar() or 0
        recipe_cnt = db.query(func.count(DailyRecipe.id)).filter(DailyRecipe.pet_id == p.id).scalar() or 0
        gene_cnt = db.query(func.count(GeneRecord.id)).filter(GeneRecord.pet_id == p.id).scalar() or 0
        consult_cnt = (db.query(func.count(ConsultationMessage.id))
            .filter(ConsultationMessage.pet_id == p.id, ConsultationMessage.role == "user")
            .scalar() or 0)

        pets_detail.append({
            "id": p.id,
            "name": p.name,
            "pet_type": p.pet_type,
            "breed": p.breed,
            "age": p.age,
            "age_unit": p.age_unit,
            "gender": p.gender,
            "weight": p.weight,
            "length": p.length,
            "avatar_url": p.avatar_url,
            "front_photo_path": p.front_photo_path,
            "side_photo_path": p.side_photo_path,
            "created_at": p.created_at.isoformat() if p.created_at else None,
            "social_bio": social.bio if social else None,
            "social_tags": social.tags if social else [],
            "usage": {
                "toilet": toilet_cnt,
                "recipe": recipe_cnt,
                "gene": gene_cnt,
                "consultation": consult_cnt,
            },
        })

    return {
        "user_id": user.id,
        "username": user.username,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "last_active": _get_last_active(user_id, db),
        "feature_usage": feature_usage,
        "pets": pets_detail,
    }


# ─────────────────────────────────────────────────────────────────────────────
# 修改用户
# ─────────────────────────────────────────────────────────────────────────────

class UserUpdate(BaseModel):
    username: Optional[str] = None


@router.patch("/users/{user_id}")
def update_user(
    user_id: str,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    _=Depends(_require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if payload.username is not None:
        # 检查用户名唯一
        exists = db.query(User).filter(User.username == payload.username, User.id != user_id).first()
        if exists:
            raise HTTPException(status_code=409, detail="用户名已被占用")
        user.username = payload.username
    db.commit()
    db.refresh(user)
    return {"ok": True, "username": user.username}


# ─────────────────────────────────────────────────────────────────────────────
# 删除用户（级联删除所有数据）
# ─────────────────────────────────────────────────────────────────────────────

def _delete_pet_data(pet_id: int, db: Session):
    """删除单只宠物的所有关联数据及本地文件"""
    pet = db.query(PetProfile).filter(PetProfile.id == pet_id).first()
    if not pet:
        return

    # 删本地文件
    for path_attr in ("front_photo_path", "side_photo_path", "avatar_url"):
        p = getattr(pet, path_attr, None)
        if p:
            local = Path("." + p) if p.startswith("/") else Path(p)
            local.unlink(missing_ok=True)

    # 删关联记录文件
    for rec in db.query(ToiletRecord).filter(ToiletRecord.pet_id == pet_id).all():
        Path(rec.image_path).unlink(missing_ok=True) if rec.image_path else None
    for rec in db.query(GeneRecord).filter(GeneRecord.pet_id == pet_id).all():
        Path(rec.image_path).unlink(missing_ok=True) if rec.image_path else None
    social = db.query(PetSocialProfile).filter(PetSocialProfile.pet_id == pet_id).first()
    if social and social.photo_paths:
        for p in social.photo_paths:
            local = Path("." + p) if p.startswith("/") else Path(p)
            local.unlink(missing_ok=True)

    # 删 DB 关联数据
    for model in (
        ConsultationMessage, ConversationSummary, ToiletRecord,
        DailyRecipe, WeightRecord, GeneRecord, MealLog,
        MealDaySummary, PhotoAnalysisRecord, PetSocialProfile,
    ):
        db.query(model).filter(model.pet_id == pet_id).delete()

    db.delete(pet)


@router.delete("/users/{user_id}")
def delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    _=Depends(_require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    pets = db.query(PetProfile).filter(PetProfile.user_id == user_id).all()
    for pet in pets:
        _delete_pet_data(pet.id, db)

    db.delete(user)
    db.commit()
    return {"ok": True}


# ─────────────────────────────────────────────────────────────────────────────
# 修改宠物档案
# ─────────────────────────────────────────────────────────────────────────────

class PetUpdate(BaseModel):
    name: Optional[str] = None
    pet_type: Optional[str] = None
    breed: Optional[str] = None
    age: Optional[int] = None
    age_unit: Optional[str] = None
    gender: Optional[str] = None
    weight: Optional[float] = None
    length: Optional[float] = None


@router.patch("/pets/{pet_id}")
def update_pet(
    pet_id: int,
    payload: PetUpdate,
    db: Session = Depends(get_db),
    _=Depends(_require_admin),
):
    pet = db.query(PetProfile).filter(PetProfile.id == pet_id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    for field, val in payload.model_dump(exclude_none=True).items():
        setattr(pet, field, val)
    db.commit()
    db.refresh(pet)
    return {"ok": True}


# ─────────────────────────────────────────────────────────────────────────────
# 删除宠物档案
# ─────────────────────────────────────────────────────────────────────────────

@router.delete("/pets/{pet_id}")
def delete_pet(
    pet_id: int,
    db: Session = Depends(get_db),
    _=Depends(_require_admin),
):
    pet = db.query(PetProfile).filter(PetProfile.id == pet_id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    _delete_pet_data(pet_id, db)
    db.commit()
    return {"ok": True}

