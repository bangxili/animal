from pathlib import Path
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import PetProfile, PetSocialProfile
from ..schemas import SocialProfileOut, SocialProfileUpdate

router = APIRouter(prefix="/api/match", tags=["match"])

SOCIAL_PHOTO_DIR = Path("uploads/social")
SOCIAL_PHOTO_DIR.mkdir(parents=True, exist_ok=True)

API_BASE_PATH = "/uploads/social"


def _get_or_create_social_profile(
    user_id: str, pet_id: int, db: Session
) -> PetSocialProfile:
    profile = (
        db.query(PetSocialProfile)
        .filter(PetSocialProfile.user_id == user_id, PetSocialProfile.pet_id == pet_id)
        .first()
    )
    if not profile:
        profile = PetSocialProfile(user_id=user_id, pet_id=pet_id, photo_paths=[], tags=[])
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


@router.get("/profile", response_model=SocialProfileOut)
def get_social_profile(user_id: str, pet_id: int, db: Session = Depends(get_db)):
    """获取宠物社交主页（不存在则自动创建空档案）"""
    pet = db.query(PetProfile).filter(PetProfile.id == pet_id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="pet not found")
    profile = _get_or_create_social_profile(user_id, pet_id, db)
    return profile


@router.patch("/profile", response_model=SocialProfileOut)
def update_social_profile(
    user_id: str,
    pet_id: int,
    payload: SocialProfileUpdate,
    db: Session = Depends(get_db),
):
    """更新自我介绍和标签"""
    profile = _get_or_create_social_profile(user_id, pet_id, db)
    if payload.bio is not None:
        profile.bio = payload.bio
    if payload.tags is not None:
        profile.tags = payload.tags
    db.commit()
    db.refresh(profile)
    return profile


@router.post("/profile/photos", response_model=SocialProfileOut)
async def upload_social_photo(
    user_id: str,
    pet_id: int,
    photo: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """上传照片到照片墙"""
    profile = _get_or_create_social_profile(user_id, pet_id, db)

    file_bytes = await photo.read()
    filename = photo.filename or "photo.jpg"
    suffix = Path(filename).suffix or ".jpg"
    saved_name = f"{uuid4().hex}{suffix}"
    saved_path = SOCIAL_PHOTO_DIR / saved_name
    saved_path.write_bytes(file_bytes)

    url_path = f"/uploads/social/{saved_name}"
    current_photos: list = list(profile.photo_paths or [])
    current_photos.append(url_path)
    profile.photo_paths = current_photos

    db.commit()
    db.refresh(profile)
    return profile


@router.delete("/profile/photos/{photo_index}", response_model=SocialProfileOut)
def delete_social_photo(
    user_id: str,
    pet_id: int,
    photo_index: int,
    db: Session = Depends(get_db),
):
    """按索引删除照片墙中的照片"""
    profile = _get_or_create_social_profile(user_id, pet_id, db)
    current_photos: list = list(profile.photo_paths or [])

    if photo_index < 0 or photo_index >= len(current_photos):
        raise HTTPException(status_code=400, detail="invalid photo index")

    # 尝试删除本地文件
    path_str = current_photos[photo_index]
    local_path = Path("." + path_str)  # e.g. ./uploads/social/xxx.jpg
    if local_path.exists():
        local_path.unlink(missing_ok=True)

    current_photos.pop(photo_index)
    profile.photo_paths = current_photos
    db.commit()
    db.refresh(profile)
    return profile
