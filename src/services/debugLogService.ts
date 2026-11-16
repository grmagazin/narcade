import { useEffect, useState } from 'react';
import { APP_BUILD_ID, APP_VERSION_LABEL } from '../config/version';

export type DebugLogLevel = 'loading' | 'success' | 'error' | 'info';

export interface DebugLogEntry {
  id: number;
  timestamp: string;
  level: DebugLogLevel;
  source: string;
  message: string;
  progress?: number;
}

const MAX_ENTRIES = 200;
let nextId = 1;
let entries: DebugLogEntry[] = [
  {
    id: nextId++,
    timestamp: new Date().toISOString().slice(11, 23),
    level: 'info',
    source: 'system',
    message: `${APP_VERSION_LABEL} (build ${APP_BUILD_ID}) runtime ready — monitoring asset, core, and ROM loading`,
  },
];

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

export function logDebug(
  level: DebugLogLevel,
  source: string,
  message: string,
  progress?: number
): void {
  const timestamp = new Date().toISOString().slice(11, 23);
  const last = entries[entries.length - 1];

  // Collapse consecutive rapid progress updates from the same source so logs stay readable
  if (
    last &&
    level === 'loading' &&
    last.level === 'loading' &&
    last.source === source &&
    typeof progress === 'number' &&
    typeof last.progress === 'number'
  ) {
    entries = [
      ...entries.slice(0, -1),
      {
        ...last,
        timestamp,
        message,
        progress,
      },
    ];
  } else {
    entries = [
      ...entries.slice(-(MAX_ENTRIES - 1)),
      {
        id: nextId++,
        timestamp,
        level,
        source,
        message,
        progress,
      },
    ];
  }
  notify();
}

export function clearDebugLogs(): void {
  entries = [
    {
      id: nextId++,
      timestamp: new Date().toISOString().slice(11, 23),
      level: 'info',
      source: 'system',
      message: 'Debug log cleared',
    },
  ];
  notify();
}

export function getDebugLogs(): DebugLogEntry[] {
  return entries;
}

export function formatDebugReport(): string {
  const header = [
    `${APP_VERSION_LABEL} (build ${APP_BUILD_ID}) Diagnostic Report`,
    `Generated: ${new Date().toISOString()}`,
    `URL: ${typeof window !== 'undefined' ? window.location.href : 'N/A'}`,
    `UserAgent: ${typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A'}`,
    `Entries: ${entries.length}`,
    `----------------------------------------`,
  ];

  const lines = entries.map((e) => {
    const pct = typeof e.progress === 'number' ? ` (${Math.round(e.progress)}%)` : '';
    return `[${e.timestamp}] [${e.level.toUpperCase()}] [${e.source}] ${e.message}${pct}`;
  });

  return [...header, ...lines].join('\n');
}

export function useDebugLogs() {
  const [snapshot, setSnapshot] = useState<DebugLogEntry[]>(entries);

  useEffect(() => {
    const sync = () => setSnapshot([...entries]);
    listeners.add(sync);
    return () => {
      listeners.delete(sync);
    };
  }, []);

  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      if (event.message) {
        logDebug('error', 'window', event.message);
      }
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      const msg =
        event.reason instanceof Error
          ? event.reason.message
          : typeof event.reason === 'string'
            ? event.reason
            : 'Unhandled async rejection';
      logDebug('error', 'promise', msg);
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  const latest = snapshot[snapshot.length - 1] ?? null;
  return { entries: snapshot, latest };
}
