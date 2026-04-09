import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { ChevronRight, PawPrint, Plus, Trash2 } from 'lucide-react';
import { MiniAppShell } from './MiniAppShell';
import type { PetProfileRecord } from '../lib/petProfileDb';
import { getAllPetProfilesByUser } from '../lib/petProfileDb';
import { apiListPetsByUser, apiDeletePet } from '../lib/backendApi';

function getPetEmoji(petType: string) {
  if (petType === '狗狗') return '🐶';
  if (petType === '猫猫') return '🐱';
  if (petType === '仓鼠') return '🐹';
  if (petType === '兔子') return '🐰';
  if (petType === '鸟类') return '🐦';
  return '🐾';
}

export function MyPetsPage() {
  const navigate = useNavigate();
  const [pets, setPets] = useState<PetProfileRecord[]>([]);
  const [currentPetId, setCurrentPetId] = useState<string | null>(localStorage.getItem('current-pet-id'));
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const currentUserId = useMemo(() => localStorage.getItem('current-user-id') || 'demo-user', []);

  useEffect(() => {
    const syncCurrentPet = (list: PetProfileRecord[]) => {
      setPets(list);
      if (!currentPetId && list[0]) {
        localStorage.setItem('current-pet-id', list[0].id);
        setCurrentPetId(list[0].id);
      }
    };
    apiListPetsByUser(currentUserId).then(syncCurrentPet).catch(() => {
      getAllPetProfilesByUser(currentUserId).then(syncCurrentPet);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]);

  const handleSelect = (petId: string) => {
    localStorage.setItem('current-pet-id', petId);
    setCurrentPetId(petId);
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
      showBack={false}
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
        {pets.length === 0 ? (
          <div className="mt-6 px-4 py-6 rounded-3xl" style={{ background: 'white', border: '1.5px solid #FFD0E8' }}>
            <p className="text-sm font-semibold" style={{ color: '#FF6B9D' }}>还没有宠物档案</p>
            <p className="text-xs" style={{ color: '#AAA', marginTop: 6 }}>请先在“新建宠物”里建立档案</p>
          </div>
        ) : (
          <>
            <div className="mt-4 mb-3 flex items-center gap-2">
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
                        </div>
                        <div className="text-xs" style={{ color: '#888', marginTop: 4 }}>
                          {p.breed || '未设置品种'} · {p.age || '-'}{p.ageUnit || ''} · {p.weight ? `${p.weight}kg` : '-'}
                        </div>
                      </div>
                      <ChevronRight size={18} color={isActive ? '#FF6B9D' : '#CCC'} />
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => handleSelect(p.id)}
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

