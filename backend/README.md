# 宠物健康管理后端 API

基于 FastAPI + SQLAlchemy + 豆包大模型(Doubao-Seed-2.0-lite)

## 快速开始

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

访问 API 文档：http://127.0.0.1:8000/docs

## API Key 配置（开发/生产）

当前已在 `backend/app/settings.py` 内置开发 Key，可直接本地运行。

生产环境建议使用环境变量覆盖：

```bash
export ARK_API_KEY=”你的生产环境API_KEY”
```

## 功能模块

### 1. 宠物档案管理 (`/api/pets`)
- `POST /api/pets` - 创建宠物档案
- `GET /api/pets?user_id=xxx` - 获取用户的所有宠物
- `GET /api/pets/{pet_id}` - 获取单个宠物信息
- `POST /api/pets/{pet_id}/photos` - 上传宠物照片

### 2. 宠物问诊 (`/api/consultations`) - **使用 Chat API**
- `POST /api/consultations/ask` - 提问（支持文字+图片）
  - 参数：`user_id`, `pet_id`, `question`, `image`(可选)
  - 使用 `/chat/completions` API
  - 结合宠物档案信息生成诊断
- `GET /api/consultations/history` - 获取问诊历史
  - 参数：`user_id`, `pet_id`

### 3. 每日大小便分析 (`/api/toilet`) - **使用 Responses API** ✨新增
- `POST /api/toilet/analyze` - 上传并分析大小便照片
  - 参数：`user_id`, `pet_id`, `toilet_type` (poop/pee), `image`
  - 使用 `/responses` API
  - 返回：健康状态、评分（消化健康、水分摄入、肠道菌群）、建议
- `GET /api/toilet/history` - 获取历史分析记录
  - 参数：`user_id`, `pet_id`

### 4. 每日食谱生成 (`/api/recipes`) - **使用 Responses API** ✨新增
- `POST /api/recipes/generate` - 生成今日食谱
  - 参数：`user_id`, `pet_id`
  - 使用 `/responses` API
  - 基于问诊记录和大小便分析生成个性化食谱
  - 返回：三餐食谱+营养摘要+健康建议
- `GET /api/recipes/today` - 获取今日食谱
  - 参数：`user_id`, `pet_id`
- `GET /api/recipes/history` - 获取历史食谱
  - 参数：`user_id`, `pet_id`

## API 配置说明

### Chat API（问诊功能）
```python
ARK_API_BASE_URL = “https://ark.cn-beijing.volces.com/api/v3/chat/completions”
```

### Responses API（大小便分析、食谱生成）
```python
ARK_RESPONSES_URL = “https://ark.cn-beijing.volces.com/api/v3/responses”
```

### 模型配置
```python
ARK_MODEL_ID = “doubao-seed-2-0-lite-260215”
ARK_API_KEY = “52f44500-fe73-4443-b5c4-971c5050e87d”
```

## 数据共享机制

三个功能模块共享数据，实现智能关联：

1. **宠物档案** → 所有功能的基础信息
2. **问诊记录** → 食谱生成（了解健康问题）
3. **大小便分析** → 食谱生成（调整营养配比）
4. **食谱建议** → 后续问诊（营养建议参考）

## 数据库模型

### 新增表结构

**ToiletRecord（大小便记录）**
```python
- id, user_id, pet_id
- type: “poop” | “pee”
- image_path: 图片路径
- analysis_result: JSON {status, scores, suggestion}
- created_at
```

**DailyRecipe（每日食谱）**
```python
- id, user_id, pet_id, date
- meals: JSON [早中晚三餐数据]
- nutrition_summary: JSON {protein, fat, carbs, water}
- tips: 营养建议
- created_at
```

## 测试示例

```bash
# 1. 分析大小便
curl -X POST “http://127.0.0.1:8000/api/toilet/analyze” \
  -F “user_id=test_user” \
  -F “pet_id=1” \
  -F “toilet_type=poop” \
  -F “image=@/path/to/image.jpg”

# 2. 生成今日食谱
curl -X POST “http://127.0.0.1:8000/api/recipes/generate?user_id=test_user&pet_id=1”

# 3. 获取今日食谱
curl “http://127.0.0.1:8000/api/recipes/today?user_id=test_user&pet_id=1”
```

## 说明

- 问诊图片保存到 `backend/uploads/consultations/`
- 大小便图片保存到 `backend/uploads/toilet/`
- 模型只读取”当前问题上传的图片”，不回溯历史图片
- 食谱每天只生成一次，避免重复调用API
