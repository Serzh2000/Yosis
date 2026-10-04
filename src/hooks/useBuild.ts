import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { BuildResult, Project } from '../../shared/types';
import { ApiError, request } from '../lib/api';
import { pollJob } from '../lib/job-client';
import {
  clearLastBuild,
  getProjectSnapshot,
  loadLastBuild,
  saveLastBuild,
  validateProject,
} from '../lib/projects';

const terminalStatuses = new Set(['success', 'error', 'cancelled']);
export function useBuild({
  projectRef,
  ready,
  onError,
  onStart,
  onResult,
}: {
  projectRef: RefObject<Project>;
  ready: boolean;
  onError: (message: string) => void;
  onStart: () => void;
  onResult: (result: BuildResult) => void;
}) {
  const [build, setBuild] = useState<BuildResult | null>(null);
  const [buildSnapshot, setBuildSnapshot] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pollError, setPollError] = useState('');
  const [clock, setClock] = useState(Date.now());
  const generation = useRef(0);
  const submissionInFlight = useRef(false);
  const latestBuild = useRef(build);
  latestBuild.current = build;
  const callbacks = useRef({ onError, onStart, onResult });
  callbacks.current = { onError, onStart, onResult };
  const busy = submitting || (!!build && !terminalStatuses.has(build.status));

  useEffect(() => {
    if (!ready) return;
    const saved = loadLastBuild(projectRef.current);
    if (!saved) return;
    const run = generation.current;
    const controller = new AbortController();
    void request<BuildResult>(`/api/builds/${saved.id}`, { signal: controller.signal })
      .then((result) => {
        if (controller.signal.aborted || run !== generation.current) return;
        setBuildSnapshot(getProjectSnapshot(JSON.parse(saved.snapshot)));
        setBuild(result);
        setClock(Date.now());
        callbacks.current.onResult(result);
      })
      .catch((cause) => {
        if (controller.signal.aborted || run !== generation.current) return;
        if (cause instanceof ApiError && (cause.status === 400 || cause.status === 404))
          clearLastBuild();
      });
    return () => controller.abort();
  }, [ready, projectRef]);

  useEffect(() => {
    const current = latestBuild.current;
    if (!current || terminalStatuses.has(current.status)) return;
    const run = generation.current;
    const controller = new AbortController();
    let timer: number;
    const poll = async () => {
      try {
        const latest = latestBuild.current;
        if (!latest || latest.id !== current.id) return;
        const result = await pollJob(`/api/builds/${current.id}`, latest, controller.signal);
        if (controller.signal.aborted || run !== generation.current) return;
        latestBuild.current = result;
        setBuild(result);
        setPollError('');
        if (terminalStatuses.has(result.status)) {
          callbacks.current.onResult(result);
          return;
        }
      } catch (cause) {
        if (controller.signal.aborted || run !== generation.current) return;
        setPollError(
          cause instanceof Error ? cause.message : 'Не удалось получить состояние сборки.',
        );
      }
      timer = window.setTimeout(poll, 1000);
    };
    timer = window.setTimeout(poll, 350);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [build?.id, build?.status]);

  useEffect(() => {
    if (!busy) return;
    const timer = window.setInterval(() => setClock(Date.now()), 500);
    return () => clearInterval(timer);
  }, [busy]);

  const resetBuild = useCallback(() => {
    generation.current++;
    clearLastBuild();
    setBuild(null);
    latestBuild.current = null;
    setBuildSnapshot('');
    setPollError('');
  }, []);
  const startBuild = useCallback(async () => {
    if (
      submissionInFlight.current ||
      (latestBuild.current && !terminalStatuses.has(latestBuild.current.status))
    )
      return;
    let validated: Project;
    try {
      validated = validateProject(projectRef.current);
    } catch (cause) {
      callbacks.current.onError(
        cause instanceof Error ? cause.message : 'Проверьте настройки проекта.',
      );
      return;
    }
    const snapshot = getProjectSnapshot(validated);
    submissionInFlight.current = true;
    const run = ++generation.current;
    setSubmitting(true);
    setPollError('');
    callbacks.current.onStart();
    try {
      const result = await request<BuildResult>('/api/builds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project: validated }),
      });
      if (run !== generation.current) return;
      saveLastBuild(result.id, snapshot);
      setBuildSnapshot(snapshot);
      latestBuild.current = result;
      setBuild(result);
      setClock(Date.now());
      callbacks.current.onResult(result);
    } catch (cause) {
      if (run === generation.current)
        callbacks.current.onError(
          cause instanceof Error ? cause.message : 'Не удалось запустить синтез.',
        );
    } finally {
      setSubmitting(false);
      submissionInFlight.current = false;
    }
  }, [projectRef]);
  const cancelBuild = useCallback(async () => {
    const current = latestBuild.current;
    if (!current) return;
    try {
      const result = await request<BuildResult>(`/api/builds/${current.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      if (latestBuild.current?.id !== current.id) return;
      latestBuild.current = result;
      setBuild(result);
    } catch (cause) {
      callbacks.current.onError(
        cause instanceof Error ? cause.message : 'Не удалось отменить сборку.',
      );
    }
  }, []);
  const elapsed = build ? (build.elapsedMs ?? Math.max(0, clock - Date.parse(build.startedAt))) : 0;
  return {
    build,
    buildSnapshot,
    submitting,
    pollError,
    busy,
    elapsed,
    startBuild,
    cancelBuild,
    resetBuild,
  };
}
