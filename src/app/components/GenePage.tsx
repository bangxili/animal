import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, ChevronRight, Clock, Crown, X } from 'lucide-react';
import { NoPetBanner } from './NoPetGuard';
import { MiniAppShell } from './MiniAppShell';
import { RabbitScientist, PawPrint } from './PetCartoonIcons';
import { apiAnalyzeGene, apiGetGeneHistory, getBackendPetId } from '../lib/backendApi';
import type { ApiGeneRecord } from '../lib/backendApi';

const proFeatures = [
  { icon: '🧬', title: '完整基因图谱', desc: '检测500+基因位点' },
  { icon: '🏥', title: '遗传病风险报告', desc: '提前了解潜在风险' },
  { icon: '💊', title: '个性化用药建议', desc: '基于基因的精准医疗' },
  { icon: '📊', title: '营养代谢分析', desc: '最适合的营养方案' },
  { icon: '🌍', title: '血统溯源', desc: '追溯祖先地域来源' },
];

interface GeneResult {
  breeds: Array<{ breed: string; percent: number; emoji: string; color: string }>;
  conclusion: string;
  traits: Array<{ name: string; value: string }>;
}

export function GenePage() {
  const [activeTab, setActiveTab] = useState<'upload' | 'history' | 'pro'>('upload');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<GeneResult | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [historyRecords, setHistoryRecords] = useState<ApiGeneRecord[]>([]);
  const [viewingRecord, setViewingRecord] = useState<GeneResult | null>(null);

  const userId = useMemo(() => localStorage.getItem('current-user-id') || 'demo-user', []);
  const [petId, setPetId] = useState('');

  useEffect(() => { getBackendPetId().then(setPetId); }, []);

  useEffect(() => {
    if (petId && activeTab === 'history') {
      loadHistory();
    }
  }, [petId, activeTab]);

  const loadHistory = async () => {
    try {
      const data = await apiGetGeneHistory(userId, petId);
      setHistoryRecords(data);
    } catch (error) {
      console.error('加载基因检测历史失败:', error);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
    setResult(null);
  };

  const clearImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setSelectedImage(null);
    setImagePreview('');
  };

  const handleAnalyze = async () => {
    if (!selectedImage) {
      alert('请先上传宠物照片');
      return;
    }
    if (!petId) {
      alert('请先创建宠物档案');
      return;
    }

    setAnalyzing(true);
    try {
      const data = await apiAnalyzeGene({ userId, petId, image: selectedImage });
      setResult(data);
    } catch (error) {
      console.error('基因分析失败:', error);
      alert('分析失败，请检查网络连接或稍后重试');
    } finally {
      setAnalyzing(false);
    }
  };

  const resetAll = () => {
    setResult(null);
    clearImage();
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  // 渲染基因结果面板（upload 和 history 详情共用）
  const renderGeneResult = (data: GeneResult, onReset?: () => void) => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-3">
      <div className="flex items-center gap-2 mb-2">
        <span style={{ fontSize: '20px' }}>🎉</span>
        <p className="font-bold" style={{ color: '#333', fontSize: '15px' }}>基因分析结果</p>
      </div>

      {data.breeds.map((r, idx) => {
        const barColor = idx === 0 ? '#7C5CBF' : r.color;
        return (
          <div key={r.breed} className="flex items-center gap-3">
            <span style={{ fontSize: '22px' }}>{r.emoji}</span>
            <div className="flex-1">
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium" style={{ color: idx === 0 ? '#333' : '#555' }}>{r.breed}</span>
                <span className="text-sm font-bold" style={{ color: barColor }}>{r.percent}%</span>
              </div>
              <div className="h-2.5 rounded-full" style={{ background: '#F0F0F0' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${r.percent}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className="h-full rounded-full"
                  style={{
                    background: idx === 0
                      ? 'linear-gradient(90deg, #7C5CBF, #C3A6FF)'
                      : barColor,
                  }}
                />
              </div>
            </div>
          </div>
        );
      })}

      {data.traits && data.traits.length > 0 && (
        <div className="mt-1 p-3 rounded-2xl" style={{ background: '#F8F0FF' }}>
          <p className="text-xs font-semibold mb-2" style={{ color: '#7C5CBF' }}>🔬 显著特征</p>
          <div className="flex flex-col gap-1.5">
            {data.traits.map((t) => (
              <div key={t.name} className="flex gap-2 text-xs">
                <span style={{ color: '#7C5CBF', fontWeight: 600 }}>{t.name}:</span>
                <span style={{ color: '#666' }}>{t.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-1 p-3 rounded-2xl" style={{ background: '#F5EEFF' }}>
        <p className="text-xs" style={{ color: '#7C5CBF', fontWeight: 600 }}>💡 结论</p>
        <p className="text-xs mt-1 leading-relaxed" style={{ color: '#666' }}>
          {data.conclusion}
        </p>
      </div>

      {onReset && (
        <button
          className="w-full py-3 rounded-2xl text-sm font-medium text-white"
          style={{ background: 'linear-gradient(135deg, #7C5CBF, #C3A6FF)' }}
          onClick={onReset}
        >
          重新检测
        </button>
      )}
    </motion.div>
  );

  return (
    <MiniAppShell title="基因检测" showBack bgColor="bg-[#F5EEFF]" titleColor="text-[#7C5CBF]">
      <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#F8F0FF' }}>
        {/* Header */}
        <div
          className="px-5 py-4 flex items-center gap-4"
          style={{ background: 'linear-gradient(135deg, #7C5CBF, #C3A6FF)', borderRadius: '0 0 24px 24px' }}
        >
          <RabbitScientist size={60} />
          <div>
            <p className="text-white font-bold" style={{ fontSize: '16px' }}>基因兔博士🔬</p>
            <p className="text-white/80" style={{ fontSize: '12px' }}>探索毛孩子的神秘血统</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex mx-4 mt-4 rounded-2xl p-1" style={{ background: '#EEE0FF' }}>
          {[
            { id: 'upload' as const, label: '📸 照片检测' },
            { id: 'history' as const, label: '📊 历史记录' },
            { id: 'pro' as const, label: '👑 专业版' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setViewingRecord(null); }}
              className="flex-1 py-2 rounded-xl text-xs font-medium transition-all"
              style={{
                background: activeTab === tab.id ? (tab.id === 'pro' ? '#7C5CBF' : 'white') : 'transparent',
                color: activeTab === tab.id ? (tab.id === 'pro' ? 'white' : '#7C5CBF') : '#AA88CC',
                boxShadow: activeTab === tab.id ? '0 2px 8px rgba(124,92,191,0.15)' : 'none',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-6 flex flex-col gap-4">
          <NoPetBanner />
          {activeTab === 'upload' && (
            <div className="bg-white rounded-3xl p-4" style={{ border: '1px solid #DDD0FF' }}>
              <p className="text-sm font-semibold mb-1" style={{ color: '#7C5CBF' }}>📸 照片识别</p>
              <p className="text-xs mb-3" style={{ color: '#AAA' }}>上传宠物正面清晰照，AI自动识别品种血统组成</p>

              {!result ? (
                <>
                  {imagePreview ? (
                    <div className="relative flex justify-center">
                      <div className="relative w-48 h-48 rounded-2xl overflow-hidden" style={{ border: '2px solid #D0B0F0' }}>
                        <img src={imagePreview} alt="宠物照片" className="w-full h-full object-cover" />
                        <button
                          onClick={clearImage}
                          className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-red-400 flex items-center justify-center shadow"
                        >
                          <X size={14} color="white" />
                        </button>
                      </div>
                      <label className="absolute bottom-2 bg-purple-500 text-white px-2 py-1 rounded-lg text-xs cursor-pointer">
                        重新选择
                        <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                      </label>
                    </div>
                  ) : (
                    <label className="w-full h-48 rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-purple-50 transition-colors" style={{ border: '2px dashed #D0B0F0', background: '#F8F0FF' }}>
                      <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: '#EEE0FF' }}>
                        <Camera size={32} color="#7C5CBF" />
                      </div>
                      <p className="text-sm font-medium" style={{ color: '#7C5CBF' }}>点击上传照片</p>
                      <p className="text-xs" style={{ color: '#BBB' }}>建议正面清晰照，效果更准确</p>
                      <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                    </label>
                  )}

                  {selectedImage && !analyzing && (
                    <motion.button
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={handleAnalyze}
                      className="mt-3 w-full py-3.5 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2"
                      style={{ background: 'linear-gradient(135deg, #7C5CBF, #C3A6FF)', boxShadow: '0 6px 20px rgba(124,92,191,0.4)' }}
                    >
                      🧬 开始基因分析
                    </motion.button>
                  )}

                  {analyzing && (
                    <div className="mt-3 flex flex-col items-center gap-3 py-4">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                        className="w-12 h-12 rounded-full"
                        style={{ border: '4px solid #EEE0FF', borderTop: '4px solid #7C5CBF' }}
                      />
                      <p className="text-sm" style={{ color: '#7C5CBF' }}>AI正在分析基因组成...</p>
                      <div className="flex gap-1">
                        {['扫描特征', '比对数据库', '生成报告'].map((s, i) => (
                          <motion.span
                            key={s}
                            className="text-xs px-2 py-1 rounded-full"
                            style={{ background: '#F0E8FF', color: '#AA88CC' }}
                            animate={{ opacity: [0.4, 1, 0.4] }}
                            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.4 }}
                          >
                            {s}
                          </motion.span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                renderGeneResult(result, resetAll)
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <>
              {viewingRecord ? (
                <div className="bg-white rounded-3xl p-4" style={{ border: '1px solid #DDD0FF' }}>
                  <button
                    className="text-xs font-medium mb-3 flex items-center gap-1"
                    style={{ color: '#7C5CBF' }}
                    onClick={() => setViewingRecord(null)}
                  >
                    ← 返回列表
                  </button>
                  {renderGeneResult(viewingRecord)}
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {historyRecords.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">暂无检测记录</div>
                  ) : (
                    historyRecords.map((r, i) => {
                      const analysis = r.analysis_result;
                      const topBreed = analysis?.breeds?.[0];
                      return (
                        <motion.div
                          key={r.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.08 }}
                          className="bg-white rounded-2xl p-4 flex items-center gap-3 cursor-pointer"
                          style={{ border: '1px solid #DDD0FF' }}
                          onClick={() => {
                            if (analysis) setViewingRecord(analysis as GeneResult);
                          }}
                        >
                          <div
                            className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg flex-shrink-0"
                            style={{ background: '#F5EEFF' }}
                          >
                            {topBreed?.emoji || '🧬'}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-sm font-medium" style={{ color: '#333' }}>
                                {topBreed ? `${topBreed.breed} ${topBreed.percent}%` : '基因检测'}
                              </span>
                            </div>
                            <p className="text-xs" style={{ color: '#888' }}>
                              {analysis?.conclusion?.substring(0, 40) || '暂无结论'}...
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <div className="flex items-center gap-1" style={{ color: '#BBB' }}>
                              <Clock size={11} />
                              <span style={{ fontSize: '10px' }}>{formatDate(r.created_at)}</span>
                            </div>
                            <ChevronRight size={14} color="#CCC" />
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </div>
              )}
            </>
          )}

          {activeTab === 'pro' && (
            <div className="flex flex-col gap-4">
              <div
                className="rounded-3xl p-5 relative overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #7C5CBF, #FF6B9D)' }}
              >
                <div className="absolute right-4 top-4 opacity-20">
                  <PawPrint size={60} color="white" />
                </div>
                <Crown size={28} color="#FFD700" className="mb-2" />
                <p className="text-white font-bold mb-1" style={{ fontSize: '18px' }}>专业版毛发基因检测</p>
                <p className="text-white/80 text-xs mb-3">寄送一小撮毛发样本，实验室级精准检测</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-white/60 text-xs line-through">¥999</span>
                  <span className="text-yellow-300 font-bold" style={{ fontSize: '28px' }}>¥298</span>
                  <span className="text-white/70 text-xs">/ 次</span>
                </div>
                <span className="text-xs text-white/60 mt-1 block">🔥 限时特惠，已有12,486只毛孩子检测</span>
              </div>

              <div className="bg-white rounded-3xl p-4" style={{ border: '1px solid #DDD0FF' }}>
                <p className="text-sm font-semibold mb-3" style={{ color: '#7C5CBF' }}>✨ 专业版包含</p>
                <div className="flex flex-col gap-2">
                  {proFeatures.map((f) => (
                    <div key={f.title} className="flex items-center gap-3 py-2">
                      <div className="w-9 h-9 rounded-2xl flex items-center justify-center" style={{ background: '#F5EEFF' }}>
                        <span style={{ fontSize: '18px' }}>{f.icon}</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium" style={{ color: '#333' }}>{f.title}</p>
                        <p className="text-xs" style={{ color: '#AAA' }}>{f.desc}</p>
                      </div>
                      <ChevronRight size={14} color="#CCC" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-3xl p-4" style={{ border: '1px solid #DDD0FF' }}>
                <p className="text-sm font-semibold mb-3" style={{ color: '#7C5CBF' }}>📦 检测流程</p>
                <div className="flex justify-between">
                  {[
                    { step: '1', label: '下单付款', icon: '💳' },
                    { step: '2', label: '收到套件', icon: '📦' },
                    { step: '3', label: '寄回毛发', icon: '✉️' },
                    { step: '4', label: '获取报告', icon: '📊' },
                  ].map((s) => (
                    <div key={s.step} className="flex flex-col items-center gap-1">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: '#F5EEFF', border: '2px solid #DDD0FF' }}>
                        <span style={{ fontSize: '16px' }}>{s.icon}</span>
                      </div>
                      <span style={{ fontSize: '10px', color: '#888', textAlign: 'center' }}>{s.label}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs mt-3 text-center" style={{ color: '#AAA' }}>预计7-10个工作日出结果</p>
              </div>

              <motion.button
                whileTap={{ scale: 0.97 }}
                className="w-full py-4 rounded-3xl font-bold text-white flex items-center justify-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, #7C5CBF, #FF6B9D)',
                  boxShadow: '0 8px 24px rgba(124,92,191,0.4)',
                }}
              >
                <Crown size={18} color="#FFD700" />
                立即购买专业版检测
              </motion.button>
            </div>
          )}
        </div>
      </div>
    </MiniAppShell>
  );
}
