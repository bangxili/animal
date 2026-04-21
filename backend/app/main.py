from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import inspect, text

from .database import Base, engine
from .routers.auth import router as auth_router
from .routers.consultations import router as consultations_router
from .routers.pets import router as pets_router
from .routers.recipes import router as recipes_router
from .routers.toilet import router as toilet_router
from .routers.health import router as health_router
from .routers.gene import router as gene_router
from .routers.match import router as match_router
from .routers.admin import router as admin_router

app = FastAPI(title="Pet Health Backend", version="0.1.0")

# 捕获所有未处理异常，确保 500 错误也带 CORS 头
# 注意：Starlette CORSMiddleware 在某些异常路径下不会自动注入头，这里手动补充
CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "*",
    "Access-Control-Allow-Headers": "*",
}

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal Server Error: {type(exc).__name__}: {str(exc)}"},
        headers=CORS_HEADERS,
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

# 轻量级迁移：为已有表添加新列（SQLite 不支持 IF NOT EXISTS 对列）
with engine.connect() as conn:
    # pet_profiles: avatar_url
    pet_cols = [col["name"] for col in inspect(engine).get_columns("pet_profiles")]
    if "avatar_url" not in pet_cols:
        conn.execute(text("ALTER TABLE pet_profiles ADD COLUMN avatar_url VARCHAR(512)"))
        conn.commit()

    # users: 确保 users 表存在（新增注册登录功能）
    if "users" not in inspect(engine).get_table_names():
        conn.execute(text(
            """
            CREATE TABLE users (
                id VARCHAR(64) PRIMARY KEY,
                username VARCHAR(64) NOT NULL UNIQUE,
                hashed_password VARCHAR(255) NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
            """
        ))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_users_username ON users(username)"))
        conn.commit()
        print("[Startup] 创建 users 表成功")

    # conversation_summaries: 确保表存在（create_all 已处理，但检查一次更稳健）
    inspector = inspect(engine)
    if "conversation_summaries" not in inspector.get_table_names():
        conn.execute(text(
            """
            CREATE TABLE conversation_summaries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id VARCHAR(64) NOT NULL,
                pet_id INTEGER NOT NULL REFERENCES pet_profiles(id),
                summary TEXT NOT NULL,
                covered_up_to_id INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
            """
        ))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_conv_sum_user ON conversation_summaries(user_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_conv_sum_pet ON conversation_summaries(pet_id)"))
        conn.commit()
        print("[Startup] 创建 conversation_summaries 表成功")

app.include_router(auth_router)
app.include_router(pets_router)
app.include_router(consultations_router)
app.include_router(toilet_router)
app.include_router(recipes_router)
app.include_router(health_router)
app.include_router(gene_router)
app.include_router(match_router)
app.include_router(admin_router)

# 静态文件：用于暴露上传的图片（部署到公网后，模型才能访问）
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


@app.get("/healthz")
def healthz():
    return {"ok": True}
