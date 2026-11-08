import { useEffect, useRef, useState } from 'react';
import type { Diagnostic, Project } from '../../shared/types';
import { request } from '../lib/api';
import { getProjectSnapshot, validateProject } from '../lib/projects';

/** Answers already received, by the sources they were for: going back to earlier text needs no request. */
const answered = new Map<string, Diagnostic[]>();
const MAX_ANSWERED = 30;
const sourcesOf = (project: Project) =>
  JSON.stringify([
    project.top,
    project.files
      .filter((file) => !/\.(cst|sdc)$/i.test(file.name))
      .map((file) => [file.name, file.content]),
  ]);

export function useSyntaxCheck(project: Project, enabled: boolean, synthesisBusy: boolean) {
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]);
  const [state, setState] = useState<'waiting' | 'checking' | 'checked' | 'unavailable'>('waiting');
  const generation = useRef(0);
  useEffect(() => {
    const run = ++generation.current;
    const controller = new AbortController();
    setDiagnostics([]);
    if (!enabled || synthesisBusy) {
      setState('waiting');
      return () => controller.abort();
    }
    let validated: Project;
    try {
      validated = validateProject(project);
    } catch {
      setState('waiting');
      return () => controller.abort();
    }
    const snapshot = getProjectSnapshot(validated);
    const key = sourcesOf(validated);
    const known = answered.get(key);
    if (known) {
      setDiagnostics(known);
      setState('checked');
      return () => controller.abort();
    }
    setState('waiting');
    const timer = window.setTimeout(() => {
      setState('checking');
      void request<{ diagnostics: Diagnostic[]; error?: string }>('/api/syntax', {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project: validated }),
      })
        .then((result) => {
          if (
            controller.signal.aborted ||
            run !== generation.current ||
            snapshot !== getProjectSnapshot(project)
          )
            return;
          // A check cut short is not an answer about the text.
          if (!result.error || result.diagnostics.some((item) => item.severity === 'error')) {
            answered.set(key, result.diagnostics);
            if (answered.size > MAX_ANSWERED) answered.delete(answered.keys().next().value!);
          }
          setDiagnostics(result.diagnostics);
          setState('checked');
        })
        .catch(() => {
          if (!controller.signal.aborted && run === generation.current) setState('unavailable');
        });
    }, 1400);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [project, enabled, synthesisBusy]);
  return { diagnostics, state };
}
