
# 宠物健康小程序设计

原始设计稿来源：
https://www.figma.com/design/KhrR7sdnWs1d1dCIjBbyoQ/%E5%AE%A0%E7%89%A9%E5%81%A5%E5%BA%B7%E5%B0%8F%E7%A8%8B%E5%BA%8F%E8%AE%BE%E8%AE%A1

## 目录分层

- `src/`：当前前端代码（React + Vite）
- `backend/`：FastAPI 后端（宠物档案、问诊接口、文件上传）
- `database/`：数据库 SQL 结构
- `frontend/`：前端独立目录预留（后续迁移）

## 前端运行

```bash
npm i
npm run dev
```

## 后端运行

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## 关键约定

- 首页与“我的”支持按宠物切换当前档案（`current-pet-id`）。
- 问诊支持文字+图片上传。
- 模型上下文只读取“当前问题上传的图片”，历史图片不自动参与推理。
  