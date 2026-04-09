import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, ChevronRight, Flame, Droplets, Beef, Plus, Trash2, X, BarChart3, Check } from 'lucide-react';
import { MiniAppShell } from './MiniAppShell';
import { HamsterChef, PawPrint } from './PetCartoonIcons';
import {
  apiGenerateRecipe,
  apiGetTodayRecipe,
  apiAddMealLog,
  apiGetTodayMealLogs,
  apiDeleteMealLog,
  apiAnalyzeMealComparison,
  apiGetMealLogHistory,
  getBackendPetId,
} from '../lib/backendApi';
import type { ApiMealLog, MealLogItem, MealComparisonResult, MealDayHistory } from '../lib/backendApi';

/* ───────── constants ───────── */
const MEAL_TYPES = [
  { id: 'breakfast', label: '早餐', icon: '🌅', time: '07:00-09:00' },
  { id: 'lunch', label: '午餐', icon: '☀️', time: '11:30-13:00' },
  { id: 'dinner', label: '晚餐', icon: '🌙', time: '17:30-19:00' },
  { id: 'snack', label: '零食', icon: '🍬', time: '不定时' },
];

const COMMON_FOODS: Array<{ name: string; emoji: string; defaultAmount: string }> = [
  { name: '狗粮/猫粮', emoji: '🍚', defaultAmount: '50g' },
  { name: '鸡胸肉', emoji: '🍗', defaultAmount: '30g' },
  { name: '牛肉', emoji: '🥩', defaultAmount: '30g' },
  { name: '三文鱼', emoji: '🐟', defaultAmount: '25g' },
  { name: '鸡蛋', emoji: '🥚', defaultAmount: '1个' },
  { name: '胡萝卜', emoji: '🥕', defaultAmount: '20g' },
  { name: '南瓜', emoji: '🎃', defaultAmount: '30g' },
  { name: '红薯', emoji: '🍠', defaultAmount: '25g' },
  { name: '酸奶', emoji: '🥛', defaultAmount: '30ml' },
  { name: '苹果', emoji: '🍎', defaultAmount: '15g' },
  { name: '蓝莓', emoji: '🫐', defaultAmount: '10g' },
  { name: '罐头', emoji: '🥫', defaultAmount: '50g' },
  { name: '冻干零食', emoji: '🧊', defaultAmount: '10g' },
  { name: '洁齿棒', emoji: '🦴', defaultAmount: '1根' },
  { name: '饮水', emoji: '💧', defaultAmount: '200ml' },
];

function statusColor(s: string) {
  if (s === '充足') return '#64D4A8';
  if (s === '不足') return '#FF6B6B';
  if (s === '过量') return '#FFB347';
  return '#999';
}

function scoreColor(s: number) {
  if (s >= 80) return '#64D4A8';
  if (s >= 60) return '#FFB347';
  return '#FF6B6B';
}

/* ═══════════ MAIN PAGE ═══════════ */
export function RecipePage() {
  const [activeTab, setActiveTab] = useState<'recipe' | 'log' | 'compare' | 'history'>('recipe');

  // recipe states
  const [generating, setGenerating] = useState(false);
  const [recipe, setRecipe] = useState<any>(null);
  const [hasRecipe, setHasRecipe] = useState(false);

  // meal log states
  const [mealLogs, setMealLogs] = useState<ApiMealLog[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addingMealType, setAddingMealType] = useState('breakfast');

  // comparison states
  const [comparing, setComparing] = useState(false);
  const [comparison, setComparison] = useState<MealComparisonResult | null>(null);

  // history states
  const [historyDays, setHistoryDays] = useState<MealDayHistory[]>([]);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  const userId = useMemo(() => localStorage.getItem('current-user-id') || 'demo-user', []);
  const petId = useMemo(() => localStorage.getItem('current-pet-id') || '', []);

  // load on mount
  useEffect(() => {
    if (!petId) return;
    loadTodayRecipe();
    loadTodayMealLogs();
    loadHistory();
  }, [petId]);

  const loadTodayRecipe = async () => {
    try {
      const data = await apiGetTodayRecipe(userId, petId);
      if (data) { setRecipe(data); setHasRecipe(true); }
      else { setHasRecipe(false); setRecipe(null); }
    } catch { setHasRecipe(false); }
  };

  const loadTodayMealLogs = async () => {
    try {
      const data = await apiGetTodayMealLogs(userId, petId);
      setMealLogs(data);
    } catch { /* ignore */ }
  };

  const loadHistory = async () => {
    try {
      const data = await apiGetMealLogHistory(userId, petId, 30);
      setHistoryDays(data);
    } catch { /* ignore */ }
  };

  const handleGenerate = async () => {
    if (!petId) { alert('请先选择宠物档案'); return; }
    setGenerating(true);
    try {
      const data = await apiGenerateRecipe(userId, petId);
      setRecipe(data); setHasRecipe(true);
    } catch { alert('生成失败，请检查网络连接或稍后重试'); }
    finally { setGenerating(false); }
  };

  const handleDeleteLog = async (logId: number) => {
    try {
      await apiDeleteMealLog(logId);
      setMealLogs((prev) => prev.filter((l) => l.id !== logId));
    } catch { alert('删除失败'); }
  };

  const handleCompare = async () => {
    if (mealLogs.length === 0) { alert('请先记录今日饮食'); return; }
    setComparing(true);
    try {
      const data = await apiAnalyzeMealComparison(userId, petId);
      setComparison(data);
      loadHistory(); // refresh history to include new score
    } catch (e: any) {
      alert(e.message || '分析失败');
    } finally { setComparing(false); }
  };

  const getTotalCalories = () => {
    if (!recipe?.meals) return 0;
    return recipe.meals.reduce((sum: number, meal: any) => sum + (meal.calories || 0), 0);
  };

  const nutrients = recipe?.nutrition_summary ? [
    { name: '蛋白质', current: recipe.nutrition_summary.protein?.current || 0, target: recipe.nutrition_summary.protein?.target || 75, unit: 'g', color: '#FF6B9D', icon: <Beef size={14} /> },
    { name: '脂肪', current: recipe.nutrition_summary.fat?.current || 0, target: recipe.nutrition_summary.fat?.target || 28, unit: 'g', color: '#FFB347', icon: '🧈' },
    { name: '碳水', current: recipe.nutrition_summary.carbs?.current || 0, target: recipe.nutrition_summary.carbs?.target || 50, unit: 'g', color: '#5B8DEF', icon: '🌾' },
    { name: '水分', current: recipe.nutrition_summary.water?.current || 0, target: recipe.nutrition_summary.water?.target || 500, unit: 'ml', color: '#7EC8E3', icon: <Droplets size={14} /> },
  ] : [];

  // group meal logs by type
  const logsByType = useMemo(() => {
    const map: Record<string, ApiMealLog[]> = {};
    for (const log of mealLogs) {
      if (!map[log.meal_type]) map[log.meal_type] = [];
      map[log.meal_type].push(log);
    }
    return map;
  }, [mealLogs]);

  return (
    <MiniAppShell title="每日食谱" showBack bgColor="bg-[#EEFFEF]" titleColor="text-[#64D4A8]">
      <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#F2FFF4' }}>
        {/* Header */}
        <div
          className="px-5 py-4 flex items-center gap-4"
          style={{ background: 'linear-gradient(135deg, #64D4A8, #A8E6CF)', borderRadius: '0 0 24px 24px' }}
        >
          <HamsterChef size={60} />
          <div className="flex-1">
            <p className="text-white font-bold" style={{ fontSize: '16px' }}>小仓营养师🍴</p>
            <p className="text-white/80" style={{ fontSize: '12px' }}>基于问诊+健康数据智能推荐</p>
            {hasRecipe && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-white/70" style={{ fontSize: '11px' }}>今日热量：</span>
                <span className="text-white font-bold" style={{ fontSize: '13px' }}>{getTotalCalories()} 千卡</span>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex mx-4 mt-4 rounded-2xl p-1" style={{ background: '#D8F5E0' }}>
          {[
            { id: 'recipe' as const, label: '🍽️ 食谱' },
            { id: 'log' as const, label: '📝 记录' },
            { id: 'compare' as const, label: '📊 对比' },
            { id: 'history' as const, label: '📅 历史' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 py-2 rounded-xl text-xs font-medium transition-all"
              style={{
                background: activeTab === tab.id ? 'white' : 'transparent',
                color: activeTab === tab.id ? '#64D4A8' : '#88C8A0',
                boxShadow: activeTab === tab.id ? '0 2px 8px rgba(100,212,168,0.15)' : 'none',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-6 flex flex-col gap-4">
          {/* ─── TAB: 推荐食谱 ─── */}
          {activeTab === 'recipe' && (
            <>
              {!hasRecipe ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center mb-6">
                    <Sparkles size={48} color="#64D4A8" />
                  </div>
                  <p className="text-lg font-bold mb-2" style={{ color: '#333' }}>还没有今日食谱</p>
                  <p className="text-sm text-gray-500 mb-6 text-center px-8">
                    点击下方按钮，AI将基于宠物档案、问诊记录和大小便分析生成个性化食谱
                  </p>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleGenerate}
                    disabled={generating}
                    className="px-8 py-4 rounded-3xl text-white font-bold flex items-center gap-2 shadow-lg"
                    style={{ background: generating ? '#CCC' : 'linear-gradient(135deg, #64D4A8, #A8E6CF)' }}
                  >
                    {generating ? (
                      <><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-5 h-5 border-2 border-white border-t-transparent rounded-full" /><span>生成中...</span></>
                    ) : (
                      <><Sparkles size={20} /><span>智能生成今日食谱</span></>
                    )}
                  </motion.button>
                  <p className="text-xs text-gray-400 mt-4">💡 基于宠物档案和健康数据生成</p>
                </div>
              ) : (
                <>
                  {/* Nutrition Summary */}
                  {nutrients.length > 0 && (
                    <div className="bg-white rounded-3xl p-4" style={{ border: '1px solid #C8F0D0' }}>
                      <p className="text-sm font-semibold mb-3" style={{ color: '#333' }}>📊 推荐营养摄入</p>
                      <div className="grid grid-cols-2 gap-3">
                        {nutrients.map((n) => (
                          <div key={n.name} className="flex flex-col gap-1.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1">
                                <span style={{ color: n.color }}>{n.icon}</span>
                                <span style={{ fontSize: '11px', color: '#666' }}>{n.name}</span>
                              </div>
                              <span style={{ fontSize: '11px', color: n.color, fontWeight: 600 }}>
                                {n.current}/{n.target}{n.unit}
                              </span>
                            </div>
                            <div className="h-2 rounded-full" style={{ background: '#F0F0F0' }}>
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min((n.current / n.target) * 100, 100)}%` }}
                                transition={{ duration: 1, ease: 'easeOut' }}
                                className="h-full rounded-full"
                                style={{ background: n.color }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Meals */}
                  {recipe?.meals?.map((meal: any, mealIndex: number) => (
                    <motion.div
                      key={mealIndex}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: mealIndex * 0.1 }}
                      className="bg-white rounded-3xl overflow-hidden"
                      style={{ border: '1px solid #C8F0D0' }}
                    >
                      <div className="px-4 py-3 flex items-center justify-between" style={{ background: '#EEFFEF' }}>
                        <div className="flex items-center gap-2">
                          <span style={{ fontSize: '20px' }}>{meal.time_icon || '🍽️'}</span>
                          <div>
                            <p className="font-bold" style={{ color: '#64D4A8', fontSize: '15px' }}>{meal.time}</p>
                            <p style={{ color: '#AAA', fontSize: '11px' }}>{meal.time_tag}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 px-3 py-1.5 rounded-2xl" style={{ background: '#E8FFF4' }}>
                          <Flame size={13} color="#64D4A8" />
                          <span style={{ fontSize: '13px', color: '#64D4A8', fontWeight: 700 }}>{meal.calories}</span>
                          <span style={{ fontSize: '10px', color: '#64D4A8' }}>kcal</span>
                        </div>
                      </div>
                      <div className="p-4 flex flex-col gap-2">
                        {meal.dishes?.map((dish: any, dishIndex: number) => (
                          <div key={dishIndex} className="flex items-center gap-3">
                            <span style={{ fontSize: '24px' }}>{dish.emoji || '🍖'}</span>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium" style={{ color: '#333' }}>{dish.name}</span>
                                <span className="px-1.5 py-0.5 rounded-full text-xs" style={{ background: '#F5F5F5', color: '#888' }}>{dish.amount}</span>
                              </div>
                              <p style={{ fontSize: '11px', color: '#AAA' }}>{dish.benefit}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  ))}

                  {/* Tips */}
                  {recipe?.tips && (
                    <div className="rounded-3xl p-4" style={{ background: 'linear-gradient(135deg, #E8FFF0, #F0FFEA)' }}>
                      <p className="text-sm font-semibold mb-2" style={{ color: '#64D4A8' }}>🌿 今日营养小贴士</p>
                      <p className="text-xs leading-relaxed" style={{ color: '#555' }}>{recipe.tips}</p>
                    </div>
                  )}

                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleGenerate}
                    disabled={generating}
                    className="w-full py-3 rounded-2xl text-sm font-medium"
                    style={{ background: generating ? '#CCC' : 'white', color: generating ? 'white' : '#64D4A8', border: '2px solid #64D4A8' }}
                  >
                    {generating ? '生成中...' : '🔄 重新生成食谱'}
                  </motion.button>
                </>
              )}
            </>
          )}

          {/* ─── TAB: 饮食记录 ─── */}
          {activeTab === 'log' && (
            <>
              {/* meal type cards */}
              {MEAL_TYPES.map((mt) => {
                const logs = logsByType[mt.id] || [];
                const allItems = logs.flatMap((l) => l.items);

                return (
                  <div key={mt.id} className="bg-white rounded-3xl overflow-hidden" style={{ border: '1px solid #C8F0D0' }}>
                    {/* header */}
                    <div className="px-4 py-3 flex items-center justify-between" style={{ background: '#EEFFEF' }}>
                      <div className="flex items-center gap-2">
                        <span style={{ fontSize: '20px' }}>{mt.icon}</span>
                        <div>
                          <p className="font-bold" style={{ color: '#64D4A8', fontSize: '14px' }}>{mt.label}</p>
                          <p style={{ color: '#BBB', fontSize: '10px' }}>{mt.time}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => { setAddingMealType(mt.id); setShowAddModal(true); }}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold text-white"
                        style={{ background: 'linear-gradient(135deg, #64D4A8, #A8E6CF)' }}
                      >
                        <Plus size={12} />
                        记录
                      </button>
                    </div>

                    {/* items */}
                    {allItems.length > 0 ? (
                      <div className="p-3 flex flex-col gap-1.5">
                        {logs.map((log) =>
                          log.items.map((item, i) => (
                            <div key={`${log.id}-${i}`} className="flex items-center gap-2.5 py-1.5 px-2 rounded-xl" style={{ background: '#FAFFFE' }}>
                              <span style={{ fontSize: '20px' }}>{item.emoji}</span>
                              <span className="flex-1 text-sm" style={{ color: '#333' }}>{item.name}</span>
                              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#E8FFF4', color: '#64D4A8' }}>{item.amount}</span>
                              {i === 0 && (
                                <button onClick={() => handleDeleteLog(log.id)} className="p-1 rounded-full" style={{ color: '#DDD' }}>
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          )),
                        )}
                      </div>
                    ) : (
                      <div className="px-4 py-4 text-center">
                        <p className="text-xs" style={{ color: '#CCC' }}>还没有记录 {mt.label}</p>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* summary strip */}
              {mealLogs.length > 0 && (
                <div className="rounded-2xl px-4 py-3 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #E8FFF0, #F0FFEA)' }}>
                  <div>
                    <p className="text-xs font-semibold" style={{ color: '#64D4A8' }}>✅ 已记录 {mealLogs.length} 条</p>
                    <p className="text-xs mt-0.5" style={{ color: '#AAA' }}>去「营养对比」查看AI分析</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('compare')}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold text-white"
                    style={{ background: 'linear-gradient(135deg, #64D4A8, #5B8DEF)' }}
                  >
                    查看对比 →
                  </button>
                </div>
              )}
            </>
          )}

          {/* ─── TAB: 营养对比 ─── */}
          {activeTab === 'compare' && (
            <>
              {!comparison ? (
                <div className="flex flex-col items-center py-10">
                  <div className="w-28 h-28 rounded-full flex items-center justify-center mb-5" style={{ background: 'linear-gradient(135deg, #E8FFF0, #E0F0FF)' }}>
                    <BarChart3 size={44} color="#64D4A8" />
                  </div>
                  <p className="font-bold mb-1" style={{ color: '#333', fontSize: '16px' }}>营养摄入对比</p>
                  <p className="text-xs text-center px-8 mb-2" style={{ color: '#999' }}>
                    AI将对比推荐食谱与实际饮食的营养差异，给出改善建议
                  </p>

                  {mealLogs.length === 0 && (
                    <div className="mt-2 mb-3 px-4 py-2 rounded-2xl" style={{ background: '#FFF5F0' }}>
                      <p className="text-xs" style={{ color: '#FFB347' }}>⚠️ 请先到「饮食记录」记录今日实际饮食</p>
                    </div>
                  )}
                  {!hasRecipe && (
                    <div className="mt-1 mb-3 px-4 py-2 rounded-2xl" style={{ background: '#FFF5F0' }}>
                      <p className="text-xs" style={{ color: '#FFB347' }}>⚠️ 请先到「推荐食谱」生成今日食谱</p>
                    </div>
                  )}

                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleCompare}
                    disabled={comparing || mealLogs.length === 0}
                    className="mt-4 px-8 py-3.5 rounded-3xl text-white font-bold flex items-center gap-2"
                    style={{
                      background: comparing || mealLogs.length === 0
                        ? '#CCC'
                        : 'linear-gradient(135deg, #64D4A8, #5B8DEF)',
                      boxShadow: mealLogs.length > 0 ? '0 6px 20px rgba(100,212,168,0.3)' : 'none',
                    }}
                  >
                    {comparing ? (
                      <><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-5 h-5 border-2 border-white border-t-transparent rounded-full" /><span>AI分析中...</span></>
                    ) : (
                      <><BarChart3 size={18} /><span>开始AI对比分析</span></>
                    )}
                  </motion.button>
                </div>
              ) : (
                <ComparisonResult data={comparison} onReset={() => setComparison(null)} />
              )}
            </>
          )}

          {/* ─── TAB: 历史记录 ─── */}
          {activeTab === 'history' && (
            <>
              {historyDays.length === 0 ? (
                <div className="flex flex-col items-center py-12">
                  <div className="w-24 h-24 rounded-full flex items-center justify-center mb-4" style={{ background: '#E8FFF0' }}>
                    <span style={{ fontSize: '36px' }}>📅</span>
                  </div>
                  <p className="font-bold mb-1" style={{ color: '#333' }}>暂无历史记录</p>
                  <p className="text-xs" style={{ color: '#BBB' }}>记录每天的饮食并分析后，这里会保留历史数据</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: '16px' }}>📅</span>
                      <span className="font-bold" style={{ color: '#333', fontSize: '15px' }}>喂养历史</span>
                    </div>
                    <span className="text-xs" style={{ color: '#CCC' }}>最近{historyDays.length}天</span>
                  </div>

                  <div className="flex flex-col gap-2">
                    {historyDays.map((day) => {
                      const isExpanded = expandedDay === day.date;
                      const allItems = day.meals.flatMap((m) => m.items);
                      const mealTypeLabels = [...new Set(day.meals.map((m) => {
                        const t = MEAL_TYPES.find((mt) => mt.id === m.meal_type);
                        return t ? t.icon : '🍽️';
                      }))];
                      const d = new Date(day.date);
                      const weekDay = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()];

                      return (
                        <div key={day.date}>
                          <motion.button
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setExpandedDay(isExpanded ? null : day.date)}
                            className="w-full bg-white rounded-2xl p-3.5 flex items-center gap-3"
                            style={{ border: `1px solid ${day.score != null ? '#C8F0D0' : '#EAEAEA'}` }}
                          >
                            <div className="flex flex-col items-center w-11 flex-shrink-0">
                              <span className="text-sm font-bold" style={{ color: '#333' }}>{d.getDate()}</span>
                              <span style={{ fontSize: '10px', color: '#999' }}>{weekDay}</span>
                            </div>
                            <div className="w-px h-8 flex-shrink-0" style={{ background: '#EEE' }} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1 mb-0.5">
                                {mealTypeLabels.map((icon, i) => (
                                  <span key={i} style={{ fontSize: '14px' }}>{icon}</span>
                                ))}
                                <span className="text-xs" style={{ color: '#999' }}>{allItems.length}项食物</span>
                              </div>
                              <p className="text-xs truncate" style={{ color: '#BBB' }}>
                                {allItems.slice(0, 3).map((it) => it.name).join('、')}{allItems.length > 3 ? '...' : ''}
                              </p>
                            </div>
                            {day.score != null ? (
                              <div className="flex flex-col items-center flex-shrink-0">
                                <div
                                  className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold"
                                  style={{ background: day.score >= 80 ? '#64D4A8' : day.score >= 60 ? '#FFB347' : '#FF6B6B' }}
                                >
                                  {day.score}
                                </div>
                                <span style={{ fontSize: '9px', color: '#CCC' }}>评分</span>
                              </div>
                            ) : (
                              <span className="text-xs px-2 py-1 rounded-full flex-shrink-0" style={{ background: '#F5F5F5', color: '#CCC' }}>未评</span>
                            )}
                            <ChevronRight size={14} color="#DDD" className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                          </motion.button>

                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                              >
                                <HistoryDayDetail day={day} />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Add Meal Modal */}
      <AnimatePresence>
        {showAddModal && (
          <AddMealModal
            mealType={addingMealType}
            onClose={() => setShowAddModal(false)}
            onSave={async (items) => {
              await apiAddMealLog({ userId, petId, mealType: addingMealType, items });
              await loadTodayMealLogs();
              setShowAddModal(false);
            }}
          />
        )}
      </AnimatePresence>
    </MiniAppShell>
  );
}

/* ───────── 对比结果组件 ───────── */
function ComparisonResult({ data, onReset }: { data: MealComparisonResult; onReset: () => void }) {
  const nutrients = data.actual_nutrition
    ? [
        { name: '蛋白质', ...data.actual_nutrition.protein, unit: 'g', color: '#FF6B9D', emoji: '🥩' },
        { name: '脂肪', ...data.actual_nutrition.fat, unit: 'g', color: '#FFB347', emoji: '🧈' },
        { name: '碳水', ...data.actual_nutrition.carbs, unit: 'g', color: '#5B8DEF', emoji: '🌾' },
        { name: '水分', ...data.actual_nutrition.water, unit: 'ml', color: '#7EC8E3', emoji: '💧' },
        ...(data.actual_nutrition.calories ? [{ name: '热量', ...data.actual_nutrition.calories, unit: 'kcal', color: '#FF9A5C', emoji: '🔥' }] : []),
      ]
    : [];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-4">
      {/* Score card */}
      <div
        className="rounded-3xl p-5 flex items-center gap-4 relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${scoreColor(data.score)}, ${scoreColor(data.score)}88)` }}
      >
        <div className="absolute right-4 top-2 opacity-15"><PawPrint size={60} color="white" /></div>
        <div className="w-16 h-16 rounded-full bg-white/25 flex items-center justify-center">
          <span className="text-2xl font-black text-white">{data.score}</span>
        </div>
        <div className="flex-1">
          <p className="text-white font-bold" style={{ fontSize: '16px' }}>营养综合评分</p>
          <p className="text-white/80 text-xs mt-1 leading-relaxed">{data.summary}</p>
        </div>
      </div>

      {/* Nutrition bars */}
      <div className="bg-white rounded-3xl p-4" style={{ border: '1px solid #C8F0D0' }}>
        <p className="text-sm font-semibold mb-3" style={{ color: '#333' }}>📊 实际 vs 推荐摄入</p>
        <div className="flex flex-col gap-3">
          {nutrients.map((n) => {
            const pct = n.target ? Math.min((n.current / n.target) * 100, 150) : 0;
            const isOver = pct > 100;
            return (
              <div key={n.name}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <span style={{ fontSize: '14px' }}>{n.emoji}</span>
                    <span className="text-xs font-medium" style={{ color: '#555' }}>{n.name}</span>
                  </div>
                  <span className="text-xs" style={{ color: n.color, fontWeight: 600 }}>
                    {n.current} / {n.target}{n.unit}
                  </span>
                </div>
                <div className="relative h-3 rounded-full" style={{ background: '#F0F0F0' }}>
                  {/* target marker */}
                  <div className="absolute top-0 bottom-0 w-0.5 bg-gray-300" style={{ left: `${Math.min(100, 100)}%` }} />
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(pct, 100)}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{ background: isOver ? '#FFB347' : n.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Comparison items */}
      {data.comparison && data.comparison.length > 0 && (
        <div className="bg-white rounded-3xl p-4" style={{ border: '1px solid #C8F0D0' }}>
          <p className="text-sm font-semibold mb-3" style={{ color: '#333' }}>🔍 逐项对比</p>
          <div className="flex flex-col gap-2">
            {data.comparison.map((c, i) => (
              <div key={i} className="flex items-center gap-2.5 py-2 px-3 rounded-xl" style={{ background: `${statusColor(c.status)}10` }}>
                <span
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                  style={{ background: statusColor(c.status) }}
                >
                  {c.status === '充足' ? '✓' : c.status === '过量' ? '↑' : '↓'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium" style={{ color: '#333' }}>{c.item}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: `${statusColor(c.status)}20`, color: statusColor(c.status) }}>
                      {c.status}
                    </span>
                  </div>
                  <p className="text-xs mt-0.5 truncate" style={{ color: '#999' }}>{c.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggestions */}
      {data.suggestions && data.suggestions.length > 0 && (
        <div className="rounded-3xl p-4" style={{ background: 'linear-gradient(135deg, #E8FFF0, #E0F0FF)' }}>
          <p className="text-sm font-semibold mb-2" style={{ color: '#64D4A8' }}>💡 改善建议</p>
          <div className="flex flex-col gap-1.5">
            {data.suggestions.map((s, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs text-white flex-shrink-0 mt-0.5" style={{ background: '#64D4A8' }}>
                  {i + 1}
                </span>
                <p className="text-xs leading-relaxed" style={{ color: '#555' }}>{s}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={onReset}
        className="w-full py-3 rounded-2xl text-sm font-medium"
        style={{ background: 'white', color: '#64D4A8', border: '2px solid #64D4A8' }}
      >
        🔄 重新分析
      </button>
    </motion.div>
  );
}

/* ───────── 历史日详情组件 ───────── */
function HistoryDayDetail({ day }: { day: MealDayHistory }) {
  const mealsByType: Record<string, MealLogItem[]> = {};
  for (const m of day.meals) {
    if (!mealsByType[m.meal_type]) mealsByType[m.meal_type] = [];
    mealsByType[m.meal_type].push(...m.items);
  }

  const analysis = day.analysis_result;

  return (
    <div className="mt-1.5 ml-2 mr-1 flex flex-col gap-2 mb-2">
      {/* meals breakdown */}
      {MEAL_TYPES.filter((mt) => mealsByType[mt.id]?.length).map((mt) => (
        <div key={mt.id} className="bg-white rounded-2xl p-3" style={{ border: '1px solid #E8F8F0' }}>
          <div className="flex items-center gap-1.5 mb-2">
            <span style={{ fontSize: '14px' }}>{mt.icon}</span>
            <span className="text-xs font-semibold" style={{ color: '#64D4A8' }}>{mt.label}</span>
          </div>
          <div className="flex flex-col gap-1">
            {mealsByType[mt.id].map((item, i) => (
              <div key={i} className="flex items-center gap-2 py-1">
                <span style={{ fontSize: '16px' }}>{item.emoji}</span>
                <span className="flex-1 text-xs" style={{ color: '#555' }}>{item.name}</span>
                <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: '#E8FFF4', color: '#64D4A8' }}>
                  {item.amount}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* analysis result if available */}
      {analysis && (
        <>
          {/* score + summary */}
          <div className="rounded-2xl p-3 flex items-center gap-3" style={{ background: `${analysis.score >= 80 ? '#E8FFF0' : analysis.score >= 60 ? '#FFF8EE' : '#FFF0F0'}` }}>
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
              style={{ background: analysis.score >= 80 ? '#64D4A8' : analysis.score >= 60 ? '#FFB347' : '#FF6B6B' }}
            >
              {analysis.score}
            </div>
            <p className="text-xs leading-relaxed" style={{ color: '#666' }}>{analysis.summary}</p>
          </div>

          {/* nutrition bars */}
          {analysis.actual_nutrition && (
            <div className="bg-white rounded-2xl p-3" style={{ border: '1px solid #E8F8F0' }}>
              <p className="text-xs font-semibold mb-2" style={{ color: '#999' }}>营养摄入</p>
              {[
                { key: 'protein', name: '蛋白质', emoji: '🥩', color: '#FF6B9D' },
                { key: 'fat', name: '脂肪', emoji: '🧈', color: '#FFB347' },
                { key: 'carbs', name: '碳水', emoji: '🌾', color: '#5B8DEF' },
                { key: 'water', name: '水分', emoji: '💧', color: '#7EC8E3' },
              ].map((n) => {
                const d = (analysis.actual_nutrition as any)[n.key];
                if (!d) return null;
                const pct = d.target ? Math.min((d.current / d.target) * 100, 100) : 0;
                return (
                  <div key={n.key} className="mb-1.5 last:mb-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs" style={{ color: '#888' }}>{n.emoji} {n.name}</span>
                      <span className="text-xs" style={{ color: n.color, fontWeight: 600 }}>{d.current}/{d.target}</span>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ background: '#F0F0F0' }}>
                      <div className="h-full rounded-full" style={{ background: n.color, width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* suggestions */}
          {analysis.suggestions && analysis.suggestions.length > 0 && (
            <div className="rounded-2xl p-3" style={{ background: '#F8FFFE' }}>
              <p className="text-xs font-semibold mb-1.5" style={{ color: '#64D4A8' }}>💡 建议</p>
              {analysis.suggestions.map((s, i) => (
                <p key={i} className="text-xs leading-relaxed" style={{ color: '#888' }}>
                  {i + 1}. {s}
                </p>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ───────── 添加饮食弹窗 ───────── */
function AddMealModal({
  mealType,
  onClose,
  onSave,
}: {
  mealType: string;
  onClose: () => void;
  onSave: (items: MealLogItem[]) => Promise<void>;
}) {
  const [items, setItems] = useState<MealLogItem[]>([]);
  const [customName, setCustomName] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [saving, setSaving] = useState(false);

  const label = MEAL_TYPES.find((t) => t.id === mealType)?.label || '饮食';

  const addFood = (food: { name: string; emoji: string; defaultAmount: string }) => {
    setItems((prev) => [...prev, { name: food.name, amount: food.defaultAmount, emoji: food.emoji }]);
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateAmount = (index: number, amount: string) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, amount } : it)));
  };

  const addCustom = () => {
    if (!customName.trim()) return;
    setItems((prev) => [...prev, { name: customName.trim(), amount: customAmount.trim() || '适量', emoji: '🍽️' }]);
    setCustomName('');
    setCustomAmount('');
    setShowCustom(false);
  };

  const handleSave = async () => {
    if (items.length === 0) { alert('请添加至少一项食物'); return; }
    setSaving(true);
    try { await onSave(items); } catch { alert('保存失败'); }
    finally { setSaving(false); }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 400 }}
        animate={{ y: 0 }}
        exit={{ y: 400 }}
        className="w-full max-w-[390px] rounded-t-3xl bg-white flex flex-col"
        style={{ maxHeight: '85vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-center justify-between p-4 pb-2">
          <span className="font-bold" style={{ fontSize: '16px', color: '#333' }}>记录{label}</span>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#F5F5F5' }}>
            <X size={16} color="#999" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {/* selected items */}
          {items.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-medium mb-2" style={{ color: '#999' }}>已选 ({items.length})</p>
              <div className="flex flex-col gap-1.5">
                {items.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: '#EEFFEF' }}>
                    <span style={{ fontSize: '18px' }}>{item.emoji}</span>
                    <span className="flex-1 text-sm" style={{ color: '#333' }}>{item.name}</span>
                    <input
                      value={item.amount}
                      onChange={(e) => updateAmount(i, e.target.value)}
                      className="w-16 text-xs text-center px-2 py-1 rounded-lg outline-none"
                      style={{ border: '1px solid #C8F0D0', background: 'white', color: '#64D4A8' }}
                    />
                    <button onClick={() => removeItem(i)} className="p-0.5" style={{ color: '#DDD' }}>
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* quick add grid */}
          <p className="text-xs font-medium mb-2" style={{ color: '#999' }}>快速添加</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {COMMON_FOODS.map((food) => {
              const isSelected = items.some((it) => it.name === food.name);
              return (
                <button
                  key={food.name}
                  onClick={() => isSelected ? null : addFood(food)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs transition-all"
                  style={{
                    background: isSelected ? '#64D4A8' : '#F5F5F5',
                    color: isSelected ? 'white' : '#666',
                  }}
                >
                  <span style={{ fontSize: '13px' }}>{food.emoji}</span>
                  {food.name}
                  {isSelected && <Check size={11} />}
                </button>
              );
            })}
          </div>

          {/* custom entry */}
          {showCustom ? (
            <div className="flex gap-2 mb-3">
              <input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="食物名称"
                className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
                style={{ border: '1.5px solid #C8F0D0', background: '#FAFFFE' }}
                autoFocus
              />
              <input
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="用量"
                className="w-20 px-3 py-2 rounded-xl text-sm outline-none"
                style={{ border: '1.5px solid #C8F0D0', background: '#FAFFFE' }}
              />
              <button onClick={addCustom} className="px-3 rounded-xl text-white text-sm" style={{ background: '#64D4A8' }}>
                添加
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowCustom(true)}
              className="w-full py-2 rounded-xl text-xs flex items-center justify-center gap-1 mb-3"
              style={{ border: '1.5px dashed #C8F0D0', color: '#64D4A8' }}
            >
              <Plus size={13} /> 自定义食物
            </button>
          )}
        </div>

        {/* save button */}
        <div className="px-4 pb-6 pt-2" style={{ borderTop: '1px solid #EEFFEF' }}>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleSave}
            disabled={saving || items.length === 0}
            className="w-full py-3.5 rounded-2xl text-sm font-bold text-white"
            style={{
              background: items.length === 0 ? '#CCC' : 'linear-gradient(135deg, #64D4A8, #A8E6CF)',
              boxShadow: items.length > 0 ? '0 4px 16px rgba(100,212,168,0.3)' : 'none',
            }}
          >
            {saving ? '保存中...' : `✓ 保存${label}记录 (${items.length}项)`}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
