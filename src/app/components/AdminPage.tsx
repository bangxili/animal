import { useEffect, useRef, useState } from 'react';

import { fmtFull } from '../lib/dateUtils';

const API = import.meta.env.VITE_API_BASE_URL ?? '';

function adminHeaders(token: string) {
  return { 'Content-Type': 'application/json', 'X-Admin-Token': token };
}

/** 统一处理 avatar_url / front_photo_path / side_photo_path 不一致的前导斜杠问题 */
function photoUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${API}${clean}`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardData {
  total_users: number;
  total_pets: number;
  online_now: number;
  active_users: { daily: number; weekly: number; monthly: number };
  daily_new_users: { date: string; count: number }[];
  feature_usage: Record<string, number>;
  revenue: { total: number; monthly: number; orders: number };
}

interface UserRow {
  user_id: string;
  username: string;
  created_at: string | null;
  last_active: string | null;
  pet_count: number;
  pets: { id: number; name: string; pet_type: string }[];
}

interface PetDetail {
  id: number;
  name: string;
  pet_type: string;
  breed: string | null;
  age: number | null;
  age_unit: string | null;
  gender: string | null;
  weight: number | null;
  length: number | null;
  avatar_url: string | null;
  front_photo_path: string | null;
  side_photo_path: string | null;
  created_at: string | null;
  social_bio: string | null;
  social_tags: string[];
  usage: { toilet: number; recipe: number; gene: number; consultation: number };
}

interface UserDetail {
  user_id: string;
  username: string;
  created_at: string | null;
  last_active: string | null;
  feature_usage: Record<string, number>;
  pets: PetDetail[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null) {
  return fmtFull(iso);
}

const FEATURE_LABEL: Record<string, string> = {
  consultation: '毛博士问诊',
  toilet: '大小便检测',
  recipe: '每日食谱',
  gene: '基因检测',
  health_photo: '毛发/情绪分析',
  weight: '体重记录',
  meal_log: '饮食记录',
};

const PET_EMOJI: Record<string, string> = { '猫猫': '🐱', '狗狗': '🐶', '仓鼠': '🐹' };

// ─── Confirm Dialog ───────────────────────────────────────────────────────────

function ConfirmDialog({ msg, onConfirm, onCancel }: { msg: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 14, padding: '28px 32px', width: 340, boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
        <p style={{ margin: '0 0 20px', fontSize: 15, color: '#1a1a2e', lineHeight: 1.6 }}>{msg}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{ ...ghostBtn }}>取消</button>
          <button onClick={onConfirm} style={{ ...dangerBtn }}>确认删除</button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Pet Modal ───────────────────────────────────────────────────────────

function EditPetModal({ pet, token, onClose, onSaved }: { pet: PetDetail; token: string; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: pet.name ?? '',
    pet_type: pet.pet_type ?? '',
    breed: pet.breed ?? '',
    age: pet.age != null ? String(pet.age) : '',
    age_unit: pet.age_unit ?? '岁',
    gender: pet.gender ?? '',
    weight: pet.weight != null ? String(pet.weight) : '',
    length: pet.length != null ? String(pet.length) : '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const save = async () => {
    setSaving(true);
    setErr('');
    const body: Record<string, any> = { ...form };
    if (body.age === '') delete body.age; else body.age = Number(body.age);
    if (body.weight === '') delete body.weight; else body.weight = Number(body.weight);
    if (body.length === '') delete body.length; else body.length = Number(body.length);
    if (!body.breed) delete body.breed;

    const res = await fetch(`${API}/api/admin/pets/${pet.id}`, {
      method: 'PATCH',
      headers: adminHeaders(token),
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (res.ok) { onSaved(); onClose(); }
    else { const d = await res.json(); setErr(d.detail ?? '保存失败'); }
  };

  const f = (key: keyof typeof form, val: string) => setForm(p => ({ ...p, [key]: val }));

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '28px 32px', width: 420, boxShadow: '0 8px 32px rgba(0,0,0,0.12)', maxHeight: '90vh', overflowY: 'auto' }}>
        <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700 }}>编辑宠物档案 · {pet.name}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="宠物名字" value={form.name} onChange={v => f('name', v)} />
          <Field label="种类" value={form.pet_type} onChange={v => f('pet_type', v)} placeholder="狗狗 / 猫猫 / 仓鼠…" />
          <Field label="品种" value={form.breed} onChange={v => f('breed', v)} />
          <Field label="性别" value={form.gender} onChange={v => f('gender', v)} placeholder="男 / 女" />
          <Field label="年龄" value={form.age} onChange={v => f('age', v)} type="number" />
          <div>
            <label style={labelStyle}>年龄单位</label>
            <select value={form.age_unit} onChange={e => f('age_unit', e.target.value)} style={inputStyle as any}>
              <option>岁</option><option>个月</option><option>周</option>
            </select>
          </div>
          <Field label="体重 (kg)" value={form.weight} onChange={v => f('weight', v)} type="number" />
          <Field label="体长 (cm)" value={form.length} onChange={v => f('length', v)} type="number" />
        </div>
        {err && <p style={{ color: '#e53e3e', fontSize: 13, margin: '12px 0 0' }}>{err}</p>}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <button onClick={onClose} style={ghostBtn}>取消</button>
          <button onClick={save} disabled={saving} style={primaryBtnSm}>{saving ? '保存中…' : '保存'}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit User Modal ──────────────────────────────────────────────────────────

function EditUserModal({ user, token, onClose, onSaved }: { user: UserDetail; token: string; onClose: () => void; onSaved: () => void }) {
  const [username, setUsername] = useState(user.username);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const save = async () => {
    setSaving(true); setErr('');
    const res = await fetch(`${API}/api/admin/users/${user.user_id}`, {
      method: 'PATCH',
      headers: adminHeaders(token),
      body: JSON.stringify({ username }),
    });
    setSaving(false);
    if (res.ok) { onSaved(); onClose(); }
    else { const d = await res.json(); setErr(d.detail ?? '保存失败'); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '28px 32px', width: 360, boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
        <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700 }}>编辑用户</h3>
        <Field label="用户名" value={username} onChange={setUsername} />
        {err && <p style={{ color: '#e53e3e', fontSize: 13, margin: '12px 0 0' }}>{err}</p>}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <button onClick={onClose} style={ghostBtn}>取消</button>
          <button onClick={save} disabled={saving} style={primaryBtnSm}>{saving ? '保存中…' : '保存'}</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder = '' }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={inputStyle as any} />
    </div>
  );
}

// ─── Login Screen ─────────────────────────────────────────────────────────────

function LoginScreen({ onLogin }: { onLogin: (token: string) => void }) {
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setErr(''); setLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u, password: p }),
      });
      if (!res.ok) { setErr('用户名或密码错误'); return; }
      const data = await res.json();
      localStorage.setItem('admin-token', data.token);
      onLogin(data.token);
    } catch { setErr('连接失败，请检查后端服务'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f7fa' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '40px 48px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', width: 360 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🐾</div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1a1a2e' }}>毛毛健康 管理端</h2>
          <p style={{ margin: '4px 0 0', color: '#888', fontSize: 13 }}>Admin Dashboard</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input placeholder="管理员账号" value={u} onChange={e => setU(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} style={inputStyle as any} />
          <input placeholder="密码" type="password" value={p} onChange={e => setP(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} style={inputStyle as any} />
          {err && <p style={{ color: '#e53e3e', fontSize: 13, margin: 0 }}>{err}</p>}
          <button onClick={submit} disabled={loading} style={{ ...primaryBtnSm, width: '100%', padding: '12px 0', fontSize: 14 }}>{loading ? '登录中...' : '登录'}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard Tab ────────────────────────────────────────────────────────────

function DashboardTab({ token }: { token: string }) {
  const [data, setData] = useState<DashboardData | null>(null);
  useEffect(() => {
    fetch(`${API}/api/admin/dashboard`, { headers: adminHeaders(token) }).then(r => r.json()).then(setData);
  }, [token]);
  if (!data) return <Loading />;
  const maxCount = Math.max(...data.daily_new_users.map(d => d.count), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <StatCard label="总用户数" value={data.total_users} icon="👥" color="#667eea" />
        <StatCard label="宠物档案总数" value={data.total_pets} icon="🐾" color="#f093fb" />
        <StatCard label="当前在线" value={data.online_now} icon="🟢" color="#43e97b" sub="15分钟内有操作" />
        <StatCard label="月活用户" value={data.active_users.monthly} icon="📅" color="#f5a623" />
      </div>
      <div style={card}>
        <h3 style={cardTitle}>用户活跃度</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginTop: 12 }}>
          <ActiveBadge label="今日活跃" value={data.active_users.daily} />
          <ActiveBadge label="本周活跃" value={data.active_users.weekly} />
          <ActiveBadge label="本月活跃" value={data.active_users.monthly} />
        </div>
      </div>
      <div style={card}>
        <h3 style={cardTitle}>近30天新增用户</h3>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 100, marginTop: 16 }}>
          {data.daily_new_users.slice(-30).map(d => (
            <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div title={`${d.date}: ${d.count}人`} style={{ width: '100%', height: `${Math.max((d.count / maxCount) * 80, 4)}px`, background: 'linear-gradient(180deg,#667eea,#764ba2)', borderRadius: '3px 3px 0 0', minHeight: 4 }} />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 11, color: '#aaa' }}>
          <span>{data.daily_new_users[0]?.date ?? ''}</span>
          <span>{data.daily_new_users[data.daily_new_users.length - 1]?.date ?? ''}</span>
        </div>
      </div>
      <div style={card}>
        <h3 style={cardTitle}>功能使用次数（全量）</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginTop: 12 }}>
          {Object.entries(data.feature_usage).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#f8f9fc', borderRadius: 10 }}>
              <span style={{ fontSize: 13, color: '#555' }}>{FEATURE_LABEL[k] ?? k}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#667eea' }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ ...card, borderStyle: 'dashed', borderColor: '#e2e8f0', opacity: 0.7 }}>
        <h3 style={{ ...cardTitle, color: '#aaa' }}>💳 支付收款统计（功能预留）</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginTop: 12 }}>
          <ActiveBadge label="总收入" value={`¥${data.revenue.total}`} />
          <ActiveBadge label="本月收入" value={`¥${data.revenue.monthly}`} />
          <ActiveBadge label="订单数" value={data.revenue.orders} />
        </div>
        <p style={{ fontSize: 12, color: '#bbb', marginTop: 12, textAlign: 'center' }}>接入支付宝/微信支付后自动统计</p>
      </div>
    </div>
  );
}

// ─── Users Tab ────────────────────────────────────────────────────────────────

function UsersTab({ token }: { token: string }) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [selectedPet, setSelectedPet] = useState<PetDetail | null>(null);
  const [confirm, setConfirm] = useState<{ msg: string; action: () => void } | null>(null);
  const [editUser, setEditUser] = useState(false);
  const [editPet, setEditPet] = useState<PetDetail | null>(null);

  const loadUsers = () => {
    fetch(`${API}/api/admin/users?limit=100`, { headers: adminHeaders(token) })
      .then(r => r.json()).then(d => { setUsers(d.users); setTotal(d.total); });
  };

  useEffect(loadUsers, [token]);

  const loadDetail = (userId: string) => {
    setDetail(null); setSelectedPet(null);
    fetch(`${API}/api/admin/users/${userId}`, { headers: adminHeaders(token) })
      .then(r => r.json()).then(setDetail);
  };

  const reloadDetail = () => {
    if (detail) loadDetail(detail.user_id);
    loadUsers();
  };

  const deleteUser = (userId: string, username: string) => {
    setConfirm({
      msg: `确认删除用户「${username}」及其所有宠物档案和数据？此操作不可撤销。`,
      action: async () => {
        await fetch(`${API}/api/admin/users/${userId}`, { method: 'DELETE', headers: adminHeaders(token) });
        setConfirm(null);
        setDetail(null); setSelectedPet(null);
        loadUsers();
      },
    });
  };

  const deletePet = (pet: PetDetail) => {
    setConfirm({
      msg: `确认删除宠物「${pet.name}」及其所有数据？此操作不可撤销。`,
      action: async () => {
        await fetch(`${API}/api/admin/pets/${pet.id}`, { method: 'DELETE', headers: adminHeaders(token) });
        setConfirm(null);
        setSelectedPet(null);
        reloadDetail();
      },
    });
  };

  return (
    <>
      {confirm && <ConfirmDialog msg={confirm.msg} onConfirm={confirm.action} onCancel={() => setConfirm(null)} />}
      {editUser && detail && (
        <EditUserModal
          user={detail} token={token}
          onClose={() => setEditUser(false)}
          onSaved={reloadDetail}
        />
      )}
      {editPet && (
        <EditPetModal
          pet={editPet} token={token}
          onClose={() => setEditPet(null)}
          onSaved={() => { reloadDetail(); setSelectedPet(null); }}
        />
      )}

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        {/* 左：用户列表 */}
        <div style={{ ...card, flex: '0 0 320px', maxHeight: 'calc(100vh - 160px)', overflowY: 'auto' }}>
          <h3 style={{ ...cardTitle, marginBottom: 10 }}>全部用户 ({total})</h3>
          {users.map(u => (
            <div
              key={u.user_id}
              onClick={() => loadDetail(u.user_id)}
              style={{
                padding: '10px 12px',
                borderRadius: 10,
                cursor: 'pointer',
                marginTop: 6,
                background: detail?.user_id === u.user_id ? '#eef2ff' : '#f8f9fc',
                border: `1.5px solid ${detail?.user_id === u.user_id ? '#667eea' : 'transparent'}`,
                transition: 'all 0.15s',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: 14, color: '#1a1a2e' }}>{u.username}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, color: '#888' }}>🐾 {u.pet_count}</span>
                  <button
                    onClick={e => { e.stopPropagation(); deleteUser(u.user_id, u.username); }}
                    style={{ ...iconBtn, color: '#e53e3e' }} title="删除用户"
                  >✕</button>
                </div>
              </div>
              <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>注册：{fmtDate(u.created_at)}</div>
              <div style={{ fontSize: 11, color: '#aaa' }}>活跃：{fmtDate(u.last_active)}</div>
            </div>
          ))}
        </div>

        {/* 右：详情 */}
        {detail ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
            {/* 用户信息 */}
            <div style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h3 style={cardTitle}>👤 {detail.username}</h3>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setEditUser(true)} style={primaryBtnSm}>编辑用户名</button>
                  <button onClick={() => deleteUser(detail.user_id, detail.username)} style={dangerBtn}>删除用户</button>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
                <InfoRow label="用户 ID" value={detail.user_id} mono />
                <InfoRow label="注册时间" value={fmtDate(detail.created_at)} />
                <InfoRow label="最后活跃" value={fmtDate(detail.last_active)} />
                <InfoRow label="宠物档案" value={`${detail.pets.length} 只`} />
              </div>
              <h4 style={{ margin: '14px 0 8px', fontSize: 13, color: '#666' }}>功能使用次数</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {Object.entries(detail.feature_usage).map(([k, v]) => (
                  <div key={k} style={{ padding: '8px 12px', background: '#f0f4ff', borderRadius: 8, textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#667eea' }}>{v}</div>
                    <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{FEATURE_LABEL[k] ?? k}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 宠物列表 */}
            <div style={card}>
              <h3 style={cardTitle}>🐾 宠物档案</h3>
              <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
                {detail.pets.map(p => (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPet(selectedPet?.id === p.id ? null : p)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 10,
                      cursor: 'pointer',
                      border: `1.5px solid ${selectedPet?.id === p.id ? '#667eea' : '#e2e8f0'}`,
                      background: selectedPet?.id === p.id ? '#eef2ff' : '#fff',
                      display: 'flex', alignItems: 'center', gap: 8,
                      position: 'relative',
                    }}
                  >
                    {photoUrl(p.avatar_url) ? (
                      <img src={photoUrl(p.avatar_url)} alt={p.name} style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: '#f0f4ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                        {PET_EMOJI[p.pet_type] ?? '🐾'}
                      </div>
                    )}
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: '#aaa' }}>{p.pet_type} · {p.breed ?? '未知品种'}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 宠物详情 */}
              {selectedPet && (
                <div style={{ marginTop: 16, padding: 16, background: '#f8f9fc', borderRadius: 12 }}>
                  {/* 操作按钮 */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 12 }}>
                    <button onClick={() => setEditPet(selectedPet)} style={primaryBtnSm}>编辑档案</button>
                    <button onClick={() => deletePet(selectedPet)} style={dangerBtn}>删除宠物</button>
                  </div>

                  <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                    {/* AI头像 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                      {photoUrl(selectedPet.avatar_url) ? (
                        <div>
                          <p style={{ fontSize: 11, color: '#aaa', margin: '0 0 4px' }}>AI 头像</p>
                          <img src={photoUrl(selectedPet.avatar_url)} alt="avatar"
                            style={{ width: 80, height: 80, borderRadius: 12, objectFit: 'cover', border: '2px solid #e8ecf0' }} />
                        </div>
                      ) : (
                        <div style={{ width: 80, height: 80, borderRadius: 12, background: '#f0f4ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>
                          {PET_EMOJI[selectedPet.pet_type] ?? '🐾'}
                        </div>
                      )}
                    </div>

                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: '0 0 10px', fontSize: 16 }}>{selectedPet.name}</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                        <InfoRow label="种类" value={selectedPet.pet_type ?? '—'} />
                        <InfoRow label="品种" value={selectedPet.breed ?? '—'} />
                        <InfoRow label="年龄" value={selectedPet.age ? `${selectedPet.age} ${selectedPet.age_unit ?? ''}` : '—'} />
                        <InfoRow label="性别" value={selectedPet.gender ?? '—'} />
                        <InfoRow label="体重" value={selectedPet.weight ? `${selectedPet.weight} kg` : '—'} />
                        <InfoRow label="体长" value={selectedPet.length ? `${selectedPet.length} cm` : '—'} />
                        <InfoRow label="建档时间" value={fmtDate(selectedPet.created_at)} />
                      </div>
                      {selectedPet.social_bio && (
                        <div style={{ marginTop: 8, fontSize: 13, color: '#555' }}>
                          <span style={{ color: '#aaa' }}>社交介绍：</span>{selectedPet.social_bio}
                        </div>
                      )}
                      {selectedPet.social_tags?.length > 0 && (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                          {selectedPet.social_tags.map(t => (
                            <span key={t} style={{ fontSize: 11, padding: '2px 8px', background: '#e0e7ff', color: '#667eea', borderRadius: 20 }}>{t}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 上传照片 */}
                  {(photoUrl(selectedPet.front_photo_path) || photoUrl(selectedPet.side_photo_path)) && (
                    <div style={{ marginTop: 14, display: 'flex', gap: 12 }}>
                      {photoUrl(selectedPet.front_photo_path) && (
                        <div>
                          <p style={{ fontSize: 11, color: '#aaa', margin: '0 0 4px' }}>正面照</p>
                          <img src={photoUrl(selectedPet.front_photo_path)} alt="front"
                            style={{ width: 90, height: 90, borderRadius: 10, objectFit: 'cover', border: '1.5px solid #e8ecf0' }} />
                        </div>
                      )}
                      {photoUrl(selectedPet.side_photo_path) && (
                        <div>
                          <p style={{ fontSize: 11, color: '#aaa', margin: '0 0 4px' }}>侧面照</p>
                          <img src={photoUrl(selectedPet.side_photo_path)} alt="side"
                            style={{ width: 90, height: 90, borderRadius: 10, objectFit: 'cover', border: '1.5px solid #e8ecf0' }} />
                        </div>
                      )}
                    </div>
                  )}

                  {/* 宠物功能使用 */}
                  <h4 style={{ margin: '14px 0 8px', fontSize: 13, color: '#666' }}>该宠物功能使用次数</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                    {Object.entries(selectedPet.usage).map(([k, v]) => (
                      <div key={k} style={{ padding: '8px 12px', background: '#fff', borderRadius: 8, textAlign: 'center', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: '#667eea' }}>{v}</div>
                        <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{FEATURE_LABEL[k] ?? k}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc', fontSize: 14 }}>
            点击左侧用户查看详情
          </div>
        )}
      </div>
    </>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, icon, color, sub }: { label: string; value: number | string; icon: string; color: string; sub?: string }) {
  return (
    <div style={{ ...card, textAlign: 'center' }}>
      <div style={{ fontSize: 28 }}>{icon}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color, marginTop: 6 }}>{value}</div>
      <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: '#bbb', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function ActiveBadge({ label, value }: { label: string; value: number | string }) {
  return (
    <div style={{ padding: 14, background: '#f8f9fc', borderRadius: 10, textAlign: 'center' }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: '#1a1a2e' }}>{value}</div>
      <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{label}</div>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ padding: '5px 0' }}>
      <span style={{ fontSize: 11, color: '#aaa', display: 'block' }}>{label}</span>
      <span style={{ fontSize: 13, color: '#333', fontFamily: mono ? 'monospace' : undefined, wordBreak: 'break-all' }}>{value}</span>
    </div>
  );
}

function Loading() {
  return <div style={{ textAlign: 'center', color: '#aaa', padding: 40 }}>加载中...</div>;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

type Tab = 'dashboard' | 'users';

export function AdminPage() {
  const [token, setToken] = useState(() => localStorage.getItem('admin-token') || '');
  const [tab, setTab] = useState<Tab>('dashboard');
  if (!token) return <LoginScreen onLogin={setToken} />;
  return (
    <div style={{ minHeight: '100vh', background: '#f5f7fa', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>
      <div style={{ background: '#fff', borderBottom: '1px solid #e8ecf0', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: '#1a1a2e' }}>🐾 毛毛健康 Admin</span>
          <div style={{ display: 'flex', gap: 4 }}>
            {(['dashboard', 'users'] as Tab[]).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{ padding: '6px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: tab === t ? 600 : 400, fontSize: 13, background: tab === t ? '#eef2ff' : 'transparent', color: tab === t ? '#667eea' : '#666' }}>
                {t === 'dashboard' ? '📊 数据面板' : '👥 用户管理'}
              </button>
            ))}
          </div>
        </div>
        <button onClick={() => { localStorage.removeItem('admin-token'); setToken(''); }} style={{ padding: '6px 16px', borderRadius: 8, border: '1px solid #e53e3e', background: '#fff', color: '#e53e3e', cursor: 'pointer', fontSize: 12 }}>
          退出登录
        </button>
      </div>
      <div style={{ padding: '24px 32px', maxWidth: 1280, margin: '0 auto' }}>
        {tab === 'dashboard' ? <DashboardTab token={token} /> : <UsersTab token={token} />}
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: '#fff', borderRadius: 14, padding: '18px 20px',
  boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: '1px solid #e8ecf0',
};
const cardTitle: React.CSSProperties = { margin: 0, fontSize: 14, fontWeight: 700, color: '#1a1a2e' };
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 8,
  border: '1.5px solid #e2e8f0', fontSize: 13, outline: 'none', boxSizing: 'border-box',
};
const labelStyle: React.CSSProperties = { fontSize: 11, color: '#888', display: 'block', marginBottom: 4 };
const primaryBtnSm: React.CSSProperties = {
  padding: '7px 16px', borderRadius: 8, border: 'none',
  background: 'linear-gradient(135deg,#667eea,#764ba2)', color: '#fff',
  fontWeight: 600, fontSize: 13, cursor: 'pointer',
};
const dangerBtn: React.CSSProperties = {
  padding: '7px 16px', borderRadius: 8, border: '1px solid #feb2b2',
  background: '#fff5f5', color: '#e53e3e', fontWeight: 600, fontSize: 13, cursor: 'pointer',
};
const ghostBtn: React.CSSProperties = {
  padding: '7px 16px', borderRadius: 8, border: '1px solid #e2e8f0',
  background: '#fff', color: '#555', fontSize: 13, cursor: 'pointer',
};
const iconBtn: React.CSSProperties = {
  width: 20, height: 20, borderRadius: 4, border: 'none', background: 'transparent',
  cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
};
