import { useRouteError, isRouteErrorResponse, useNavigate } from 'react-router';

export function RouteErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();

  let title = '页面出现了一点问题';
  let message = '请刷新页面或返回首页重试。';

  if (isRouteErrorResponse(error)) {
    title = `${error.status} ${error.statusText}`;
    message = typeof error.data === 'string' ? error.data : message;
  } else if (error instanceof Error) {
    // 开发模式展示详细信息；生产模式只展示友好提示
    message = import.meta.env.DEV ? error.message : message;
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: '#FFF5F8',
        textAlign: 'center',
        gap: 16,
      }}
    >
      <div style={{ fontSize: 56 }}>🐾</div>
      <p style={{ fontSize: 18, fontWeight: 700, color: '#FF6B9D' }}>{title}</p>
      <p style={{ fontSize: 13, color: '#888', lineHeight: 1.6, maxWidth: 280 }}>{message}</p>
      <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '10px 20px',
            borderRadius: 20,
            background: '#FFE0F0',
            color: '#FF6B9D',
            fontWeight: 600,
            fontSize: 14,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          刷新页面
        </button>
        <button
          onClick={() => navigate('/home')}
          style={{
            padding: '10px 20px',
            borderRadius: 20,
            background: '#FF6B9D',
            color: 'white',
            fontWeight: 600,
            fontSize: 14,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          返回首页
        </button>
      </div>
    </div>
  );
}
