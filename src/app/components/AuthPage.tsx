import { useState } from 'react';
import { useNavigate } from 'react-router';
import { apiLogin, apiRegister } from '../lib/backendApi';

type Tab = 'login' | 'register';

// 将登录结果写入 localStorage，供全站读取
function persistAuth(userId: string, username: string) {
  localStorage.setItem('current-user-id', userId);
  localStorage.setItem('current-username', username);
  // 切换账号时清除上一个用户残留的宠物缓存
  localStorage.removeItem('current-pet-id');
  localStorage.removeItem('current-backend-pet-id');
  localStorage.removeItem('current-pet-cache');
}

export function AuthPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('login');

  // 表单字段
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI 状态
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const switchTab = (t: Tab) => {
    setTab(t);
    setError('');
    setUsername('');
    setPassword('');
    setConfirmPassword('');
  };

  const handleSubmit = async () => {
    setError('');

    // ── 本地校验 ─────────────────────────────────────────────
    if (!username.trim()) { setError('请输入用户名'); return; }
    if (!password) { setError('请输入密码'); return; }

    if (tab === 'register') {
      if (username.trim().length < 2) { setError('用户名至少需要 2 个字符'); return; }
      if (password.length < 6) { setError('密码至少需要 6 位'); return; }
      if (password !== confirmPassword) { setError('两次输入的密码不一致'); return; }
    }

    setLoading(true);
    try {
      const result =
        tab === 'login'
          ? await apiLogin(username.trim(), password)
          : await apiRegister(username.trim(), password);

      persistAuth(result.user_id, result.username);

      // 首次注册 / 没有宠物 → 去建档；已有宠物 → 去主页
      navigate(result.has_pets ? '/home' : '/setup', { replace: true });
    } catch (err: any) {
      setError(err.message || '操作失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#f0f0f0' }}>
      <div
        className="max-w-[390px] w-full min-h-screen flex flex-col"
        style={{ background: 'linear-gradient(160deg, #FF6B9D 0%, #FF9A5C 40%, #FFCA80 80%, #FFF0A0 100%)' }}
      >
        {/* ── 顶部品牌区 ── */}
        <div className="flex flex-col items-center pt-16 pb-8 px-8">
          {/* App icon */}
          <div
            className="w-24 h-24 rounded-[24px] flex items-center justify-center shadow-xl mb-4 overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.95)' }}
          >
            <img
              src={`${import.meta.env.BASE_URL}logo.png`}
              alt="爪爪远眺"
              style={{ width: '110%', height: '110%', objectFit: 'cover' }}
            />
          </div>

          <h1 className="text-white font-extrabold tracking-tight" style={{ fontSize: 28 }}>爪爪远眺</h1>
          <p className="text-white/80 text-sm mt-1">宠物专属 AI 健康管家</p>
        </div>

        {/* ── 登录/注册卡片 ── */}
        <div
          className="flex-1 mx-4 rounded-3xl shadow-2xl overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.97)' }}
        >
          {/* Tab 切换 */}
          <div className="flex border-b border-gray-100">
            {(['login', 'register'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => switchTab(t)}
                className="flex-1 py-4 text-sm font-semibold transition-all relative"
                style={{ color: tab === t ? '#FF6B9D' : '#AAA' }}
              >
                {t === 'login' ? '登录' : '注册'}
                {tab === t && (
                  <span
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                    style={{ background: '#FF6B9D' }}
                  />
                )}
              </button>
            ))}
          </div>

          <div className="px-6 py-8 flex flex-col gap-4">
            {/* 用户名 */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold" style={{ color: '#888' }}>用户名</label>
              <input
                type="text"
                placeholder="请输入用户名（2-32个字符）"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={handleKeyDown}
                maxLength={32}
                className="w-full px-4 py-3 rounded-2xl text-sm outline-none transition-all"
                style={{
                  background: '#F8F8F8',
                  border: '1.5px solid #F0F0F0',
                  color: '#333',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#FF6B9D')}
                onBlur={(e) => (e.target.style.borderColor = '#F0F0F0')}
              />
            </div>

            {/* 密码 */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold" style={{ color: '#888' }}>密码</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder={tab === 'register' ? '请设置密码（至少6位）' : '请输入密码'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full px-4 py-3 pr-12 rounded-2xl text-sm outline-none transition-all"
                  style={{
                    background: '#F8F8F8',
                    border: '1.5px solid #F0F0F0',
                    color: '#333',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#FF6B9D')}
                  onBlur={(e) => (e.target.style.borderColor = '#F0F0F0')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-lg"
                  style={{ color: '#CCC', lineHeight: 1 }}
                >
                  {showPassword ? '隐藏' : '显示'}
                </button>
              </div>
            </div>

            {/* 确认密码（仅注册） */}
            {tab === 'register' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold" style={{ color: '#888' }}>确认密码</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="请再次输入密码"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full px-4 py-3 rounded-2xl text-sm outline-none transition-all"
                  style={{
                    background: '#F8F8F8',
                    border: '1.5px solid #F0F0F0',
                    color: '#333',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#FF6B9D')}
                  onBlur={(e) => (e.target.style.borderColor = '#F0F0F0')}
                />
              </div>
            )}

            {/* 错误提示 */}
            {error && (
              <div
                className="flex items-center gap-2 px-4 py-3 rounded-2xl text-sm"
                style={{ background: '#FFF0F3', color: '#FF4D6A' }}
              >
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* 提交按钮 */}
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-4 rounded-2xl font-bold text-white text-sm mt-1 transition-all active:scale-[0.97]"
              style={{
                background: loading
                  ? '#FFB3C6'
                  : 'linear-gradient(135deg, #FF6B9D, #FF9A5C)',
                boxShadow: loading ? 'none' : '0 6px 20px rgba(255,107,157,0.35)',
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span
                    className="w-4 h-4 rounded-full inline-block"
                    style={{
                      border: '2px solid rgba(255,255,255,0.4)',
                      borderTop: '2px solid white',
                      animation: 'spin 1s linear infinite',
                    }}
                  />
                  {tab === 'login' ? '登录中...' : '注册中...'}
                </span>
              ) : (
                tab === 'login' ? '🐾 登录' : '✨ 注册并开始使用'
              )}
            </button>

            {/* 切换提示 */}
            <p className="text-center text-xs" style={{ color: '#BBB' }}>
              {tab === 'login' ? (
                <>
                  还没有账号？
                  <button
                    onClick={() => switchTab('register')}
                    className="font-semibold ml-1"
                    style={{ color: '#FF6B9D' }}
                  >
                    立即注册
                  </button>
                </>
              ) : (
                <>
                  已有账号？
                  <button
                    onClick={() => switchTab('login')}
                    className="font-semibold ml-1"
                    style={{ color: '#FF6B9D' }}
                  >
                    直接登录
                  </button>
                </>
              )}
            </p>
          </div>
        </div>

        {/* ── 底部说明 ── */}
        <p className="text-center text-white/50 py-6" style={{ fontSize: 11 }}>
          登录即代表同意《用户协议》与《隐私政策》
        </p>
      </div>
    </div>
  );
}
