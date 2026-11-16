import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  ExternalLink,
  FolderUp,
  Gamepad2,
  Maximize2,
  Minimize2,
  Play,
  RotateCcw,
  Save,
  Settings2,
  ShieldCheck,
  Square,
  Volume2,
  VolumeX,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GamepadConfigModal } from '../components/GamepadConfigModal';
import { SystemIcon } from '../components/SystemIcon';
import { loadGamepadMapping, useGamepad } from '../hooks/useGamepad';
import {
  checkRequiredBiosForRom,
  resolveBiosPayloadForSystem,
} from '../services/biosService';
import { formatBytes, getSystemById } from '../services/dataService';
import { logDebug, type DebugLogLevel } from '../services/debugLogService';
import { isNeoGeoSession } from '../services/mameMetaService';
import type {
  MissingBiosPrompt,
  ModuleRoute,
  PlaySession,
  ShaderPreset,
  StoredBiosMeta,
  StoredRomMeta,
} from '../types';

interface PlayerPageProps {
  session: PlaySession | null;
  storedRoms: StoredRomMeta[];
  storedBios: StoredBiosMeta[];
  onNavigate: (route: ModuleRoute) => void;
  onPlayStoredRom: (romId: string, overrideTitle?: string) => Promise<void>;
  onSwitchCore: (nextCore: string) => void;
  onEjectSession: () => void;
  onBiosUpdated?: () => Promise<void> | void;
  onMissingBiosDetected?: (prompt: MissingBiosPrompt) => void;
}

const SHADER_OPTIONS: Array<{ value: ShaderPreset; label: string }> = [
  { value: 'disabled', label: 'Shader: Sharp Pixels' },
  { value: 'crt-easymode.glslp', label: 'Shader: CRT Easymode' },
  { value: 'crt-geom.glslp', label: 'Shader: CRT Geom' },
  { value: 'crt-aperture.glslp', label: 'Shader: CRT Aperture' },
  { value: '2xScaleHQ.glslp', label: 'Shader: 2xScaleHQ' },
  { value: 'bicubic', label: 'Shader: Bicubic Soft' },
];

const SHADER_STORAGE_KEY = 'ngames_preferred_shader_v1';
const ZOOM_STORAGE_KEY = 'ngames_player_zoom_v1';
const TOOLBAR_MINIMIZED_KEY = 'ngames_player_toolbar_minimized_v1';

export function PlayerPage({
  session,
  storedRoms,
  storedBios,
  onNavigate,
  onPlayStoredRom,
  onSwitchCore,
  onEjectSession,
  onBiosUpdated,
  onMissingBiosDetected,
}: PlayerPageProps) {
  const frameWrapRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);
  const [playerStatus, setPlayerStatus] = useState<
    'idle' | 'booting' | 'ready' | 'running' | 'error'
  >(session ? 'booting' : 'idle');
  const [statusError, setStatusError] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [attachedBiosNames, setAttachedBiosNames] = useState<string[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [gamepadModalOpen, setGamepadModalOpen] = useState(false);
  const [copiedPlayLink, setCopiedPlayLink] = useState(false);

  // Fast Zoom (+10% / -10%) + Centered / Wide frame option for embeds
  const [zoom, setZoom] = useState<number>(() => {
    try {
      const saved = Number(localStorage.getItem(ZOOM_STORAGE_KEY));
      return Number.isFinite(saved) && saved >= 50 && saved <= 200 ? saved : 100;
    } catch {
      return 100;
    }
  });
  const [embedWideMode, setEmbedWideMode] = useState(false);
  const [toolbarMinimized, setToolbarMinimized] = useState<boolean>(() => {
    try {
      return localStorage.getItem(TOOLBAR_MINIMIZED_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const toggleToolbarMinimized = () => {
    setToolbarMinimized((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(TOOLBAR_MINIMIZED_KEY, String(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  };

  const [saveSlot, setSaveSlot] = useState<1 | 2 | 3>(1);
  const [muted, setMuted] = useState(false);
  const [shader, setShader] = useState<ShaderPreset>(() => {
    try {
      const saved = localStorage.getItem(SHADER_STORAGE_KEY) as ShaderPreset | null;
      return saved || 'disabled';
    } catch {
      return 'disabled';
    }
  });

  const { gamepads } = useGamepad(false);
  const system = session ? getSystemById(session.systemId) : undefined;
  const isEmbedMode = Boolean(session?.embedUrl);
  const isNeoGeo = useMemo(() => {
    if (!session || session.embedUrl) return false;
    return isNeoGeoSession({
      romFileName: session.romFileName,
      romUrl: session.romUrl,
      gameName: session.title,
      category: session.category,
      isNeoGeo: session.isNeoGeo,
    });
  }, [session]);
  const hasVaultNeoGeoBios = useMemo(
    () => attachedBiosNames.some((name) => /^neogeo\.zip$/i.test(name)),
    [attachedBiosNames]
  );

  const updateZoom = (next: number) => {
    const clamped = Math.min(200, Math.max(50, Math.round(next / 10) * 10));
    setZoom(clamped);
    try {
      localStorage.setItem(ZOOM_STORAGE_KEY, String(clamped));
    } catch {
      // Ignore storage errors
    }
  };

  const directPlayShareUrl = useMemo(() => {
    if (!session || typeof window === 'undefined') return null;
    const targetUrl = session.embedUrl || session.romUrl;
    if (!targetUrl) return null;
    const base = window.location.origin + window.location.pathname;
    const qp = new URLSearchParams();
    qp.set('play', targetUrl);
    qp.set('system', session.systemId);
    if (session.core && session.core !== 'embed') qp.set('core', session.core);
    qp.set('title', session.title);
    return `${base}?${qp.toString()}`;
  }, [session]);

  const handleCopyPlayUrl = async () => {
    if (!directPlayShareUrl) return;
    try {
      await navigator.clipboard.writeText(directPlayShareUrl);
      setCopiedPlayLink(true);
      window.setTimeout(() => setCopiedPlayLink(false), 2000);
    } catch {
      // Ignore clipboard failures
    }
  };

  const postToIframe = useCallback((type: string, payload?: unknown) => {
    if (!iframeRef.current?.contentWindow) return;
    iframeRef.current.contentWindow.postMessage(
      { type, payload },
      window.location.origin
    );
  }, []);

  const sendGameToIframe = useCallback(async () => {
    if (!session || session.embedUrl || !iframeRef.current?.contentWindow) return;

    setPlayerStatus('booting');
    setStatusError(null);
    setActionFeedback(null);

    try {
      const biosCheck = await checkRequiredBiosForRom(
        {
          title: session.title,
          systemId: session.systemId,
          fileName: session.romFileName,
          sourceUrl: session.romUrl,
          isNeoGeo,
        },
        storedBios
      );
      if (biosCheck.autoInstalledNeoGeo) {
        logDebug('info', 'bios', 'Saved self-hosted neogeo.zip into local BIOS Vault');
      }
      if (biosCheck.missingEntries.length > 0) {
        onMissingBiosDetected?.({
          romTitle: session.title,
          systemId: session.systemId,
          isNeoGeo: biosCheck.isNeoGeo,
          missingEntries: biosCheck.missingEntries,
        });
      }

      const rawBiosPayload = await resolveBiosPayloadForSystem(session.systemId);
      const filteredBiosList = [
        ...(rawBiosPayload.primary ? [rawBiosPayload.primary] : []),
        ...rawBiosPayload.extras,
      ].filter(
        (entry) =>
          !(session.systemId === 'arcade' && !isNeoGeo && /^neogeo\.zip$/i.test(entry.name))
      );

      const primaryBios = filteredBiosList[0];
      const extraBios = filteredBiosList.slice(1);
      setAttachedBiosNames(filteredBiosList.map((b) => b.name));

      postToIframe('NGAMES_LOAD_GAME', {
        gameName: session.title,
        core: session.core,
        category: session.category,
        isNeoGeo,
        romBuffer: session.romBuffer,
        romFileName: session.romFileName,
        romUrl: session.romBuffer ? undefined : session.romUrl,
        biosBuffer: primaryBios?.buffer,
        biosFileName: primaryBios?.name,
        extraBiosFiles: extraBios,
        extraDiscFiles: session.extraDiscFiles,
        gamepadMapping: loadGamepadMapping(),
        shader,
        volume: muted ? 0 : 0.85,
        color: '#F97316',
        startOnLoaded: true,
      });

      if (biosCheck.autoInstalledNeoGeo) {
        void onBiosUpdated?.();
      }
    } catch (err) {
      setPlayerStatus('error');
      setStatusError(
        err instanceof Error ? err.message : 'Unable to initialize EmulatorJS session.'
      );
    }
  }, [
    session,
    isNeoGeo,
    storedBios,
    shader,
    muted,
    postToIframe,
    onBiosUpdated,
    onMissingBiosDetected,
  ]);

  useEffect(() => {
    if (!session) {
      setPlayerStatus('idle');
      setAttachedBiosNames([]);
      setStatusError(null);
      setActionFeedback(null);
    } else if (session.embedUrl) {
      setPlayerStatus('booting');
      setAttachedBiosNames([]);
      setStatusError(null);
      setActionFeedback(null);
      // Responsive embeds like PlayPager / GamePix / RetroGames benefit from wide mode automatically
      const u = session.embedUrl.toLowerCase();
      setEmbedWideMode(!u.includes('archive.org/embed'));
      logDebug('loading', 'embed', `Loading external embed: ${session.title} (${session.embedUrl})`);
    } else {
      setPlayerStatus('booting');
      logDebug(
        'loading',
        'player',
        `Preparing ${session.title} (${session.romFileName}) on core ${session.core}`
      );
    }
  }, [session]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const msg = event.data;
      if (!msg || typeof msg !== 'object') return;

      if (msg.type === 'NGAMES_DEBUG_LOG') {
        const lvl = (msg.payload?.level as DebugLogLevel) || 'info';
        const src = String(msg.payload?.source || 'emulator');
        const text = String(msg.payload?.message || '');
        const prog = typeof msg.payload?.progress === 'number' ? msg.payload.progress : undefined;
        if (text) logDebug(lvl, src, text, prog);
      } else if (msg.type === 'NGAMES_PLAYER_READY') {
        logDebug('info', 'player', 'Player runtime frame ready — sending ROM payload');
        void sendGameToIframe();
      } else if (msg.type === 'NGAMES_EMULATOR_READY') {
        setPlayerStatus('ready');
      } else if (msg.type === 'NGAMES_GAME_STARTED') {
        setPlayerStatus('running');
      } else if (msg.type === 'NGAMES_PLAYER_ERROR') {
        const errMsg = msg.payload?.message || 'EmulatorJS failed to initialize.';
        setPlayerStatus('error');
        setStatusError(errMsg);
        logDebug('error', 'player', errMsg);
      } else if (msg.type === 'NGAMES_SAVE_RESULT' || msg.type === 'NGAMES_LOAD_RESULT') {
        const resMsg = msg.payload?.message || null;
        setActionFeedback(resMsg);
        if (resMsg) {
          logDebug(msg.payload?.ok ? 'success' : 'error', 'save-state', resMsg);
        }
      }
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [sendGameToIframe]);

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const toggleFullscreen = async () => {
    const el = frameWrapRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Ignore fullscreen denial in embedded sandboxes
    }
  };

  const handleShaderChange = (nextShader: ShaderPreset) => {
    setShader(nextShader);
    try {
      localStorage.setItem(SHADER_STORAGE_KEY, nextShader);
    } catch {
      // Ignore storage errors
    }
    postToIframe('NGAMES_SET_SHADER', { shader: nextShader });
  };

  const handleToggleMute = () => {
    const nextMuted = !muted;
    setMuted(nextMuted);
    postToIframe('NGAMES_SET_VOLUME', { volume: nextMuted ? 0 : 0.85 });
  };

  if (!session) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-white">Player</h1>
            <p className="mt-1 text-sm text-slate-400">
              Centered EmulatorJS v4.2.3 &amp; External Archive Embed container. Select a stored ROM, browse the MAME Archive, or open Embeds.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setGamepadModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-white/[0.12] bg-[#11151B] px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-white/[0.06] self-start sm:self-auto cursor-pointer"
          >
            <Gamepad2
              className={`h-4 w-4 ${gamepads.length > 0 ? 'text-emerald-400' : 'text-slate-400'}`}
              aria-hidden="true"
            />
            <span>
              {gamepads.length > 0 ? `${gamepads.length} Connected: ${gamepads[0].id}` : 'Configure Gamepad'}
            </span>
          </button>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#11151B] p-8 sm:p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl border border-white/[0.1] bg-[#171C24] text-orange-400">
            <Gamepad2 className="h-7 w-7" aria-hidden="true" />
          </div>
          <h2 className="mt-4 font-display text-xl font-bold text-white">No Active Cartridge Loaded</h2>
          <p className="mt-2 text-sm text-slate-400 max-w-md mx-auto">
            Load a local ROM, pick an Archive.org MAME cabinet, launch an Embed, or use <code className="font-mono text-orange-300">?play=ROM_URL</code>.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('embeds')}
              className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-5 py-2.5 text-xs font-semibold text-slate-950 hover:bg-orange-400 transition-colors cursor-pointer"
            >
              <Play className="h-4 w-4 fill-current" aria-hidden="true" />
              <span>Playable Embeds</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('archive')}
              className="rounded-lg border border-white/[0.12] bg-white/[0.04] px-5 py-2.5 text-xs font-medium text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
            >
              MAME Archive
            </button>
            <button
              type="button"
              onClick={() => onNavigate('roms')}
              className="inline-flex items-center gap-2 rounded-lg border border-white/[0.12] bg-white/[0.04] px-5 py-2.5 text-xs font-medium text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
            >
              <FolderUp className="h-4 w-4" aria-hidden="true" />
              <span>ROM Loader</span>
            </button>
          </div>
        </div>

        {storedRoms.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-display text-lg font-bold text-white">
              Quick Launch from Your Vault ({storedRoms.length})
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {storedRoms.map((rom) => {
                const sys = getSystemById(rom.systemId);
                return (
                  <button
                    key={rom.id}
                    type="button"
                    onClick={() => void onPlayStoredRom(rom.id, rom.title)}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-[#11151B] p-4 text-left hover:border-orange-500/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#171C24] text-orange-400">
                        <SystemIcon systemId={rom.systemId} className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{rom.title}</p>
                        <p className="text-xs text-slate-400 truncate">
                          {sys?.shortName ?? rom.systemId} · {formatBytes(rom.sizeBytes)}
                        </p>
                      </div>
                    </div>
                    <Play className="h-4 w-4 text-orange-400 shrink-0 fill-current" aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <GamepadConfigModal
          open={gamepadModalOpen}
          onClose={() => setGamepadModalOpen(false)}
        />
      </div>
    );
  }

  const isArcadeCore = session.systemId === 'arcade' && !isEmbedMode;

  return (
    <div className="space-y-5">
      {/* Collapsible Player Header & Control Bar */}
      {toolbarMinimized ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-[#11151B] px-3.5 py-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <SystemIcon systemId={session.systemId} className="h-4 w-4 text-orange-400 shrink-0" />
            <span className="font-display text-sm font-semibold text-white truncate">
              {session.title}
            </span>
            <span className="hidden sm:inline font-mono text-[11px] text-slate-400">
              · {isEmbedMode ? 'Embed' : session.core}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="inline-flex items-center rounded-lg border border-white/[0.12] bg-[#090B0E] p-0.5">
              <button
                type="button"
                onClick={() => updateZoom(zoom - 10)}
                disabled={zoom <= 50}
                title="Zoom Out (-10%)"
                aria-label="Zoom out 10 percent"
                className="inline-flex h-6 w-6 items-center justify-center rounded text-slate-300 hover:bg-white/[0.08] hover:text-white disabled:opacity-35 cursor-pointer"
              >
                <ZoomOut className="h-3 w-3" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => updateZoom(100)}
                title="Reset zoom to 100%"
                className="px-1.5 font-mono text-[11px] font-semibold text-white tabular-nums hover:text-orange-400 cursor-pointer"
              >
                {zoom}%
              </button>
              <button
                type="button"
                onClick={() => updateZoom(zoom + 10)}
                disabled={zoom >= 200}
                title="Zoom In (+10%)"
                aria-label="Zoom in 10 percent"
                className="inline-flex h-6 w-6 items-center justify-center rounded text-slate-300 hover:bg-white/[0.08] hover:text-white disabled:opacity-35 cursor-pointer"
              >
                <ZoomIn className="h-3 w-3" aria-hidden="true" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => void toggleFullscreen()}
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              className="inline-flex h-7 items-center gap-1 rounded-lg border border-white/[0.12] bg-white/[0.04] px-2.5 text-[11px] font-medium text-slate-200 hover:bg-white/[0.08] cursor-pointer"
            >
              {isFullscreen ? (
                <Minimize2 className="h-3 w-3" aria-hidden="true" />
              ) : (
                <Maximize2 className="h-3 w-3" aria-hidden="true" />
              )}
            </button>

            <button
              type="button"
              onClick={toggleToolbarMinimized}
              title="Expand player controls"
              className="inline-flex h-7 items-center gap-1 rounded-lg border border-white/[0.12] bg-white/[0.04] px-2.5 text-[11px] font-medium text-slate-200 hover:bg-white/[0.08] cursor-pointer"
            >
              <span>Controls</span>
              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={onEjectSession}
              title="Eject cartridge"
              className="inline-flex h-7 items-center gap-1 rounded-lg border border-red-500/30 bg-red-950/25 px-2.5 text-[11px] font-medium text-red-200 hover:bg-red-950/45 cursor-pointer"
            >
              <Square className="h-3 w-3" aria-hidden="true" />
              <span className="hidden sm:inline">Eject</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3 rounded-xl border border-white/[0.08] bg-[#11151B] p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#171C24] text-orange-400">
                <SystemIcon systemId={session.systemId} className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <span>{system?.name ?? session.systemId}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono">
                    {isEmbedMode ? 'External Iframe' : session.core}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {playerStatus === 'running'
                      ? 'Running'
                      : playerStatus === 'ready'
                        ? 'Core Ready'
                        : playerStatus === 'error'
                          ? 'Load Error'
                          : 'Initializing'}
                  </span>
                  {session.isMultiDisc && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>Multi-Disc M3U</span>
                    </>
                  )}
                </div>
                <h1 className="font-display text-lg font-bold text-white truncate">{session.title}</h1>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {/* Fast Zoom Controls (-10% / 100% / +10%) */}
              <div className="inline-flex items-center rounded-lg border border-white/[0.12] bg-[#090B0E] p-0.5">
                <button
                  type="button"
                  onClick={() => updateZoom(zoom - 10)}
                  disabled={zoom <= 50}
                  title="Zoom Out (-10%)"
                  aria-label="Zoom out 10 percent"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-300 hover:bg-white/[0.08] hover:text-white disabled:opacity-35 cursor-pointer"
                >
                  <ZoomOut className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => updateZoom(100)}
                  title="Reset zoom to 100%"
                  className="px-2 font-mono text-xs font-semibold text-white tabular-nums hover:text-orange-400 cursor-pointer"
                >
                  {zoom}%
                </button>
                <button
                  type="button"
                  onClick={() => updateZoom(zoom + 10)}
                  disabled={zoom >= 200}
                  title="Zoom In (+10%)"
                  aria-label="Zoom in 10 percent"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-300 hover:bg-white/[0.08] hover:text-white disabled:opacity-35 cursor-pointer"
                >
                  <ZoomIn className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>

              {/* Gamepad Visual Status Indicator + Configure Trigger */}
              <button
                type="button"
                onClick={() => setGamepadModalOpen(true)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  gamepads.length > 0
                    ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-200 hover:bg-emerald-950/50'
                    : 'border-white/[0.12] bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]'
                }`}
                title="Inspect and remap connected Web Gamepad controllers"
              >
                <Gamepad2
                  className={`h-3.5 w-3.5 ${
                    gamepads.length > 0 ? 'text-emerald-400' : 'text-slate-400'
                  }`}
                  aria-hidden="true"
                />
                <span className="max-w-[140px] truncate">
                  {gamepads.length > 0
                    ? `${gamepads.length} Pad: ${gamepads[0].id}`
                    : 'No Gamepad'}
                </span>
                <Settings2 className="h-3 w-3 opacity-70" aria-hidden="true" />
              </button>

              {directPlayShareUrl && (
                <button
                  type="button"
                  onClick={() => void handleCopyPlayUrl()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.12] bg-white/[0.04] px-3 py-2 text-xs font-medium text-slate-200 hover:bg-white/[0.08] whitespace-nowrap cursor-pointer"
                >
                  {copiedPlayLink ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  <span>{copiedPlayLink ? 'Copied ?play=' : 'Share ?play='}</span>
                </button>
              )}

              {!isEmbedMode && (
                <button
                  type="button"
                  onClick={handleToggleMute}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.12] bg-white/[0.04] px-3 py-2 text-xs font-medium text-slate-200 hover:bg-white/[0.08] whitespace-nowrap cursor-pointer"
                >
                  {muted ? (
                    <VolumeX className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
                  ) : (
                    <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  <span>{muted ? 'Unmute' : 'Audio'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setReloadNonce((n) => n + 1)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.12] bg-white/[0.04] px-3 py-2 text-xs font-medium text-slate-200 hover:bg-white/[0.08] whitespace-nowrap cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Restart</span>
              </button>

              <button
                type="button"
                onClick={() => void toggleFullscreen()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.12] bg-white/[0.04] px-3 py-2 text-xs font-medium text-slate-200 hover:bg-white/[0.08] whitespace-nowrap cursor-pointer"
              >
                {isFullscreen ? (
                  <Minimize2 className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                <span>{isFullscreen ? 'Exit' : 'Fullscreen'}</span>
              </button>

              <button
                type="button"
                onClick={toggleToolbarMinimized}
                title="Minimize player toolbar during gameplay"
                className="inline-flex items-center gap-1 rounded-lg border border-white/[0.12] bg-white/[0.04] px-2.5 py-2 text-xs font-medium text-slate-300 hover:bg-white/[0.08] hover:text-white whitespace-nowrap cursor-pointer"
              >
                <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Minimize</span>
              </button>

              <button
                type="button"
                onClick={onEjectSession}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-950/25 px-3 py-2 text-xs font-medium text-red-200 hover:bg-red-950/45 whitespace-nowrap cursor-pointer"
              >
                <Square className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Eject</span>
              </button>
            </div>
          </div>

          {/* Two-Way Save State + Shader + Arcade Core Strip OR Embed Info Strip */}
          {!isEmbedMode ? (
            <div className="flex flex-col gap-3 border-t border-white/[0.06] pt-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={saveSlot}
                  onChange={(e) => setSaveSlot(Number(e.target.value) as 1 | 2 | 3)}
                  aria-label="Quick save slot"
                  className="h-8 rounded-lg border border-white/[0.1] bg-[#090B0E] px-2.5 text-xs text-slate-200 focus:border-orange-500 focus:outline-none"
                >
                  <option value={1}>Slot 1</option>
                  <option value={2}>Slot 2</option>
                  <option value={3}>Slot 3</option>
                </select>

                <button
                  type="button"
                  onClick={() => postToIframe('NGAMES_QUICK_SAVE', { slot: saveSlot })}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white/[0.06] px-3 text-xs font-medium text-white hover:bg-orange-500 hover:text-slate-950 transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Save className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Quick Save</span>
                </button>

                <button
                  type="button"
                  onClick={() => postToIframe('NGAMES_QUICK_LOAD', { slot: saveSlot })}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white/[0.06] px-3 text-xs font-medium text-white hover:bg-white/[0.12] transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Quick Load</span>
                </button>

                <select
                  value={shader}
                  onChange={(e) => handleShaderChange(e.target.value as ShaderPreset)}
                  aria-label="Video shader preset"
                  className="h-8 rounded-lg border border-white/[0.1] bg-[#090B0E] px-2.5 text-xs text-slate-200 focus:border-orange-500 focus:outline-none"
                >
                  {SHADER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                {isArcadeCore && (
                  <select
                    value={session.core}
                    onChange={(e) => onSwitchCore(e.target.value)}
                    aria-label="Switch Arcade Core"
                    className="h-8 rounded-lg border border-orange-500/40 bg-[#090B0E] px-2.5 text-xs text-orange-200 focus:border-orange-500 focus:outline-none"
                  >
                    <option value="mame2003_plus">Core: mame2003_plus</option>
                    <option value="fbneo">Core: fbneo</option>
                  </select>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-400">
                {actionFeedback && (
                  <span className="text-orange-300 font-medium">{actionFeedback}</span>
                )}
                <span>
                  {gamepads.length > 0 ? 'Web Gamepad Active' : 'Keyboard Ready'}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-3 text-xs text-slate-400">
              <span className="truncate font-mono text-[11px] text-slate-400">
                Embed Source: {session.embedUrl}
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setEmbedWideMode((w) => !w)}
                  className="rounded-md border border-white/[0.12] bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-slate-200 hover:bg-white/[0.08] cursor-pointer"
                >
                  {embedWideMode ? 'Frame: Wide Fill' : 'Frame: Centered 4:3'}
                </button>
                <a
                  href={session.embedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-orange-400 hover:text-orange-300 whitespace-nowrap"
                >
                  <span>Open Source Frame</span>
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Centered Runtime Stage with Fast 10% Zoom */}
      <div
        ref={frameWrapRef}
        className="relative flex overflow-auto rounded-2xl border border-white/[0.1] bg-[#05070A] min-h-[460px] sm:min-h-[580px] w-full p-3"
      >
        <div
          className="m-auto flex items-center justify-center transition-transform duration-150 ease-out"
          style={{
            transform: `scale(${zoom / 100})`,
            transformOrigin: 'center center',
            width: isEmbedMode && !embedWideMode ? 'auto' : '100%',
            height: isEmbedMode && !embedWideMode ? 'auto' : '100%',
            marginTop: zoom > 100 ? `${Math.round((zoom - 100) * 2.4)}px` : 'auto',
            marginBottom: zoom > 100 ? `${Math.round((zoom - 100) * 2.4)}px` : 'auto',
          }}
        >
          {isEmbedMode ? (
            <iframe
              key={`${session.id}_${reloadNonce}_${embedWideMode ? 'wide' : 'box'}`}
              src={session.embedUrl}
              title={`External Game Frame — ${session.title}`}
              allow="autoplay; fullscreen; gamepad"
              onLoad={() => {
                setPlayerStatus('running');
                logDebug('success', 'embed', `Embed loaded: ${session.title}`, 100);
              }}
              className={
                embedWideMode
                  ? 'w-full h-[520px] sm:h-[600px] border-0 rounded-lg bg-black'
                  : 'w-[580px] sm:w-[640px] max-w-full h-[420px] sm:h-[480px] border-0 rounded-lg bg-black'
              }
            />
          ) : (
            <iframe
              key={`${session.id}_${reloadNonce}_${session.core}`}
              ref={iframeRef}
              src="./player/index.html"
              title={`EmulatorJS Player — ${session.title}`}
              allow="autoplay; fullscreen; gamepad"
              className="w-full max-w-[960px] h-[460px] sm:h-[580px] border-0 rounded-lg bg-black"
            />
          )}
        </div>
      </div>

      {statusError && (
        <div
          role="alert"
          className="rounded-xl border border-red-500/30 bg-red-950/30 p-4 text-xs text-red-200"
        >
          {statusError}
        </div>
      )}

      {/* Session Metadata & Controls Reference */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7 rounded-xl border border-white/[0.08] bg-[#11151B] p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-bold text-white">
              {isEmbedMode ? 'External Arcade Embed Controls' : 'Default Keyboard & Gamepad'}
            </h2>
            <button
              type="button"
              onClick={() => setGamepadModalOpen(true)}
              className="text-xs font-medium text-orange-400 hover:text-orange-300 cursor-pointer"
            >
              Remap Gamepad →
            </button>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {isEmbedMode
              ? 'Click inside the centered game frame to focus keyboard input. For MAME embeds, press 5 to insert coin and 1 to start. Use +/- Zoom buttons above to scale in 10% steps.'
              : 'Click inside the game screen to focus keyboard input, or use the quick-save, zoom, and shader controls above. Remapped gamepad profiles apply on next Restart.'}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
            <div className="rounded-lg bg-[#090B0E] px-3 py-2 border border-white/[0.06]">
              <span className="text-slate-500 block">D-Pad / Move</span>
              <span className="font-mono text-slate-200">Arrow Keys</span>
            </div>
            <div className="rounded-lg bg-[#090B0E] px-3 py-2 border border-white/[0.06]">
              <span className="text-slate-500 block">A / B Buttons</span>
              <span className="font-mono text-slate-200">Z / X (or Ctrl/Alt)</span>
            </div>
            <div className="rounded-lg bg-[#090B0E] px-3 py-2 border border-white/[0.06]">
              <span className="text-slate-500 block">X / Y Buttons</span>
              <span className="font-mono text-slate-200">A / S</span>
            </div>
            <div className="rounded-lg bg-[#090B0E] px-3 py-2 border border-white/[0.06]">
              <span className="text-slate-500 block">L / R Shoulders</span>
              <span className="font-mono text-slate-200">Q / E</span>
            </div>
            <div className="rounded-lg bg-[#090B0E] px-3 py-2 border border-white/[0.06]">
              <span className="text-slate-500 block">Start / Coin (MAME)</span>
              <span className="font-mono text-slate-200">Enter / 5 &amp; 1</span>
            </div>
            <div className="rounded-lg bg-[#090B0E] px-3 py-2 border border-white/[0.06]">
              <span className="text-slate-500 block">Save Backup</span>
              <button
                type="button"
                onClick={() => onNavigate('roms')}
                className="font-mono text-orange-400 hover:underline cursor-pointer"
              >
                Export .zip →
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 rounded-xl border border-white/[0.08] bg-[#11151B] p-5 space-y-3">
          <h2 className="font-display text-sm font-bold text-white">Runtime Attachment Info</h2>
          <dl className="space-y-2 text-xs">
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Active Source</dt>
              <dd className="font-mono text-slate-200 truncate">{session.romFileName}</dd>
            </div>
            {session.headerInfo && (
              <>
                {session.headerInfo.internalTitle && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Header Title</dt>
                    <dd className="font-mono text-slate-200 truncate">
                      {session.headerInfo.internalTitle}
                    </dd>
                  </div>
                )}
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">ROM Format</dt>
                  <dd className="font-mono text-slate-200 truncate">
                    {session.headerInfo.format}
                    {session.headerInfo.region ? ` · ${session.headerInfo.region}` : ''}
                  </dd>
                </div>
                {session.headerInfo.mapperOrHardware && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Hardware / Mapper</dt>
                    <dd className="font-mono text-slate-200 truncate">
                      {session.headerInfo.mapperOrHardware}
                    </dd>
                  </div>
                )}
              </>
            )}
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">BIOS Attachment</dt>
              <dd className="flex items-center gap-1.5 text-slate-200">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
                <span className="font-mono truncate">
                  {isEmbedMode
                    ? 'Handled by Remote Frame'
                    : isNeoGeo &&
                        (session.core === 'fbneo' || session.core === 'mame2003_plus') &&
                        !hasVaultNeoGeoBios
                      ? attachedBiosNames.length > 0
                        ? `${attachedBiosNames.join(', ')}, neogeo.zip (Self-hosted /bios/neogeo.zip)`
                        : 'neogeo.zip (Self-hosted /bios/neogeo.zip)'
                      : attachedBiosNames.length > 0
                        ? attachedBiosNames.join(', ')
                        : system?.biosRequirement === 'required'
                          ? 'None loaded (check BIOS tab)'
                          : 'Built-in HLE / Not required'}
                </span>
              </dd>
            </div>
          </dl>

          {storedRoms.length > 1 && (
            <div className="pt-3 border-t border-white/[0.06]">
              <p className="text-xs font-medium text-slate-400 mb-2">Switch ROM from Vault</p>
              <div className="flex flex-wrap gap-1.5">
                {storedRoms
                  .filter((r) => r.id !== session.romId)
                  .slice(0, 4)
                  .map((rom) => (
                    <button
                      key={rom.id}
                      type="button"
                      onClick={() => void onPlayStoredRom(rom.id, rom.title)}
                      className="rounded-md border border-white/[0.1] bg-[#090B0E] px-2.5 py-1 text-xs text-slate-300 hover:border-orange-500/50 hover:text-white truncate max-w-[180px] cursor-pointer"
                    >
                      {rom.title}
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <GamepadConfigModal
        open={gamepadModalOpen}
        onClose={() => setGamepadModalOpen(false)}
        onSaved={() => {
          if (!isEmbedMode) {
            setActionFeedback('Gamepad mapping saved — click Restart to apply');
          }
        }}
      />
    </div>
  );
}
