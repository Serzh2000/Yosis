import { useCallback, useEffect, useState } from 'react';
import { ApiError, request } from '../lib/api';

export interface ServerSession {
  user: string;
  local: boolean;
  guest?: boolean;
}
export function useServerSession() {
  const [session, setSession] = useState<ServerSession | null>(null);
  const [loginRequired, setLoginRequired] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setSession(await request<ServerSession>('/api/session'));
      setLoginRequired(false);
      setError('');
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) {
        setLoginRequired(true);
        setSession(null);
        setError('');
      } else
        setError(cause instanceof Error ? cause.message : 'Не удалось подключиться к серверу.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  const login = useCallback(async (token: string) => {
    const result = await request<ServerSession>('/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    setSession(result);
    setLoginRequired(false);
    setError('');
    return result;
  }, []);
  const logout = useCallback(async () => {
    const response = await fetch('/api/session', { method: 'DELETE' });
    if (!response.ok) throw new Error('Не удалось завершить сеанс.');
    if (session?.guest) {
      await refresh();
      return;
    }
    setSession(null);
    setLoginRequired(true);
  }, [session?.guest, refresh]);
  return { session, loginRequired, loading, error, login, logout, refresh };
}
