import base64
import json
from pathlib import Path
from typing import Optional
from uuid import uuid4

import httpx
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import GeneRecord, PetProfile
from ..schemas import GeneRecordOut
from ..settings import ARK_API_KEY, ARK_MODEL_ID, ARK_RESPONSES_URL

router = APIRouter(prefix="/api/gene", tags=["gene"])
UPLOAD_DIR = Path("uploads/gene")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def _file_to_base64_data_uri(file_bytes: bytes, filename: str) -> str:
    suffix = Path(filename).suffix.lower()
    mime_map = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".gif": "image/gif", ".webp": "image/webp"}
    mime = mime_map.get(suffix, "image/jpeg")
    b64 = base64.b64encode(file_bytes).decode("utf-8")
    return f"data:{mime};base64,{b64}"


def _build_gene_prompt(pet: PetProfile) -> str:
    pet_type = pet.pet_type or "宠物"
    breed = pet.breed or "未知品种"
    return (
        f"你是一位专业的宠物基因分析师。请根据上传的宠物照片，分析这只{pet_type}的品种血统组成。\n\n"
        f"宠物档案: 名字={pet.name}, 类型={pet_type}, 品种={breed}, "
        f"年龄={pet.age}{pet.age_unit or ''}, 性别={pet.gender or '未知'}。\n\n"
        f"请按照以下JSON格式返回分析结果：\n"
        f'{{\n'
        f'  "breeds": [\n'
        f'    {{"breed": "品种名称", "percent": 65, "emoji": "🐕", "color": "#7C5CBF"}},\n'
        f'    {{"breed": "品种名称", "percent": 25, "emoji": "🐶", "color": "#5B8DEF"}},\n'
        f'    {{"breed": "其他混合", "percent": 10, "emoji": "🐾", "color": "#AAA"}}\n'
        f'  ],\n'
        f'  "conclusion": "关于这只{pet_type}品种血统组成的详细结论和性格特征描述，100字以内",\n'
        f'  "traits": [\n'
        f'    {{"name": "特征名称", "value": "特征描述"}}\n'
        f'  ]\n'
        f'}}\n\n'
        f"要求：\n"
        f"1. breeds数组按占比从高到低排列，最多5个品种\n"
        f"2. percent总和必须为100\n"
        f"3. 根据照片中宠物的外观特征进行分析\n"
        f"4. traits列出3-5个显著特征（如体型、毛发、性格倾向等）\n"
        f"5. 只返回JSON格式，不要包含其他文字"
    )


async def _call_ark_for_gene(prompt: str, base64_image: str) -> dict:
    api_key = ARK_API_KEY.strip()
    if not api_key:
        raise HTTPException(status_code=500, detail="ARK_API_KEY not configured")

    payload = {
        "model": ARK_MODEL_ID,
        "input": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "input_image",
                        "image_url": base64_image,
                    },
                    {
                        "type": "input_text",
                        "text": prompt,
                    },
                ],
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
                if isinstance(item, dict) and item.get("type") == "message":
                    msg_content = item.get("content", [])
                    if msg_content and isinstance(msg_content, list):
                        for c in msg_content:
                            if isinstance(c, dict) and c.get("type") == "output_text":
                                output_text = c.get("text", "")
                                break
                    break

            if not output_text and isinstance(output[0], dict):
                output_text = output[0].get("text", "")

            if not output_text:
                raise HTTPException(status_code=502, detail="模型返回为空")

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
                "breeds": [
                    {"breed": "分析中", "percent": 100, "emoji": "🐾", "color": "#7C5CBF"},
                ],
                "conclusion": output_text[:200] if output_text else "AI分析结果处理中，请稍后重试。",
                "traits": [],
            }
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"解析结果失败: {str(exc)}")


@router.post("/analyze")
async def analyze_gene(
    user_id: str = Form(),
    pet_id: int = Form(),
    image: UploadFile = File(),
    db: Session = Depends(get_db),
):
    """上传宠物照片进行AI基因/品种分析"""
    pet = db.query(PetProfile).filter(PetProfile.id == pet_id, PetProfile.user_id == user_id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="pet not found")

    image_bytes = await image.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="请上传照片")

    # 保存图片到本地
    suffix = Path(image.filename or "photo.jpg").suffix or ".jpg"
    file_name = f"gene_{uuid4().hex}{suffix}"
    file_path = UPLOAD_DIR / file_name
    file_path.write_bytes(image_bytes)

    # 转为 base64 发送给 AI
    base64_image = _file_to_base64_data_uri(image_bytes, image.filename or "photo.jpg")

    prompt = _build_gene_prompt(pet)
    analysis = await _call_ark_for_gene(prompt, base64_image)

    # 保存分析记录到数据库
    record = GeneRecord(
        user_id=user_id,
        pet_id=pet_id,
        image_path=str(file_path),
        analysis_result=analysis,
    )
    db.add(record)

    # 将占比最高的品种同步到宠物档案
    breeds = analysis.get("breeds", [])
    if breeds:
        top_breed = breeds[0].get("breed", "")
        if top_breed and top_breed != "分析中":
            # 拼接品种信息，例如"金毛(65%)+拉布拉多(25%)"
            breed_summary = "+".join(
                f"{b['breed']}({b['percent']}%)" for b in breeds if b.get("percent", 0) >= 10
            )
            pet.breed = breed_summary or top_breed

    db.commit()
    db.refresh(record)

    return {
        "record_id": record.id,
        **analysis,
    }


@router.get("/history", response_model=list[GeneRecordOut])
def get_gene_history(user_id: str, pet_id: int, db: Session = Depends(get_db)):
    """获取基因检测历史记录"""
    records = (
        db.query(GeneRecord)
        .filter(
            GeneRecord.user_id == user_id,
            GeneRecord.pet_id == pet_id,
        )
        .order_by(GeneRecord.created_at.desc())
        .limit(20)
        .all()
    )
    return records
