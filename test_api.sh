#!/bin/bash
# 测试所有API功能

API_BASE="http://127.0.0.1:8000"

echo "=== 测试宠物健康管理系统API ==="
echo ""

# 1. 测试健康检查
echo "1. 健康检查..."
curl -s "$API_BASE/healthz"
echo ""
echo ""

# 2. 测试宠物列表
echo "2. 获取宠物列表..."
curl -s "$API_BASE/api/pets?user_id=test_user" | python3 -m json.tool 2>/dev/null || echo "[]"
echo ""

# 3. 测试问诊历史
echo "3. 获取问诊历史（如果有宠物ID=1）..."
curl -s "$API_BASE/api/consultations/history?user_id=test_user&pet_id=1" | python3 -m json.tool 2>/dev/null || echo "[]"
echo ""

# 4. 测试大小便历史
echo "4. 获取大小便历史（如果有宠物ID=1）..."
curl -s "$API_BASE/api/toilet/history?user_id=test_user&pet_id=1" | python3 -m json.tool 2>/dev/null || echo "[]"
echo ""

# 5. 测试今日食谱
echo "5. 获取今日食谱（如果有宠物ID=1）..."
curl -s "$API_BASE/api/recipes/today?user_id=test_user&pet_id=1" | python3 -m json.tool 2>/dev/null || echo "null"
echo ""

# 6. 列出所有可用的API端点
echo "6. 查看API文档..."
echo "访问: http://127.0.0.1:8000/docs"
echo ""

echo "=== 测试完成 ==="
