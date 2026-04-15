import json
from datetime import date, timedelta
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import and_
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import ConsultationMessage, DailyRecipe, MealDaySummary, MealLog, PetProfile, ToiletRecord
from ..schemas import DailyRecipeOut, MealLogOut
from ..settings import ARK_API_KEY, ARK_MODEL_ID, ARK_API_BASE_URL

router = APIRouter(prefix="/api/recipes", tags=["recipes"])


def _build_recipe_prompt(pet: PetProfile, recent_consultations: list, recent_toilet: list) -> str:
    # 构建宠物健康上下文
    context = ( 
        f"宠物档案: 名字={pet.name}, 类型={pet.pet_type}, 品种={pet.breed}, "
        f"年龄={pet.age}{pet.age_unit or ''}, 体重={pet.weight}kg, 体长={pet.length}cm。\n\n"
    )

    # 添加最近的问诊记录（包含用户提问和AI诊断）
    if recent_consultations:
        context += "最近问诊记录:\n"
        # 按时间正序显示对话
        for msg in reversed(recent_consultations[-10:]):
            role_label = "主人" if msg.role == "user" else "兽医AI"
            context += f"- [{role_label}] {msg.content[:150]}\n"
        context += "\n"

    # 添加最近的大小便分析
    if recent_toilet:
        context += "最近大小便分析:\n"
        for record in recent_toilet[:5]:
            analysis = record.analysis_result or {}
            type_label = "大便" if record.type == "poop" else "小便"
            status = analysis.get("status", "未知")
            description = analysis.get("description", "")
            suggestion = analysis.get("suggestion", "")
            scores = analysis.get("scores", {})
            scores_str = ", ".join(f"{k}:{v}" for k, v in scores.items()) if scores else ""
            context += f"- {type_label}: 状态={status}"
            if description:
                context += f", {description[:80]}"
            if scores_str:
                context += f", 评分=[{scores_str}]"
            if suggestion:
                context += f", 建议: {suggestion[:80]}"
            context += "\n"
        context += "\n"

    prompt = (
        f"{context}"
        f"请为这只宠物生成今日（早、中、晚）的营养食谱。请按照以下JSON格式返回：\n"
        f'{{\n'
        f'  "meals": [\n'
        f'    {{\n'
        f'      "time": "早餐",\n'
        f'      "time_icon": "🌅",\n'
        f'      "time_tag": "07:00 - 08:00",\n'
        f'      "dishes": [\n'
        f'        {{"name": "鸡胸肉拌饭", "amount": "80g", "emoji": "🍗", "benefit": "高蛋白，易消化"}}\n'
        f'      ],\n'
        f'      "calories": 285\n'
        f'    }}\n'
        f'  ],\n'
        f'  "nutrition_summary": {{\n'
        f'    "protein": {{"current": 68, "target": 75}},\n'
        f'    "fat": {{"current": 22, "target": 28}},\n'
        f'    "carbs": {{"current": 45, "target": 50}},\n'
        f'    "water": {{"current": 380, "target": 500}}\n'
        f'  }},\n'
        f'  "tips": "根据宠物健康状况给出的营养建议"\n'
        f'}}\n\n'
        f"要求:\n"
        f"1. 根据宠物的体重、年龄、健康状况合理安排食物量和营养配比\n"
        f"2. 如果有消化问题，应选择易消化的食物\n"
        f"3. 每餐包含2-3道菜品\n"
        f"4. 提供具体的喂食时间和注意事项\n"
        f"5. 只返回JSON格式，不要包含其他文字"
    )

    return prompt


async def _call_ark_for_recipe(prompt: str) -> dict:
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
        "reasoning_effort": "low",
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
            if "error" in data:
                raise HTTPException(status_code=502, detail=f"ARK API返回错误: {data['error']}")

            choice = data["choices"][0]["message"]["content"]
            if isinstance(choice, list):
                texts = [c.get("text", "") for c in choice if isinstance(c, dict) and c.get("type") == "text"]
                output_text = "".join(texts)
            else:
                output_text = str(choice)

            if not output_text:
                raise HTTPException(status_code=502, detail="模型返回为空")

            # 清理markdown代码块
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
            # 返回默认食谱
            return {
                "meals": [
                    {
                        "time": "早餐",
                        "time_icon": "🌅",
                        "time_tag": "07:00 - 08:00",
                        "dishes": [
                            {"name": "宠物粮", "amount": "100g", "emoji": "🍚", "benefit": "均衡营养"},
                        ],
                        "calories": 300,
                    },
                    {
                        "time": "午餐",
                        "time_icon": "☀️",
                        "time_tag": "12:00 - 13:00",
                        "dishes": [
                            {"name": "宠物粮", "amount": "100g", "emoji": "🍚", "benefit": "均衡营养"},
                        ],
                        "calories": 300,
                    },
                    {
                        "time": "晚餐",
                        "time_icon": "🌙",
                        "time_tag": "18:00 - 19:00",
                        "dishes": [
                            {"name": "宠物粮", "amount": "100g", "emoji": "🍚", "benefit": "均衡营养"},
                        ],
                        "calories": 300,
                    },
                ],
                "nutrition_summary": {
                    "protein": {"current": 60, "target": 75},
                    "fat": {"current": 20, "target": 28},
                    "carbs": {"current": 40, "target": 50},
                    "water": {"current": 350, "target": 500},
                },
                "tips": "AI生成的详细食谱正在处理中，当前显示为默认食谱。",
            }
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"解析结果失败: {str(exc)}")


@router.post("/generate", response_model=DailyRecipeOut)
async def generate_recipe(
    user_id: str,
    pet_id: int,
    db: Session = Depends(get_db),
):
    """生成今日食谱（基于最新问诊记录和大小便分析）"""
    # 验证宠物档案
    pet = db.query(PetProfile).filter(PetProfile.id == pet_id, PetProfile.user_id == user_id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="pet not found")

    today = date.today()
    week_ago = today - timedelta(days=7)

    # 删除今天已有的食谱（允许重新生成）
    db.query(DailyRecipe).filter(
        and_(
            DailyRecipe.user_id == user_id,
            DailyRecipe.pet_id == pet_id,
            DailyRecipe.date == today,
        )
    ).delete(synchronize_session=False)
    db.commit()
    # 重新加载 pet 避免 expired 状态
    db.refresh(pet)

    # 获取最近7天的问诊记录（包含用户提问和AI诊断）
    recent_consultations = (
        db.query(ConsultationMessage)
        .filter(
            ConsultationMessage.user_id == user_id,
            ConsultationMessage.pet_id == pet_id,
            ConsultationMessage.created_at >= week_ago,
        )
        .order_by(ConsultationMessage.created_at.desc())
        .limit(10)
        .all()
    )

    # 获取最近7天的大小便记录
    recent_toilet = (
        db.query(ToiletRecord)
        .filter(
            ToiletRecord.user_id == user_id,
            ToiletRecord.pet_id == pet_id,
            ToiletRecord.created_at >= week_ago,
        )
        .order_by(ToiletRecord.created_at.desc())
        .limit(5)
        .all()
    )

    # 调用AI生成食谱
    prompt = _build_recipe_prompt(pet, recent_consultations, recent_toilet)
    recipe_data = await _call_ark_for_recipe(prompt)

    # 保存到数据库
    recipe = DailyRecipe(
        user_id=user_id,
        pet_id=pet_id,
        date=today,
        meals=recipe_data.get("meals", []),
        nutrition_summary=recipe_data.get("nutrition_summary"),
        tips=recipe_data.get("tips"),
    )
    db.add(recipe)
    db.commit()
    db.refresh(recipe)

    return recipe


@router.get("/today", response_model=DailyRecipeOut | None)
def get_today_recipe(
    user_id: str,
    pet_id: int,
    db: Session = Depends(get_db),
):
    """获取今日食谱"""
    today = date.today()
    recipe = (
        db.query(DailyRecipe)
        .filter(
            and_(
                DailyRecipe.user_id == user_id,
                DailyRecipe.pet_id == pet_id,
                DailyRecipe.date == today,
            )
        )
        .first()
    )
    return recipe


@router.get("/history", response_model=list[DailyRecipeOut])
def get_recipe_history(
    user_id: str,
    pet_id: int,
    db: Session = Depends(get_db),
):
    """获取历史食谱记录"""
    recipes = (
        db.query(DailyRecipe)
        .filter(
            DailyRecipe.user_id == user_id,
            DailyRecipe.pet_id == pet_id,
        )
        .order_by(DailyRecipe.date.desc())
        .limit(30)
        .all()
    )
    return recipes


# ───────── 实际饮食记录 ─────────

class MealLogItem(BaseModel):
    name: str
    amount: str
    emoji: str = "🍖"


class MealLogCreate(BaseModel):
    user_id: str
    pet_id: int
    meal_type: str  # breakfast / lunch / dinner / snack
    items: list[MealLogItem]


@router.post("/meal-log", response_model=MealLogOut)
def add_meal_log(body: MealLogCreate, db: Session = Depends(get_db)):
    """记录宠物实际吃了什么"""
    valid_types = ["breakfast", "lunch", "dinner", "snack"]
    if body.meal_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"meal_type must be one of: {valid_types}")

    pet = db.query(PetProfile).filter(PetProfile.id == body.pet_id, PetProfile.user_id == body.user_id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="pet not found")

    record = MealLog(
        user_id=body.user_id,
        pet_id=body.pet_id,
        date=date.today(),
        meal_type=body.meal_type,
        items=[item.model_dump() for item in body.items],
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("/meal-log/today", response_model=list[MealLogOut])
def get_today_meal_logs(user_id: str, pet_id: int, db: Session = Depends(get_db)):
    """获取今日实际饮食记录"""
    return (
        db.query(MealLog)
        .filter(
            MealLog.user_id == user_id,
            MealLog.pet_id == pet_id,
            MealLog.date == date.today(),
        )
        .order_by(MealLog.created_at.asc())
        .all()
    )


@router.delete("/meal-log/{log_id}")
def delete_meal_log(log_id: int, db: Session = Depends(get_db)):
    """删除饮食记录"""
    record = db.query(MealLog).filter(MealLog.id == log_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="record not found")
    db.delete(record)
    db.commit()
    return {"ok": True}


def _build_comparison_prompt(
    pet: PetProfile,
    recommended_nutrition: dict,
    actual_meals: list[dict],
) -> str:
    meals_text = ""
    for m in actual_meals:
        type_label = {"breakfast": "早餐", "lunch": "午餐", "dinner": "晚餐", "snack": "零食"}.get(m["meal_type"], m["meal_type"])
        items_str = ", ".join(f"{it['name']}({it['amount']})" for it in m["items"])
        meals_text += f"- {type_label}: {items_str}\n"

    rec_text = json.dumps(recommended_nutrition, ensure_ascii=False)

    return (
        f"你是一位专业的宠物营养师。请分析这只宠物今日实际饮食的营养摄入，并与推荐食谱进行对比。\n\n"
        f"宠物档案: 名字={pet.name}, 类型={pet.pet_type or '未知'}, 品种={pet.breed or '未知'}, "
        f"年龄={pet.age}{pet.age_unit or ''}, 体重={pet.weight}kg。\n\n"
        f"今日实际饮食:\n{meals_text}\n"
        f"推荐食谱营养摄入目标: {rec_text}\n\n"
        f"请按照以下JSON格式返回分析结果：\n"
        f'{{\n'
        f'  "actual_nutrition": {{\n'
        f'    "protein": {{"current": 估算克数, "target": 推荐目标}},\n'
        f'    "fat": {{"current": 估算克数, "target": 推荐目标}},\n'
        f'    "carbs": {{"current": 估算克数, "target": 推荐目标}},\n'
        f'    "water": {{"current": 估算毫升, "target": 推荐目标}},\n'
        f'    "calories": {{"current": 估算总千卡, "target": 推荐目标}}\n'
        f'  }},\n'
        f'  "comparison": [\n'
        f'    {{"item": "营养素名", "status": "充足/不足/过量", "detail": "一句话说明"}}\n'
        f'  ],\n'
        f'  "score": 0到100的综合评分,\n'
        f'  "summary": "50字以内的总结评价",\n'
        f'  "suggestions": ["建议1", "建议2", "建议3"]\n'
        f'}}\n\n'
        f"要求:\n"
        f"1. 根据宠物的体重和年龄估算实际食物的营养含量\n"
        f"2. status只能是：充足、不足、过量三种\n"
        f"3. 给出3条具体可操作的改善建议\n"
        f"4. 只返回JSON格式，不要包含其他文字"
    )


@router.post("/meal-log/analyze")
async def analyze_meal_comparison(
    user_id: str,
    pet_id: int,
    db: Session = Depends(get_db),
):
    """AI分析实际饮食与推荐食谱的营养对比"""
    pet = db.query(PetProfile).filter(PetProfile.id == pet_id, PetProfile.user_id == user_id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="pet not found")

    # 获取今日实际饮食
    today_logs = (
        db.query(MealLog)
        .filter(MealLog.user_id == user_id, MealLog.pet_id == pet_id, MealLog.date == date.today())
        .all()
    )
    if not today_logs:
        raise HTTPException(status_code=400, detail="今天还没有饮食记录，请先记录宠物的饮食")

    # 获取今日推荐食谱的营养目标
    today_recipe = (
        db.query(DailyRecipe)
        .filter(DailyRecipe.user_id == user_id, DailyRecipe.pet_id == pet_id, DailyRecipe.date == date.today())
        .first()
    )
    recommended = today_recipe.nutrition_summary if today_recipe else {
        "protein": {"current": 0, "target": 75},
        "fat": {"current": 0, "target": 28},
        "carbs": {"current": 0, "target": 50},
        "water": {"current": 0, "target": 500},
    }

    actual_meals = [{"meal_type": log.meal_type, "items": log.items} for log in today_logs]
    prompt = _build_comparison_prompt(pet, recommended, actual_meals)
    result = await _call_ark_for_recipe(prompt)

    # 保存分析结果到 MealDaySummary
    score = result.get("score", 0)
    existing_summary = (
        db.query(MealDaySummary)
        .filter(MealDaySummary.user_id == user_id, MealDaySummary.pet_id == pet_id, MealDaySummary.date == date.today())
        .first()
    )
    if existing_summary:
        existing_summary.score = score
        existing_summary.analysis_result = result
    else:
        summary = MealDaySummary(
            user_id=user_id,
            pet_id=pet_id,
            date=date.today(),
            score=score,
            analysis_result=result,
        )
        db.add(summary)
    db.commit()

    return result


@router.get("/meal-log/history")
def get_meal_log_history(
    user_id: str,
    pet_id: int,
    days: int = 30,
    db: Session = Depends(get_db),
):
    """获取历史饮食记录，按天分组，附带分析评分"""
    since = date.today() - timedelta(days=days)

    # 获取饮食记录
    logs = (
        db.query(MealLog)
        .filter(
            MealLog.user_id == user_id,
            MealLog.pet_id == pet_id,
            MealLog.date >= since,
            MealLog.date <= date.today(),
        )
        .order_by(MealLog.date.desc(), MealLog.created_at.asc())
        .all()
    )

    # 获取分析评分
    summaries = (
        db.query(MealDaySummary)
        .filter(
            MealDaySummary.user_id == user_id,
            MealDaySummary.pet_id == pet_id,
            MealDaySummary.date >= since,
        )
        .all()
    )
    score_map = {str(s.date): s for s in summaries}

    # 按天分组
    days_map: dict[str, list] = {}
    for log in logs:
        day_key = str(log.date)
        if day_key not in days_map:
            days_map[day_key] = []
        days_map[day_key].append({
            "id": log.id,
            "meal_type": log.meal_type,
            "items": log.items,
        })

    result = []
    for day_key in sorted(days_map.keys(), reverse=True):
        summary_obj = score_map.get(day_key)
        result.append({
            "date": day_key,
            "meals": days_map[day_key],
            "score": summary_obj.score if summary_obj else None,
            "analysis_result": summary_obj.analysis_result if summary_obj else None,
        })

    return result
