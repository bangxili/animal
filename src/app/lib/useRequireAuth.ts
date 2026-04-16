import { useEffect } from 'react';
import { useNavigate } from 'react-router';

/**
 * 未登录守卫：如果 localStorage 中没有 current-user-id，立即跳回登录页。
 * 在所有需要鉴权的页面顶部调用即可。
 */
export function useRequireAuth() {
  const navigate = useNavigate();
  useEffect(() => {
    const userId = localStorage.getItem('current-user-id');
    if (!userId) {
      navigate('/', { replace: true });
    }
  }, [navigate]);
}
