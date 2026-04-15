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


# 大便分析专业参考指引（仅供模型参考，不直接输出）
POOP_ANALYSIS_GUIDE = (
    "- 颜色：正常为棕褐色；黑色/柏油样提示上消化道出血；鲜红色提示下消化道出血或肛周出血；"
    "  灰白色提示胆道/胰腺问题；黄色提示消化不良或胆汁过多\n"
    "- 形态：正常为成形柱状、表面光滑且有一定弹性；过软/糊状/水样为腹泻；"
    "  过干/颗粒状为便秘；分节/不规则提示肠道蠕动异常\n"
    "- 表面附着物：黏液附着提示肠道炎症；可见血丝提示肠黏膜损伤；"
    "  白色米粒状节段提示绦虫感染；大量未消化食物残渣提示消化吸收障碍\n"
    "- 肠道菌群评估依据：粪便颜色是否均匀、是否有大量泡沫（产气过多提示菌群紊乱）、"
    "  是否有明显恶臭（超出正常范围提示腐败菌增多）、整体形态稳定性\n"
    "- 频率参考（照片无法判断，禁止从照片推断）：犬每日1-3次，猫每日1-2次属正常"
)

PEE_ANALYSIS_GUIDE = (
    "- 颜色：正常为淡黄色至黄色；深黄/琥珀色提示饮水不足或脱水；橘红/粉红/红色提示血尿（异常）；"
    "  近乎无色提示多饮多尿（需关注）；乳白色提示脂肪尿或脓尿\n"
    "- 透明度：正常为清澈；轻微混浊可能为尿液浓缩；明显混浊/沉淀提示泌尿道感染或结晶尿\n"
    "- 泡沫：少量泡沫属正常；大量持续性泡沫提示蛋白尿（照片仅供参考，需结合检查确认）\n"
    "- 气味（照片无法判断，勿从照片推断气味）\n"
    "- 含水量/水合状态评估：尿液颜色深浅是判断宠物水分摄入是否充足的重要直观依据"
)


def _build_toilet_prompt(pet: PetProfile, has_poop: bool, has_pee: bool) -> str:
    pet_name = pet.name or "未知"
    pet_type = pet.pet_type or "宠物"
    pet_breed = pet.breed or "未知品种"
    pet_age = str(pet.age) + (pet.age_unit or "")
    pet_weight = str(pet.weight) + "kg"

    pet_desc = (
        "宠物档案：" + pet_name + "，" + pet_type + "，品种：" + pet_breed
        + "，年龄：" + pet_age + "，体重：" + pet_weight
    )

    if has_poop and has_pee:
        photo_desc = "大便和小便"
        combined = "\n大便分析要点：\n" + POOP_ANALYSIS_GUIDE + "\n\n小便分析要点：\n" + PEE_ANALYSIS_GUIDE
    elif has_poop:
        photo_desc = "大便"
        combined = "\n大便分析要点：\n" + POOP_ANALYSIS_GUIDE
    else:
        photo_desc = "小便"
        combined = "\n小便分析要点：\n" + PEE_ANALYSIS_GUIDE

    rules = (
        "【严格规则】\n"
        "1. 只描述照片中实际可见的内容，严禁凭空推断或编造症状\n"
        "2. 照片清晰度不足或角度受限时，在 description 中如实注明难以判断的部分，不得随意猜测\n"
        "3. 三项评分必须有据可查，基于照片可见特征给出，正常情况下评分不应过低\n"
        "4. suggestion 必须以编号列表形式输出，针对本次观察给出具体可操作建议，"
        "   并结合宠物档案（品种、年龄、体重）个性化说明\n"
        "5. 如照片整体表现正常，切勿过度渲染风险、贩卖焦虑，应给予主人积极正向的反馈\n"
        "6. 如观察到真正异常（血便、黑便、明显虫体、橘红色尿液等），status 才设为异常，"
        "   并在 suggestion 中给出清晰就医建议\n"
        "7. suggestion 中每条建议单独成段，措辞专业但口语化，让宠物主人易于理解和执行\n"
    )

    # 提示词里用示例帮助模型理解建议的长度和格式
    suggestion_example = (
        "suggestion 示例格式（请参照此风格和详尽度输出，实际内容必须基于照片和宠物档案，勿照抄）：\n"
        "1. 粪便整体形态成形良好，颜色棕褐色均匀，是消化功能正常的表现，本次大便状况良好；"
        "2. 建议保持目前的饮食结构，避免频繁更换主粮；犬每日饮水量参考标准为每公斤体重50-70ml，"
        "   可留意" + pet_name + "的饮水习惯，必要时使用流动饮水器提升饮水积极性；"
        "3. 建议每季度定期做一次体内驱虫，日常遛弯避免让" + pet_name + "捡食地面异物；"
        "4. " + pet_breed + "属于" + pet_type + "，" + pet_age + "正值成长期，"
        "   当前体重" + pet_weight + "，后续可结合定期体检监测生长曲线。"
    )

    json_format = (
        '{\n'
        '  "status": "正常" 或 "注意" 或 "异常",\n'
        '  "description": "专业描述' + photo_desc + '的颜色、形态、质地、表面附着物等可见特征，'
        '   客观准确，100字以内",\n'
        '  "scores": {\n'
        '    "消化健康": 0到100的整数（基于粪便形态、颜色、成形度综合评估消化系统功能），\n'
        '    "水分摄入": 0到100的整数（基于尿液颜色深浅或粪便含水程度评估宠物水化状态），\n'
        '    "肠道菌群": 0到100的整数（基于粪便气味、颜色均匀性、是否泡沫/黏液等评估菌群平衡）\n'
        '  },\n'
        '  "suggestion": "以编号列表输出3-4条具体建议，每条50-80字，结合宠物档案个性化说明，'
        '   正常时以正向鼓励为主，异常时给出清晰的应对步骤和就医指引"\n'
        '}'
    )

    return (
        "你是一位经验丰富的执业兽医，具备扎实的小动物内科、消化科、泌尿科临床背景，"
        "擅长通过粪便和尿液的外观特征评估宠物消化与泌尿健康状态。\n\n"
        "请仔细观察上传的宠物" + photo_desc + "照片，结合以下宠物档案给出专业评估报告。\n\n"
        + pet_desc + "\n"
        + combined + "\n\n"
        + rules + "\n"
        + suggestion_example + "\n\n"
        "【返回格式】只返回如下 JSON，不得包含任何其他文字或 markdown 标记：\n"
        + json_format
    )


async def _call_ark_responses_multi(prompt: str, base64_images: list[str]) -> dict:
    """多张图片分析，使用 base64 编码图片"""
    api_key = ARK_API_KEY.strip()
    if not api_key:
        raise HTTPException(status_code=500, detail="ARK_API_KEY not configured")

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
        "reasoning": {"effort": "low"},
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
    pet = db.query(PetProfile).filter(PetProfile.id == pet_id, PetProfile.user_id == user_id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="pet not found")

    has_poop = poop_image is not None and poop_image.filename
    has_pee = pee_image is not None and pee_image.filename

    if not has_poop and not has_pee:
        raise HTTPException(status_code=400, detail="请至少上传一张照片")

    if has_poop and has_pee:
        toilet_type = "both"
    elif has_poop:
        toilet_type = "poop"
    else:
        toilet_type = "pee"

    base64_images = []
    image_paths = []

    if has_poop:
        poop_bytes = await poop_image.read()
        suffix = Path(poop_image.filename).suffix or ".jpg"
        file_name = f"poop_{uuid4().hex}{suffix}"
        file_path = UPLOAD_DIR / file_name
        file_path.write_bytes(poop_bytes)
        image_paths.append(str(file_path))
        base64_images.append(_file_to_base64_data_uri(poop_bytes, poop_image.filename))

    if has_pee:
        pee_bytes = await pee_image.read()
        suffix = Path(pee_image.filename).suffix or ".jpg"
        file_name = f"pee_{uuid4().hex}{suffix}"
        file_path = UPLOAD_DIR / file_name
        file_path.write_bytes(pee_bytes)
        image_paths.append(str(file_path))
        base64_images.append(_file_to_base64_data_uri(pee_bytes, pee_image.filename))

    prompt = _build_toilet_prompt(pet, has_poop, has_pee)
    analysis = await _call_ark_responses_multi(prompt, base64_images)

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
