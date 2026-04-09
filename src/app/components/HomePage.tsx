import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Bell, MapPin, Home, Heart, MessageCircle, User } from 'lucide-react';
import { MiniAppShell } from './MiniAppShell';
import type { PetProfileRecord } from '../lib/petProfileDb';
import { getAllPetProfilesByUser } from '../lib/petProfileDb';
import { apiListPetsByUser, apiGetToiletHistory } from '../lib/backendApi';
import {
  BorderCollieDoctor,
  OrangeCatAnalyst,
  HamsterChef,
  RabbitScientist,
  PetHeartMatch,
  PawPrint,
} from './PetCartoonIcons';

const features = [
  {
    id: 'consultation',
    title: '宠物问诊',
    subtitle: 'AI兽医在线',
    path: '/consultation',
    gradient: ['#FF6B9D', '#FF9A5C'],
    icon: BorderCollieDoctor,
    tag: '🔥 热门',
  },
  {
    id: 'toilet',
    title: '每日大小便',
    subtitle: '健康分析',
    path: '/toilet',
    gradient: ['#5B8DEF', '#7EC8E3'],
    icon: OrangeCatAnalyst,
    tag: '📊 日常',
  },
  {
    id: 'recipe',
    title: '每日食谱',
    subtitle: '智能营养',
    path: '/recipe',
    gradient: ['#64D4A8', '#A8E6CF'],
    icon: HamsterChef,
    tag: '🥗 推荐',
  },
  {
    id: 'gene',
    title: '基因检测',
    subtitle: '探索血统',
    path: '/gene',
    gradient: ['#7C5CBF', '#C3A6FF'],
    icon: RabbitScientist,
    tag: '🧬 科技',
  },
  {
    id: 'match',
    title: '宠物交友',
    subtitle: '配对恋爱',
    path: '/match',
    gradient: ['#FF6B9D', '#FF80CC'],
    icon: PetHeartMatch,
    tag: '💕 配对',
  },
];

const defaultHealthTips = [
  '🌟 今天运动了30分钟，状态很棒！',
  '💊 记得给毛孩子做每月定期驱虫哦~',
  '🥩 根据体重合理安排蛋白质摄入~',
  '🌡️ 近期天气变化，注意宠物保暖~',
];

function getPetEmoji(petType: string) {
  if (petType === '狗狗') return '🐶';
  if (petType === '猫猫') return '🐱';
  if (petType === '仓鼠') return '🐹';
  if (petType === '兔子') return '🐰';
  if (petType === '鸟类') return '🐦';
  return '🐾';
}

const tabItems = [
  { id: 'home', label: '首页', icon: Home },
  { id: 'health', label: '健康', icon: Heart },
  { id: 'chat', label: '消息', icon: MessageCircle },
  { id: 'profile', label: '我的', icon: User },
];

export function HomePage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('home');
  const [tipIndex, setTipIndex] = useState(0);
  const [pets, setPets] = useState<PetProfileRecord[]>([]);
  const [currentPetId, setCurrentPetId] = useState<string | null>(localStorage.getItem('current-pet-id'));
  const [backendPetId, setBackendPetId] = useState<string>(localStorage.getItem('current-backend-pet-id') || '');
  const [showPetDropdown, setShowPetDropdown] = useState(false);
  const [toiletRecords, setToiletRecords] = useState<any[]>([]);
  const featuredFeature = features[4];
  const FeaturedIcon = featuredFeature.icon;

  const profile = useMemo(
    () => pets.find((p) => p.id === currentPetId) || pets[0] || null,
    [pets, currentPetId],
  );

  const petName = profile?.name || '毛毛';
  const ownerName = `${petName}主人`;
  const petGenderLabel = profile?.gender === 'male' ? '♂' : profile?.gender === 'female' ? '♀' : '';
  const petGenderColor = profile?.gender === 'male' ? '#5B8DEF' : profile?.gender === 'female' ? '#FF6B9D' : 'rgba(255,255,255,0.5)';
  const petBreed = (() => {
    if (!profile?.breed) return '未设置品种';
    const match = profile.breed.match(/^([^(（+]+)/);
    return match ? match[1].trim() : profile.breed;
  })();
  const petSummary = `${profile?.age || '-'}${profile?.ageUnit || ''} · ${profile?.weight || '-'}kg · ${profile?.length || '-'}cm`;
  const petEmoji = profile?.petType ? getPetEmoji(profile.petType) : '🐶';

  // 根据大小便记录推算健康状态
  const latestToiletStatus = useMemo(() => {
    if (toiletRecords.length === 0) return null;
    const latest = toiletRecords[0]; // 已按时间倒序
    return latest?.analysis_result?.status || null;
  }, [toiletRecords]);

  const petStatus = useMemo(() => {
    if (latestToiletStatus === '异常') return '异常';
    if (latestToiletStatus === '注意') return '注意';
    if (latestToiletStatus === '正常') return '健康';
    if (profile && profile.weight && profile.length && profile.age) return '健康';
    return '待完善';
  }, [latestToiletStatus, profile]);

  const petStatusColor = petStatus === '健康' ? '#64D4A8' : petStatus === '注意' ? '#FFB347' : petStatus === '异常' ? '#FF6B6B' : '#CCC';

  const healthTips = useMemo(
    () => defaultHealthTips.map((tip) => tip.replace('今天', `${petName}今天`)),
    [petName],
  );

  useEffect(() => {
    const userId = localStorage.getItem('current-user-id') || 'demo-user';
    // IndexedDB 负责展示数据（name/weight/breed/length 完整）
    getAllPetProfilesByUser(userId).then((list) => {
      if (list.length === 0) return;
      setPets(list);
      const storedPetId = localStorage.getItem('current-pet-id');
      if (storedPetId && list.some((p) => p.id === storedPetId)) {
        setCurrentPetId(storedPetId);
      } else {
        localStorage.setItem('current-pet-id', list[0].id);
        setCurrentPetId(list[0].id);
      }
    });
    // 后端负责提供数字 id，存入独立的 key，不干扰展示
    apiListPetsByUser(userId).then((backendList) => {
      if (backendList.length === 0) return;
      localStorage.setItem('current-backend-pet-id', backendList[0].id);
      setBackendPetId(backendList[0].id);
    }).catch(() => {});
  }, []);

  // 加载大小便历史记录
  useEffect(() => {
    if (!backendPetId) return;
    const userId = localStorage.getItem('current-user-id') || 'demo-user';
    apiGetToiletHistory(userId, backendPetId).then(setToiletRecords).catch(() => {});
  }, [backendPetId]);

  // 从大小便记录中提取最新消化健康评分
  const latestToiletScores = useMemo(() => {
    if (toiletRecords.length === 0) return null;
    return toiletRecords[0]?.analysis_result?.scores || null;
  }, [toiletRecords]);

  const healthItems = [
    {
      label: '体重',
      value: profile?.weight ? `${profile.weight}kg` : '-',
      status: profile?.weight ? (parseFloat(profile.weight) <= 20 ? '正常' : '偏重') : '待完善',
      color: '#64D4A8',
      emoji: '⚖️',
    },
    {
      label: '消化',
      value: latestToiletScores ? `${latestToiletScores['消化健康'] || '-'}分` : '-',
      status: latestToiletStatus || '待检测',
      color: latestToiletStatus === '正常' ? '#64D4A8' : latestToiletStatus === '注意' ? '#FFB347' : latestToiletStatus === '异常' ? '#FF6B6B' : '#5B8DEF',
      emoji: '🩺',
    },
    {
      label: '水分',
      value: latestToiletScores ? `${latestToiletScores['水分摄入'] || '-'}分` : '-',
      status: latestToiletScores?.['水分摄入'] >= 70 ? '正常' : latestToiletScores ? '偏低' : '待检测',
      color: latestToiletScores?.['水分摄入'] >= 70 ? '#5B8DEF' : latestToiletScores ? '#FFB347' : '#5B8DEF',
      emoji: '💧',
    },
  ];

  return (
    <MiniAppShell>
      <div
        className="flex-1 flex flex-col overflow-hidden"
        style={{ background: '#FFF5F8' }}
      >
        {/* Header */}
        <div
          className="px-5 pt-2 pb-5 relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #FF6B9D 0%, #FF9A5C 100%)',
            borderRadius: '0 0 28px 28px',
          }}
        >
          {/* Decorative paws */}
          {[{ x: '75%', y: '10%', size: 22, opacity: 0.15 }, { x: '88%', y: '55%', size: 16, opacity: 0.12 }].map((p, i) => (
            <div key={i} className="absolute" style={{ left: p.x, top: p.y, opacity: p.opacity }}>
              <PawPrint size={p.size} color="white" />
            </div>
          ))}

          {/* Top row */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-white/80" style={{ fontSize: '12px' }}>早上好 🌸</p>
              <p className="text-white font-bold" style={{ fontSize: '18px' }}>{ownerName}</p>
              <div className="relative" style={{ zIndex: 20 }}>
                <button
                  onClick={() => setShowPetDropdown(!showPetDropdown)}
                  className="mt-2 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
                  style={{ background: 'rgba(255,255,255,0.18)', color: 'white' }}
                >
                  {profile?.avatarUrl ? (
                    <img src={profile.avatarUrl} alt="" className="w-4 h-4 rounded-full object-cover" />
                  ) : (
                    <span>{petEmoji}</span>
                  )}
                  <span>{petName}</span>
                  <span style={{ opacity: 0.85 }}>▼</span>
                </button>
                {showPetDropdown && (
                  <div
                    className="absolute left-0 mt-2 w-56 rounded-2xl shadow-lg overflow-hidden"
                    style={{ background: 'white', border: '1.5px solid #FFD0E8' }}
                  >
                    {pets.length === 0 ? (
                      <div className="px-3 py-3 text-xs" style={{ color: '#AAA' }}>暂无宠物档案</div>
                    ) : (
                      pets.map((p) => {
                        const active = p.id === (currentPetId || pets[0]?.id);
                        return (
                          <button
                            key={p.id}
                            onClick={() => {
                              localStorage.setItem('current-pet-id', p.id);
                              setCurrentPetId(p.id);
                              setShowPetDropdown(false);
                              // 切换宠物时同步更新后端 id（按名字+品种匹配）
                              const userId2 = localStorage.getItem('current-user-id') || 'demo-user';
                              apiListPetsByUser(userId2).then((bl) => {
                                const match = bl.find((b) => b.name === p.name && b.breed === p.breed) || bl[0];
                                if (match) {
                                  localStorage.setItem('current-backend-pet-id', match.id);
                                  setBackendPetId(match.id);
                                }
                              }).catch(() => {});
                            }}
                            className="w-full px-3 py-2 text-left text-xs transition-colors"
                            style={{
                              background: active ? '#FFE0F0' : 'white',
                              color: active ? '#FF6B9D' : '#444',
                            }}
                          >
                            <div className="flex items-center gap-2">
                              {p.avatarUrl ? (
                                <img src={p.avatarUrl} alt="" className="w-5 h-5 rounded-full object-cover" />
                              ) : (
                                <span>{getPetEmoji(p.petType)}</span>
                              )}
                              <span className="font-semibold">{p.name}</span>
                            </div>
                          </button>
                        );
                      })
                    )}
                    <div className="px-3 py-2" style={{ borderTop: '1.5px solid #FFE0EE' }}>
                      <button
                        onClick={() => {
                          setShowPetDropdown(false);
                          navigate('/setup');
                        }}
                        className="w-full text-xs font-semibold py-2 rounded-xl"
                        style={{ background: '#FF6B9D', color: 'white' }}
                      >
                        新建宠物档案
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
                <Bell size={18} color="white" />
              </button>
              <button className="w-9 h-9 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.3)', border: '2px solid white' }}>
                {profile?.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span style={{ fontSize: '20px' }}>{petEmoji}</span>
                )}
              </button>
            </div>
          </div>

          {/* Pet card */}
          <div
            className="rounded-3xl p-4 flex items-center gap-4"
            style={{ background: 'rgba(255,255,255,0.22)', backdropFilter: 'blur(10px)' }}
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.3)' }}
            >
              {profile?.avatarUrl ? (
                <img src={profile.avatarUrl} alt={petName} className="w-full h-full object-cover" />
              ) : (
                <span style={{ fontSize: '36px' }}>{petEmoji}</span>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1 flex-nowrap" style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}>
                <span className="text-white font-bold flex-shrink-0" style={{ fontSize: '16px' }}>{petName}</span>
                <span className="px-2 py-0.5 rounded-full text-xs text-white flex-shrink-0" style={{ background: petGenderColor }}>{petGenderLabel}</span>
                <span className="px-2 py-0.5 rounded-full text-xs text-white" style={{ background: 'rgba(255,255,255,0.25)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{petBreed}</span>
              </div>
              <p className="text-white/80" style={{ fontSize: '12px' }}>{petSummary}</p>
              <div className="flex items-center gap-1 mt-1">
                <MapPin size={11} color="rgba(255,255,255,0.7)" />
                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px' }}>上海市 · 静安区</span>
              </div>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: petStatusColor }}>
                <span style={{ fontSize: '18px' }}>💊</span>
              </div>
              <span className="font-semibold" style={{ fontSize: '10px', color: petStatusColor }}>{petStatus}</span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pb-20">
          {/* Health tip banner */}
          <div className="mx-4 mt-4">
            <motion.div
              className="rounded-2xl px-4 py-3 flex items-center gap-3"
              style={{ background: 'linear-gradient(135deg, #FFE0F0, #FFF0E0)' }}
              onClick={() => setTipIndex((tipIndex + 1) % healthTips.length)}
            >
              <span style={{ fontSize: '20px' }}>💡</span>
              <p className="flex-1 text-xs" style={{ color: '#FF6B9D' }}>{healthTips[tipIndex]}</p>
              <span className="text-xs" style={{ color: '#FFB0C8' }}>→</span>
            </motion.div>
          </div>

          {/* Feature section title */}
          <div className="flex items-center justify-between mx-4 mt-5 mb-3">
            <div className="flex items-center gap-2">
              <PawPrint size={16} color="#FF6B9D" />
              <span className="font-bold" style={{ color: '#333', fontSize: '16px' }}>全部功能</span>
            </div>
            <span className="text-xs" style={{ color: '#FF9DBB' }}>为{petName}定制吧 ✨</span>
          </div>

          {/* Feature Grid */}
          <div className="px-4 grid grid-cols-2 gap-3">
            {features.slice(0, 4).map((feature, index) => (
              <FeatureCard key={feature.id} feature={feature} index={index} navigate={navigate} />
            ))}
          </div>

          {/* Full-width last feature */}
          <div className="px-4 mt-3">
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate(featuredFeature.path)}
              className="w-full rounded-3xl overflow-hidden flex items-center gap-4 px-5 py-4 relative"
              style={{
                background: `linear-gradient(135deg, ${featuredFeature.gradient[0]}, ${featuredFeature.gradient[1]})`,
                boxShadow: `0 6px 20px ${featuredFeature.gradient[0]}55`,
              }}
            >
              <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20">
                <PawPrint size={50} color="white" />
              </div>
              <div className="w-16 h-16 flex-shrink-0">
                <FeaturedIcon size={64} />
              </div>
              <div className="flex-1 text-left">
                <span
                  className="inline-block px-2 py-0.5 rounded-full text-xs text-white mb-1"
                  style={{ background: 'rgba(255,255,255,0.25)' }}
                >
                  {featuredFeature.tag}
                </span>
                <p className="text-white font-bold" style={{ fontSize: '18px' }}>{featuredFeature.title}</p>
                <p className="text-white/80" style={{ fontSize: '12px' }}>{featuredFeature.subtitle}</p>
              </div>
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.25)' }}>
                <span className="text-white" style={{ fontSize: '16px' }}>→</span>
              </div>
            </motion.button>
          </div>

          {/* Health Status Summary */}
          <div className="mx-4 mt-5 mb-2">
            <div className="flex items-center gap-2 mb-3">
              <PawPrint size={16} color="#5B8DEF" />
              <span className="font-bold" style={{ color: '#333', fontSize: '16px' }}>健康状态</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {healthItems.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl p-3 flex flex-col items-center gap-1"
                  style={{ background: 'white', border: '1px solid #FFE0EE' }}
                >
                  <span style={{ fontSize: '20px' }}>{item.emoji}</span>
                  <span className="text-xs font-bold" style={{ color: '#333' }}>{item.value}</span>
                  <span
                    className="px-1.5 py-0.5 rounded-full text-xs"
                    style={{ background: `${item.color}22`, color: item.color }}
                  >
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Tab Bar */}
        <div
          className="absolute bottom-0 left-0 right-0 max-w-[390px] mx-auto"
          style={{
            background: 'white',
            borderTop: '1px solid #FFE0EE',
            paddingBottom: '8px',
          }}
        >
          <div className="flex items-center justify-around pt-2 pb-1">
            {tabItems.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id === 'profile') navigate('/my');
                  if (tab.id === 'health') navigate('/health');
                  if (tab.id === 'chat') navigate('/consultation');
                }}
                className="flex flex-col items-center gap-0.5 px-4 py-1 rounded-2xl transition-all"
              >
                <tab.icon
                  size={22}
                  color={activeTab === tab.id ? '#FF6B9D' : '#CCC'}
                  fill={activeTab === tab.id ? '#FF6B9D' : 'none'}
                />
                <span
                  style={{
                    fontSize: '10px',
                    color: activeTab === tab.id ? '#FF6B9D' : '#CCC',
                    fontWeight: activeTab === tab.id ? 600 : 400,
                  }}
                >
                  {tab.label}
                </span>
                {activeTab === tab.id && (
                  <div className="w-1 h-1 rounded-full" style={{ background: '#FF6B9D' }} />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </MiniAppShell>
  );
}

function FeatureCard({
  feature,
  index,
  navigate,
}: {
  feature: (typeof features)[0];
  index: number;
  navigate: (path: string) => void;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 + 0.1 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => navigate(feature.path)}
      className="rounded-3xl overflow-hidden flex flex-col items-center py-4 px-2 relative"
      style={{
        background: `linear-gradient(145deg, ${feature.gradient[0]}, ${feature.gradient[1]})`,
        boxShadow: `0 6px 16px ${feature.gradient[0]}44`,
        minHeight: '160px',
      }}
    >
      {/* Tag */}
      <span
        className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full text-xs text-white"
        style={{ background: 'rgba(255,255,255,0.25)', fontSize: '10px' }}
      >
        {feature.tag}
      </span>

      {/* Paw watermark */}
      <div className="absolute bottom-2 right-2 opacity-15">
        <PawPrint size={28} color="white" />
      </div>

      {/* Icon */}
      <div className="mt-3">
        <feature.icon size={72} />
      </div>

      {/* Text */}
      <div className="mt-2 text-center">
        <p className="text-white font-bold" style={{ fontSize: '14px' }}>{feature.title}</p>
        <p className="text-white/75" style={{ fontSize: '11px' }}>{feature.subtitle}</p>
      </div>
    </motion.button>
  );
}
