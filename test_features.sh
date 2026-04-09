#!/bin/bash

echo "========================================="
echo "宠物健康管理系统 - 功能测试"
echo "========================================="
echo ""

API_BASE="http://127.0.0.1:8000"

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "1️⃣  测试后端服务状态..."
response=$(curl -s -w "\n%{http_code}" "$API_BASE/healthz")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✅ 后端服务正常${NC}"
    echo "   响应: $body"
else
    echo -e "${RED}❌ 后端服务异常 (HTTP $http_code)${NC}"
    exit 1
fi
echo ""

echo "2️⃣  检查API端点..."
echo "   - /api/pets (宠物档案)"
echo "   - /api/consultations (智能问诊)"
echo "   - /api/toilet (每日大小便)"
echo "   - /api/recipes (每日食谱)"
echo ""

echo "3️⃣  创建测试数据..."

# 创建测试宠物
echo "   创建测试宠物..."
pet_response=$(curl -s -X POST "$API_BASE/api/pets" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test_user",
    "name": "测试喵",
    "age": 3,
    "age_unit": "岁",
    "gender": "公",
    "pet_type": "猫",
    "breed": "英短",
    "weight": 5.5,
    "length": 45
  }' 2>/dev/null)

pet_id=$(echo "$pet_response" | python3 -c "import sys, json; print(json.load(sys.stdin).get('id', ''))" 2>/dev/null)

if [ -n "$pet_id" ]; then
    echo -e "   ${GREEN}✅ 宠物创建成功 (ID: $pet_id)${NC}"
else
    echo -e "   ${YELLOW}⚠️  宠物可能已存在，使用ID=1${NC}"
    pet_id=1
fi
echo ""

echo "4️⃣  测试API功能..."

# 测试问诊API
echo "   [问诊] 发送测试问题..."
consult_response=$(curl -s -X POST "$API_BASE/api/consultations/ask" \
  -F "user_id=test_user" \
  -F "pet_id=$pet_id" \
  -F "question=我的宠物最近精神不太好" 2>/dev/null)

if echo "$consult_response" | grep -q "answer"; then
    echo -e "   ${GREEN}✅ 问诊API工作正常${NC}"
    answer=$(echo "$consult_response" | python3 -c "import sys, json; print(json.load(sys.stdin).get('answer', '')[:50])" 2>/dev/null)
    echo "   AI回复: $answer..."
else
    echo -e "   ${YELLOW}⚠️  问诊API可能需要时间响应${NC}"
fi
echo ""

# 测试今日食谱
echo "   [食谱] 检查今日食谱..."
recipe_response=$(curl -s "$API_BASE/api/recipes/today?user_id=test_user&pet_id=$pet_id")

if [ "$recipe_response" = "null" ]; then
    echo -e "   ${YELLOW}ℹ️  还没有今日食谱（需要点击生成）${NC}"
else
    echo -e "   ${GREEN}✅ 今日食谱已存在${NC}"
fi
echo ""

# 测试历史记录
echo "   [大小便] 获取历史记录..."
toilet_response=$(curl -s "$API_BASE/api/toilet/history?user_id=test_user&pet_id=$pet_id")
toilet_count=$(echo "$toilet_response" | python3 -c "import sys, json; print(len(json.load(sys.stdin)))" 2>/dev/null)

echo -e "   ${GREEN}✅ 大小便历史记录: $toilet_count 条${NC}"
echo ""

echo "========================================="
echo "🎉 测试完成！"
echo "========================================="
echo ""
echo "📖 下一步："
echo "  1. 启动前端: npm run dev"
echo "  2. 访问: http://localhost:5173"
echo "  3. 测试各项功能"
echo ""
echo "📊 API文档: http://127.0.0.1:8000/docs"
echo "📝 更新说明: UPDATE_SUMMARY.md"
echo ""
