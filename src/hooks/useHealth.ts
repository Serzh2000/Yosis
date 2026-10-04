import { useCallback, useEffect, useState } from 'react';
import type { ToolchainStatus } from '../../shared/types';
import { request } from '../lib/api';

export function useHealth() {
  const [health, setHealth] = useState<ToolchainStatus | null>(null);
  const [healthError, setHealthError] = useState('');
  const [healthLoading, setHealthLoading] = useState(true);
  const checkHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      setHealth(await request<ToolchainStatus>('/api/health'));
      setHealthError('');
    } catch (cause) {
      setHealthError(cause instanceof Error ? cause.message : 'Сервис сборки недоступен.');
    } finally {
      setHealthLoading(false);
    }
  }, []);
  useEffect(() => {
    void checkHealth();
  }, [checkHealth]);
  return { health, healthError, healthLoading, checkHealth };
}
