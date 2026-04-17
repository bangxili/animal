import { useNavigate } from 'react-router';

/** 判断当前用户是否已有宠物档案 */
export function hasPetProfile(): boolean {
  const id = localStorage.getItem('current-backend-pet-id');
  return !!id && id !== '';
}

/**
 * 用于 Recipe / Health / Match 页面：
 * 没有宠物档案时整页拦截，显示引导去填写。
 */
export function NoPetBlock({ pageName }: { pageName: string }) {
  const navigate = useNavigate();
  return (
    <div
      className="flex flex-col items-center justify-center"
      style={{
        minHeight: '60vh',
        padding: '40px 32px',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 56, marginBottom: 16 }}>🐾</div>
      <p style={{ fontSize: 17, fontWeight: 700, color: '#2c251c', marginBottom: 8 }}>
        {pageName}需要宠物档案
      </p>
      <p style={{ fontSize: 13, color: '#786a57', marginBottom: 28, lineHeight: 1.7 }}>
        建立宠物档案后可使用，去填写吧～
      </p>
      <button
        onClick={() => navigate('/setup')}
        style={{
          background: 'linear-gradient(135deg, #FF6B9D, #FF9A5C)',
          color: 'white',
          border: 'none',
          borderRadius: 999,
          padding: '12px 32px',
          fontSize: 15,
          fontWeight: 700,
          cursor: 'pointer',
          boxShadow: '0 6px 20px rgba(255,107,157,0.35)',
        }}
      >
        去填写宠物档案 →
      </button>
    </div>
  );
}

/**
 * 用于 Toilet / SBTI / Consultation / Gene 页面：
 * 没有宠物档案时在顶部显示提示条，页面功能仍可正常使用。
 */
export function NoPetBanner() {
  const navigate = useNavigate();
  if (hasPetProfile()) return null;
  return (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(255,107,157,0.12), rgba(255,154,92,0.10))',
        border: '1px solid rgba(255,107,157,0.25)',
        borderRadius: 12,
        padding: '10px 14px',
        margin: '0 0 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
      }}
    >
      <p style={{ margin: 0, fontSize: 12.5, color: '#c05080', lineHeight: 1.5, flex: 1 }}>
        🐾 建立宠物档案，分析会更准确哦～
      </p>
      <button
        onClick={() => navigate('/setup')}
        style={{
          background: 'linear-gradient(135deg, #FF6B9D, #FF9A5C)',
          color: 'white',
          border: 'none',
          borderRadius: 999,
          padding: '5px 12px',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        去填写
      </button>
    </div>
  );
}
