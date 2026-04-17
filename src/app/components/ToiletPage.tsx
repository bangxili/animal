import { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, CheckCircle, Clock, X } from 'lucide-react';
import { MiniAppShell } from './MiniAppShell';
import { NoPetBanner } from './NoPetGuard';
import { OrangeCatAnalyst } from './PetCartoonIcons';
import { apiAnalyzeToilet, apiGetToiletHistory, getBackendPetId } from '../lib/backendApi';
import { AutoRecoverBoundary } from './AutoRecoverBoundary';

// 纯 CSS 进度条，颜色可按维度定制
function ScoreBar({ score, color = '#5B8DEF' }: { score: number; color?: string }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(score), 50);
    return () => clearTimeout(t);
  }, [score]);
  return (
    <div className="h-2 rounded-full" style={{ background: '#F0F0F0' }}>
      <div
        className="h-full rounded-full"
        style={{
          width: `${width}%`,
          background: color,
          transition: 'width 0.9s ease-out',
        }}
      />
    </div>
  );
}

// 根据维度名称返回对应颜色和图标
function getDimensionMeta(label: string, score: number): { color: string; icon: string; hint: string } {
  if (label === '消化健康') {
    const color = score >= 80 ? '#64D4A8' : score >= 60 ? '#FFB347' : '#FF6B6B';
    return { color, icon: '🫁', hint: '粪便形态、颜色、成形度综合评估' };
  }
  if (label === '水分摄入') {
    const color = score >= 75 ? '#5B8DEF' : score >= 55 ? '#FFB347' : '#FF6B6B';
    return { color, icon: '💧', hint: '尿液颜色/粪便含水度反映水化状态' };
  }
  if (label === '肠道菌群') {
    const color = score >= 80 ? '#A78BFA' : score >= 60 ? '#FFB347' : '#FF6B6B';
    return { color, icon: '🦠', hint: '粪便均匀性、气味、黏液等菌群指标' };
  }
  // 兜底
  return { color: '#5B8DEF', icon: '📊', hint: '' };
}

// 将 suggestion 字符串按编号拆成条目数组
// 支持 "1. xxx 2. xxx" 或 "1.xxx\n2.xxx" 两种格式
function parseSuggestionItems(text: string): string[] {
  if (!text) return [];
  // 尝试按 数字+点+空格 分割
  const parts = text.split(/(?=\d+[.、]\s)/).map(s => s.trim()).filter(Boolean);
  if (parts.length > 1) return parts;
  // 尝试换行分割
  const lines = text.split('\n').map(s => s.trim()).filter(Boolean);
  if (lines.length > 1) return lines;
  // 无法分割则整段返回
  return [text];
}

export function ToiletPage() {
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'history'>('upload');
  // 用 ref 做 records 备份：AutoRecoverBoundary 仅包裹渲染区，state 在此保留
  const [records, setRecords] = useState<any[]>([]);
  const recordsRef = useRef<any[]>([]);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [viewingRecord, setViewingRecord] = useState<any>(null);

  // 大便照片
  const [poopImage, setPoopImage] = useState<File | null>(null);
  const [poopPreview, setPoopPreview] = useState('');
  // 小便照片
  const [peeImage, setPeeImage] = useState<File | null>(null);
  const [peePreview, setPeePreview] = useState('');

  const userId = useMemo(() => localStorage.getItem('current-user-id') || 'demo-user', []);
  const [petId, setPetId] = useState('');

  useEffect(() => { getBackendPetId().then(setPetId); }, []);

  const hasAnyImage = !!(poopImage || peeImage);

  useEffect(() => {
    if (petId && activeTab === 'history') {
      loadHistory();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [petId, activeTab]);

  const loadHistory = async () => {
    try {
      const data = await apiGetToiletHistory(userId, petId);
      const formatted = data.map((r: any) => {
        const date = new Date(r.created_at);
        const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
        return {
          date: dateStr,
          type: r.type === 'poop' ? '大便' : r.type === 'pee' ? '小便' : '大便+小便',
          status: r.analysis_result?.status || '未知',
          color: r.analysis_result?.status === '正常' ? '#64D4A8' : '#FFB347',
          desc: r.analysis_result?.suggestion?.substring(0, 50) || '暂无描述',
          emoji: r.analysis_result?.status === '正常' ? '✅' : '⚠️',
          analysis: r.analysis_result,
        };
      });
      recordsRef.current = formatted;
      setRecords(formatted);
    } catch (error) {
      console.error('加载历史记录失败:', error);
      // 如果加载失败但 ref 中有缓存，恢复显示
      if (recordsRef.current.length > 0) {
        setRecords(recordsRef.current);
      }
    }
  };

  const handlePoopSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (poopPreview) URL.revokeObjectURL(poopPreview);
    setPoopImage(file);
    setPoopPreview(URL.createObjectURL(file));
    setAnalyzed(false);
    setAnalysisResult(null);
  };

  const handlePeeSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (peePreview) URL.revokeObjectURL(peePreview);
    setPeeImage(file);
    setPeePreview(URL.createObjectURL(file));
    setAnalyzed(false);
    setAnalysisResult(null);
  };

  const clearPoop = () => {
    if (poopPreview) URL.revokeObjectURL(poopPreview);
    setPoopImage(null);
    setPoopPreview('');
  };

  const clearPee = () => {
    if (peePreview) URL.revokeObjectURL(peePreview);
    setPeeImage(null);
    setPeePreview('');
  };

  const handleAnalyze = async () => {
    if (!petId) { alert('请先选择宠物档案'); return; }
    if (!hasAnyImage) { alert('请至少上传一张照片'); return; }

    setAnalyzing(true);
    setAnalyzed(false);

    try {
      const result = await apiAnalyzeToilet({ userId, petId, poopImage, peeImage });
      setAnalysisResult(result);
      setAnalyzed(true);
    } catch (error) {
      console.error('分析失败:', error);
      alert('分析失败，请检查网络连接或稍后重试');
    } finally {
      setAnalyzing(false);
    }
  };

  const resetAll = () => {
    setAnalyzed(false);
    setAnalysisResult(null);
    clearPoop();
    clearPee();
  };

  return (
    <MiniAppShell title="每日大小便" showBack bgColor="bg-[#EEF6FF]" titleColor="text-[#5B8DEF]">
      <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#F5FAFF' }}>
        {/* Header */}
        <div
          className="px-5 py-4 flex items-center gap-4"
          style={{ background: 'linear-gradient(135deg, #5B8DEF, #7EC8E3)', borderRadius: '0 0 24px 24px' }}
        >
          <OrangeCatAnalyst size={60} />
          <div>
            <p className="text-white font-bold" style={{ fontSize: '16px' }}>健康侦探猫🔍</p>
            <p className="text-white/80" style={{ fontSize: '12px' }}>上传照片，AI分析宠物健康状态</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex mx-4 mt-4 rounded-2xl p-1" style={{ background: '#E0EEFF' }}>
          {[{ id: 'upload', label: '📸 今日上传' }, { id: 'history', label: '📊 历史记录' }].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className="flex-1 py-2 rounded-xl text-sm font-medium transition-all"
              style={{
                background: activeTab === tab.id ? 'white' : 'transparent',
                color: activeTab === tab.id ? '#5B8DEF' : '#88AACC',
                boxShadow: activeTab === tab.id ? '0 2px 8px rgba(91,141,239,0.15)' : 'none',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* AutoRecoverBoundary 只包裹内容渲染区，不包裹 state 持有层 */}
        <AutoRecoverBoundary>
          <div className="flex-1 overflow-y-auto px-4 pt-4 pb-6 flex flex-col gap-4">
            <NoPetBanner />
            {activeTab === 'upload' ? (
              <>
                {/* 双照片上传区域 */}
                <div className="grid grid-cols-2 gap-3">
                  {/* 大便照片上传 */}
                  <div className="bg-white rounded-3xl p-3" style={{ border: '1px solid #D0E8FF' }}>
                    <p className="text-sm font-semibold mb-2 text-center" style={{ color: '#64D4A8' }}>💩 大便照片</p>
                    {poopPreview ? (
                      <div className="relative">
                        <div className="w-full aspect-square rounded-2xl overflow-hidden border-2 border-green-300">
                          <img src={poopPreview} alt="大便预览" className="w-full h-full object-cover" />
                        </div>
                        <button
                          onClick={clearPoop}
                          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-400 flex items-center justify-center shadow"
                        >
                          <X size={14} color="white" />
                        </button>
                        <label className="mt-2 block text-center text-xs text-blue-400 cursor-pointer">
                          重新选择
                          <input type="file" accept="image/*" onChange={handlePoopSelect} className="hidden" />
                        </label>
                      </div>
                    ) : (
                      <label className="w-full aspect-square rounded-2xl border-2 border-dashed border-green-300 flex flex-col items-center justify-center cursor-pointer hover:bg-green-50 transition-colors">
                        <Camera size={28} color="#64D4A8" />
                        <span className="text-green-400 text-xs mt-2">点击上传</span>
                        <input type="file" accept="image/*" onChange={handlePoopSelect} className="hidden" />
                      </label>
                    )}
                  </div>

                  {/* 小便照片上传 */}
                  <div className="bg-white rounded-3xl p-3" style={{ border: '1px solid #D0E8FF' }}>
                    <p className="text-sm font-semibold mb-2 text-center" style={{ color: '#5B8DEF' }}>💧 小便照片</p>
                    {peePreview ? (
                      <div className="relative">
                        <div className="w-full aspect-square rounded-2xl overflow-hidden border-2 border-blue-300">
                          <img src={peePreview} alt="小便预览" className="w-full h-full object-cover" />
                        </div>
                        <button
                          onClick={clearPee}
                          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-400 flex items-center justify-center shadow"
                        >
                          <X size={14} color="white" />
                        </button>
                        <label className="mt-2 block text-center text-xs text-blue-400 cursor-pointer">
                          重新选择
                          <input type="file" accept="image/*" onChange={handlePeeSelect} className="hidden" />
                        </label>
                      </div>
                    ) : (
                      <label className="w-full aspect-square rounded-2xl border-2 border-dashed border-blue-300 flex flex-col items-center justify-center cursor-pointer hover:bg-blue-50 transition-colors">
                        <Camera size={28} color="#5B8DEF" />
                        <span className="text-blue-400 text-xs mt-2">点击上传</span>
                        <input type="file" accept="image/*" onChange={handlePeeSelect} className="hidden" />
                      </label>
                    )}
                  </div>
                </div>

                {/* 提示文字 */}
                <p className="text-xs text-center" style={{ color: '#AAA' }}>
                  至少上传一张照片即可开始分析，两张照片可获得更全面的健康评估
                </p>

                {/* 开始分析按钮 */}
                {!analyzed && (
                  <button
                    onClick={handleAnalyze}
                    disabled={!hasAnyImage || analyzing}
                    className="w-full py-4 rounded-3xl font-bold text-white flex items-center justify-center gap-2 transition-all active:scale-[0.97]"
                    style={{
                      background: hasAnyImage ? 'linear-gradient(135deg, #5B8DEF, #7EC8E3)' : '#C0D8F0',
                      boxShadow: hasAnyImage ? '0 6px 20px rgba(91,141,239,0.3)' : 'none',
                      opacity: analyzing ? 0.7 : 1,
                    }}
                  >
                    {analyzing ? (
                      <>
                        <div
                          className="w-5 h-5 rounded-full"
                          style={{
                            border: '2px solid rgba(255,255,255,0.4)',
                            borderTop: '2px solid white',
                            animation: 'spin 1s linear infinite',
                          }}
                        />
                        AI 分析中...
                      </>
                    ) : (
                      <>
                        🔬 开始分析
                        {poopImage && peeImage && ' (大便+小便)'}
                        {poopImage && !peeImage && ' (大便)'}
                        {!poopImage && peeImage && ' (小便)'}
                      </>
                    )}
                  </button>
                )}

                {/* Analysis result — 纯 CSS 淡入，不用 AnimatePresence */}
                {analyzed && analysisResult && (
                  <div
                    className="bg-white rounded-3xl p-4"
                    style={{
                      border: '1px solid #D0E8FF',
                      animation: 'fadeIn 0.3s ease-out',
                    }}
                  >
                    {/* 标题行 */}
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle size={20} color="#64D4A8" />
                      <p className="font-bold" style={{ color: '#333', fontSize: '15px' }}>AI分析报告</p>
                      <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-medium" style={{
                        background: analysisResult.status === '正常' ? '#E8FFF4' : analysisResult.status === '异常' ? '#FFE8E8' : '#FFF3E8',
                        color: analysisResult.status === '正常' ? '#34C78A' : analysisResult.status === '异常' ? '#FF5A5A' : '#FF8C00',
                      }}>
                        {analysisResult.status === '正常' ? '✅ 正常' : analysisResult.status === '异常' ? '🔴 异常' : '⚠️ 注意'}
                      </span>
                    </div>

                    {/* 描述卡片 */}
                    {analysisResult.description && (
                      <div className="mb-3 p-3 rounded-2xl" style={{ background: '#F5FAFF' }}>
                        <p className="text-xs font-semibold mb-1" style={{ color: '#5B8DEF' }}>📋 观察描述</p>
                        <p className="text-xs leading-relaxed" style={{ color: '#555' }}>
                          {analysisResult.description}
                        </p>
                      </div>
                    )}

                    {/* 三维度评分 */}
                    <p className="text-xs font-semibold mb-2" style={{ color: '#888' }}>健康指标评分</p>
                    {Object.entries(analysisResult.scores || {}).map(([label, score]: [string, any]) => {
                      const meta = getDimensionMeta(label, score);
                      return (
                        <div key={label} className="mb-3">
                          <div className="flex justify-between mb-1 items-center">
                            <span className="text-xs flex items-center gap-1" style={{ color: '#444' }}>
                              <span>{meta.icon}</span>
                              <span style={{ fontWeight: 600 }}>{label}</span>
                              <span style={{ color: '#BBB', fontSize: 10 }}>· {meta.hint}</span>
                            </span>
                            <span className="text-xs font-bold ml-2 flex-shrink-0" style={{ color: meta.color }}>{score}分</span>
                          </div>
                          <ScoreBar score={score} color={meta.color} />
                        </div>
                      );
                    })}

                    {/* 健康建议 — 逐条展示 */}
                    <div className="mt-4 rounded-2xl overflow-hidden" style={{ border: '1px solid #D0F0E4' }}>
                      <div className="px-3 py-2" style={{ background: '#34C78A' }}>
                        <p className="text-xs font-bold text-white">💬 健康建议</p>
                      </div>
                      <div className="p-3 flex flex-col gap-2" style={{ background: '#F0FFF8' }}>
                        {parseSuggestionItems(analysisResult.suggestion).map((item, idx) => (
                          <div key={idx} className="flex gap-2">
                            <span
                              className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-white font-bold"
                              style={{ background: '#34C78A', fontSize: 11, marginTop: 1 }}
                            >
                              {idx + 1}
                            </span>
                            <p className="text-xs leading-relaxed flex-1" style={{ color: '#444' }}>
                              {/* 去掉开头的 "1. " "1、" 等编号前缀 */}
                              {item.replace(/^\d+[.、]\s*/, '')}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      className="mt-4 w-full py-2.5 rounded-2xl text-sm font-medium"
                      style={{ background: '#5B8DEF', color: 'white' }}
                      onClick={resetAll}
                    >
                      再次上传
                    </button>
                  </div>
                )}
              </>
            ) : (
              /* History */
              <div className="flex flex-col gap-3">
                {viewingRecord ? (
                  <div
                    className="bg-white rounded-3xl p-4"
                    style={{
                      border: '1px solid #D0E8FF',
                      animation: 'fadeIn 0.2s ease-out',
                    }}
                  >
                    <button
                      className="text-xs font-medium mb-3 flex items-center gap-1"
                      style={{ color: '#5B8DEF' }}
                      onClick={() => setViewingRecord(null)}
                    >
                      ← 返回列表
                    </button>

                    <div className="flex items-center gap-2 mb-4">
                      <CheckCircle size={20} color={viewingRecord.color} />
                      <p className="font-bold" style={{ color: '#333', fontSize: '15px' }}>
                        {viewingRecord.type} 分析报告
                      </p>
                      <span className="ml-auto text-xs px-2 py-0.5 rounded-full" style={{
                        background: viewingRecord.status === '正常' ? '#E8FFF4' : '#FFF3E8',
                        color: viewingRecord.color,
                      }}>
                        {viewingRecord.emoji} {viewingRecord.status}
                      </span>
                    </div>

                    {viewingRecord.analysis?.description && (
                      <div className="mb-3 p-3 rounded-2xl" style={{ background: '#F5FAFF' }}>
                        <p className="text-xs font-semibold mb-1" style={{ color: '#5B8DEF' }}>📝 详细描述</p>
                        <p className="text-xs leading-relaxed" style={{ color: '#666' }}>
                          {viewingRecord.analysis.description}
                        </p>
                      </div>
                    )}

                    {viewingRecord.analysis?.scores && (
                      <>
                        <p className="text-xs font-semibold mb-2" style={{ color: '#888' }}>健康指标评分</p>
                        {Object.entries(viewingRecord.analysis.scores).map(([label, score]: [string, any]) => {
                          const meta = getDimensionMeta(label, score);
                          return (
                            <div key={label} className="mb-3">
                              <div className="flex justify-between mb-1 items-center">
                                <span className="text-xs flex items-center gap-1" style={{ color: '#444' }}>
                                  <span>{meta.icon}</span>
                                  <span style={{ fontWeight: 600 }}>{label}</span>
                                </span>
                                <span className="text-xs font-bold ml-2" style={{ color: meta.color }}>{score}分</span>
                              </div>
                              <ScoreBar score={score} color={meta.color} />
                            </div>
                          );
                        })}
                      </>
                    )}

                    {/* 健康建议 — 逐条展示 */}
                    <div className="mt-4 rounded-2xl overflow-hidden" style={{ border: '1px solid #D0F0E4' }}>
                      <div className="px-3 py-2" style={{ background: '#34C78A' }}>
                        <p className="text-xs font-bold text-white">💬 健康建议</p>
                      </div>
                      <div className="p-3 flex flex-col gap-2" style={{ background: '#F0FFF8' }}>
                        {parseSuggestionItems(viewingRecord.analysis?.suggestion || '').length > 0
                          ? parseSuggestionItems(viewingRecord.analysis?.suggestion || '').map((item, idx) => (
                              <div key={idx} className="flex gap-2">
                                <span
                                  className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-white font-bold"
                                  style={{ background: '#34C78A', fontSize: 11, marginTop: 1 }}
                                >
                                  {idx + 1}
                                </span>
                                <p className="text-xs leading-relaxed flex-1" style={{ color: '#444' }}>
                                  {item.replace(/^\d+[.、]\s*/, '')}
                                </p>
                              </div>
                            ))
                          : <p className="text-xs" style={{ color: '#888' }}>暂无建议</p>
                        }
                      </div>
                    </div>

                    <p className="text-xs text-center mt-3" style={{ color: '#BBB' }}>
                      {viewingRecord.date}
                    </p>
                  </div>
                ) : (
                  <>
                    {records.length === 0 ? (
                      <div className="text-center py-8 text-gray-400">
                        暂无历史记录
                      </div>
                    ) : (
                      records.map((r, i) => (
                        <div
                          key={`${r.date}-${r.type}-${i}`}
                          className="bg-white rounded-2xl p-4 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-transform"
                          style={{
                            border: '1px solid #E0EEFF',
                            animation: `fadeIn 0.25s ease-out ${i * 0.06}s both`,
                          }}
                          onClick={() => setViewingRecord(r)}
                        >
                          <div
                            className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg flex-shrink-0"
                            style={{ background: r.type === '大便' ? '#F0FFF4' : r.type === '小便' ? '#EEF6FF' : '#FFF8F0' }}
                          >
                            {r.type === '大便' ? '💩' : r.type === '小便' ? '💧' : '🔬'}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-sm font-medium" style={{ color: '#333' }}>{r.type}</span>
                              <span
                                className="px-2 py-0.5 rounded-full text-xs"
                                style={{ background: `${r.color}22`, color: r.color }}
                              >
                                {r.emoji} {r.status}
                              </span>
                            </div>
                            <p className="text-xs" style={{ color: '#888' }}>{r.desc}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <div className="flex items-center gap-1" style={{ color: '#BBB' }}>
                              <Clock size={11} />
                              <span style={{ fontSize: '10px' }}>{r.date}</span>
                            </div>
                            <span className="text-xs" style={{ color: '#5B8DEF' }}>查看详情 →</span>
                          </div>
                        </div>
                      ))
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </AutoRecoverBoundary>
      </div>
    </MiniAppShell>
  );
}
