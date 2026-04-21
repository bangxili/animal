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
ID_PHOTO_DIR = Path("uploads/id_photos")
ID_PHOTO_DIR.mkdir(parents=True, exist_ok=True)

STYLE_PROMPTS: dict[str, str] = {
    "headshot": (
        "参考美式校园风格headshot，只露出上半身，不要改变宠物样貌，"
        "专业摄影棚灯光，背景为柔和渐变，高清写实风格"
    ),
    "grid9": (
        "根据这张照片给宠物生成9张不同表情的证件照，白底，只露出上半身，"
        "不要改变宠物样貌，比例3:4。"
        "表情分别为（1）正脸吐舌头笑（2）歪头吐舌头舔鼻尖（3）正脸咧嘴笑"
        "（4）正脸举左侧爪子（5）正脸大笑（6）歪头大笑（7）歪头吐舌笑"
        "（8）正脸委屈（9）正脸张嘴笑闭眼睛。原比例，3列3行网格排列"
    ),
}


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

    allowed = {"name", "age", "age_unit", "gender", "pet_type", "breed", "weight", "length", "avatar_url"}
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

    # 用正面照路径作为默认头像（不再自动生成Q版）
    if front_photo and pet.front_photo_path and not pet.avatar_url:
        pet.avatar_url = f"/{pet.front_photo_path}"
        db.commit()

    db.refresh(pet)
    return pet


@router.post("/{pet_id}/generate-avatar", response_model=PetProfileOut)
async def generate_pet_avatar(
    pet_id: int,
    db: Session = Depends(get_db),
):
    """单独触发 Q 版卡通头像生成（调用 Seedream 模型）"""
    pet = db.query(PetProfile).filter(PetProfile.id == pet_id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="pet not found")
    if not pet.front_photo_path:
        raise HTTPException(status_code=400, detail="请先上传宠物正面照片")

    # 读取正面照文件
    front_path = Path(pet.front_photo_path)
    if not front_path.exists():
        # 兼容有前导斜杠的路径
        front_path = Path("." + pet.front_photo_path) if pet.front_photo_path.startswith("/") else Path(pet.front_photo_path)
    if not front_path.exists():
        raise HTTPException(status_code=404, detail="正面照文件不存在，请重新上传")

    front_bytes = front_path.read_bytes()
    photo_data_list = [(front_bytes, front_path.name)]

    cartoon_url = await _generate_cartoon_image(pet, photo_data_list)
    if not cartoon_url:
        raise HTTPException(status_code=502, detail="AI 形象生成失败，请稍后重试")

    pet.avatar_url = cartoon_url
    db.commit()
    db.refresh(pet)
    return pet


@router.post("/{pet_id}/id-photo")
async def generate_id_photo(
    pet_id: int,
    style: str = Form(...),
    photo: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """生成宠物证件照（headshot 或 grid9）"""
    pet = db.query(PetProfile).filter(PetProfile.id == pet_id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="pet not found")

    prompt = STYLE_PROMPTS.get(style)
    if not prompt:
        raise HTTPException(status_code=400, detail="invalid style")

    api_key = ARK_API_KEY.strip()
    if not api_key:
        raise HTTPException(status_code=502, detail="AI 服务未配置")

    photo_bytes = await photo.read()
    ref_image = _file_to_base64_data_uri(photo_bytes, photo.filename or "photo.jpg")

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

    print(f"[IdPhoto] style={style}, pet={pet.name}")
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(180, connect=30)) as client:
            resp = await client.post(ARK_IMAGES_URL, headers=headers, json=payload)
            if resp.status_code != 200:
                print(f"[IdPhoto] FAILED (HTTP {resp.status_code}): {resp.text[:300]}")
                raise HTTPException(status_code=502, detail=f"生成失败 ({resp.status_code})")

            data = resp.json()
            remote_url = data.get("data", [{}])[0].get("url")
            if not remote_url:
                raise HTTPException(status_code=502, detail="生成失败，未获取到图片 URL")

            dl_resp = await client.get(remote_url)
            local_name = f"{uuid4().hex}_idphoto.jpeg"
            local_path = ID_PHOTO_DIR / local_name
            local_path.write_bytes(dl_resp.content)
            local_url = f"/uploads/id_photos/{local_name}"
            print(f"[IdPhoto] saved: {local_url}")
            return {"url": local_url}

    except HTTPException:
        raise
    except Exception as e:
        print(f"[IdPhoto] Exception: {type(e).__name__}: {e}")
        raise HTTPException(status_code=502, detail=f"生成失败: {type(e).__name__}")
