import base64
import json
from pathlib import Path
from typing import Optional
from uuid import uuid4

import httpx
from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from sqlalchemy.orm import Session

from ..database import get_db, SessionLocal
from ..models import ConsultationMessage, PetProfile, PhotoAnalysisRecord
from ..schemas import ConsultationAskOut, ConsultationMessageOut
from ..settings import ARK_API_KEY, ARK_API_BASE_URL, ARK_MODEL_ID

router = APIRouter(prefix="/api/consultations", tags=["consultations"])
UPLOAD_DIR = Path("uploads/consultations")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def _file_to_base64_data_uri(file_bytes: bytes, filename: str) -> str:
    """将文件字节转为 base64 data URI"""
    suffix = Path(filename).suffix.lower()
    mime_map = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".gif": "image/gif", ".webp": "image/webp"}
    mime = mime_map.get(suffix, "image/jpeg")
    b64 = base64.b64encode(file_bytes).decode("utf-8")
    return f"data:{mime};base64,{b64}"


def _build_prompt_context(pet: PetProfile, question: str) -> str:
    return (
        f"宠物档案: 名字={pet.name}, 类型={pet.pet_type}, 品种={pet.breed}, "
        f"年龄={pet.age}{pet.age_unit or ''}, 体重={pet.weight}kg, 体长={pet.length}cm。\n"
        f"用户问题: {question}"
    )


def _build_photo_score_prompt(pet: PetProfile, analysis_type: str) -> str:
    """构建毛发/精神评分提示词"""
    pet_type = pet.pet_type or "宠物"
    breed = pet.breed or ""

    if analysis_type == "fur":
        return (
            f"你是专业的宠物健康评估师。请仔细观察这张{pet_type}{breed}的照片，"
            f"对宠物的毛发健康进行综合评估。\n\n"
            f"评估维度：毛发光泽度、毛燥程度、泪痕、胡须状态、尾巴毛发、脱毛情况\n\n"
            f"请返回JSON格式（只返回JSON，不要其他文字）：\n"
            f'{{"score": 0到100的综合评分, "detail": "一句话总结毛发状态", "suggestion": "40字以内的护理建议"}}'
        )
    else:  # mood
        return (
            f"你是专业的宠物行为学专家，精通{pet_type}的肢体语言解读。"
            f"请仔细观察这张{pet_type}{breed}的照片，分析宠物的精神状态和心情。\n\n"
            f"分析维度：姿势、耳朵、眼神、嘴部、尾巴、整体活力\n\n"
            f"请返回JSON格式（只返回JSON，不要其他文字）：\n"
            f'{{"score": 0到100的精神评分, "mood": "开心/放松/紧张/疲惫/不适/焦虑等心情关键词", "detail": "一句话总结精神状态", "suggestion": "40字以内的建议"}}'
        )


async def _call_ark_vision_for_score(prompt: str, image_data_uri: str) -> dict:
    """调用 ARK 视觉模型分析图片并返回评分（使用 chat/completions 格式）"""
    api_key = ARK_API_KEY.strip()
    if not api_key:
        return {"score": None, "detail": "未配置API", "suggestion": ""}

    payload = {
        "model": ARK_MODEL_ID,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "image_url", "image_url": {"url": image_data_uri}},
                    {"type": "text", "text": prompt},
                ],
            }
        ],
    }
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
    }

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(ARK_API_BASE_URL, headers=headers, json=payload)
            if resp.status_code != 200:
                print(f"[PhotoScore] ARK API error: {resp.status_code} {resp.text[:200]}")
                return {"score": None, "detail": "分析失败", "suggestion": ""}

            data = resp.json()
            try:
                choice = data["choices"][0]["message"]["content"]
            except Exception:
                return {"score": None, "detail": "分析失败", "suggestion": ""}

            if isinstance(choice, list):
                texts = [c.get("text", "") for c in choice if isinstance(c, dict) and c.get("type") == "text"]
                output_text = "".join(texts)
            else:
                output_text = str(choice)

            if not output_text:
                return {"score": None, "detail": "分析失败", "suggestion": ""}

            output_text = output_text.strip()
            if output_text.startswith("```json"):
                output_text = output_text[7:]
            if output_text.startswith("```"):
                output_text = output_text[3:]
            if output_text.endswith("```"):
                output_text = output_text[:-3]

            return json.loads(output_text.strip())
    except json.JSONDecodeError:
        return {"score": None, "detail": "分析失败", "suggestion": ""}
    except Exception as e:
        print(f"[PhotoScore] Exception: {type(e).__name__}: {e}")
        return {"score": None, "detail": "分析失败", "suggestion": ""}


async def _analyze_and_store_photo_scores(
    user_id: str, pet_id: int, image_data_uri: str, image_path: str
):
    """在后台对上传的照片进行毛发+精神评分，并存入数据库"""
    db = SessionLocal()
    try:
        pet = db.query(PetProfile).filter(PetProfile.id == pet_id).first()
        if not pet:
            return

        for analysis_type in ("fur", "mood"):
            prompt = _build_photo_score_prompt(pet, analysis_type)
            result = await _call_ark_vision_for_score(prompt, image_data_uri)
            score = result.get("score")
            if score is None:
                continue

            record = PhotoAnalysisRecord(
                user_id=user_id,
                pet_id=pet_id,
                analysis_type=analysis_type,
                score=score,
                detail=result.get("detail", ""),
                suggestion=result.get("suggestion", ""),
                mood=result.get("mood") if analysis_type == "mood" else None,
                image_path=image_path,
            )
            db.add(record)

        db.commit()
        print(f"[PhotoScore] Saved fur+mood scores for pet {pet_id}")
    except Exception as e:
        print(f"[PhotoScore] Error: {type(e).__name__}: {e}")
        db.rollback()
    finally:
        db.close()


async def _call_volc_llm(prompt: str, image_data_uri: Optional[str]) -> str:
    api_key = ARK_API_KEY.strip()
    if not api_key:
        raise HTTPException(status_code=500, detail="ARK_API_KEY not configured in backend/app/settings.py")

    content: list[dict] = []
    if image_data_uri:
        content.append(
            {
                "type": "image_url",
                "image_url": {"url": image_data_uri},
            }
        )
    content.append(
        {
            "type": "text",
            "text": prompt,
        }
    )

    payload = {
        "model": ARK_MODEL_ID,
        "messages": [
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

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(ARK_API_BASE_URL, headers=headers, json=payload)
        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail=f"ark api error: {resp.text}")

        data = resp.json()
        # 兼容 OpenAI 风格与列表 content 两种返回
        try:
            choice = data["choices"][0]["message"]["content"]
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=502, detail="invalid ark response") from exc

        if isinstance(choice, str):
            return choice

        if isinstance(choice, list):
            texts = [c.get("text", "") for c in choice if isinstance(c, dict) and c.get("type") == "text"]
            return "".join(texts) or "模型未返回文本内容。"

        return str(choice)


@router.get("/history", response_model=list[ConsultationMessageOut])
def get_history(user_id: str, pet_id: int, db: Session = Depends(get_db)):
    return (
        db.query(ConsultationMessage)
        .filter(
            ConsultationMessage.user_id == user_id,
            ConsultationMessage.pet_id == pet_id,
        )
        .order_by(ConsultationMessage.created_at.asc())
        .all()
    )


@router.post("/ask", response_model=ConsultationAskOut)
async def ask_consultation(
    request: Request,
    db: Session = Depends(get_db),
    user_id: str = Form(),
    pet_id: int = Form(),
    question: str = Form(),
    image: UploadFile = File(None),
):
    """宠物问诊 - 简化版"""
    pet = db.query(PetProfile).filter(PetProfile.id == pet_id, PetProfile.user_id == user_id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="pet not found")

    image_path = None
    image_data_uri = None
    if image and image.filename:
        image_bytes = await image.read()
        suffix = Path(image.filename).suffix or ".jpg"
        file_name = f"{uuid4().hex}{suffix}"
        file_path = UPLOAD_DIR / file_name
        file_path.write_bytes(image_bytes)
        image_path = str(file_path)
        # 转为 base64 data URI，直接发送给 ARK API，不依赖公网 URL
        image_data_uri = _file_to_base64_data_uri(image_bytes, image.filename)

    # 当前问题上下文
    prompt_context = _build_prompt_context(pet, question)
    answer = await _call_volc_llm(prompt_context, image_data_uri)

    # 保存消息
    user_msg = ConsultationMessage(
        user_id=user_id,
        pet_id=pet_id,
        role="user",
        content=question,
        image_path=image_path,
    )
    assistant_msg = ConsultationMessage(
        user_id=user_id,
        pet_id=pet_id,
        role="assistant",
        content=answer,
        image_path=None,
    )
    db.add(user_msg)
    db.add(assistant_msg)
    db.commit()

    # 如果上传了图片，异步触发毛发+精神评分分析并存入数据库
    if image_data_uri and image_path:
        import asyncio
        asyncio.create_task(_analyze_and_store_photo_scores(user_id, pet_id, image_data_uri, image_path))

    return ConsultationAskOut(answer=answer)
