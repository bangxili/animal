import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Heart, X, MessageCircle, Filter, Star, Check, Camera, Pencil } from 'lucide-react';
import { NoPetBlock, hasPetProfile } from './NoPetGuard';
import { MiniAppShell } from './MiniAppShell';
import { PetHeartMatch } from './PetCartoonIcons';
import { getPetProfileById, getLatestPetProfileByUser, type PetProfileRecord } from '../lib/petProfileDb';
import {
  apiGetSocialProfile,
  apiSaveSocialProfile,
  apiUploadSocialPhoto,
  apiDeleteSocialPhoto,
  apiGetPetPhotoUrls,
  apiListPetsByUser,
  type ApiSocialProfile,
} from '../lib/backendApi';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

interface Pet {
  id: number;
  name: string;
  breed: string;
  age: string;
  gender: string;
  distance: string;
  emoji: string;
  tags: string[];
  desc: string;
  color: string;
}

const pets: Pet[] = [
  {
    id: 1,
    name: '豆豆',
    breed: '金毛寻回犬',
    age: '1岁半',
    gender: '♀ 女生',
    distance: '0.8km',
    emoji: '🐶',
    tags: ['活泼好动', '喜欢玩水', '已绝育'],
    desc: '我是超级可爱的豆豆！喜欢和小伙伴们一起玩耍，性格超好，欢迎来找我~',
    color: '#FFB347',
  },
  {
    id: 2,
    name: '橘子',
    breed: '英国短毛猫',
    age: '2岁',
    gender: '♂ 男生',
    distance: '1.2km',
    emoji: '🐱',
    tags: ['温柔安静', '擅长撒娇', '已接种疫苗'],
    desc: '名字叫橘子，性格温顺，喜欢晒太阳和梳毛。养了2年，健康证明完整。',
    color: '#FF9A5C',
  },
  {
    id: 3,
    name: '小花',
    breed: '柴犬',
    age: '3岁',
    gender: '♀ 女生',
    distance: '2.1km',
    emoji: '🐕',
    tags: ['独立性强', '聪明伶俐', '会才艺'],
    desc: '柴柴小花，会坐立握手翻滚，性格独立但超级可爱！喜欢户外活动。',
    color: '#E8934A',
  },
  {
    id: 4,
    name: '奶茶',
    breed: '布偶猫',
    age: '1岁',
    gender: '♀ 女生',
    distance: '3.0km',
    emoji: '🐈',
    tags: ['超级温顺', '爱抱抱', '室内猫'],
    desc: '奶茶宝宝，布偶中的颜值担当！性格粘人，超爱抱抱，是你理想的配对对象吗？',
    color: '#C4A0DC',
  },
];

// 标签分类
const TAG_GROUPS = [
  {
    label: '🧠 性格',
    tags: ['活泼好动', '温柔安静', '独立性强', '亲人粘人', '聪明伶俐', '慵懒悠闲', '胆大探险', '胆小内敛'],
  },
  {
    label: '🩺 健康',
    tags: ['疫苗已接种', '已绝育', '已驱虫', '定期体检', '体重达标', '无遗传病'],
  },
  {
    label: '🐾 血统',
    tags: ['纯血统', '混血萌宠', '有血统证书'],
  },
  {
    label: '✨ 颜值',
    tags: ['颜值爆表', '毛色漂亮', '眼睛迷人', '体型匀称', '萌态十足'],
  },
];

function simplifyBreed(breed: string): string {
  const m = breed.match(/^([^(（+]+)/);
  return m ? m[1].trim() : breed;
}

function genderLabel(g: string): string {
  if (g === '男' || g === 'male' || g === '♂') return '♂ 男生';
  if (g === '女' || g === 'female' || g === '♀') return '♀ 女生';
  return g;
}

// ─── Profile Card (view mode) ─────────────────────────────────────────────────
function ProfileCard({
  petRecord,
  socialProfile,
  allPhotos,
  onEdit,
}: {
  petRecord: PetProfileRecord | null;
  socialProfile: ApiSocialProfile | null;
  allPhotos: Array<{ url: string; type: 'pet' | 'social' }>;
  onEdit: () => void;
}) {
  const [photoIdx, setPhotoIdx] = useState(0);

  const name = petRecord?.name || '我的宠物';
  const breed = simplifyBreed(petRecord?.breed || '');
  const age = petRecord ? `${petRecord.age}${petRecord.ageUnit}` : '';
  const gender = genderLabel(petRecord?.gender || '');
  const weight = petRecord?.weight ? `${petRecord.weight}kg` : '';
  const bio = socialProfile?.bio || '';
  const tags = socialProfile?.tags || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-4"
    >
      {/* Main card */}
      <div
        className="rounded-3xl overflow-hidden shadow-lg"
        style={{ background: 'white', border: '1px solid #FFE0EE' }}
      >
        {/* Photo area */}
        <div className="relative" style={{ height: '260px', background: 'linear-gradient(135deg, #FF6B9D22, #FF80CC11)' }}>
          {allPhotos.length > 0 ? (
            <>
              <img
                src={allPhotos[photoIdx % allPhotos.length].url}
                alt=""
                className="w-full h-full object-cover"
              />
              {/* Photo dots */}
              {allPhotos.length > 1 && (
                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                  {allPhotos.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setPhotoIdx(i)}
                      className="rounded-full transition-all"
                      style={{
                        width: i === photoIdx % allPhotos.length ? '16px' : '6px',
                        height: '6px',
                        background: i === photoIdx % allPhotos.length ? 'white' : 'rgba(255,255,255,0.5)',
                      }}
                    />
                  ))}
                </div>
              )}
              {/* Tap areas for prev/next */}
              <button
                className="absolute inset-y-0 left-0 w-1/2"
                onClick={() => setPhotoIdx((p) => (p - 1 + allPhotos.length) % allPhotos.length)}
              />
              <button
                className="absolute inset-y-0 right-0 w-1/2"
                onClick={() => setPhotoIdx((p) => (p + 1) % allPhotos.length)}
              />
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 2.5, repeat: Infinity }}
                style={{ fontSize: '80px' }}
              >
                🐾
              </motion.div>
            </div>
          )}

          {/* Edit button */}
          <button
            onClick={onEdit}
            className="absolute top-3 right-3 flex items-center gap-1 px-3 py-1.5 rounded-full"
            style={{ background: 'rgba(255,255,255,0.9)', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
          >
            <Pencil size={12} color="#FF6B9D" />
            <span style={{ fontSize: '12px', color: '#FF6B9D', fontWeight: 600 }}>编辑</span>
          </button>

          {/* Tags overlay */}
          {tags.length > 0 && (
            <div className="absolute bottom-3 left-3 right-8 flex gap-1.5 flex-wrap">
              {tags.slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded-full text-white"
                  style={{ background: 'rgba(255,107,157,0.85)', fontSize: '10px' }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="font-bold" style={{ color: '#333', fontSize: '20px' }}>{name}</span>
              {age && <span style={{ fontSize: '13px', color: '#888' }}>{age}</span>}
            </div>
            {gender && (
              <span
                className="px-2 py-0.5 rounded-full text-xs font-medium"
                style={{
                  background: gender.includes('♀') ? '#FFF0F7' : '#EEF4FF',
                  color: gender.includes('♀') ? '#FF6B9D' : '#5B8DEF',
                }}
              >
                {gender}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mb-2">
            {breed && <span style={{ fontSize: '12px', color: '#AAA' }}>{breed}</span>}
            {weight && (
              <>
                <span style={{ color: '#EEE' }}>·</span>
                <span style={{ fontSize: '12px', color: '#AAA' }}>{weight}</span>
              </>
            )}
          </div>
          {bio ? (
            <p className="text-xs leading-relaxed" style={{ color: '#666' }}>{bio}</p>
          ) : (
            <p className="text-xs" style={{ color: '#CCC' }}>还没有自我介绍，点击编辑添加~</p>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div
        className="rounded-2xl p-4 flex justify-around"
        style={{ background: 'white', border: '1px solid #FFE0EE' }}
      >
        {[
          { label: '照片', value: allPhotos.length },
          { label: '标签', value: tags.length },
          { label: '被喜欢', value: 8 },
        ].map((s) => (
          <div key={s.label} className="text-center">
            <p className="font-bold" style={{ color: '#FF6B9D', fontSize: '20px' }}>{s.value}</p>
            <p style={{ fontSize: '11px', color: '#AAA' }}>{s.label}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Profile Editor ───────────────────────────────────────────────────────────
function ProfileEditor({
  petRecord,
  petPhotoUrls,
  socialProfile,
  allPhotos,
  userId,
  petId,
  onSaved,
  onCancel,
}: {
  petRecord: PetProfileRecord | null;
  petPhotoUrls: { frontPhotoUrl: string | null; sidePhotoUrl: string | null } | null;
  socialProfile: ApiSocialProfile | null;
  allPhotos: Array<{ url: string; type: 'pet' | 'social'; index?: number }>;
  userId: string;
  petId: string;
  onSaved: (profile: ApiSocialProfile) => void;
  onCancel: () => void;
}) {
  const [bio, setBio] = useState(socialProfile?.bio || '');
  const [selectedTags, setSelectedTags] = useState<string[]>(socialProfile?.tags || []);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [localPhotos, setLocalPhotos] = useState(allPhotos);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const name = petRecord?.name || '我的宠物';
  const breed = simplifyBreed(petRecord?.breed || '');
  const age = petRecord ? `${petRecord.age}${petRecord.ageUnit}` : '';
  const gender = genderLabel(petRecord?.gender || '');
  const weight = petRecord?.weight ? `${petRecord.weight}kg` : '';
  const petType = petRecord?.petType || '';

  const handleUploadPhoto = async (file: File) => {
    setUploadingPhoto(true);
    try {
      const updated = await apiUploadSocialPhoto(userId, petId, file);
      // rebuild photos
      const base: Array<{ url: string; type: 'pet' | 'social'; index?: number }> = [];
      if (petPhotoUrls?.frontPhotoUrl) base.push({ url: petPhotoUrls.frontPhotoUrl, type: 'pet' });
      if (petPhotoUrls?.sidePhotoUrl) base.push({ url: petPhotoUrls.sidePhotoUrl, type: 'pet' });
      (updated.photo_paths || []).forEach((p, i) => {
        const url = p.startsWith('http') ? p : `${API_BASE}${p}`;
        base.push({ url, type: 'social', index: i });
      });
      setLocalPhotos(base);
    } catch (e) {
      console.error(e);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleDeletePhoto = async (index: number) => {
    try {
      const updated = await apiDeleteSocialPhoto(userId, petId, index);
      const base: Array<{ url: string; type: 'pet' | 'social'; index?: number }> = [];
      if (petPhotoUrls?.frontPhotoUrl) base.push({ url: petPhotoUrls.frontPhotoUrl, type: 'pet' });
      if (petPhotoUrls?.sidePhotoUrl) base.push({ url: petPhotoUrls.sidePhotoUrl, type: 'pet' });
      (updated.photo_paths || []).forEach((p, i) => {
        const url = p.startsWith('http') ? p : `${API_BASE}${p}`;
        base.push({ url, type: 'social', index: i });
      });
      setLocalPhotos(base);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await apiSaveSocialProfile(userId, petId, { bio, tags: selectedTags });
      onSaved(updated);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-4"
    >
      {/* Photo wall */}
      <div className="bg-white rounded-3xl p-4" style={{ border: '1px solid #FFE0EE' }}>
        <p className="font-semibold mb-3" style={{ color: '#333', fontSize: '14px' }}>📸 照片墙</p>
        <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {localPhotos.map((photo, i) => (
            <div key={i} className="relative rounded-2xl overflow-hidden" style={{ aspectRatio: '1' }}>
              <img src={photo.url} alt="" className="w-full h-full object-cover" />
              {photo.type === 'pet' && (
                <div
                  className="absolute bottom-0 left-0 right-0 flex items-center justify-center py-0.5"
                  style={{ background: 'rgba(0,0,0,0.35)' }}
                >
                  <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.85)' }}>档案照</span>
                </div>
              )}
              {photo.type === 'social' && photo.index !== undefined && (
                <button
                  onClick={() => handleDeletePhoto(photo.index!)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(0,0,0,0.55)' }}
                >
                  <X size={10} color="white" />
                </button>
              )}
            </div>
          ))}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingPhoto}
            className="rounded-2xl flex flex-col items-center justify-center gap-1"
            style={{ aspectRatio: '1', background: '#FFF0F7', border: '2px dashed #FFB0D0' }}
          >
            {uploadingPhoto ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-5 h-5 rounded-full border-2"
                style={{ borderColor: '#FF6B9D', borderTopColor: 'transparent' }}
              />
            ) : (
              <>
                <Camera size={18} color="#FF9DBB" />
                <span style={{ fontSize: '10px', color: '#FF9DBB' }}>添加</span>
              </>
            )}
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUploadPhoto(file);
            e.target.value = '';
          }}
        />
      </div>

      {/* Pet info (read-only from profile) */}
      <div className="bg-white rounded-3xl p-4" style={{ border: '1px solid #FFE0EE' }}>
        <p className="font-semibold mb-3" style={{ color: '#333', fontSize: '14px' }}>🐾 宠物信息 <span style={{ fontSize: '11px', color: '#CCC', fontWeight: 400 }}>（同步自档案）</span></p>
        <div className="grid gap-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
          {[
            { label: '名字', value: name },
            { label: '品种', value: breed || '未设置' },
            { label: '年龄', value: age || '未设置' },
            { label: '性别', value: gender || '未设置' },
            { label: '体重', value: weight || '未设置' },
            { label: '类型', value: petType || '未设置' },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl px-3 py-2" style={{ background: '#FFF5FA' }}>
              <p style={{ fontSize: '10px', color: '#FF9DBB' }}>{item.label}</p>
              <p className="font-semibold" style={{ color: '#333', fontSize: '13px' }}>{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Bio */}
      <div className="bg-white rounded-3xl p-4" style={{ border: '1px solid #FFE0EE' }}>
        <p className="font-semibold mb-3" style={{ color: '#333', fontSize: '14px' }}>✏️ 自我介绍</p>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="介绍一下你的宠物吧，比如性格、爱好..."
          rows={3}
          className="w-full resize-none rounded-2xl px-3 py-2 outline-none"
          style={{
            background: '#FFF5FA',
            border: '1px solid #FFE0EE',
            color: '#333',
            fontSize: '13px',
          }}
        />
      </div>

      {/* Tags */}
      <div className="bg-white rounded-3xl p-4" style={{ border: '1px solid #FFE0EE' }}>
        <p className="font-semibold mb-3" style={{ color: '#333', fontSize: '14px' }}>🏷️ 我的标签</p>
        <div className="flex flex-col gap-3">
          {TAG_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="mb-2" style={{ fontSize: '12px', color: '#AAA' }}>{group.label}</p>
              <div className="flex flex-wrap gap-2">
                {group.tags.map((tag) => {
                  const active = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() =>
                        setSelectedTags((prev) =>
                          active ? prev.filter((t) => t !== tag) : [...prev, tag]
                        )
                      }
                      className="px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1"
                      style={{
                        background: active ? 'linear-gradient(135deg, #FF6B9D, #FF80CC)' : '#FFF0F7',
                        color: active ? 'white' : '#FF9DBB',
                        border: active ? 'none' : '1px solid #FFD0E8',
                      }}
                    >
                      {active && <Check size={10} />}
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Save / Cancel buttons */}
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 py-3 rounded-2xl text-sm font-medium"
          style={{ background: 'white', color: '#AAA', border: '1px solid #FFE0EE' }}
        >
          取消
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 py-3 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg, #FF6B9D, #FF80CC)', boxShadow: '0 4px 16px rgba(255,107,157,0.35)' }}
        >
          {saving ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-4 h-4 rounded-full border-2 border-white"
              style={{ borderTopColor: 'transparent' }}
            />
          ) : (
            <><Check size={15} /> 保存</>
          )}
        </button>
      </div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function MatchPage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likedPets, setLikedPets] = useState<number[]>([]);
  const [showMatch, setShowMatch] = useState(false);
  const [matchedPet, setMatchedPet] = useState<Pet | null>(null);
  const [swipeDir, setSwipeDir] = useState<'left' | 'right' | null>(null);
  const [activeView, setActiveView] = useState<'cards' | 'list' | 'profile'>('cards');
  const [editingProfile, setEditingProfile] = useState(false);

  // profile data
  const [petRecord, setPetRecord] = useState<PetProfileRecord | null>(null);
  const [socialProfile, setSocialProfile] = useState<ApiSocialProfile | null>(null);
  const [petPhotoUrls, setPetPhotoUrls] = useState<{ frontPhotoUrl: string | null; sidePhotoUrl: string | null } | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [backendPetId, setBackendPetId] = useState('');

  const userId = useMemo(() => localStorage.getItem('current-user-id') || 'demo-user', []);

  useEffect(() => {
    if (activeView !== 'profile') return;
    setProfileLoading(true);
    // 用 current-pet-id 精准取对应的 IndexedDB 记录，fallback 到最新
    const currentPetId = localStorage.getItem('current-pet-id') || '';
    const loadPetRecord = currentPetId
      ? getPetProfileById(currentPetId).then((r) => r ?? getLatestPetProfileByUser(userId))
      : getLatestPetProfileByUser(userId);
    // 后端数字 id 优先从专用 key 取，避免和 IndexedDB UUID 混用
    const storedBpid = localStorage.getItem('current-backend-pet-id') || '';
    const loadBpid: Promise<string> = storedBpid
      ? Promise.resolve(storedBpid)
      : apiListPetsByUser(userId).then((list) => list[0]?.id || '').catch(() => '');

    loadBpid.then((bpid) => {
      if (bpid) {
        localStorage.setItem('current-backend-pet-id', bpid);
        setBackendPetId(bpid);
      }
      const loadSocial = bpid ? apiGetSocialProfile(userId, bpid) : Promise.resolve(null);
      const loadPhotos = bpid ? apiGetPetPhotoUrls(bpid) : Promise.resolve({ frontPhotoUrl: null, sidePhotoUrl: null });
      Promise.all([loadPetRecord, loadSocial, loadPhotos])
        .then(([rec, social, urls]) => {
          setPetRecord(rec);
          setSocialProfile(social);
          setPetPhotoUrls(urls);
        })
        .catch(console.error)
        .finally(() => setProfileLoading(false));
    });
  }, [activeView, userId]);

  const allPhotos = useMemo(() => {
    const photos: Array<{ url: string; type: 'pet' | 'social'; index?: number }> = [];
    if (petPhotoUrls?.frontPhotoUrl) photos.push({ url: petPhotoUrls.frontPhotoUrl, type: 'pet' });
    if (petPhotoUrls?.sidePhotoUrl) photos.push({ url: petPhotoUrls.sidePhotoUrl, type: 'pet' });
    (socialProfile?.photo_paths || []).forEach((p, i) => {
      const url = p.startsWith('http') ? p : `${API_BASE}${p}`;
      photos.push({ url, type: 'social', index: i });
    });
    return photos;
  }, [petPhotoUrls, socialProfile]);

  const currentPet = pets[currentIndex];

  const handleSwipe = (dir: 'left' | 'right') => {
    setSwipeDir(dir);
    if (dir === 'right') {
      setLikedPets((prev) => [...prev, currentPet.id]);
      if (Math.random() > 0.5) {
        setTimeout(() => {
          setMatchedPet(currentPet);
          setShowMatch(true);
        }, 500);
      }
    }
    setTimeout(() => {
      setSwipeDir(null);
      setCurrentIndex((prev) => (prev + 1) % pets.length);
    }, 400);
  };

  const tabs = [
    { id: 'cards', label: '💕 滑动配对' },
    { id: 'list', label: '📋 附近毛友' },
    { id: 'profile', label: '🐾 我的主页' },
  ];

  return (
    <MiniAppShell title="宠物交友配对" showBack bgColor="bg-[#FFF0F5]" titleColor="text-[#FF6B9D]">
      {!hasPetProfile() ? (
        <NoPetBlock pageName="宠物交友配对" />
      ) : (
      <div className="flex-1 flex flex-col overflow-hidden relative" style={{ background: '#FFF5FA' }}>
        {/* Header */}
        <div
          className="px-5 py-4 flex items-center gap-4"
          style={{ background: 'linear-gradient(135deg, #FF6B9D, #FF80CC)', borderRadius: '0 0 24px 24px' }}
        >
          <PetHeartMatch size={60} />
          <div className="flex-1">
            <p className="text-white font-bold" style={{ fontSize: '16px' }}>毛毛缘分铺💕</p>
            <p className="text-white/80" style={{ fontSize: '12px' }}>基于地点+档案智能推荐</p>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1 px-2 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.25)' }}>
              <MapPin size={12} color="white" />
              <span className="text-white text-xs">上海</span>
            </div>
            <button className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.25)' }}>
              <Filter size={14} color="white" />
            </button>
          </div>
        </div>

        {/* View toggle */}
        <div className="flex mx-4 mt-4 rounded-2xl p-1" style={{ background: '#FFE0EE' }}>
          {tabs.map((v) => (
            <button
              key={v.id}
              onClick={() => { setActiveView(v.id as any); setEditingProfile(false); }}
              className="flex-1 py-2 rounded-xl text-xs font-medium transition-all"
              style={{
                background: activeView === v.id ? 'white' : 'transparent',
                color: activeView === v.id ? '#FF6B9D' : '#FF9DBB',
                boxShadow: activeView === v.id ? '0 2px 8px rgba(255,107,157,0.2)' : 'none',
              }}
            >
              {v.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-6">
          {activeView === 'cards' ? (
            <div className="flex flex-col items-center gap-4">
              {/* Card stack */}
              <div className="relative w-full" style={{ height: '320px' }}>
                {pets[(currentIndex + 1) % pets.length] && (
                  <div
                    className="absolute inset-0 rounded-3xl"
                    style={{
                      background: 'white',
                      border: '1px solid #FFE0EE',
                      transform: 'scale(0.95) translateY(8px)',
                      opacity: 0.7,
                    }}
                  />
                )}
                <AnimatePresence>
                  {currentPet && (
                    <motion.div
                      key={currentPet.id}
                      className="absolute inset-0 rounded-3xl overflow-hidden shadow-lg flex flex-col"
                      style={{ background: 'white', border: '1px solid #FFE0EE' }}
                      animate={
                        swipeDir === 'right'
                          ? { x: 400, rotate: 20, opacity: 0 }
                          : swipeDir === 'left'
                          ? { x: -400, rotate: -20, opacity: 0 }
                          : { x: 0, rotate: 0, opacity: 1 }
                      }
                      transition={{ duration: 0.35 }}
                    >
                      <div
                        className="relative flex-1 flex flex-col items-center justify-center"
                        style={{ background: `linear-gradient(135deg, ${currentPet.color}33, ${currentPet.color}11)` }}
                      >
                        <div
                          className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full"
                          style={{ background: 'white', border: '1px solid #FFE0EE' }}
                        >
                          <MapPin size={10} color="#FF6B9D" />
                          <span style={{ fontSize: '11px', color: '#FF6B9D' }}>{currentPet.distance}</span>
                        </div>
                        {swipeDir === 'right' && (
                          <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(100,212,168,0.15)' }}>
                            <div className="px-4 py-2 rounded-2xl rotate-[-20deg]" style={{ border: '3px solid #64D4A8' }}>
                              <span className="font-bold text-lg" style={{ color: '#64D4A8' }}>喜欢 💚</span>
                            </div>
                          </div>
                        )}
                        {swipeDir === 'left' && (
                          <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(255,107,107,0.1)' }}>
                            <div className="px-4 py-2 rounded-2xl rotate-[20deg]" style={{ border: '3px solid #FF7070' }}>
                              <span className="font-bold text-lg" style={{ color: '#FF7070' }}>跳过 ❌</span>
                            </div>
                          </div>
                        )}
                        <motion.div
                          animate={{ y: [0, -8, 0] }}
                          transition={{ duration: 2.5, repeat: Infinity }}
                          style={{ fontSize: '80px' }}
                        >
                          {currentPet.emoji}
                        </motion.div>
                        <div className="absolute bottom-3 left-3 right-3 flex gap-1.5 flex-wrap">
                          {currentPet.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 rounded-full text-xs text-white"
                              style={{ background: `${currentPet.color}CC`, fontSize: '10px' }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-1">
                          <div>
                            <span className="font-bold" style={{ color: '#333', fontSize: '18px' }}>{currentPet.name}</span>
                            <span className="ml-2 text-sm" style={{ color: '#888' }}>{currentPet.age}</span>
                          </div>
                          <span
                            className="px-2 py-0.5 rounded-full text-xs"
                            style={{
                              background: currentPet.gender.includes('♀') ? '#FFF0F7' : '#EEF4FF',
                              color: currentPet.gender.includes('♀') ? '#FF6B9D' : '#5B8DEF',
                            }}
                          >
                            {currentPet.gender}
                          </span>
                        </div>
                        <p style={{ fontSize: '12px', color: '#888' }}>{currentPet.breed}</p>
                        <p className="mt-2 text-xs leading-relaxed" style={{ color: '#666' }}>{currentPet.desc}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-6 mt-2">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleSwipe('left')}
                  className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
                  style={{ background: 'white', border: '2px solid #FFE0E0' }}
                >
                  <X size={24} color="#FF7070" />
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  className="w-10 h-10 rounded-full flex items-center justify-center shadow-md"
                  style={{ background: 'white', border: '2px solid #FFE0EE' }}
                >
                  <Star size={18} color="#FFB347" />
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleSwipe('right')}
                  className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
                  style={{
                    background: 'linear-gradient(135deg, #FF6B9D, #FF80CC)',
                    boxShadow: '0 6px 20px rgba(255,107,157,0.4)',
                  }}
                >
                  <Heart size={24} color="white" fill="white" />
                </motion.button>
              </div>

              {/* Stats */}
              <div className="flex gap-4 mt-1">
                <div className="text-center">
                  <p className="font-bold" style={{ color: '#FF6B9D', fontSize: '18px' }}>{likedPets.length}</p>
                  <p style={{ fontSize: '11px', color: '#AAA' }}>已喜欢</p>
                </div>
                <div className="w-px" style={{ background: '#F0E0EE' }} />
                <div className="text-center">
                  <p className="font-bold" style={{ color: '#64D4A8', fontSize: '18px' }}>3</p>
                  <p style={{ fontSize: '11px', color: '#AAA' }}>互相喜欢</p>
                </div>
                <div className="w-px" style={{ background: '#F0E0EE' }} />
                <div className="text-center">
                  <p className="font-bold" style={{ color: '#5B8DEF', fontSize: '18px' }}>12</p>
                  <p style={{ fontSize: '11px', color: '#AAA' }}>附近毛友</p>
                </div>
              </div>
            </div>
          ) : activeView === 'list' ? (
            <div className="flex flex-col gap-3">
              {pets.map((pet, i) => (
                <motion.div
                  key={pet.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="bg-white rounded-3xl p-4 flex items-center gap-3"
                  style={{ border: '1px solid #FFE0EE', boxShadow: '0 2px 12px rgba(255,107,157,0.08)' }}
                >
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${pet.color}22`, border: `2px solid ${pet.color}44` }}
                  >
                    <span style={{ fontSize: '32px' }}>{pet.emoji}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-bold" style={{ color: '#333', fontSize: '15px' }}>{pet.name}</span>
                      <span style={{ fontSize: '11px', color: '#888' }}>{pet.age}</span>
                      {likedPets.includes(pet.id) && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: '#FFE0F0', color: '#FF6B9D' }}>
                          💕 互喜欢
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: '12px', color: '#AAA' }}>{pet.breed}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <MapPin size={10} color="#FF9DBB" />
                      <span style={{ fontSize: '11px', color: '#FF9DBB' }}>{pet.distance}</span>
                      <span className="mx-1" style={{ color: '#EEE' }}>·</span>
                      <span style={{ fontSize: '11px', color: '#AAA' }}>{pet.gender}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <button className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#FFE0F0' }}>
                      <Heart size={15} color="#FF6B9D" />
                    </button>
                    <button className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#EEF4FF' }}>
                      <MessageCircle size={15} color="#5B8DEF" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            /* Profile view */
            profileLoading ? (
              <div className="flex justify-center py-16">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-8 h-8 rounded-full border-2"
                  style={{ borderColor: '#FF6B9D', borderTopColor: 'transparent' }}
                />
              </div>
            ) : editingProfile ? (
              <ProfileEditor
                petRecord={petRecord}
                petPhotoUrls={petPhotoUrls}
                socialProfile={socialProfile}
                allPhotos={allPhotos}
                userId={userId}
                petId={backendPetId}
                onSaved={(updated) => {
                  setSocialProfile(updated);
                  setEditingProfile(false);
                }}
                onCancel={() => setEditingProfile(false)}
              />
            ) : (
              <ProfileCard
                petRecord={petRecord}
                socialProfile={socialProfile}
                allPhotos={allPhotos}
                onEdit={() => setEditingProfile(true)}
              />
            )
          )}
        </div>

        {/* Match overlay */}
        <AnimatePresence>
          {showMatch && matchedPet && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center px-6"
              style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', zIndex: 50 }}
            >
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="bg-white p-6 w-full flex flex-col items-center gap-4"
                style={{ borderRadius: '32px' }}
              >
                <motion.div
                  animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 0.8, repeat: 2 }}
                  style={{ fontSize: '50px' }}
                >
                  💕
                </motion.div>
                <h2 className="font-bold text-center" style={{ color: '#FF6B9D', fontSize: '22px' }}>
                  配对成功！
                </h2>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl" style={{ background: '#FFE0F0' }}>
                    🐶
                  </div>
                  <motion.div
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    style={{ fontSize: '24px' }}
                  >
                    ❤️
                  </motion.div>
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl" style={{ background: '#FFE0F0' }}>
                    {matchedPet.emoji}
                  </div>
                </div>
                <div className="text-center">
                  <p className="font-semibold" style={{ color: '#333' }}>小白 × {matchedPet.name}</p>
                  <p className="text-xs mt-1" style={{ color: '#AAA' }}>你们距离只有 {matchedPet.distance}，快去打个招呼吧！</p>
                </div>
                <div className="flex gap-3 w-full">
                  <button
                    onClick={() => setShowMatch(false)}
                    className="flex-1 py-3 rounded-2xl text-sm font-medium"
                    style={{ background: '#F5F5F5', color: '#888' }}
                  >
                    继续滑动
                  </button>
                  <button
                    className="flex-1 py-3 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2"
                    style={{ background: 'linear-gradient(135deg, #FF6B9D, #FF80CC)' }}
                    onClick={() => setShowMatch(false)}
                  >
                    <MessageCircle size={16} />
                    发消息
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      )}
    </MiniAppShell>
  );
}
