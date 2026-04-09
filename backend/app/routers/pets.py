import base64
from pathlib import Path
from typing import Optional
from uuid import uuid4

import httpx
from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import PetProfile
from ..schemas import PetProfileCreate, PetProfileOut
from ..settings import ARK_API_KEY, ARK_IMAGES_URL, ARK_SEEDREAM_MODEL

router = APIRouter(prefix="/api/pets", tags=["pets"])
UPLOAD_DIR = Path("uploads/pets")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
AVATAR_DIR = Path("uploads/avatars")
AVATAR_DIR.mkdir(parents=True, exist_ok=True)


def _file_to_base64_data_uri(file_bytes: bytes, filename: str) -> str:
    """将文件字节转为 base64 data URI"""
    suffix = Path(filename).suffix.lower()
    mime_map = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".gif": "image/gif", ".webp": "image/webp"}
    mime = mime_map.get(suffix, "image/jpeg")
    b64 = base64.b64encode(file_bytes).decode("utf-8")
    return f"data:{mime};base64,{b64}"


@router.post("", response_model=PetProfileOut)
def create_pet(payload: PetProfileCreate, db: Session = Depends(get_db)):
    pet = PetProfile(**payload.model_dump())
    db.add(pet)
    db.commit()
    db.refresh(pet)
    return pet


@router.get("", response_model=list[PetProfileOut])
def list_pets(user_id: str, db: Session = Depends(get_db)):
    return (
        db.query(PetProfile)
        .filter(PetProfile.user_id == user_id)
        .order_by(PetProfile.created_at.desc())
        .all()
    )


@router.get("/{pet_id}", response_model=PetProfileOut)
def get_pet(pet_id: int, db: Session = Depends(get_db)):
    pet = db.query(PetProfile).filter(PetProfile.id == pet_id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="pet not found")
    return pet


@router.delete("/{pet_id}")
def delete_pet(pet_id: int, db: Session = Depends(get_db)):
    """删除宠物档案及其所有关联数据"""
    from ..models import ConsultationMessage, DailyRecipe, GeneRecord, MealDaySummary, MealLog, ToiletRecord, WeightRecord, PhotoAnalysisRecord

    pet = db.query(PetProfile).filter(PetProfile.id == pet_id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="pet not found")

    # 删除所有关联数据
    db.query(ConsultationMessage).filter(ConsultationMessage.pet_id == pet_id).delete()
    db.query(ToiletRecord).filter(ToiletRecord.pet_id == pet_id).delete()
    db.query(DailyRecipe).filter(DailyRecipe.pet_id == pet_id).delete()
    db.query(MealLog).filter(MealLog.pet_id == pet_id).delete()
    db.query(MealDaySummary).filter(MealDaySummary.pet_id == pet_id).delete()
    db.query(WeightRecord).filter(WeightRecord.pet_id == pet_id).delete()
    db.query(GeneRecord).filter(GeneRecord.pet_id == pet_id).delete()
    db.query(PhotoAnalysisRecord).filter(PhotoAnalysisRecord.pet_id == pet_id).delete()

    db.delete(pet)
    db.commit()
    return {"ok": True}


@router.patch("/{pet_id}", response_model=PetProfileOut)
def update_pet(pet_id: int, payload: dict, db: Session = Depends(get_db)):
    """更新宠物档案（支持部分更新）"""
    pet = db.query(PetProfile).filter(PetProfile.id == pet_id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="pet not found")

    allowed = {"name", "age", "age_unit", "gender", "pet_type", "breed", "weight", "length"}
    for k, v in payload.items():
        if k in allowed:
            setattr(pet, k, v)
    db.commit()
    db.refresh(pet)
    return pet


async def _generate_cartoon_image(
    pet: PetProfile,
    photo_data_list: list[tuple[bytes, str]],
) -> Optional[str]:
    """调用即梦(doubao-seedream-5.0)模型，基于宠物照片生成Q版卡通头像"""
    api_key = ARK_API_KEY.strip()
    if not api_key:
        print("[Avatar] ARK_API_KEY is empty, skipping")
        return None

    if not photo_data_list:
        return None

    # 将正面照转为 base64 data URI（只用第一张）
    front_data, front_name = photo_data_list[0]
    ref_image = _file_to_base64_data_uri(front_data, front_name)

    # 构建提示词
    pet_type = pet.pet_type or "宠物"
    breed = pet.breed or ""

    prompt = (
        f"基于这张真实{pet_type}{breed}照片，生成一个超可爱的Q版卡通大头照头像。"
        f"要求：保留{pet_type}原本的毛色花纹特征，大头小身体的Q版比例，"
        f"圆润可爱的脸庞，水汪汪的大眼睛，微笑表情，"
        f"浅粉色纯色背景，日系动漫卡通风格，高品质，正面头像构图"
    )

    # 严格按照官方 REST API 示例构造 payload
    payload = {
        "model": ARK_SEEDREAM_MODEL,
        "prompt": prompt,
        "image": [ref_image],
        "sequential_image_generation": "disabled",
        "response_format": "url",
        "size": "2K",
        "stream": False,
        "watermark": True,
    }

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
    }

    print(f"[Avatar] Calling ARK image API: model={ARK_SEEDREAM_MODEL}, image_base64_len={len(ref_image)}")

    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(180, connect=30)) as client:
            resp = await client.post(ARK_IMAGES_URL, headers=headers, json=payload)
            if resp.status_code != 200:
                print(f"[Avatar] FAILED (HTTP {resp.status_code}): {resp.text[:500]}")
                return None

            data = resp.json()
            remote_url = data.get("data", [{}])[0].get("url")
            if not remote_url:
                print(f"[Avatar] No URL in response: {str(data)[:500]}")
                return None

            print(f"[Avatar] Got remote URL for pet '{pet.name}', downloading...")

            # 下载图片到本地（远程URL是临时签名的，24小时过期）
            dl_resp = await client.get(remote_url)
            if dl_resp.status_code != 200:
                print(f"[Avatar] Download failed: {dl_resp.status_code}")
                return remote_url  # fallback to remote URL

            local_name = f"{uuid4().hex}_avatar.jpeg"
            local_path = AVATAR_DIR / local_name
            local_path.write_bytes(dl_resp.content)
            local_url = f"/uploads/avatars/{local_name}"
            print(f"[Avatar] Saved locally: {local_url}")
            return local_url
    except Exception as e:
        print(f"[Avatar] Exception: {type(e).__name__}: {e}")
        return None


@router.get("/test-avatar")
async def test_avatar_generation():
    """测试即梦API是否能正常调用（使用官方示例图片URL）"""
    api_key = ARK_API_KEY.strip()
    payload = {
        "model": ARK_SEEDREAM_MODEL,
        "prompt": "将这只狗狗转换成可爱的Q版卡通大头照，大眼睛，圆润可爱，粉色背景",
        "image": ["https://ark-project.tos-cn-beijing.volces.com/doc_image/seedream4_imagesToimage_1.png"],
        "sequential_image_generation": "disabled",
        "response_format": "url",
        "size": "2K",
        "stream": False,
        "watermark": True,
    }
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
    }
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(180, connect=30)) as client:
            resp = await client.post(ARK_IMAGES_URL, headers=headers, json=payload)
            return {
                "status": resp.status_code,
                "response": resp.json() if resp.status_code == 200 else resp.text[:500],
            }
    except Exception as e:
        return {"status": "error", "detail": f"{type(e).__name__}: {e}"}


@router.post("/{pet_id}/photos", response_model=PetProfileOut)
async def upload_pet_photos(
    pet_id: int,
    request: Request,
    front_photo: Optional[UploadFile] = File(default=None),
    side_photo: Optional[UploadFile] = File(default=None),
    db: Session = Depends(get_db),
):
    pet = db.query(PetProfile).filter(PetProfile.id == pet_id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="pet not found")

    photo_data_list: list[tuple[bytes, str]] = []

    if front_photo:
        front_bytes = await front_photo.read()
        front_filename = front_photo.filename or "photo.jpg"
        suffix = Path(front_filename).suffix or ".jpg"
        front_name = f"{uuid4().hex}_front{suffix}"
        front_path = UPLOAD_DIR / front_name
        front_path.write_bytes(front_bytes)
        pet.front_photo_path = str(front_path)
        photo_data_list.append((front_bytes, front_filename))

    if side_photo:
        side_bytes = await side_photo.read()
        side_filename = side_photo.filename or "photo.jpg"
        suffix = Path(side_filename).suffix or ".jpg"
        side_name = f"{uuid4().hex}_side{suffix}"
        side_path = UPLOAD_DIR / side_name
        side_path.write_bytes(side_bytes)
        pet.side_photo_path = str(side_path)
        photo_data_list.append((side_bytes, side_filename))

    db.commit()

    # 上传了照片后，生成Q版卡通头像并保存到 avatar_url
    if photo_data_list:
        print(f"[Avatar] Starting cartoon generation for pet {pet_id} with {len(photo_data_list)} photo(s)...")
        cartoon_url = await _generate_cartoon_image(pet, photo_data_list)
        if cartoon_url:
            pet.avatar_url = cartoon_url
            db.commit()
            print(f"[Avatar] Saved avatar_url for pet {pet_id}: {cartoon_url[:80]}...")
        else:
            print(f"[Avatar] Failed to generate cartoon for pet {pet_id}")

    db.refresh(pet)
    return pet
