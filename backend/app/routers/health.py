import json
from datetime import date, timedelta
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import ConsultationMessage, PetProfile, ToiletRecord, WeightRecord, PhotoAnalysisRecord
from ..settings import ARK_API_KEY, ARK_MODEL_ID, ARK_API_BASE_URL

router = APIRouter(prefix="/api/health", tags=["health"])


def _build_health_prompt(
    pet: PetProfile,
    health_type: str,
    recent_consultations: list,
    recent_toilet: list
) -> str:
    """构建健康分析提示词"""

    # 基础信息
    context = f"""宠物档案：
- 名字：{pet.name}
- 类型：{pet.pet_type or '未知'}
- 品种：{pet.breed or '未知'}
- 年龄：{pet.age or '未知'}{pet.age_unit or ''}
- 体重：{pet.weight}kg
- 性别：{pet.gender or '未知'}
"""

    # 近期问诊
    if recent_consultations:
        context += "\n近期问诊记录：\n"
        for msg in recent_consultations[-3:]:
            context += f"- {msg.content[:100]}\n"

    # 近期大小便分析
    if recent_toilet:
        context += "\n近期健康数据：\n"
        for record in recent_toilet[:3]:
            analysis = record.analysis_result or {}
            context += f"- {record.type}分析：状态={analysis.get('status', '未知')}, 建议={analysis.get('suggestion', '')[:50]}\n"

    # 健康类型对应的分析请求
    prompts = {
        "weight": f"{context}\n请根据以上信息分析宠物的体重状况，给出健康评估和建议。只返回JSON格式：{{\"value\": \"数值+单位\", \"suggestion\": \"详细建议\"}}",
        "fat": f"{context}\n请根据以上信息估算宠物的体脂率，给出健康评估和建议。只返回JSON格式：{{\"value\": \"百分比\", \"suggestion\": \"详细建议\"}}",
        "stomach": f"{context}\n请根据以上信息分析宠物的肠胃健康状况，给出健康评估和建议。只返回JSON格式：{{\"value\": \"评估状态\", \"suggestion\": \"详细建议\"}}",
        "heart": f"{context}\n请根据以上信息分析宠物的心脑血管健康状况，给出健康评估和建议。只返回JSON格式：{{\"value\": \"评估状态\", \"suggestion\": \"详细建议\"}}",
        "bone": f"{context}\n请根据以上信息分析宠物的骨骼健康状况，给出健康评估和建议。只返回JSON格式：{{\"value\": \"评估状态\", \"suggestion\": \"详细建议\"}}",
    }

    return prompts.get(health_type, prompts["weight"])


async def _call_ark_for_health(prompt: str) -> dict:
    """调用ARK API进行健康分析"""
    api_key = ARK_API_KEY.strip()
    if not api_key:
        raise HTTPException(status_code=500, detail="ARK_API_KEY not configured")

    payload = {
        "model": ARK_MODEL_ID,
        "messages": [
            {
                "role": "user",
                "content": prompt,
            }
        ],
    }

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
    }

    async with httpx.AsyncClient(timeout=90) as client:
        resp = await client.post(ARK_API_BASE_URL, headers=headers, json=payload)
        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail=f"ark api error: {resp.text}")

        data = resp.json()
        try:
            choice = data["choices"][0]["message"]["content"]
            if isinstance(choice, list):
                texts = [c.get("text", "") for c in choice if isinstance(c, dict) and c.get("type") == "text"]
                output_text = "".join(texts)
            else:
                output_text = str(choice)

            if not output_text:
                raise HTTPException(status_code=502, detail="模型返回为空")

            # 清理并解析JSON
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
            # 返回默认结果
            return {
                "value": "分析中",
                "suggestion": "AI分析结果处理中，请稍后查看。"
            }
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"解析结果失败: {str(exc)}")


@router.get("/analyze")
async def analyze_health(
    user_id: str,
    pet_id: int,
    health_type: str,
    db: Session = Depends(get_db),
):
    """
    健康分析 API
    - health_type: weight(体重), fat(体脂), stomach(肠胃), heart(心脑血管), bone(骨骼)
    """
    # 验证宠物档案
    pet = db.query(PetProfile).filter(PetProfile.id == pet_id, PetProfile.user_id == user_id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="pet not found")

    # 验证健康类型
    valid_types = ["weight", "fat", "stomach", "heart", "bone"]
    if health_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"health_type must be one of: {valid_types}")

    # 获取近期问诊记录（最近7天）
    recent_consultations = (
        db.query(ConsultationMessage)
        .filter(
            ConsultationMessage.user_id == user_id,
            ConsultationMessage.pet_id == pet_id,
            ConsultationMessage.role == "user",
        )
        .order_by(ConsultationMessage.created_at.desc())
        .limit(5)
        .all()
    )

    # 获取近期大小便记录（最近7天）
    recent_toilet = (
        db.query(ToiletRecord)
        .filter(
            ToiletRecord.user_id == user_id,
            ToiletRecord.pet_id == pet_id,
        )
        .order_by(ToiletRecord.created_at.desc())
        .limit(5)
        .all()
    )

    # 构建提示词并调用AI
    prompt = _build_health_prompt(pet, health_type, recent_consultations, recent_toilet)
    result = await _call_ark_for_health(prompt)

    return result


@router.get("/summary")
async def get_health_summary(
    user_id: str,
    pet_id: int,
    db: Session = Depends(get_db),
):
    """获取宠物健康摘要"""
    pet = db.query(PetProfile).filter(PetProfile.id == pet_id, PetProfile.user_id == user_id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="pet not found")

    # 获取最近的分析记录
    return {
        "pet_id": pet_id,
        "pet_name": pet.name,
        "pet_type": pet.pet_type,
        "age": pet.age,
        "weight": pet.weight,
    }


class WeightRecordBody(BaseModel):
    user_id: str
    pet_id: int
    weight: float
    note: Optional[str] = None
    recorded_at: Optional[str] = None  # 支持补录，格式 "YYYY-MM-DD"


@router.post("/weight")
def add_weight_record(body: WeightRecordBody, db: Session = Depends(get_db)):
    """记录宠物体重（支持补录昨日）"""
    pet = db.query(PetProfile).filter(PetProfile.id == body.pet_id, PetProfile.user_id == body.user_id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="pet not found")

    if body.recorded_at:
        try:
            record_date = date.fromisoformat(body.recorded_at)
        except ValueError:
            raise HTTPException(status_code=400, detail="recorded_at 格式无效，需要 YYYY-MM-DD")
    else:
        record_date = date.today()

    # 同日期去重：覆盖同一天的旧记录
    existing = (
        db.query(WeightRecord)
        .filter(
            WeightRecord.user_id == body.user_id,
            WeightRecord.pet_id == body.pet_id,
            WeightRecord.recorded_at == record_date,
        )
        .first()
    )
    if existing:
        existing.weight = body.weight
        existing.note = body.note
        record = existing
    else:
        record = WeightRecord(
            user_id=body.user_id,
            pet_id=body.pet_id,
            weight=body.weight,
            recorded_at=record_date,
            note=body.note,
        )
        db.add(record)

    # 如果记录的是今天或最新日期，同步更新宠物档案的体重
    if record_date >= date.today():
        pet.weight = body.weight
    db.commit()
    db.refresh(record)

    return {"id": record.id, "weight": record.weight, "recorded_at": str(record.recorded_at)}


@router.get("/weight/history")
def get_weight_history(user_id: str, pet_id: int, days: int = 30, db: Session = Depends(get_db)):
    """获取体重历史记录"""
    since = date.today() - timedelta(days=days)
    records = (
        db.query(WeightRecord)
        .filter(
            WeightRecord.user_id == user_id,
            WeightRecord.pet_id == pet_id,
            WeightRecord.recorded_at >= since,
        )
        .order_by(WeightRecord.recorded_at.asc())
        .all()
    )
    return [
        {"id": r.id, "weight": r.weight, "recorded_at": str(r.recorded_at)}
        for r in records
    ]


# ───────── 毛发 / 精神 照片分析（读取已存储的评分） ─────────

@router.get("/photo-analysis")
def get_photo_analysis_scores(
    user_id: str,
    pet_id: int,
    analysis_type: str,  # "fur" or "mood"
    db: Session = Depends(get_db),
):
    """
    获取最新的毛发/精神评分（由问诊上传照片时自动生成并存储）。
    analysis_type: fur(毛发) / mood(精神)
    """
    if analysis_type not in ("fur", "mood"):
        raise HTTPException(status_code=400, detail="analysis_type must be fur or mood")

    pet = db.query(PetProfile).filter(PetProfile.id == pet_id, PetProfile.user_id == user_id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="pet not found")

    # 查询最新的评分记录
    record = (
        db.query(PhotoAnalysisRecord)
        .filter(
            PhotoAnalysisRecord.user_id == user_id,
            PhotoAnalysisRecord.pet_id == pet_id,
            PhotoAnalysisRecord.analysis_type == analysis_type,
        )
        .order_by(PhotoAnalysisRecord.created_at.desc())
        .first()
    )

    if not record:
        return {"score": None, "detail": "", "suggestion": "", "no_photo": True}

    result = {
        "score": record.score,
        "detail": record.detail or "",
        "suggestion": record.suggestion or "",
    }
    if analysis_type == "mood" and record.mood:
        result["mood"] = record.mood
    return result