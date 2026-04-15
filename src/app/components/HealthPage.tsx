import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Camera, ChevronRight, TrendingUp, TrendingDown,
  Scale, Activity, Droplets, Heart, Bone, Sparkles, Edit3, Check,
} from 'lucide-react';
import { MiniAppShell } from './MiniAppShell';
import { PawPrint } from './PetCartoonIcons';
import {
  apiAnalyzeHealth,
  apiAddWeightRecord,
  apiGetWeightHistory,
  apiGetToiletHistory,
  apiGetConsultationHistory,
  apiUploadPetPhotos,
  apiUpdatePetProfile,
  apiListPetsByUser,
  apiAnalyzePetPhoto,
  getBackendPetId,
} from '../lib/backendApi';
import type { PetProfileRecord, SBTIResult } from '../lib/petProfileDb';
import { getPetProfileById } from '../lib/petProfileDb';

/* ───────── helpers ───────── */
function getPetEmoji(t: string) {
  if (t === '狗狗') return '🐶';
  if (t === '猫猫') return '🐱';
  if (t === '仓鼠') return '🐹';
  if (t === '兔子') return '🐰';
  return '🐾';
}

/** 本地日期格式化为 YYYY-MM-DD，避免 toISOString 的 UTC 偏移 */
function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function statusColor(s: string) {
  if (s === '正常' || s === '健康') return '#64D4A8';
  if (s === '注意') return '#FFB347';
  if (s === '异常') return '#FF6B6B';
  return '#CCC';
}

/* ───────── section: 宠物信息卡 ───────── */
function PetInfoCard({
  pet,
  onEdit,
  onUploadPhoto,
}: {
  pet: PetProfileRecord;
  onEdit: () => void;
  onUploadPhoto: () => void;
}) {
  const emoji = getPetEmoji(pet.petType);
  const genderLabel = pet.gender === 'male' ? '♂' : pet.gender === 'female' ? '♀' : '';
  const genderColor = pet.gender === 'male' ? '#5B8DEF' : '#FF6B9D';

  return (
    <div
      className="mx-4 rounded-3xl p-4 flex items-center gap-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #FF6B9D, #FF9A5C)', boxShadow: '0 6px 20px rgba(255,107,157,0.3)' }}
    >
      {/* decorative paw */}
      <div className="absolute -right-3 -top-3 opacity-15"><PawPrint size={60} color="white" /></div>

      {/* avatar */}
      <button
        onClick={onUploadPhoto}
        className="relative w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.3)', border: '2px dashed rgba(255,255,255,0.5)' }}
      >
        {pet.avatarUrl ? (
          <img src={pet.avatarUrl} alt={pet.name} className="w-full h-full object-cover" />
        ) : (
          <span style={{ fontSize: '34px' }}>{emoji}</span>
        )}
        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white flex items-center justify-center shadow">
          <Camera size={11} color="#FF6B9D" />
        </div>
      </button>

      {/* info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-nowrap" style={{ whiteSpace: 'nowrap' }}>
          <span className="text-white font-bold" style={{ fontSize: '16px' }}>{pet.name}</span>
          {genderLabel && (
            <span className="px-1.5 py-0.5 rounded-full text-xs text-white" style={{ background: genderColor }}>
              {genderLabel}
            </span>
          )}
          <span className="text-white/80 text-xs truncate">{pet.breed || '未设置品种'}</span>
        </div>
        <p className="text-white/75 mt-0.5" style={{ fontSize: '12px' }}>
          {pet.age || '-'}{pet.ageUnit || ''} · {pet.weight || '-'}kg · {pet.length || '-'}cm
        </p>
      </div>

      <button
        onClick={onEdit}
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: 'rgba(255,255,255,0.25)' }}
      >
        <Edit3 size={14} color="white" />
      </button>
    </div>
  );
}

/* ───────── section: 综合健康概览 ───────── */
function HealthOverview({
  petStatus,
  toiletRecords,
  consultIssues,
  furScore,
  moodScore,
}: {
  petStatus: string;
  toiletRecords: any[];
  consultIssues: string[];
  furScore: { score: number | null; detail: string; no_photo?: boolean } | null;
  moodScore: { score: number | null; detail: string; mood?: string; no_photo?: boolean } | null;
}) {
  const sColor = statusColor(petStatus);
  const latest = toiletRecords[0];
  const scores = latest?.analysis_result?.scores;
  const [bubbleMsg, setBubbleMsg] = useState<string | null>(null);

  // 点击无数据的毛发/精神卡片时弹出可爱气泡
  const showBubble = (msg: string) => {
    setBubbleMsg(msg);
    setTimeout(() => setBubbleMsg(null), 2500);
  };

  const handleFurClick = () => {
    if (furScore?.score == null) {
      showBubble('去问诊页上传一张宠物照片就能分析毛发啦~');
    }
  };

  const handleMoodClick = () => {
    if (moodScore?.score == null) {
      showBubble('上传一张宠物近照，我来帮你读懂它的心情~');
    }
  };

  const items = [
    { emoji: '💩', label: '消化', value: scores?.['消化健康'] ?? '-', unit: '分', color: '#64D4A8', onClick: undefined },
    { emoji: '💧', label: '水分', value: scores?.['水分摄入'] ?? '-', unit: '分', color: '#5B8DEF', onClick: undefined },
    { emoji: '✨', label: '毛发', value: furScore?.score != null ? `${furScore.score}` : '-', unit: '分', color: '#FF9A5C', onClick: handleFurClick },
    { emoji: '😸', label: '精神', value: moodScore?.score != null ? `${moodScore.score}` : '-', unit: '分', color: '#7C5CBF', onClick: handleMoodClick },
  ];

  return (
    <div className="mx-4 mt-4 relative">
      {/* 可爱气泡提示 */}
      <AnimatePresence>
        {bubbleMsg && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.95 }}
            className="absolute left-1/2 -translate-x-1/2 z-20 px-4 py-3 rounded-2xl shadow-lg"
            style={{
              top: '70px',
              background: 'linear-gradient(135deg, #FFE0F0, #FFF0E0)',
              border: '1.5px solid #FFD0E8',
              maxWidth: '280px',
              whiteSpace: 'nowrap',
            }}
          >
            <p className="text-xs font-medium text-center" style={{ color: '#FF6B9D' }}>
              🐾 {bubbleMsg}
            </p>
            <div
              className="absolute left-1/2 -translate-x-1/2 -bottom-2 w-3 h-3 rotate-45"
              style={{ background: '#FFE0F0', border: '1.5px solid #FFD0E8', borderTop: 'none', borderLeft: 'none' }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* status badge */}
      <div className="flex items-center gap-2 mb-3">
        <PawPrint size={16} color={sColor} />
        <span className="font-bold" style={{ color: '#333', fontSize: '15px' }}>综合健康</span>
        <span
          className="ml-auto px-3 py-1 rounded-full text-xs font-semibold text-white"
          style={{ background: sColor }}
        >
          {petStatus}
        </span>
      </div>

      {/* scores grid */}
      <div className="grid grid-cols-4 gap-2">
        {items.map((it) => (
          <button
            key={it.label}
            onClick={it.onClick}
            className="rounded-2xl py-3 flex flex-col items-center gap-1"
            style={{ background: 'white', border: '1px solid #FFE0EE', cursor: it.onClick ? 'pointer' : 'default' }}
          >
            <span style={{ fontSize: '18px' }}>{it.emoji}</span>
            <span className="text-sm font-bold" style={{ color: '#333' }}>
              {it.value !== '-' ? it.value : '-'}
              <span className="text-xs font-normal" style={{ color: '#AAA' }}>{it.value !== '-' ? it.unit : ''}</span>
            </span>
            <span className="text-xs" style={{ color: '#999' }}>{it.label}</span>
          </button>
        ))}
      </div>

      {/* fur/mood detail tips */}
      {(furScore?.score != null || moodScore?.score != null) && (
        <div className="mt-2 p-3 rounded-2xl" style={{ background: '#FFF8F0', border: '1px solid #FFE8D0' }}>
          {furScore?.score != null && (
            <p className="text-xs leading-relaxed" style={{ color: '#888' }}>
              <span style={{ color: '#FF9A5C', fontWeight: 600 }}>✨ 毛发：</span>{furScore.detail}
            </p>
          )}
          {moodScore?.score != null && (
            <p className="text-xs leading-relaxed mt-1" style={{ color: '#888' }}>
              <span style={{ color: '#7C5CBF', fontWeight: 600 }}>😸 精神：</span>{moodScore.detail}
            </p>
          )}
        </div>
      )}

      {/* recent consultation issues */}
      {consultIssues.length > 0 && (
        <div className="mt-3 p-3 rounded-2xl" style={{ background: '#FFF5F0', border: '1px solid #FFE0D0' }}>
          <p className="text-xs font-semibold mb-1.5" style={{ color: '#FF9A5C' }}>🩺 近期问诊记录</p>
          {consultIssues.slice(0, 3).map((msg, i) => (
            <p key={i} className="text-xs leading-relaxed" style={{ color: '#888' }}>
              · {msg.length > 40 ? msg.slice(0, 40) + '...' : msg}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

/* ───────── section: 体重趋势 ───────── */
function WeightSection({
  currentWeight,
  weightHistory,
  onAddWeight,
}: {
  currentWeight: string;
  weightHistory: Array<{ weight: number; recorded_at: string }>;
  onAddWeight: (dateType: 'today' | 'yesterday') => void;
}) {
  // 构建7天滑动窗口数据
  const chartData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days: Array<{ date: string; label: string; weight: number | null }> = [];

    // 构建日期->体重的映射
    const weightMap = new Map<string, number>();
    for (const r of weightHistory) {
      weightMap.set(r.recorded_at, r.weight);
    }

    // 最多展示7天，从D-6到D-0
    const windowSize = 7;
    for (let i = windowSize - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = toLocalDateStr(d);
      const label = i === 0 ? '今天' : i === 1 ? '昨天' : `${d.getMonth() + 1}/${d.getDate()}`;
      days.push({ date: key, label, weight: weightMap.get(key) ?? null });
    }

    return days;
  }, [weightHistory]);

  // 有数据的点（带index信息用于x轴定位）
  const dataPoints = useMemo(() => {
    const pts: Array<{ idx: number; date: string; label: string; weight: number }> = [];
    for (let i = 0; i < chartData.length; i++) {
      const d = chartData[i];
      if (d.weight !== null) {
        pts.push({ idx: i, ...d, weight: d.weight });
      }
    }
    return pts;
  }, [chartData]);

  const trend = useMemo(() => {
    if (dataPoints.length < 2) return null;
    const last = dataPoints[dataPoints.length - 1].weight;
    const prev = dataPoints[dataPoints.length - 2].weight;
    return last - prev;
  }, [dataPoints]);

  // 计算SVG折线图坐标
  const chartW = 300;
  const chartH = 100;
  const padX = 10;
  const padTop = 22; // 顶部留空给数字标签
  const padBot = 6;

  const svgPath = useMemo(() => {
    if (dataPoints.length < 2) return null;

    const allWeights = dataPoints.map((d) => d.weight);
    const minW = Math.min(...allWeights);
    const maxW = Math.max(...allWeights);
    const range = maxW - minW || 1;

    const points: Array<{ x: number; y: number; weight: number; label: string }> = [];
    for (const dp of dataPoints) {
      const x = padX + (dp.idx / (chartData.length - 1)) * (chartW - padX * 2);
      const y = padTop + (1 - (dp.weight - minW) / range) * (chartH - padTop - padBot);
      points.push({ x, y, weight: dp.weight, label: dp.label });
    }

    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaD = pathD
      + ` L ${points[points.length - 1].x} ${chartH}`
      + ` L ${points[0].x} ${chartH} Z`;

    return { pathD, areaD, points, minW, maxW };
  }, [chartData, dataPoints]);

  // 检查今天/昨天是否已有数据
  const todayHasData = chartData[chartData.length - 1]?.weight !== null;
  const yesterdayHasData = chartData[chartData.length - 2]?.weight !== null;

  return (
    <div className="mx-4 mt-4">
      <div className="flex items-center gap-2 mb-3">
        <span style={{ fontSize: '16px' }}>⚖️</span>
        <span className="font-bold" style={{ color: '#333', fontSize: '15px' }}>体重趋势</span>
        <span className="text-xs ml-1" style={{ color: '#CCC' }}>近7日</span>
      </div>

      <div className="bg-white rounded-3xl p-4" style={{ border: '1px solid #FFE0EE' }}>
        <div className="flex items-end gap-2 mb-3">
          <span className="text-2xl font-bold" style={{ color: '#333' }}>{currentWeight || '-'}</span>
          <span className="text-sm pb-0.5" style={{ color: '#999' }}>kg</span>
          {trend !== null && (
            <span className="flex items-center gap-0.5 text-xs font-medium ml-2 pb-0.5" style={{ color: trend > 0 ? '#FF6B6B' : trend < 0 ? '#64D4A8' : '#999' }}>
              {trend > 0 ? <TrendingUp size={12} /> : trend < 0 ? <TrendingDown size={12} /> : null}
              {trend > 0 ? '+' : ''}{trend.toFixed(1)}kg
            </span>
          )}
        </div>

        {/* SVG 折线图 */}
        {svgPath ? (
          <div className="relative">
            <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full" style={{ height: '110px' }}>
              <defs>
                <linearGradient id="weightFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FF6B9D" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#FF6B9D" stopOpacity="0.02" />
                </linearGradient>
              </defs>
              {/* 填充区域 */}
              <path d={svgPath.areaD} fill="url(#weightFill)" />
              {/* 折线 */}
              <path d={svgPath.pathD} fill="none" stroke="#FF6B9D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              {/* 数据点圆圈 */}
              {svgPath.points.map((p, i) => (
                <circle key={`c${i}`} cx={p.x} cy={p.y} r="4" fill="white" stroke="#FF6B9D" strokeWidth="2" />
              ))}
              {/* 数字标签：用 SVG foreignObject 包裹 span 替代 <text>，避免 React removeChild 冲突 */}
              {svgPath.points.map((p, i) => (
                <foreignObject key={`t${i}`} x={p.x - 16} y={p.y - 22} width="32" height="14">
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: '#FF6B9D',
                      textAlign: 'center',
                      lineHeight: '14px',
                      userSelect: 'none',
                    }}
                  >
                    {p.weight}
                  </div>
                </foreignObject>
              ))}
            </svg>
            {/* X轴日期标签 */}
            <div className="flex justify-between mt-1 px-1">
              {chartData.map((d) => (
                <span
                  key={d.date}
                  className="text-center"
                  style={{
                    fontSize: '9px',
                    color: d.weight !== null ? '#FF6B9D' : '#DDD',
                    fontWeight: d.weight !== null ? 500 : 400,
                    width: `${100 / chartData.length}%`,
                  }}
                >
                  {d.label}
                </span>
              ))}
            </div>
          </div>
        ) : dataPoints.length === 1 ? (
          <div className="text-center py-3">
            <p className="text-xs" style={{ color: '#999' }}>
              已记录 <span style={{ color: '#FF6B9D', fontWeight: 600 }}>{dataPoints[0].weight}kg</span>（{dataPoints[0].label}），再记录一次即可展示趋势图
            </p>
          </div>
        ) : (
          <p className="text-xs text-center py-4" style={{ color: '#CCC' }}>记录体重数据后将展示趋势图</p>
        )}

        {/* 记录按钮 */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => onAddWeight('today')}
            className="flex-1 py-2.5 rounded-2xl text-xs font-semibold text-white"
            style={{ background: todayHasData ? '#CCC' : 'linear-gradient(135deg, #FF6B9D, #FF9A5C)' }}
          >
            {todayHasData ? '✓ 今日已记录' : '+ 记录今日体重'}
          </button>
          <button
            onClick={() => onAddWeight('yesterday')}
            className="flex-1 py-2.5 rounded-2xl text-xs font-semibold"
            style={{
              background: yesterdayHasData ? '#F5F5F5' : '#FFF5F8',
              color: yesterdayHasData ? '#CCC' : '#FF6B9D',
              border: yesterdayHasData ? '1px solid #EEE' : '1px solid #FFD0E8',
            }}
          >
            {yesterdayHasData ? '✓ 昨日已记录' : '+ 补录昨日体重'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────── section: AI 健康分析卡片 ───────── */
function AiAnalysisSection({
  healthData,
  loadingType,
  onAnalyze,
}: {
  healthData: Record<string, { value: string; suggestion: string }>;
  loadingType: string | null;
  onAnalyze: (type: string) => void;
}) {
  const items = [
    { type: 'weight', title: '体重评估', icon: <Scale size={20} />, color: '#5B8DEF', emoji: '⚖️' },
    { type: 'fat', title: '体脂分析', icon: <Activity size={20} />, color: '#FF6B9D', emoji: '📐' },
    { type: 'stomach', title: '肠胃健康', icon: <Droplets size={20} />, color: '#64D4A8', emoji: '🩺' },
    { type: 'heart', title: '心脑血管', icon: <Heart size={20} />, color: '#FF9A5C', emoji: '❤️' },
    { type: 'bone', title: '骨骼健康', icon: <Bone size={20} />, color: '#7C5CBF', emoji: '🦴' },
  ];

  return (
    <div className="mx-4 mt-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles size={16} color="#FF6B9D" />
        <span className="font-bold" style={{ color: '#333', fontSize: '15px' }}>AI 健康分析</span>
        <span className="text-xs" style={{ color: '#CCC' }}>点击获取报告</span>
      </div>

      <div className="flex flex-col gap-2.5">
        {items.map((item) => {
          const data = healthData[item.type];
          const isLoading = loadingType === item.type;
          return (
            <div key={item.type}>
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => onAnalyze(item.type)}
                disabled={isLoading}
                className="w-full bg-white rounded-2xl p-3.5 flex items-center gap-3"
                style={{ border: `1px solid ${item.color}25` }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: `${item.color}15` }}
                >
                  {isLoading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-5 h-5 border-2 border-t-transparent rounded-full"
                      style={{ borderColor: item.color, borderTopColor: 'transparent' }}
                    />
                  ) : (
                    <span style={{ fontSize: '18px' }}>{item.emoji}</span>
                  )}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium" style={{ color: '#333' }}>{item.title}</p>
                  {data && <p className="text-xs" style={{ color: item.color }}>{data.value}</p>}
                </div>
                <ChevronRight size={16} color="#DDD" />
              </motion.button>

              <AnimatePresence>
                {data && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-1.5 mx-1 p-3 rounded-2xl" style={{ background: `${item.color}10` }}>
                      <p className="text-xs font-medium mb-1" style={{ color: item.color }}>💡 健康建议</p>
                      <p className="text-xs leading-relaxed" style={{ color: '#666' }}>{data.suggestion}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ───────── section: 大小便历史 ───────── */
function ToiletHistorySection({ records }: { records: any[] }) {
  if (records.length === 0) return null;

  return (
    <div className="mx-4 mt-4">
      <div className="flex items-center gap-2 mb-3">
        <span style={{ fontSize: '16px' }}>📊</span>
        <span className="font-bold" style={{ color: '#333', fontSize: '15px' }}>大小便记录</span>
        <span className="ml-auto text-xs" style={{ color: '#CCC' }}>最近{records.length}条</span>
      </div>

      <div className="flex flex-col gap-2">
        {records.slice(0, 5).map((r: any) => {
          const analysis = r.analysis_result;
          const st = analysis?.status || '待分析';
          const sCol = statusColor(st);
          const d = new Date(r.created_at);
          const dateStr = `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

          return (
            <div
              key={r.id}
              className="bg-white rounded-2xl p-3 flex items-center gap-3"
              style={{ border: '1px solid #FFE0EE' }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: `${sCol}20` }}
              >
                <span style={{ fontSize: '16px' }}>{r.type === 'poop' ? '💩' : '💧'}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate" style={{ color: '#333' }}>
                  {analysis?.suggestion?.slice(0, 30) || '等待分析结果'}
                </p>
                <p className="text-xs mt-0.5" style={{ color: '#BBB' }}>{dateStr}</p>
              </div>
              <span
                className="px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0"
                style={{ background: `${sCol}20`, color: sCol }}
              >
                {st}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ───────── modal: 编辑宠物信息 ───────── */
function EditPetModal({
  pet,
  onClose,
  onSave,
}: {
  pet: PetProfileRecord;
  onClose: () => void;
  onSave: (data: Record<string, any>) => void;
}) {
  const [weight, setWeight] = useState(pet.weight || '');
  const [length, setLength] = useState(pet.length || '');
  const [age, setAge] = useState(pet.age || '');
  const [ageUnit, setAgeUnit] = useState(pet.ageUnit || '岁');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const data: Record<string, any> = {};
    if (weight) data.weight = parseFloat(String(weight));
    if (length) data.length = parseFloat(String(length));
    if (age) data.age = parseInt(String(age), 10);
    if (ageUnit) data.age_unit = ageUnit;
    await onSave(data);
    setSaving(false);
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
        initial={{ y: 300 }}
        animate={{ y: 0 }}
        exit={{ y: 300 }}
        className="w-full max-w-[390px] rounded-t-3xl bg-white p-5 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <span className="font-bold" style={{ fontSize: '16px', color: '#333' }}>更新宠物信息</span>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#F5F5F5' }}>
            <X size={16} color="#999" />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: '#888' }}>体重 (kg)</label>
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="例如 5.2"
              className="w-full px-4 py-3 rounded-2xl text-sm outline-none"
              style={{ border: '1.5px solid #FFE0EE', background: '#FFF5F8' }}
              step="0.1"
            />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: '#888' }}>体长 (cm)</label>
            <input
              type="number"
              value={length}
              onChange={(e) => setLength(e.target.value)}
              placeholder="例如 45"
              className="w-full px-4 py-3 rounded-2xl text-sm outline-none"
              style={{ border: '1.5px solid #FFE0EE', background: '#FFF5F8' }}
              step="0.1"
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium mb-1 block" style={{ color: '#888' }}>年龄</label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="例如 3"
                className="w-full px-4 py-3 rounded-2xl text-sm outline-none"
                style={{ border: '1.5px solid #FFE0EE', background: '#FFF5F8' }}
              />
            </div>
            <div className="w-24">
              <label className="text-xs font-medium mb-1 block" style={{ color: '#888' }}>单位</label>
              <div className="flex gap-1">
                {['岁', '月'].map((u) => (
                  <button
                    key={u}
                    onClick={() => setAgeUnit(u)}
                    className="flex-1 py-3 rounded-2xl text-sm font-medium transition-all"
                    style={{
                      background: ageUnit === u ? '#FF6B9D' : '#FFF5F8',
                      color: ageUnit === u ? 'white' : '#999',
                      border: `1.5px solid ${ageUnit === u ? '#FF6B9D' : '#FFE0EE'}`,
                    }}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleSave}
          disabled={saving}
          className="w-full mt-5 py-3.5 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg, #FF6B9D, #FF9A5C)', opacity: saving ? 0.6 : 1 }}
        >
          {saving ? '保存中...' : '✓ 保存更新'}
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

/* ───────── modal: 记录体重 ───────── */
function AddWeightModal({
  currentWeight,
  dateType,
  onClose,
  onSave,
}: {
  currentWeight: string;
  dateType: 'today' | 'yesterday';
  onClose: () => void;
  onSave: (weight: number, note: string, dateType: 'today' | 'yesterday') => Promise<void>;
}) {
  const [weight, setWeight] = useState(currentWeight || '');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const dateLabel = dateType === 'today' ? '今日' : '昨日';

  const handleSave = async () => {
    const w = parseFloat(weight);
    if (!w || w <= 0) { alert('请输入有效体重'); return; }
    setSaving(true);
    await onSave(w, note, dateType);
    setSaving(false);
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
        initial={{ y: 300 }}
        animate={{ y: 0 }}
        exit={{ y: 300 }}
        className="w-full max-w-[390px] rounded-t-3xl bg-white p-5 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <span className="font-bold" style={{ fontSize: '16px', color: '#333' }}>记录{dateLabel}体重</span>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#F5F5F5' }}>
            <X size={16} color="#999" />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: '#888' }}>{dateLabel}体重 (kg)</label>
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="例如 5.2"
              className="w-full px-4 py-3 rounded-2xl text-sm outline-none"
              style={{ border: '1.5px solid #FFE0EE', background: '#FFF5F8' }}
              step="0.1"
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: '#888' }}>备注（可选）</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="例如：饭后称重"
              className="w-full px-4 py-3 rounded-2xl text-sm outline-none"
              style={{ border: '1.5px solid #FFE0EE', background: '#FFF5F8' }}
            />
          </div>
        </div>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleSave}
          disabled={saving}
          className="w-full mt-5 py-3.5 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg, #FF6B9D, #FF9A5C)', opacity: saving ? 0.6 : 1 }}
        >
          {saving ? '保存中...' : `✓ 记录${dateLabel}体重`}
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

/* ───────── modal: 上传照片 ───────── */
function UploadPhotoModal({
  petId,
  onClose,
  onDone,
}: {
  petId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [sideFile, setSideFile] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState('');
  const [sidePreview, setSidePreview] = useState('');
  const [uploading, setUploading] = useState(false);

  const pickFile = (type: 'front' | 'side') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    if (type === 'front') { setFrontFile(f); setFrontPreview(url); }
    else { setSideFile(f); setSidePreview(url); }
  };

  const handleUpload = async () => {
    if (!frontFile && !sideFile) { alert('请选择至少一张照片'); return; }
    setUploading(true);
    try {
      await apiUploadPetPhotos(petId, frontFile, sideFile);
      onDone();
    } catch (e) {
      alert('上传失败，请重试');
    } finally {
      setUploading(false);
    }
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
        initial={{ y: 300 }}
        animate={{ y: 0 }}
        exit={{ y: 300 }}
        className="w-full max-w-[390px] rounded-t-3xl bg-white p-5 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <span className="font-bold" style={{ fontSize: '16px', color: '#333' }}>更新宠物照片</span>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#F5F5F5' }}>
            <X size={16} color="#999" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {(['front', 'side'] as const).map((type) => {
            const preview = type === 'front' ? frontPreview : sidePreview;
            return (
              <label key={type} className="cursor-pointer">
                <div
                  className="aspect-square rounded-2xl flex flex-col items-center justify-center gap-2 overflow-hidden"
                  style={{ border: '2px dashed #FFD0E8', background: preview ? 'transparent' : '#FFF5F8' }}
                >
                  {preview ? (
                    <img src={preview} className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <Camera size={28} color="#FF6B9D" />
                      <span className="text-xs font-medium" style={{ color: '#FF6B9D' }}>
                        {type === 'front' ? '正面照' : '侧面照'}
                      </span>
                    </>
                  )}
                </div>
                <input type="file" accept="image/*" onChange={pickFile(type)} className="hidden" />
              </label>
            );
          })}
        </div>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleUpload}
          disabled={uploading || (!frontFile && !sideFile)}
          className="w-full mt-4 py-3.5 rounded-2xl text-sm font-bold text-white"
          style={{
            background: 'linear-gradient(135deg, #FF6B9D, #FF9A5C)',
            opacity: uploading || (!frontFile && !sideFile) ? 0.5 : 1,
          }}
        >
          {uploading ? '上传中，正在生成Q版头像...' : '📷 上传照片'}
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

/* ═══════════ SBTI RESULT CARD ═══════════ */

const dimColors: Record<string, [string, string]> = {
  e: ['#6f8f72', '#4e6e52'], i: ['#7a8ea0', '#5d7081'],
  u: ['#c78677', '#a06255'], d: ['#86a6b5', '#5f8394'],
  o: ['#c8a06d', '#a97f4f'], x: ['#8f86a3', '#6f667f'],
  p: ['#6b8a6a', '#4f6d4f'], c: ['#9a7f63', '#7b6149'],
  a: ['#b68a9a', '#916878'], n: ['#9a9fa6', '#767b82'],
};

function MiniDimBar({ label1, label2, pct1, pct2, cls1, cls2 }: {
  label1: string; label2: string; pct1: number; pct2: number; cls1: string; cls2: string;
}) {
  const [c1a] = dimColors[cls1];
  const [c2a] = dimColors[cls2];
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 600, color: '#786a57', marginBottom: 3 }}>
        <span>{label1} {pct1}%</span>
        <span>{label2} {pct2}%</span>
      </div>
      <div style={{ display: 'flex', height: 14, borderRadius: 4, overflow: 'hidden', border: '1.5px solid #d6ccb8' }}>
        <div style={{ width: `${pct1}%`, background: c1a, flexShrink: 0 }} />
        <div style={{ width: `${pct2}%`, background: c2a, flexShrink: 0 }} />
      </div>
    </div>
  );
}

function SBTIResultCard({
  result, petName, showDetail, onToggle,
}: {
  result: SBTIResult | null;
  petName: string;
  showDetail: boolean;
  onToggle: () => void;
}) {
  const navigate = useNavigate();
  if (!result) {
    return (
      <div className="mx-4 mt-4">
        <div className="flex items-center gap-2 mb-3">
          <span style={{ fontSize: 16 }}>🧠</span>
          <span className="font-bold" style={{ color: '#333', fontSize: '15px' }}>性格测试</span>
        </div>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate('/sbti')}
          className="w-full rounded-2xl p-4 flex items-center gap-3"
          style={{
            background: 'linear-gradient(135deg, #f3efe6, #ede8dc)',
            border: '1.5px dashed #c8956c',
          }}
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(200,149,108,0.15)', fontSize: 24 }}
          >
            🐾
          </div>
          <div className="flex-1 text-left">
            <p className="font-bold" style={{ color: '#5c4a32', fontSize: 14 }}>还没测过宠物版SBTI</p>
            <p style={{ color: '#9a836a', fontSize: 12, marginTop: 2 }}>
              30题揭开{petName}的性格密码 →
            </p>
          </div>
        </motion.button>
      </div>
    );
  }

  const savedDate = new Date(result.savedAt).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });

  return (
    <div className="mx-4 mt-4">
      <div className="flex items-center gap-2 mb-3">
        <span style={{ fontSize: 16 }}>🧠</span>
        <span className="font-bold" style={{ color: '#333', fontSize: '15px' }}>性格测试</span>
        <span className="text-xs" style={{ color: '#CCC' }}>{savedDate}测</span>
      </div>

      <div
        className="rounded-2xl overflow-hidden"
        style={{ border: '1.5px solid #d6ccb8', background: '#fcfaf5' }}
      >
        {/* 折叠头 */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onToggle}
          className="w-full flex items-center gap-3 p-4"
        >
          <img
            src={`/sbti-assets/${result.petKey}1.png`}
            alt={result.petName}
            className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
            style={{ border: '2px solid #c8956c', background: '#ede8dc' }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <div className="flex-1 text-left">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold" style={{ color: '#2c251c', fontSize: 15 }}>{result.petName}</span>
              <span
                className="px-2 py-0.5 rounded-full text-xs font-bold"
                style={{ background: '#c8956c22', color: '#a0714f', fontSize: 10 }}
              >
                {result.typeCode}
              </span>
            </div>
            <p style={{ color: '#786a57', fontSize: 12, lineHeight: 1.4 }} className="line-clamp-2">
              {result.petDesc}
            </p>
          </div>
          <span style={{ color: '#c8956c', fontSize: 16, flexShrink: 0, transform: showDetail ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>›</span>
        </motion.button>

        {/* 展开内容 */}
        <AnimatePresence>
          {showDetail && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{ padding: '0 16px 16px', borderTop: '1px solid #e8e0d0' }}>
                {/* 一句话标签 */}
                <div
                  className="rounded-xl px-3 py-2.5 mt-3 mb-3"
                  style={{ background: '#f3efe6', border: '1px solid #d6ccb8' }}
                >
                  <p style={{ color: '#5c4a32', fontSize: 12, lineHeight: 1.6, fontStyle: 'italic' }}>
                    "{result.petLine}"
                  </p>
                </div>

                {/* 维度条 */}
                <MiniDimBar label1="外向E" label2="内向I" pct1={result.dimE} pct2={result.dimI} cls1="e" cls2="i" />
                <MiniDimBar label1="强烈U" label2="平稳D" pct1={result.dimU} pct2={result.dimD} cls1="u" cls2="d" />
                <MiniDimBar label1="外显O" label2="内敛X" pct1={result.dimO} pct2={result.dimX} cls1="o" cls2="x" />

                {/* 行为驱动条 */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 600, color: '#786a57', marginBottom: 3 }}>
                    <span>行为驱动</span>
                    <span>{['探索', '控制', '关怀', '松弛'].map((l, i) => `${l} ${result.drivePercents[i]}%`).join(' · ')}</span>
                  </div>
                  <div style={{ display: 'flex', height: 14, borderRadius: 4, overflow: 'hidden', border: '1.5px solid #d6ccb8' }}>
                    {(['p', 'c', 'a', 'n'] as const).map((cls, i) => (
                      <div key={cls} style={{ width: `${result.drivePercents[i]}%`, background: dimColors[cls][0], flexShrink: 0 }} />
                    ))}
                  </div>
                </div>

                {/* 详细分析 */}
                {result.bodyText.split('\n\n').filter(Boolean).map((para, i) => (
                  <p key={i} style={{ color: '#5c4a32', fontSize: 12, lineHeight: 1.7, marginBottom: 8 }}>
                    {para}
                  </p>
                ))}

                {/* 重测按钮 */}
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => navigate('/sbti')}
                  className="w-full mt-2 py-2 rounded-xl text-sm font-semibold"
                  style={{ background: 'linear-gradient(135deg, #c8956c, #a0714f)', color: 'white' }}
                >
                  重新测试
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ═══════════ MAIN PAGE ═══════════ */
export function HealthPage() {
  const userId = useMemo(() => localStorage.getItem('current-user-id') || 'demo-user', []);
  const [petId, setPetId] = useState('');

  useEffect(() => { getBackendPetId().then(setPetId); }, []);

  const [pet, setPet] = useState<PetProfileRecord | null>(null);
  const [toiletRecords, setToiletRecords] = useState<any[]>([]);
  const [consultIssues, setConsultIssues] = useState<string[]>([]);
  const [weightHistory, setWeightHistory] = useState<Array<{ id: number; weight: number; recorded_at: string }>>([]);
  const [healthData, setHealthData] = useState<Record<string, { value: string; suggestion: string }>>({});
  const [loadingType, setLoadingType] = useState<string | null>(null);
  const [furScore, setFurScore] = useState<{ score: number | null; detail: string; suggestion: string; no_photo?: boolean } | null>(null);
  const [moodScore, setMoodScore] = useState<{ score: number | null; detail: string; suggestion: string; mood?: string; no_photo?: boolean } | null>(null);

  // modals
  const [showEditModal, setShowEditModal] = useState(false);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [weightDateType, setWeightDateType] = useState<'today' | 'yesterday'>('today');
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  // SBTI result — loaded from IndexedDB (not backend)
  const [sbtiResult, setSbtiResult] = useState<SBTIResult | null>(null);
  const [showSbtiDetail, setShowSbtiDetail] = useState(false);

  useEffect(() => {
    const petId = localStorage.getItem('current-pet-id');
    if (!petId) return;
    getPetProfileById(petId)
      .then((profile) => { if (profile?.sbtiResult) setSbtiResult(profile.sbtiResult); })
      .catch(() => {});
  }, []);

  const loadPet = useCallback(async () => {
    if (!petId) return;
    try {
      const pets = await apiListPetsByUser(userId);
      const current = pets.find((p) => p.id === petId);
      if (current) setPet(current);
    } catch { /* ignore */ }
  }, [userId, petId]);

  // load all data
  useEffect(() => {
    if (!petId) return;
    loadPet();
    apiGetToiletHistory(userId, petId).then(setToiletRecords).catch(() => {});
    apiGetWeightHistory(userId, petId, 60).then(setWeightHistory).catch(() => {});
    apiGetConsultationHistory(userId, petId)
      .then((msgs) => {
        setConsultIssues(msgs.filter((m) => m.role === 'user').map((m) => m.content).reverse().slice(0, 5));
      })
      .catch(() => {});
    // 自动加载毛发/精神分析（如果有近期照片）
    apiAnalyzePetPhoto(userId, petId, 'fur').then(setFurScore).catch(() => {});
    apiAnalyzePetPhoto(userId, petId, 'mood').then(setMoodScore).catch(() => {});
  }, [userId, petId, loadPet]);

  // compute overall status from toilet
  const petStatus = useMemo(() => {
    if (toiletRecords.length === 0) return pet?.weight ? '健康' : '待完善';
    const latest = toiletRecords[0]?.analysis_result?.status;
    if (latest === '异常') return '异常';
    if (latest === '注意') return '注意';
    return '健康';
  }, [toiletRecords, pet]);

  const handleAnalyze = async (type: string) => {
    if (!petId) { alert('请先选择宠物'); return; }
    setLoadingType(type);
    try {
      const result = await apiAnalyzeHealth({ userId, petId, healthType: type as any });
      setHealthData((prev) => ({ ...prev, [type]: result }));
    } catch {
      alert('分析失败，请检查网络连接');
    } finally {
      setLoadingType(null);
    }
  };

  const handleSavePet = async (data: Record<string, any>) => {
    if (!petId) return;
    try {
      const updated = await apiUpdatePetProfile(petId, data);
      setPet(updated);
      setShowEditModal(false);
    } catch {
      alert('更新失败，请重试');
    }
  };

  const handleAddWeight = async (weight: number, note: string, dateType: 'today' | 'yesterday') => {
    try {
      let recordedAt: string | undefined;
      if (dateType === 'yesterday') {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        recordedAt = toLocalDateStr(d);
      }
      await apiAddWeightRecord({ userId, petId, weight, note, recordedAt });
      // refresh
      const history = await apiGetWeightHistory(userId, petId, 60);
      setWeightHistory(history);
      await loadPet();
      setShowWeightModal(false);
    } catch {
      alert('记录失败，请重试');
    }
  };

  const handlePhotoDone = () => {
    setShowPhotoModal(false);
    loadPet();
  };

  if (!pet) {
    return (
      <MiniAppShell title="宠物健康" showBack bgColor="bg-[#FFF5F8]" titleColor="text-[#FF6B9D]">
        <div className="flex-1 flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            className="w-10 h-10 border-3 border-t-transparent rounded-full"
            style={{ borderColor: '#FFD0E8', borderTopColor: 'transparent' }}
          />
        </div>
      </MiniAppShell>
    );
  }

  return (
    <MiniAppShell title="宠物健康" showBack bgColor="bg-[#FFF5F8]" titleColor="text-[#FF6B9D]">
      <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#FFF5F8' }}>
        <div className="flex-1 overflow-y-auto pb-8">
          {/* top gradient */}
          <div
            className="pt-4 pb-6"
            style={{ background: 'linear-gradient(180deg, #FFE0F0 0%, #FFF5F8 100%)' }}
          >
            <PetInfoCard pet={pet} onEdit={() => setShowEditModal(true)} onUploadPhoto={() => setShowPhotoModal(true)} />
          </div>

          <HealthOverview
            petStatus={petStatus}
            toiletRecords={toiletRecords}
            consultIssues={consultIssues}
            furScore={furScore}
            moodScore={moodScore}
          />

          <WeightSection
            currentWeight={pet.weight || ''}
            weightHistory={weightHistory}
            onAddWeight={(dateType) => { setWeightDateType(dateType); setShowWeightModal(true); }}
          />

          <AiAnalysisSection
            healthData={healthData}
            loadingType={loadingType}
            onAnalyze={handleAnalyze}
          />

          <SBTIResultCard
            result={sbtiResult}
            petName={pet.name || '毛毛'}
            showDetail={showSbtiDetail}
            onToggle={() => setShowSbtiDetail((v) => !v)}
          />

          <ToiletHistorySection records={toiletRecords} />

          {/* footer tip */}
          <div className="mt-6 mb-4 text-center">
            <p className="text-xs flex items-center justify-center gap-1" style={{ color: '#DDD' }}>
              <PawPrint size={10} color="#EEE" />
              数据来自问诊、大小便记录及AI分析
              <PawPrint size={10} color="#EEE" />
            </p>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showEditModal && pet && (
          <EditPetModal pet={pet} onClose={() => setShowEditModal(false)} onSave={handleSavePet} />
        )}
        {showWeightModal && (
          <AddWeightModal currentWeight={pet.weight || ''} dateType={weightDateType} onClose={() => setShowWeightModal(false)} onSave={handleAddWeight} />
        )}
        {showPhotoModal && (
          <UploadPhotoModal petId={petId} onClose={() => setShowPhotoModal(false)} onDone={handlePhotoDone} />
        )}
      </AnimatePresence>
    </MiniAppShell>
  );
}
