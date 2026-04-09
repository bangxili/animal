import os

# 后端模型配置（开发/生产双模式）
ARK_API_BASE_URL = "https://ark.cn-beijing.volces.com/api/v3/chat/completions"
ARK_RESPONSES_URL = "https://ark.cn-beijing.volces.com/api/v3/responses"
ARK_MODEL_ID = "doubao-seed-2-0-lite-260215"

# 图生图 API（Seedream 模型）
ARK_IMAGES_URL = "https://ark.cn-beijing.volces.com/api/v3/images/generations"
ARK_SEEDREAM_MODEL = "doubao-seedream-5-0-260128"

# 开发模式默认 Key（你本地调试可直接使用）
DEV_ARK_API_KEY = "52f44500-fe73-4443-b5c4-971c5050e87d"

# 生产模式建议通过环境变量注入 ARK_API_KEY，优先级高于 DEV_ARK_API_KEY
ARK_API_KEY = os.getenv("ARK_API_KEY", DEV_ARK_API_KEY).strip()
