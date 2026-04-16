import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { LogOut, PawPrint, Plus, Trash2, ChevronRight } from 'lucide-react';
import { MiniAppShell } from './MiniAppShell';
import type { PetProfileRecord } from '../lib/petProfileDb';
import { getAllPetProfilesByUser, savePetProfile } from '../lib/petProfileDb';
import { apiListPetsByUser, apiDeletePet } from '../lib/backendApi';

function getPetEmoji(petType: string) {
  if (petType === '狗狗') return '🐶';
  if (petType === '猫猫') return '🐱';
  if (petType === '仓鼠') return '🐹';
  if (petType === '兔子') return '🐰';
  if (petType === '鸟类') return '🐦';
  return '🐾';
}

/** 清除当前登录状态，跳转到登录页 */
function clearAuthAndRedirect(navigate: ReturnType<typeof useNavigate>) {
  localStorage.removeItem('current-user-id');
  localStorage.removeItem('current-username');
  localStorage.removeItem('current-pet-id');
  localStorage.removeItem('current-backend-pet-id');
  localStorage.removeItem('current-pet-cache');
  navigate('/', { replace: true });
}

export function MyPetsPage() {
  const navigate = useNavigate();
  const [pets, setPets] = useState<PetProfileRecord[]>([]);
  const [currentPetId, setCurrentPetId] = useState<string | null>(localStorage.getItem('current-pet-id'));
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const currentUserId = useMemo(() => localStorage.getItem('current-user-id') || 'demo-user', []);
  const currentUsername = useMemo(() => localStorage.getItem('current-username') || '用户', []);

  useEffect(() => {
    // 先查 IndexedDB；如果为空则从后端同步并写入 IndexedDB
    getAllPetProfilesByUser(currentUserId).then(async (list) => {
      let pets = list;
      if (pets.length === 0) {
        // IndexedDB 没有该用户的宠物 → 从后端拉取并同步
        try {
          const backendList = await apiListPetsByUser(currentUserId);
          for (const p of backendList) {
            await savePetProfile({ ...p, userId: currentUserId });
          }
          pets = await getAllPetProfilesByUser(currentUserId);
        } catch {
          // 后端也拉不到，保持空列表
        }
      }
      setPets(pets);
      if (!currentPetId && pets[0]) {
        localStorage.setItem('current-pet-id', pets[0].id);
        setCurrentPetId(pets[0].id);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]);

  const handleSelect = async (pet: PetProfileRecord) => {
    // 设置 IndexedDB UUID/ID 作为 current-pet-id
    localStorage.setItem('current-pet-id', pet.id);
    setCurrentPetId(pet.id);
    // 去后端列表里按名字+品种匹配，拿整数 ID 写入 current-backend-pet-id
    try {
      const backendList = await apiListPetsByUser(currentUserId);
      const match = backendList.find((b) => b.name === pet.name && b.breed === pet.breed)
        || backendList.find((b) => b.name === pet.name)
        || backendList[0];
      if (match) localStorage.setItem('current-backend-pet-id', match.id);
    } catch {
      // 网络失败就用已缓存的 backend id 继续
    }
    navigate('/home');
  };

  const handleDelete = async (petId: string, petName: string) => {
    if (!confirm(`确定要删除宠物「${petName}」吗？删除后所有相关数据（问诊记录、食谱、健康分析等）将无法恢复。`)) return;
    setDeletingId(petId);
    try {
      await apiDeletePet(petId);
      const newList = pets.filter((p) => p.id !== petId);
      setPets(newList);
      if (currentPetId === petId) {
        const next = newList[0]?.id || null;
        if (next) localStorage.setItem('current-pet-id', next);
        else localStorage.removeItem('current-pet-id');
        setCurrentPetId(next);
      }
    } catch {
      alert('删除失败，请重试');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <MiniAppShell
      title="我的"
      showBack={true}
      onBack={() => navigate('/home')}
      bgColor="bg-[#FFF5F8]"
      titleColor="text-[#FF6B9D]"
      rightAction={
        <button
          onClick={() => navigate('/setup')}
          className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold"
          style={{ background: '#FFE0F0', color: '#FF6B9D' }}
        >
          <Plus size={14} />
          新建宠物
        </button>
      }
    >
      <div className="flex-1 overflow-y-auto px-4 pb-24">

        {/* ── 账号信息卡片 ── */}
        <div
          className="mt-4 mb-5 rounded-3xl px-4 py-4"
          style={{ background: 'linear-gradient(135deg, #FF6B9D 0%, #FF9A5C 100%)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xl"
              style={{ background: 'rgba(255,255,255,0.25)', color: 'white' }}
            >
              {currentUsername.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="text-white font-bold" style={{ fontSize: 16 }}>{currentUsername}</p>
              <p className="text-white/70" style={{ fontSize: 12 }}>共 {pets.length} 只毛孩子</p>
            </div>
            <button
              onClick={() => {
                if (!confirm('确定要退出登录吗？')) return;
                clearAuthAndRedirect(navigate);
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-semibold transition-all active:scale-95"
              style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}
            >
              <LogOut size={14} />
              退出登录
            </button>
          </div>
        </div>

        {/* ── 宠物列表 ── */}
        {pets.length === 0 ? (
          <div className="px-4 py-6 rounded-3xl" style={{ background: 'white', border: '1.5px solid #FFD0E8' }}>
            <p className="text-sm font-semibold" style={{ color: '#FF6B9D' }}>还没有宠物档案</p>
            <p className="text-xs" style={{ color: '#AAA', marginTop: 6 }}>请先在"新建宠物"里建立档案</p>
          </div>
        ) : (
          <>
            <div className="mb-3 flex items-center gap-2">
              <PawPrint size={14} color="#FF6B9D" />
              <span className="text-sm font-bold" style={{ color: '#333' }}>请选择要使用的宠物</span>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {pets.map((p) => {
                const isActive = p.id === currentPetId;
                return (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className="rounded-3xl px-4 py-4"
                    style={{
                      background: isActive ? 'linear-gradient(135deg, #FFE0F0, #FFF0E0)' : 'white',
                      border: isActive ? '1.5px solid #FF6B9D' : '1.5px solid #FFD0E8',
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center overflow-hidden" style={{ background: '#FFF0F7' }}>
                        {p.avatarUrl ? (
                          <img src={p.avatarUrl} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <span style={{ fontSize: 22 }}>{getPetEmoji(p.petType)}</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold" style={{ color: '#333' }}>{p.name}</span>
                          <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: '#FFE0F0', color: '#FF6B9D' }}>
                            {p.petType}
                          </span>
                          {isActive && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: '#FF6B9D', color: 'white' }}>
                              使用中
                            </span>
                          )}
                        </div>
                        <div className="text-xs" style={{ color: '#888', marginTop: 4 }}>
                          {p.breed || '未设置品种'} · {p.age || '-'}{p.ageUnit || ''} · {p.weight ? `${p.weight}kg` : '-'}
                        </div>
                      </div>
                      <ChevronRight size={18} color={isActive ? '#FF6B9D' : '#CCC'} />
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => handleSelect(p)}
                        className="flex-1 py-2 rounded-2xl text-sm font-semibold transition-all"
                        style={{
                          background: isActive ? '#FF6B9D' : '#5B8DEF',
                          color: 'white',
                          opacity: isActive ? 1 : 0.95,
                        }}
                      >
                        {isActive ? '当前使用中' : '选择并切换'}
                      </button>
                      <button
                        onClick={() => handleDelete(p.id, p.name)}
                        disabled={deletingId === p.id}
                        className="w-10 py-2 rounded-2xl flex items-center justify-center transition-all"
                        style={{
                          background: '#FFF0F0',
                          color: deletingId === p.id ? '#CCC' : '#FF6B6B',
                          border: '1px solid #FFD0D0',
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </MiniAppShell>
  );
}



