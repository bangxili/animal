from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import inspect, text

from .database import Base, engine
from .routers.consultations import router as consultations_router
from .routers.pets import router as pets_router
from .routers.recipes import router as recipes_router
from .routers.toilet import router as toilet_router
from .routers.health import router as health_router
from .routers.gene import router as gene_router
from .routers.match import router as match_router

app = FastAPI(title="Pet Health Backend", version="0.1.0")

# 捕获所有未处理异常，确保 500 错误也带 CORS 头
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal Server Error: {type(exc).__name__}: {str(exc)}"},
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
    columns = [col["name"] for col in inspect(engine).get_columns("pet_profiles")]
    if "avatar_url" not in columns:
        conn.execute(text("ALTER TABLE pet_profiles ADD COLUMN avatar_url VARCHAR(512)"))
        conn.commit()

app.include_router(pets_router)
app.include_router(consultations_router)
app.include_router(toilet_router)
app.include_router(recipes_router)
app.include_router(health_router)
app.include_router(gene_router)
app.include_router(match_router)

# 静态文件：用于暴露上传的图片（部署到公网后，模型才能访问）
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


@app.get("/healthz")
def healthz():
    return {"ok": True}
