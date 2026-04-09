import base64
import json
from pathlib import Path
from typing import Optional
from uuid import uuid4

import httpx
from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import PetProfile, ToiletRecord
from ..schemas import ToiletAnalyzeOut, ToiletRecordOut
from ..settings import ARK_API_KEY, ARK_MODEL_ID, ARK_RESPONSES_URL

router = APIRouter(prefix="/api/toilet", tags=["toilet"])
UPLOAD_DIR = Path("uploads/toilet")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def _build_toilet_prompt(pet: PetProfile, has_poop: bool, has_pee: bool) -> str:
    if has_poop and has_pee:
        type_desc = "大便和小便"
    elif has_poop:
        type_desc = "大便"
    else:
        type_desc = "小便"

    return (
        f"你是一位专业的宠物健康分析师。请根据上传的宠物{type_desc}照片，分析宠物的健康状况。\n\n"
        f"宠物档案: 名字={pet.name}, 类型={pet.pet_type}, 品种={pet.breed}, "
        f"年龄={pet.age}{pet.age_unit or ''}, 体重={pet.weight}kg。\n\n"
        f"请按照以下格式返回JSON分析结果：\n"
        f'{{\n'
        f'  "status": "正常" 或 "注意" 或 "异常",\n'
        f'  "description": "详细描述{type_desc}的外观、颜色、形状等",\n'
        f'  "scores": {{\n'
        f'    "消化健康": 85,\n'
        f'    "水分摄入": 75,\n'
        f'    "肠道菌群": 80\n'
        f'  }},\n'
        f'  "suggestion": "详细的健康建议"\n'
        f'}}\n\n'
        f"注意：请只返回JSON格式的结果，不要包含其他文字。"
    )


async def _call_ark_responses_multi(prompt: str, base64_images: list[str]) -> dict:
    """多张图片分析，使用 base64 编码图片"""
    api_key = ARK_API_KEY.strip()
    if not api_key:
        raise HTTPException(status_code=500, detail="ARK_API_KEY not configured")

    # 构建content，使用 base64 data URI
    content = []
    for b64_img in base64_images:
        content.append({
            "type": "input_image",
            "image_url": b64_img,
        })
    content.append({
        "type": "input_text",
        "text": prompt,
    })

    payload = {
        "model": ARK_MODEL_ID,
        "input": [
            {
                "role": "user",
                "content": content,
            }
        ],
    }

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
    }

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(ARK_RESPONSES_URL, headers=headers, json=payload)
        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail=f"ark api error: {resp.text}")

        data = resp.json()
        try:
            if "error" in data:
                raise HTTPException(status_code=502, detail=f"ARK API返回错误: {data['error']}")

            output = data.get("output", [])
            if not output or not isinstance(output, list):
                raise HTTPException(status_code=502, detail="模型返回为空")

            output_text = ""
            for item in output:
                if isinstance(item, dict):
                    if item.get("type") == "message":
                        msg_content = item.get("content", [])
                        if msg_content and isinstance(msg_content, list):
                            for c in msg_content:
                                if isinstance(c, dict) and c.get("type") == "output_text":
                                    output_text = c.get("text", "")
                                    break
                        break

            if not output_text:
                if isinstance(output[0], dict):
                    output_text = output[0].get("text", "")
            if not output_text:
                raise HTTPException(status_code=502, detail="模型返回为空")

            # 尝试解析JSON
            output_text = output_text.strip()
            if output_text.startswith("```json"):
                output_text = output_text[7:]
            if output_text.startswith("```"):
                output_text = output_text[3:]
            if output_text.endswith("```"):
                output_text = output_text[:-3]
            output_text = output_text.strip()

            return json.loads(output_text)
        except json.JSONDecodeError:
            return {
                "status": "分析中",
                "description": output_text[:200],
                "scores": {
                    "消化健康": 75,
                    "水分摄入": 70,
                    "肠道菌群": 75,
                },
                "suggestion": "AI分析结果处理中，请稍后查看历史记录。",
            }
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"解析结果失败: {str(exc)}")


def _file_to_base64_data_uri(file_bytes: bytes, filename: str) -> str:
    """将文件字节转为 base64 data URI"""
    suffix = Path(filename).suffix.lower()
    mime_map = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".gif": "image/gif", ".webp": "image/webp"}
    mime = mime_map.get(suffix, "image/jpeg")
    b64 = base64.b64encode(file_bytes).decode("utf-8")
    return f"data:{mime};base64,{b64}"


@router.post("/analyze", response_model=ToiletAnalyzeOut)
async def analyze_toilet(
    request: Request,
    db: Session = Depends(get_db),
    user_id: str = Form(),
    pet_id: int = Form(),
    poop_image: Optional[UploadFile] = File(None),
    pee_image: Optional[UploadFile] = File(None),
):
    """上传大小便照片进行AI分析（支持分别上传大便和小便照片）"""
    # 验证宠物档案
    pet = db.query(PetProfile).filter(PetProfile.id == pet_id, PetProfile.user_id == user_id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="pet not found")

    has_poop = poop_image is not None and poop_image.filename
    has_pee = pee_image is not None and pee_image.filename

    if not has_poop and not has_pee:
        raise HTTPException(status_code=400, detail="请至少上传一张照片")

    # 确定 toilet_type
    if has_poop and has_pee:
        toilet_type = "both"
    elif has_poop:
        toilet_type = "poop"
    else:
        toilet_type = "pee"

    base64_images = []
    image_paths = []

    # 处理大便照片
    if has_poop:
        poop_bytes = await poop_image.read()
        suffix = Path(poop_image.filename).suffix or ".jpg"
        file_name = f"poop_{uuid4().hex}{suffix}"
        file_path = UPLOAD_DIR / file_name
        file_path.write_bytes(poop_bytes)
        image_paths.append(str(file_path))
        base64_images.append(_file_to_base64_data_uri(poop_bytes, poop_image.filename))

    # 处理小便照片
    if has_pee:
        pee_bytes = await pee_image.read()
        suffix = Path(pee_image.filename).suffix or ".jpg"
        file_name = f"pee_{uuid4().hex}{suffix}"
        file_path = UPLOAD_DIR / file_name
        file_path.write_bytes(pee_bytes)
        image_paths.append(str(file_path))
        base64_images.append(_file_to_base64_data_uri(pee_bytes, pee_image.filename))

    # 调用AI分析
    prompt = _build_toilet_prompt(pet, has_poop, has_pee)
    analysis = await _call_ark_responses_multi(prompt, base64_images)

    # 保存记录到数据库
    record = ToiletRecord(
        user_id=user_id,
        pet_id=pet_id,
        type=toilet_type,
        image_path=",".join(image_paths),
        analysis_result=analysis,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return ToiletAnalyzeOut(
        record_id=record.id,
        status=analysis.get("status", "未知"),
        scores=analysis.get("scores", {}),
        suggestion=analysis.get("suggestion", ""),
    )


@router.get("/history", response_model=list[ToiletRecordOut])
def get_toilet_history(user_id: str, pet_id: int, db: Session = Depends(get_db)):
    """获取宠物的大小便历史记录"""
    records = (
        db.query(ToiletRecord)
        .filter(
            ToiletRecord.user_id == user_id,
            ToiletRecord.pet_id == pet_id,
        )
        .order_by(ToiletRecord.created_at.desc())
        .limit(50)
        .all()
    )
    return records
