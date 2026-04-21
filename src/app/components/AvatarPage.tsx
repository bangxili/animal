import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MiniAppShell } from './MiniAppShell';
import { NoPetBlock } from './NoPetGuard';
import { apiGeneratePetAvatar, apiGenerateIdPhoto, apiListPetsByUser, apiUpdatePetProfile } from '../lib/backendApi';
import { getPetProfileById, savePetProfile } from '../lib/petProfileDb';
import { useRequireAuth } from '../lib/useRequireAuth';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

function photoUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${API_BASE}${path.startsWith('/') ? path : '/' + path}`;
}

function isAiAvatar(path: string | null | undefined): boolean {
  if (!path) return false;
  return path.includes('avatars');
}

// ── 证件照历史记录（存 localStorage） ─────────────────────────────
interface IdPhotoHistoryItem {
  url: string;
  style: 'headshot' | 'grid9';
  createdAt: string; // ISO string
}

const STYLE_LABEL: Record<string, string> = { headshot: '美式Headshot', grid9: '白底9宫格' };

function loadIdHistory(petId: string): IdPhotoHistoryItem[] {
  try {
    return JSON.parse(localStorage.getItem(`id-photo-history-${petId}`) || '[]');
  } catch { return []; }
}

function saveIdHistory(petId: string, item: IdPhotoHistoryItem) {
  const list = loadIdHistory(petId);
  // 最多保留 20 条，最新在前
  const updated = [item, ...list].slice(0, 20);
  localStorage.setItem(`id-photo-history-${petId}`, JSON.stringify(updated));
}

const TABS = [
  { id: 'cartoon', label: 'Q版形象' },
  { id: 'id', label: '证件照' },
];

const STYLES = [
  {
    id: 'headshot' as const,
    label: '美式 Headshot',
    desc: '专业校园风，柔和渐变背景',
    icon: '🎓',
    bg: 'linear-gradient(135deg, #2D3561, #4B5E8A)',
    textColor: 'white',
  },
  {
    id: 'grid9' as const,
    label: '白底9宫格',
    desc: '9种表情证件照，白底排列',
    icon: '🔲',
    bg: 'linear-gradient(135deg, #F8F4FF, #EDE0FF)',
    textColor: '#6B4FA0',
  },
];

export function AvatarPage() {
  useRequireAuth();

  const userId = localStorage.getItem('current-user-id') || '';
  const backendPetId = localStorage.getItem('current-backend-pet-id') || '';
  const localPetId = localStorage.getItem('current-pet-id') || '';

  const [petName, setPetName] = useState('');
  const [activeTab, setActiveTab] = useState('cartoon');

  // ── Q版形象状态 ──────────────────────────────
  const [existingAvatar, setExistingAvatar] = useState<string | null>(null);
  const [showRegenerate, setShowRegenerate] = useState(false);
  const [cartoonGenerating, setCartoonGenerating] = useState(false);
  const [cartoonResult, setCartoonResult] = useState<string | null>(null);
  const [cartoonError, setCartoonError] = useState('');
  const [cartoonSaved, setCartoonSaved] = useState(false);

  // ── 证件照状态 ──────────────────────────────
  const [idPhoto, setIdPhoto] = useState<File | null>(null);
  const [idPhotoPreview, setIdPhotoPreview] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<'headshot' | 'grid9'>('headshot');
  const [idGenerating, setIdGenerating] = useState(false);
  const [idResult, setIdResult] = useState<string | null>(null);
  const [idError, setIdError] = useState('');
  const [idSaved, setIdSaved] = useState(false);
  const [idHistory, setIdHistory] = useState<IdPhotoHistoryItem[]>([]);
  const [showIdHistory, setShowIdHistory] = useState(false);
  const [historySelected, setHistorySelected] = useState<IdPhotoHistoryItem | null>(null);
  const [historySaved, setHistorySaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!userId || !backendPetId) return;
    apiListPetsByUser(userId).then((pets) => {
      const pet = pets.find((p) => String(p.id) === backendPetId);
      if (pet) {
        setPetName(pet.name);
        if (pet.avatarUrl && isAiAvatar(pet.avatarUrl)) {
          setExistingAvatar(pet.avatarUrl);
        }
      }
    }).catch(() => {});
    // 加载证件照历史
    setIdHistory(loadIdHistory(backendPetId));
  }, [userId, backendPetId]);

  const handleSetAvatar = async (url: string, setSaved: (v: boolean) => void) => {
    const cache = localStorage.getItem('current-pet-cache');
    if (cache) {
      try {
        const parsed = JSON.parse(cache);
        parsed.avatarUrl = url;
        localStorage.setItem('current-pet-cache', JSON.stringify(parsed));
      } catch { /* ignore */ }
    }
    if (localPetId) {
      try {
        const profile = await getPetProfileById(localPetId);
        if (profile) await savePetProfile({ ...profile, avatarUrl: url });
      } catch { /* ignore */ }
    }
    if (backendPetId) {
      try {
        await apiUpdatePetProfile(backendPetId, { avatar_url: url } as any);
      } catch { /* ignore */ }
    }
    setSaved(true);
  };

  const handleDownload = async (url: string, filename: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      window.open(url, '_blank');
    }
  };

  // ── Q版生成 ──────────────────────────────────
  const handleCartoonGenerate = async () => {
    if (!backendPetId) return;
    setCartoonGenerating(true);
    setCartoonError('');
    setCartoonResult(null);
    setCartoonSaved(false);
    try {
      const updated = await apiGeneratePetAvatar(backendPetId);
      const url = updated.avatarUrl ? photoUrl(updated.avatarUrl) : null;
      setCartoonResult(url);
      setExistingAvatar(url);
      setShowRegenerate(false);
    } catch (e: any) {
      setCartoonError(e.message || '生成失败，请稍后重试');
    } finally {
      setCartoonGenerating(false);
    }
  };

  // ── 证件照生成 ────────────────────────────────
  const handleIdPhotoSelect = (file: File) => {
    setIdPhoto(file);
    setIdPhotoPreview(URL.createObjectURL(file));
    setIdResult(null);
    setIdError('');
    setIdSaved(false);
  };

  const handleIdGenerate = async () => {
    if (!backendPetId || !idPhoto) return;
    setIdGenerating(true);
    setIdError('');
    setIdResult(null);
    setIdSaved(false);
    try {
      const data = await apiGenerateIdPhoto(backendPetId, selectedStyle, idPhoto);
      const url = photoUrl(data.url);
      setIdResult(url);
      // 保存到历史
      const item: IdPhotoHistoryItem = { url, style: selectedStyle, createdAt: new Date().toISOString() };
      saveIdHistory(backendPetId, item);
      setIdHistory(loadIdHistory(backendPetId));
    } catch (e: any) {
      setIdError(e.message || '生成失败，请稍后重试');
    } finally {
      setIdGenerating(false);
    }
  };

  if (!backendPetId) return <NoPetBlock pageName="宠物AI形象" />;

  // ── 公共 Tab 栏 ──────────────────────────────
  const TabBar = () => (
    <div className="px-5 pt-4 pb-2">
      <div className="flex gap-1 p-1 rounded-2xl" style={{ background: 'rgba(161,140,209,0.12)' }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: activeTab === tab.id ? 'white' : 'transparent',
              color: activeTab === tab.id ? '#A18CD1' : '#B0A0C8',
              boxShadow: activeTab === tab.id ? '0 2px 8px rgba(161,140,209,0.18)' : 'none',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );

  const pageBg = 'linear-gradient(180deg, #FBF0FF 0%, #FFF5FF 100%)';

  return (
    <MiniAppShell title="宠物AI形象" showBack bgColor="bg-[#FBF0FF]" titleColor="text-[#A18CD1]">
      <div className="flex-1 flex flex-col overflow-y-auto" style={{ background: pageBg }}>
        <TabBar />

        {/* ══════════ Q版形象 Tab ══════════ */}
        {activeTab === 'cartoon' && (
          <>
            {/* 有历史形象 且 未触发重新生成 且 未在生成中 且 无新结果 → 展示历史 */}
            {existingAvatar && !showRegenerate && !cartoonGenerating && !cartoonResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex-1 flex flex-col items-center px-5 pt-6 pb-10 gap-5"
              >
                <div className="text-center">
                  <p className="font-bold text-lg" style={{ color: '#6B4FA0' }}>
                    {petName} 的 Q 版形象
                  </p>
                  <p className="text-sm mt-1" style={{ color: '#B0A0C8' }}>来看看吧 ✨</p>
                </div>
                <div className="rounded-3xl overflow-hidden shadow-xl" style={{ width: 240, height: 240 }}>
                  <img src={existingAvatar} alt="Q版形象" className="w-full h-full object-cover" />
                </div>
                {cartoonSaved && (
                  <div className="w-full px-4 py-3 rounded-2xl text-sm flex items-center gap-2"
                    style={{ background: '#F0FFF4', color: '#38A169' }}>
                    <span>✅</span><span>已设为首页头像</span>
                  </div>
                )}
                <div className="w-full flex flex-col gap-3">
                  <button
                    onClick={() => handleDownload(existingAvatar, `${petName}_Q版形象.jpg`)}
                    className="w-full py-3.5 rounded-3xl font-bold text-white text-sm"
                    style={{ background: 'linear-gradient(135deg, #A18CD1, #FBC2EB)', boxShadow: '0 6px 18px rgba(161,140,209,0.35)' }}
                  >
                    ⬇️ 保存到相册
                  </button>
                  <button
                    onClick={() => handleSetAvatar(existingAvatar, setCartoonSaved)}
                    disabled={cartoonSaved}
                    className="w-full py-3.5 rounded-3xl font-semibold text-sm"
                    style={{
                      background: cartoonSaved ? '#F5F5F5' : 'white',
                      color: cartoonSaved ? '#AAA' : '#A18CD1',
                      border: `1.5px solid ${cartoonSaved ? '#EEE' : '#D4C4F0'}`,
                    }}
                  >
                    {cartoonSaved ? '已设为头像 ✓' : '设为首页头像'}
                  </button>
                  <button
                    onClick={() => setShowRegenerate(true)}
                    className="w-full py-3 rounded-3xl text-sm"
                    style={{ color: '#C0B0D8' }}
                  >
                    重新生成
                  </button>
                </div>
              </motion.div>
            )}

            {/* 无历史 或 触发重新生成 → 生成界面 */}
            {(!existingAvatar || showRegenerate) && (
              <div className="flex-1 flex flex-col px-5 pb-8">
                <AnimatePresence mode="wait">
                  {!cartoonGenerating && !cartoonResult && (
                    <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="flex-1 flex flex-col items-center justify-center gap-6 py-12">
                      <div className="w-32 h-32 rounded-full flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, #EDE0FF, #FFE0F5)' }}>
                        <span style={{ fontSize: 60 }}>🎨</span>
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-base" style={{ color: '#6B4FA0' }}>
                          {showRegenerate ? '重新生成 Q 版形象' : `${petName} 的专属 Q 版形象`}
                        </p>
                        <p className="text-sm mt-1" style={{ color: '#B0A0C8' }}>基于档案照片，AI 一键生成</p>
                      </div>
                      {cartoonError && (
                        <div className="w-full px-4 py-3 rounded-2xl text-sm flex items-center gap-2"
                          style={{ background: '#FFF0F3', color: '#FF4D6A' }}>
                          <span>⚠️</span><span>{cartoonError}</span>
                        </div>
                      )}
                      <div className="w-full flex flex-col gap-3">
                        <button onClick={handleCartoonGenerate}
                          className="w-full py-4 rounded-3xl font-bold text-white text-base"
                          style={{ background: 'linear-gradient(135deg, #A18CD1, #FBC2EB)', boxShadow: '0 8px 24px rgba(161,140,209,0.4)' }}>
                          ✨ 立即生成
                        </button>
                        {showRegenerate && (
                          <button onClick={() => setShowRegenerate(false)}
                            className="w-full py-3 rounded-3xl text-sm" style={{ color: '#C0B0D8' }}>
                            返回查看当前形象
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {cartoonGenerating && (
                    <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="flex-1 flex flex-col items-center justify-center gap-5 py-12">
                      <div className="relative w-28 h-28">
                        <div className="absolute inset-0 rounded-full"
                          style={{ background: 'linear-gradient(135deg, #EDE0FF, #FFE0F5)', animation: 'pulse 1.5s ease-in-out infinite' }} />
                        <div className="absolute inset-2 rounded-full border-4"
                          style={{ borderColor: 'transparent', borderTopColor: '#A18CD1', animation: 'spin 1s linear infinite' }} />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span style={{ fontSize: 40 }}>🎨</span>
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="font-bold" style={{ color: '#6B4FA0' }}>AI 正在绘制中…</p>
                        <p className="text-sm mt-1" style={{ color: '#B0A0C8' }}>大约需要 20–60 秒，请稍候</p>
                      </div>
                    </motion.div>
                  )}

                  {!cartoonGenerating && cartoonResult && (
                    <motion.div key="result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                      className="flex-1 flex flex-col items-center gap-5 pt-6 pb-8">
                      <p className="font-bold text-base" style={{ color: '#6B4FA0' }}>🎉 生成成功！</p>
                      <div className="rounded-3xl overflow-hidden shadow-xl" style={{ width: 240, height: 240 }}>
                        <img src={cartoonResult} alt="Q版形象" className="w-full h-full object-cover" />
                      </div>
                      {cartoonSaved && (
                        <div className="w-full px-4 py-3 rounded-2xl text-sm flex items-center gap-2"
                          style={{ background: '#F0FFF4', color: '#38A169' }}>
                          <span>✅</span><span>已设为首页头像</span>
                        </div>
                      )}
                      <div className="w-full flex flex-col gap-3">
                        <button onClick={() => handleDownload(cartoonResult, `${petName}_Q版形象.jpg`)}
                          className="w-full py-3.5 rounded-3xl font-bold text-white text-sm"
                          style={{ background: 'linear-gradient(135deg, #A18CD1, #FBC2EB)', boxShadow: '0 6px 18px rgba(161,140,209,0.35)' }}>
                          ⬇️ 保存到相册
                        </button>
                        <button onClick={() => handleSetAvatar(cartoonResult, setCartoonSaved)} disabled={cartoonSaved}
                          className="w-full py-3.5 rounded-3xl font-semibold text-sm"
                          style={{
                            background: cartoonSaved ? '#F5F5F5' : 'white',
                            color: cartoonSaved ? '#AAA' : '#A18CD1',
                            border: `1.5px solid ${cartoonSaved ? '#EEE' : '#D4C4F0'}`,
                          }}>
                          {cartoonSaved ? '已设为头像 ✓' : '设为首页头像'}
                        </button>
                        <button onClick={() => { setCartoonResult(null); setCartoonSaved(false); setCartoonError(''); }}
                          className="w-full py-3 rounded-3xl text-sm" style={{ color: '#C0B0D8' }}>
                          重新生成
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </>
        )}

        {/* ══════════ 证件照 Tab ══════════ */}
        {activeTab === 'id' && (
          <div className="flex-1 flex flex-col px-5 pb-8">
            <AnimatePresence mode="wait">
              {/* 初始 / 选图 / 选风格 */}
              {!idGenerating && !idResult && (
                <motion.div key="id-setup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex flex-col gap-4 pt-4">

                  {/* 上传区 */}
                  <div>
                    <p className="text-sm font-semibold mb-2" style={{ color: '#6B4FA0' }}>上传宠物正面照</p>
                    <p className="text-xs mb-3" style={{ color: '#B0A0C8' }}>提示：用正面照效果更好哦 📸</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleIdPhotoSelect(f); }}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full rounded-3xl overflow-hidden flex items-center justify-center"
                      style={{
                        height: 180,
                        border: `2px dashed ${idPhotoPreview ? '#A18CD1' : '#D4C4F0'}`,
                        background: idPhotoPreview ? 'transparent' : '#FBF4FF',
                      }}
                    >
                      {idPhotoPreview ? (
                        <img src={idPhotoPreview} alt="预览" className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <span style={{ fontSize: 40 }}>📷</span>
                          <span className="text-sm" style={{ color: '#B0A0C8' }}>点击选择照片</span>
                        </div>
                      )}
                    </button>
                    {idPhotoPreview && (
                      <button onClick={() => fileInputRef.current?.click()}
                        className="w-full text-center text-xs mt-2" style={{ color: '#A18CD1' }}>
                        重新选择
                      </button>
                    )}
                  </div>

                  {/* 风格选择 */}
                  <div>
                    <p className="text-sm font-semibold mb-3" style={{ color: '#6B4FA0' }}>选择风格</p>
                    <div className="flex flex-col gap-3">
                      {STYLES.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => setSelectedStyle(s.id)}
                          className="w-full rounded-3xl p-4 flex items-center gap-4 text-left transition-all"
                          style={{
                            background: selectedStyle === s.id ? s.bg : '#F8F4FF',
                            border: `2px solid ${selectedStyle === s.id ? 'transparent' : '#E8DCFF'}`,
                            boxShadow: selectedStyle === s.id ? '0 4px 16px rgba(161,140,209,0.3)' : 'none',
                          }}
                        >
                          <span style={{ fontSize: 36 }}>{s.icon}</span>
                          <div className="flex-1">
                            <p className="font-bold text-sm"
                              style={{ color: selectedStyle === s.id ? s.textColor : '#6B4FA0' }}>
                              {s.label}
                            </p>
                            <p className="text-xs mt-0.5"
                              style={{ color: selectedStyle === s.id ? (s.id === 'headshot' ? 'rgba(255,255,255,0.75)' : '#B0A0C8') : '#B0A0C8' }}>
                              {s.desc}
                            </p>
                          </div>
                          <div
                            className="w-5 h-5 rounded-full border-2 flex items-center justify-center"
                            style={{ borderColor: selectedStyle === s.id ? 'white' : '#D4C4F0' }}
                          >
                            {selectedStyle === s.id && (
                              <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'white' }} />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {idError && (
                    <div className="px-4 py-3 rounded-2xl text-sm flex items-center gap-2"
                      style={{ background: '#FFF0F3', color: '#FF4D6A' }}>
                      <span>⚠️</span><span>{idError}</span>
                    </div>
                  )}

                  <button
                    onClick={handleIdGenerate}
                    disabled={!idPhoto}
                    className="w-full py-4 rounded-3xl font-bold text-white text-base mt-2"
                    style={{
                      background: idPhoto
                        ? 'linear-gradient(135deg, #A18CD1, #FBC2EB)'
                        : 'linear-gradient(135deg, #D4C4F0, #F0D8F8)',
                      boxShadow: idPhoto ? '0 8px 24px rgba(161,140,209,0.4)' : 'none',
                    }}
                  >
                    ✨ 生成证件照
                  </button>

                  {/* 历史记录入口 — 始终显示 */}
                  <button
                    onClick={() => setShowIdHistory(true)}
                    className="w-full py-2.5 rounded-3xl text-sm flex items-center justify-center gap-1.5"
                    style={{ color: '#A18CD1', background: 'rgba(161,140,209,0.08)' }}
                  >
                    <span>🕐</span>
                    <span>历史生成{idHistory.length > 0 ? `（${idHistory.length}条）` : ''}</span>
                  </button>
                </motion.div>
              )}

              {/* 生成中 */}
              {idGenerating && (
                <motion.div key="id-loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex-1 flex flex-col items-center justify-center gap-5 py-16">
                  <div className="relative w-28 h-28">
                    <div className="absolute inset-0 rounded-full"
                      style={{ background: 'linear-gradient(135deg, #EDE0FF, #FFE0F5)', animation: 'pulse 1.5s ease-in-out infinite' }} />
                    <div className="absolute inset-2 rounded-full border-4"
                      style={{ borderColor: 'transparent', borderTopColor: '#A18CD1', animation: 'spin 1s linear infinite' }} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span style={{ fontSize: 40 }}>📷</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="font-bold" style={{ color: '#6B4FA0' }}>AI 正在生成中…</p>
                    <p className="text-sm mt-1" style={{ color: '#B0A0C8' }}>
                      {selectedStyle === 'grid9' ? '9宫格生成较慢，约 30–90 秒' : '大约需要 20–60 秒'}，请稍候
                    </p>
                  </div>
                </motion.div>
              )}

              {/* 结果 */}
              {!idGenerating && idResult && (
                <motion.div key="id-result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center gap-5 pt-4 pb-8">
                  <p className="font-bold text-base" style={{ color: '#6B4FA0' }}>🎉 证件照生成成功！</p>
                  <div
                    className="rounded-3xl overflow-hidden shadow-xl w-full"
                    style={{ maxHeight: 400 }}
                  >
                    <img src={idResult} alt="证件照" className="w-full object-contain" />
                  </div>
                  {idSaved && (
                    <div className="w-full px-4 py-3 rounded-2xl text-sm flex items-center gap-2"
                      style={{ background: '#F0FFF4', color: '#38A169' }}>
                      <span>✅</span><span>已设为首页头像</span>
                    </div>
                  )}
                  <div className="w-full flex flex-col gap-3">
                    <button
                      onClick={() => handleDownload(idResult, `${petName}_证件照.jpg`)}
                      className="w-full py-3.5 rounded-3xl font-bold text-white text-sm"
                      style={{ background: 'linear-gradient(135deg, #A18CD1, #FBC2EB)', boxShadow: '0 6px 18px rgba(161,140,209,0.35)' }}
                    >
                      ⬇️ 保存到相册
                    </button>
                    <button
                      onClick={() => handleSetAvatar(idResult, setIdSaved)}
                      disabled={idSaved}
                      className="w-full py-3.5 rounded-3xl font-semibold text-sm"
                      style={{
                        background: idSaved ? '#F5F5F5' : 'white',
                        color: idSaved ? '#AAA' : '#A18CD1',
                        border: `1.5px solid ${idSaved ? '#EEE' : '#D4C4F0'}`,
                      }}
                    >
                      {idSaved ? '已设为头像 ✓' : '设为首页头像'}
                    </button>
                    <button
                      onClick={() => { setIdResult(null); setIdSaved(false); setIdError(''); }}
                      className="w-full py-3 rounded-3xl text-sm" style={{ color: '#C0B0D8' }}
                    >
                      重新生成
                    </button>
                    {idHistory.length > 1 && (
                      <button
                        onClick={() => setShowIdHistory(true)}
                        className="w-full py-2 rounded-3xl text-sm flex items-center justify-center gap-1.5"
                        style={{ color: '#A18CD1', background: 'rgba(161,140,209,0.08)' }}
                      >
                        <span>🕐</span>
                        <span>历史生成（{idHistory.length}条）</span>
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ══════════ 历史记录底部弹层 ══════════ */}
      <AnimatePresence>
        {showIdHistory && (
          <>
            {/* 遮罩 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-40"
              style={{ background: 'rgba(0,0,0,0.35)' }}
              onClick={() => { setShowIdHistory(false); setHistorySelected(null); setHistorySaved(false); }}
            />
            {/* 弹层 */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'tween', duration: 0.28 }}
              className="absolute bottom-0 left-0 right-0 z-50 rounded-t-3xl overflow-hidden flex flex-col"
              style={{ background: 'white', maxHeight: '80%' }}
            >
              {/* 弹层头部 */}
              <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: '#F0E8FF' }}>
                <span className="font-bold" style={{ color: '#6B4FA0', fontSize: 16 }}>历史生成记录</span>
                <button
                  onClick={() => { setShowIdHistory(false); setHistorySelected(null); setHistorySaved(false); }}
                  className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: '#F5F0FF', color: '#A18CD1', fontSize: 16 }}
                >
                  ×
                </button>
              </div>

              {/* 选中图片大图 */}
              <AnimatePresence mode="wait">
                {historySelected && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="px-5 pt-4 flex flex-col items-center gap-3"
                  >
                    <div className="rounded-2xl overflow-hidden shadow-md w-full" style={{ maxHeight: 260 }}>
                      <img src={historySelected.url} alt="历史证件照" className="w-full object-contain" />
                    </div>
                    <div className="flex gap-2 w-full">
                      <button
                        onClick={() => handleDownload(historySelected.url, `${petName}_证件照.jpg`)}
                        className="flex-1 py-2.5 rounded-2xl text-sm font-bold text-white"
                        style={{ background: 'linear-gradient(135deg, #A18CD1, #FBC2EB)' }}
                      >
                        ⬇️ 保存
                      </button>
                      <button
                        onClick={async () => { await handleSetAvatar(historySelected.url, setHistorySaved); }}
                        disabled={historySaved}
                        className="flex-1 py-2.5 rounded-2xl text-sm font-semibold"
                        style={{
                          background: historySaved ? '#F5F5F5' : 'white',
                          color: historySaved ? '#AAA' : '#A18CD1',
                          border: `1.5px solid ${historySaved ? '#EEE' : '#D4C4F0'}`,
                        }}
                      >
                        {historySaved ? '已设为头像 ✓' : '设为头像'}
                      </button>
                    </div>
                    <div className="w-full pb-1 border-b" style={{ borderColor: '#F0E8FF' }} />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* 历史列表 */}
              <div className="overflow-y-auto flex-1 px-4 py-3">
                {idHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <span style={{ fontSize: 40 }}>📭</span>
                    <p className="text-sm" style={{ color: '#B0A0C8' }}>还没有生成过证件照哦</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {idHistory.map((item, i) => {
                    const isSelected = historySelected?.url === item.url;
                    const d = new Date(item.createdAt);
                    const label = `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                    return (
                      <button
                        key={i}
                        onClick={() => {
                          setHistorySelected(isSelected ? null : item);
                          setHistorySaved(false);
                        }}
                        className="flex flex-col rounded-2xl overflow-hidden text-left"
                        style={{
                          border: `2px solid ${isSelected ? '#A18CD1' : 'transparent'}`,
                          boxShadow: isSelected ? '0 0 0 2px rgba(161,140,209,0.3)' : '0 2px 8px rgba(0,0,0,0.08)',
                        }}
                      >
                        <div className="w-full bg-gray-100" style={{ aspectRatio: '1/1' }}>
                          <img src={item.url} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div className="px-2 py-1.5" style={{ background: isSelected ? '#F5EEFF' : '#FAFAFA' }}>
                          <p className="text-xs font-semibold" style={{ color: isSelected ? '#A18CD1' : '#555' }}>
                            {STYLE_LABEL[item.style]}
                          </p>
                          <p className="text-xs" style={{ color: '#AAA' }}>{label}</p>
                        </div>
                      </button>
                    );
                  })}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </MiniAppShell>
  );
}
