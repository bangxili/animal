import asyncio
import base64
import json
from pathlib import Path
from typing import Optional
from uuid import uuid4

import httpx
from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from sqlalchemy.orm import Session

from ..database import get_db, SessionLocal
from ..models import ConsultationMessage, ConversationSummary, PetProfile, PhotoAnalysisRecord
from ..schemas import ConsultationAskOut, ConsultationMessageOut
from ..settings import ARK_API_KEY, ARK_API_BASE_URL, ARK_MODEL_ID

router = APIRouter(prefix="/api/consultations", tags=["consultations"])
UPLOAD_DIR = Path("uploads/consultations")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# ─── 常量配置 ────────────────────────────────────────────────────────────────
SLIDING_WINDOW = 8          # 滑动窗口：每次携带最近 N 条历史消息
COMPRESS_THRESHOLD = 16     # 未压缩消息数超过此值时触发压缩
SUMMARY_MAX_CHARS = 500     # 摘要目标长度

# ─── 毛博士 System Prompt ─────────────────────────────────────────────────────
MAOBOSHI_SYSTEM = (
    "你是毛博士，一位专业、温暖且略带幽默感的AI宠物医生。"
    "你拥有丰富的兽医学知识，擅长宠物疾病诊断、营养建议、行为分析和日常护理指导。"
    "你会记住与主人的每一次对话，持续关注宠物的健康变化趋势，给出连贯、有依据的建议。\n"
    "回答风格：专业但通俗易懂，适当使用 emoji 让对话更温暖，"
    "避免过度重复已说过的内容，优先结合历史信息给出有针对性的回答。"
)


# ─── 工具函数 ─────────────────────────────────────────────────────────────────

def _file_to_base64_data_uri(file_bytes: bytes, filename: str) -> str:
    suffix = Path(filename).suffix.lower()
    mime_map = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
                ".gif": "image/gif", ".webp": "image/webp"}
    mime = mime_map.get(suffix, "image/jpeg")
    b64 = base64.b64encode(file_bytes).decode("utf-8")
    return f"data:{mime};base64,{b64}"


def _pet_profile_text(pet: PetProfile) -> str:
    return (
        f"宠物档案 | 名字：{pet.name}，类型：{pet.pet_type}，品种：{pet.breed}，"
        f"年龄：{pet.age}{pet.age_unit or ''}，体重：{pet.weight}kg，体长：{pet.length}cm"
    )


def _build_system_content(pet: PetProfile, summary: Optional[str]) -> str:
    """拼装 system 消息：人设 + 宠物档案 + 长期记忆摘要"""
    parts = [MAOBOSHI_SYSTEM, "", _pet_profile_text(pet)]
    if summary:
        parts += ["", "【历史诊断摘要（长期记忆）】", summary]
    return "\n".join(parts)


def _build_messages(
    pet: PetProfile,
    question: str,
    image_data_uri: Optional[str],
    history: list,          # ConsultationMessage 列表（滑动窗口）
    summary: Optional[str],
) -> list[dict]:
    """构建完整的多轮 messages 列表"""
    messages: list[dict] = [
        {"role": "system", "content": _build_system_content(pet, summary)}
    ]

    # 注入滑动窗口历史（已存入 DB 的 user/assistant 轮次）
    for msg in history:
        messages.append({"role": msg.role, "content": msg.content})

    # 当前轮：用户输入（可含图片）
    if image_data_uri:
        user_content: list | str = [
            {"type": "image_url", "image_url": {"url": image_data_uri}},
            {"type": "text", "text": question},
        ]
    else:
        user_content = question

    messages.append({"role": "user", "content": user_content})
    return messages


# ─── 核心 LLM 调用 ────────────────────────────────────────────────────────────

async def _call_ark_chat(messages: list[dict], timeout: int = 30) -> str:
    """通用多轮对话调用（Chat Completions API）"""
    api_key = ARK_API_KEY.strip()
    if not api_key:
        raise HTTPException(status_code=500, detail="ARK_API_KEY not configured")

    payload = {
        "model": ARK_MODEL_ID,
        "messages": messages,
        "reasoning_effort": "low",
    }
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
    }

    async with httpx.AsyncClient(timeout=timeout) as client:
        resp = await client.post(ARK_API_BASE_URL, headers=headers, json=payload)
        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail=f"ark api error: {resp.text}")

        data = resp.json()
        try:
            choice = data["choices"][0]["message"]["content"]
        except Exception as exc:
            raise HTTPException(status_code=502, detail="invalid ark response") from exc

        if isinstance(choice, str):
            return choice
        if isinstance(choice, list):
            texts = [c.get("text", "") for c in choice if isinstance(c, dict) and c.get("type") == "text"]
            return "".join(texts) or "模型未返回文本内容。"
        return str(choice)


# ─── 上下文压缩（长期记忆写入）──────────────────────────────────────────────────

def _build_compression_prompt(
    pet: PetProfile,
    existing_summary: Optional[str],
    messages_to_compress: list,
) -> str:
    """构建压缩摘要的 prompt"""
    conv_text = ""
    for msg in messages_to_compress:
        role_label = "主人" if msg.role == "user" else "毛博士"
        conv_text += f"[{role_label}] {msg.content[:300]}\n"

    prompt = (
        "你是一位专业的宠物医疗记录员。"
        "请将以下宠物问诊对话压缩成结构化的诊断摘要，"
        f"保留所有关键医疗信息，控制在 {SUMMARY_MAX_CHARS} 字以内。\n\n"
        f"宠物档案：{_pet_profile_text(pet)}\n\n"
    )
    if existing_summary:
        prompt += f"【已有摘要（需合并更新）】\n{existing_summary}\n\n"

    prompt += (
        f"【新增对话记录】\n{conv_text}\n"
        "请输出更新后的完整摘要，格式如下（无需标注字数）：\n"
        "【主要症状史】...\n"
        "【诊断与建议】...\n"
        "【持续关注点】...\n"
        "【其他重要信息】..."
    )
    return prompt


async def _do_compress(user_id: str, pet_id: int) -> None:
    """异步压缩任务：生成新摘要并写入 DB"""
    db = SessionLocal()
    try:
        pet = db.query(PetProfile).filter(PetProfile.id == pet_id).first()
        if not pet:
            return

        # 获取最新摘要
        latest = (
            db.query(ConversationSummary)
            .filter(ConversationSummary.user_id == user_id, ConversationSummary.pet_id == pet_id)
            .order_by(ConversationSummary.id.desc())
            .first()
        )
        covered_id = latest.covered_up_to_id if latest else 0
        existing_summary = latest.summary if latest else None

        # 取出未压缩的消息，保留最后 SLIDING_WINDOW 条不压缩（留给滑动窗口）
        all_msgs = (
            db.query(ConsultationMessage)
            .filter(
                ConsultationMessage.user_id == user_id,
                ConsultationMessage.pet_id == pet_id,
                ConsultationMessage.id > covered_id,
            )
            .order_by(ConsultationMessage.id.asc())
            .all()
        )
        to_compress = all_msgs[:-SLIDING_WINDOW]
        if not to_compress:
            return

        # 调用模型生成摘要
        prompt = _build_compression_prompt(pet, existing_summary, to_compress)
        messages = [
            {"role": "system", "content": "你是专业的宠物医疗记录员，擅长提炼关键诊断信息。"},
            {"role": "user", "content": prompt},
        ]
        new_summary = await _call_ark_chat(messages, timeout=60)

        # 写入新摘要
        record = ConversationSummary(
            user_id=user_id,
            pet_id=pet_id,
            summary=new_summary,
            covered_up_to_id=to_compress[-1].id,
        )
        db.add(record)
        db.commit()
        print(f"[Memory] 压缩完成 pet={pet_id}，覆盖到消息 id={to_compress[-1].id}")

    except Exception as e:
        print(f"[Memory] 压缩失败: {type(e).__name__}: {e}")
        db.rollback()
    finally:
        db.close()


async def _maybe_trigger_compression(user_id: str, pet_id: int) -> None:
    """判断是否需要触发压缩（在回复保存后异步调用）"""
    db = SessionLocal()
    try:
        latest = (
            db.query(ConversationSummary)
            .filter(ConversationSummary.user_id == user_id, ConversationSummary.pet_id == pet_id)
            .order_by(ConversationSummary.id.desc())
            .first()
        )
        covered_id = latest.covered_up_to_id if latest else 0

        uncovered_count = (
            db.query(ConsultationMessage)
            .filter(
                ConsultationMessage.user_id == user_id,
                ConsultationMessage.pet_id == pet_id,
                ConsultationMessage.id > covered_id,
            )
            .count()
        )
    finally:
        db.close()

    if uncovered_count >= COMPRESS_THRESHOLD:
        print(f"[Memory] 触发压缩，未压缩消息数={uncovered_count}")
        asyncio.create_task(_do_compress(user_id, pet_id))


# ─── 照片评分（毛发 / 精神）──────────────────────────────────────────────────────

def _build_photo_score_prompt(pet: PetProfile, analysis_type: str) -> str:
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
    else:
        return (
            f"你是专业的宠物行为学专家，精通{pet_type}的肢体语言解读。"
            f"请仔细观察这张{pet_type}{breed}的照片，分析宠物的精神状态和心情。\n\n"
            f"分析维度：姿势、耳朵、眼神、嘴部、尾巴、整体活力\n\n"
            f"请返回JSON格式（只返回JSON，不要其他文字）：\n"
            f'{{"score": 0到100的精神评分, "mood": "开心/放松/紧张/疲惫/不适/焦虑等心情关键词", "detail": "一句话总结精神状态", "suggestion": "40字以内的建议"}}'
        )


async def _call_ark_vision_for_score(prompt: str, image_data_uri: str) -> dict:
    api_key = ARK_API_KEY.strip()
    if not api_key:
        return {"score": None, "detail": "未配置API", "suggestion": ""}
    try:
        messages = [
            {
                "role": "user",
                "content": [
                    {"type": "image_url", "image_url": {"url": image_data_uri}},
                    {"type": "text", "text": prompt},
                ],
            }
        ]
        output_text = await _call_ark_chat(messages, timeout=60)
        output_text = output_text.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        return json.loads(output_text)
    except json.JSONDecodeError:
        return {"score": None, "detail": "分析失败", "suggestion": ""}
    except Exception as e:
        print(f"[PhotoScore] Exception: {type(e).__name__}: {e}")
        return {"score": None, "detail": "分析失败", "suggestion": ""}


async def _analyze_and_store_photo_scores(
    user_id: str, pet_id: int, image_data_uri: str, image_path: str
) -> None:
    db = SessionLocal()
    try:
        pet = db.query(PetProfile).filter(PetProfile.id == pet_id).first()
        if not pet:
            return
        for analysis_type in ("fur", "mood"):
            prompt = _build_photo_score_prompt(pet, analysis_type)
            result = await _call_ark_vision_for_score(prompt, image_data_uri)
            if result.get("score") is None:
                continue
            db.add(PhotoAnalysisRecord(
                user_id=user_id,
                pet_id=pet_id,
                analysis_type=analysis_type,
                score=result.get("score"),
                detail=result.get("detail", ""),
                suggestion=result.get("suggestion", ""),
                mood=result.get("mood") if analysis_type == "mood" else None,
                image_path=image_path,
            ))
        db.commit()
        print(f"[PhotoScore] Saved fur+mood scores for pet {pet_id}")
    except Exception as e:
        print(f"[PhotoScore] Error: {type(e).__name__}: {e}")
        db.rollback()
    finally:
        db.close()


# ─── 路由 ────────────────────────────────────────────────────────────────────

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
    """宠物问诊 — 多轮对话 + 长期记忆"""
    pet = db.query(PetProfile).filter(PetProfile.id == pet_id, PetProfile.user_id == user_id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="pet not found")

    # ① 处理图片
    image_path = None
    image_data_uri = None
    if image and image.filename:
        image_bytes = await image.read()
        suffix = Path(image.filename).suffix or ".jpg"
        file_name = f"{uuid4().hex}{suffix}"
        file_path = UPLOAD_DIR / file_name
        file_path.write_bytes(image_bytes)
        image_path = str(file_path)
        image_data_uri = _file_to_base64_data_uri(image_bytes, image.filename)

    # ② 读取长期记忆摘要（最新一条）
    latest_summary = (
        db.query(ConversationSummary)
        .filter(ConversationSummary.user_id == user_id, ConversationSummary.pet_id == pet_id)
        .order_by(ConversationSummary.id.desc())
        .first()
    )
    summary_text = latest_summary.summary if latest_summary else None
    covered_id = latest_summary.covered_up_to_id if latest_summary else 0

    # ③ 读取滑动窗口（摘要覆盖点之后的最近 SLIDING_WINDOW 条）
    recent_history = (
        db.query(ConsultationMessage)
        .filter(
            ConsultationMessage.user_id == user_id,
            ConsultationMessage.pet_id == pet_id,
            ConsultationMessage.id > covered_id,
        )
        .order_by(ConsultationMessage.id.asc())
        .all()
    )[-SLIDING_WINDOW:]

    # ④ 构建多轮 messages 并调用模型
    messages = _build_messages(pet, question, image_data_uri, recent_history, summary_text)
    answer = await _call_ark_chat(messages)

    # ⑤ 持久化本轮对话
    db.add(ConsultationMessage(
        user_id=user_id, pet_id=pet_id, role="user",
        content=question, image_path=image_path,
    ))
    db.add(ConsultationMessage(
        user_id=user_id, pet_id=pet_id, role="assistant",
        content=answer, image_path=None,
    ))
    db.commit()

    # ⑥ 后台任务：照片评分 + 压缩判断
    if image_data_uri and image_path:
        asyncio.create_task(_analyze_and_store_photo_scores(user_id, pet_id, image_data_uri, image_path))

    asyncio.create_task(_maybe_trigger_compression(user_id, pet_id))

    return ConsultationAskOut(answer=answer)
