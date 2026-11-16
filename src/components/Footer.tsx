import { Check, ChevronDown, ChevronUp, Copy, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { APP_BUILD_ID, APP_VERSION_LABEL } from '../config/version';
import { clearLocalBrowserCache } from '../services/cacheService';
import {
  clearDebugLogs,
  formatDebugReport,
  useDebugLogs,
  type DebugLogLevel,
} from '../services/debugLogService';
import type { ModuleRoute } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

interface FooterProps {
  onNavigate: (route: ModuleRoute) => void;
}

const LEVEL_STYLES: Record<
  DebugLogLevel,
  { text: string; dot: string; label: string }
> = {
  success: {
    text: 'text-emerald-400',
    dot: 'bg-emerald-400',
    label: 'OK',
  },
  loading: {
    text: 'text-yellow-300',
    dot: 'bg-yellow-300 animate-pulse',
    label: 'LOAD',
  },
  error: {
    text: 'text-red-400',
    dot: 'bg-red-400',
    label: 'FAIL',
  },
  info: {
    text: 'text-sky-400',
    dot: 'bg-sky-400',
    label: 'INFO',
  },
};

export function Footer({ onNavigate }: FooterProps) {
  const { entries, latest } = useDebugLogs();
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const activeStyle = latest ? LEVEL_STYLES[latest.level] : LEVEL_STYLES.info;

  const handleCopyReport = async () => {
    try {
      await navigator.clipboard.writeText(formatDebugReport());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard failures
    }
  };

  return (
    <footer className="border-t border-white/[0.08] bg-[#090B0E] mt-16">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-display text-base font-bold text-white">
              {APP_VERSION_LABEL}{' '}
              <span className="font-mono text-[11px] font-normal text-slate-500">
                (build {APP_BUILD_ID})
              </span>
            </p>
            <p className="mt-1 text-xs text-slate-400 max-w-md leading-relaxed">
              Static-first browser gaming portal powered by official EmulatorJS v4.2.3. ROMs and BIOS files remain exclusively in your browser storage.
            </p>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <nav
              className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-400"
              aria-label="Footer navigation"
            >
              <button
                type="button"
                onClick={() => onNavigate('library')}
                className="hover:text-white transition-colors cursor-pointer"
              >
                Game Library
              </button>
              <button
                type="button"
                onClick={() => onNavigate('archive')}
                className="hover:text-white transition-colors cursor-pointer"
              >
                MAME Archive
              </button>
              <button
                type="button"
                onClick={() => onNavigate('embeds')}
                className="hover:text-white transition-colors cursor-pointer"
              >
                Playable Embeds
              </button>
              <button
                type="button"
                onClick={() => onNavigate('systems')}
                className="hover:text-white transition-colors cursor-pointer"
              >
                System Browser
              </button>
              <button
                type="button"
                onClick={() => onNavigate('roms')}
                className="hover:text-white transition-colors cursor-pointer"
              >
                ROM Loader
              </button>
              <button
                type="button"
                onClick={() => onNavigate('bios')}
                className="hover:text-white transition-colors cursor-pointer"
              >
                BIOS Compatibility
              </button>
              <a
                href="https://github.com/EmulatorJS/EmulatorJS"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
              >
                EmulatorJS
              </a>
              <a
                href="https://github.com/Abdess/retrobios"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
              >
                RetroBIOS Reference
              </a>
            </nav>
            <PWAInstallButton variant="subtle" />
          </div>
        </div>

        {/* Single-line Smart Loading Progress Debug Bar + Copy Full Report + Clear Cache */}
        <div className="border-t border-white/[0.06] pt-4">
          <div className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.08] bg-[#0D1016] px-3 py-2 text-xs font-mono">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <span
                className={`h-2 w-2 rounded-full shrink-0 ${activeStyle.dot}`}
                aria-hidden="true"
              />
              <span className={`shrink-0 font-semibold ${activeStyle.text}`}>
                [{activeStyle.label}]
              </span>
              <span className={`truncate ${activeStyle.text}`}>
                {latest
                  ? `${latest.source}: ${latest.message}${
                      typeof latest.progress === 'number' && latest.level === 'loading'
                        ? ` (${Math.round(latest.progress)}%)`
                        : ''
                    }`
                  : 'Ready'}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => void clearLocalBrowserCache()}
                className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] text-slate-400 hover:bg-white/[0.06] hover:text-white transition-colors cursor-pointer"
                title="Clear local Archive, metadata, and Service Worker caches"
              >
                <Trash2 className="h-3 w-3" aria-hidden="true" />
                <span className="hidden sm:inline">Clean Cache</span>
              </button>

              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] text-slate-400 hover:bg-white/[0.06] hover:text-white transition-colors tabular-nums cursor-pointer"
                title="Expand or collapse full debug log"
              >
                <span>Report ({entries.length})</span>
                {expanded ? (
                  <ChevronDown className="h-3 w-3" aria-hidden="true" />
                ) : (
                  <ChevronUp className="h-3 w-3" aria-hidden="true" />
                )}
              </button>

              <button
                type="button"
                onClick={() => void handleCopyReport()}
                className="inline-flex items-center gap-1 rounded border border-white/[0.1] bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-slate-200 hover:bg-white/[0.1] transition-colors cursor-pointer"
                title="Copy complete timestamped loading & diagnostic report"
              >
                {copied ? (
                  <Check className="h-3 w-3 text-emerald-400" aria-hidden="true" />
                ) : (
                  <Copy className="h-3 w-3" aria-hidden="true" />
                )}
                <span>{copied ? 'Copied' : 'Copy Report'}</span>
              </button>
            </div>
          </div>

          {expanded && (
            <div className="mt-2 rounded-lg border border-white/[0.08] bg-[#07090C] p-3 font-mono text-[11px]">
              <div className="mb-2 flex items-center justify-between text-slate-500">
                <span>Full Session Loading &amp; Runtime Report ({entries.length} entries)</span>
                <button
                  type="button"
                  onClick={clearDebugLogs}
                  className="inline-flex items-center gap-1 text-slate-400 hover:text-white cursor-pointer"
                >
                  <Trash2 className="h-3 w-3" aria-hidden="true" />
                  <span>Clear</span>
                </button>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {entries
                  .slice()
                  .reverse()
                  .map((entry) => {
                    const st = LEVEL_STYLES[entry.level];
                    return (
                      <div key={entry.id} className="flex items-start gap-2 leading-relaxed">
                        <span className="text-slate-600 shrink-0 tabular-nums">
                          {entry.timestamp}
                        </span>
                        <span className={`shrink-0 font-semibold ${st.text}`}>
                          [{st.label}]
                        </span>
                        <span className="text-slate-400 shrink-0">[{entry.source}]</span>
                        <span className={`${st.text} break-all`}>
                          {entry.message}
                          {typeof entry.progress === 'number'
                            ? ` (${Math.round(entry.progress)}%)`
                            : ''}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
