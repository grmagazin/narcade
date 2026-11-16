import { ArrowRight, Play, ShieldCheck, Upload } from 'lucide-react';
import { useState } from 'react';
import { GameCard } from '../components/GameCard';
import { PWAInstallButton } from '../components/PWAInstallButton';
import { RomDropzone } from '../components/RomDropzone';
import { SystemIcon } from '../components/SystemIcon';
import { catalogGames, formatBytes, getSystemById, systems } from '../services/dataService';
import type { CatalogGame, ModuleRoute, RecentPlayEntry, StoredRomMeta } from '../types';

interface HomePageProps {
  storedRoms: StoredRomMeta[];
  recentPlays: RecentPlayEntry[];
  catalogBindings: Record<string, string>;
  biosCount: number;
  onNavigate: (route: ModuleRoute, opts?: { systemFilter?: string }) => void;
  onQuickUploadAndPlay: (files: File[], systemOverride?: string) => Promise<void>;
  onPlayStoredRom: (romId: string, overrideTitle?: string) => Promise<void>;
  onPlayBundled: (game: CatalogGame) => Promise<void>;
  onPlayEmbed: (game: CatalogGame) => void;
  onPlayExternalUrl: (
    url: string,
    opts?: { systemId?: string; core?: string; title?: string }
  ) => void;
  onAttachRom: (game: CatalogGame) => void;
}

export function HomePage({
  storedRoms,
  recentPlays,
  catalogBindings,
  biosCount,
  onNavigate,
  onQuickUploadAndPlay,
  onPlayStoredRom,
  onPlayBundled,
  onPlayEmbed,
  onPlayExternalUrl,
  onAttachRom,
}: HomePageProps) {
  const [heroImgError, setHeroImgError] = useState(false);
  const featuredGames = catalogGames.filter((g) => g.featured).slice(0, 4);

  return (
    <div className="space-y-14">
      {/* Hero Split */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-stretch">
        <div className="lg:col-span-7 flex flex-col justify-center rounded-2xl border border-white/[0.08] bg-[#11151B] p-6 sm:p-10">
          <p className="text-xs font-medium text-orange-400">
            Static-first offline PWA arcade · EmulatorJS v4.2.3
          </p>
          <h1
            className="mt-3 font-display text-3xl sm:text-5xl font-bold tracking-tight text-white leading-[1.08]"
            style={{ textWrap: 'balance' }}
          >
            Play classic console &amp; arcade ROMs directly in your browser.
          </h1>
          <p className="mt-4 text-sm sm:text-base text-slate-300 max-w-xl leading-relaxed">
            ngames pairs an isolated self-hosted EmulatorJS runtime with local IndexedDB ROM storage, external Archive.org arcade streams, Web Gamepad calibration, and offline PWA support.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('roms')}
              className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-orange-400 whitespace-nowrap cursor-pointer"
            >
              <Upload className="h-4 w-4" aria-hidden="true" />
              <span>Load ROM / ZIP</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('library')}
              className="inline-flex items-center gap-2 rounded-lg border border-white/[0.12] bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/[0.08] whitespace-nowrap cursor-pointer"
            >
              <span>Browse Library</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <PWAInstallButton variant="subtle" />
          </div>
        </div>

        <div className="lg:col-span-5 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#11151B] min-h-[240px]">
          {!heroImgError ? (
            <img
              src="./images/hero-console.jpg"
              alt="Matte-black retro console and controller on slate stone"
              referrerPolicy="no-referrer"
              onError={() => setHeroImgError(true)}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full min-h-[240px] items-center justify-center bg-gradient-to-br from-[#161C26] to-[#0B0E14] p-8">
              <SystemIcon systemId="snes" className="h-20 w-20 text-slate-600" />
            </div>
          )}
        </div>
      </section>

      {/* 4-column Portal Summary Strip */}
      <section aria-label="Portal summary" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-white/[0.08] bg-[#11151B] p-4 sm:p-5">
          <p className="text-xs text-slate-400">Supported Systems</p>
          <p className="mt-1 font-display text-2xl font-bold text-white tabular-nums">
            {systems.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">Consoles &amp; arcade cores</p>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-[#11151B] p-4 sm:p-5">
          <p className="text-xs text-slate-400">Your ROM Vault</p>
          <p className="mt-1 font-display text-2xl font-bold text-white tabular-nums">
            {storedRoms.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">Stored locally in IndexedDB</p>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-[#11151B] p-4 sm:p-5">
          <p className="text-xs text-slate-400">Verified BIOS Files</p>
          <p className="mt-1 font-display text-2xl font-bold text-white tabular-nums">
            {biosCount}
          </p>
          <p className="mt-1 text-xs text-slate-500">Checked locally via SHA-256</p>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-[#11151B] p-4 sm:p-5">
          <p className="text-xs text-slate-400">Instant-Play Titles</p>
          <p className="mt-1 font-display text-2xl font-bold text-white tabular-nums">
            {catalogGames.filter((g) => Boolean(g.bundledRomUrl || g.embedUrl)).length}
          </p>
          <p className="mt-1 text-xs text-slate-500">Bundled ROMs &amp; embeds</p>
        </div>
      </section>

      {/* Quick Launch Dropzone + Recent Plays */}
      <section className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold text-white">Quick ROM Launchpad</h2>
            <button
              type="button"
              onClick={() => onNavigate('roms')}
              className="text-xs font-medium text-orange-400 hover:text-orange-300 cursor-pointer"
            >
              Embeds, URL loader, M3U &amp; backups →
            </button>
          </div>
          <RomDropzone compact onFilesSelected={onQuickUploadAndPlay} />
        </div>

        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold text-white">Recent Sessions</h2>
            <button
              type="button"
              onClick={() => onNavigate('bios')}
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-white cursor-pointer"
            >
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              <span>BIOS Vault</span>
            </button>
          </div>

          <div className="rounded-xl border border-white/[0.08] bg-[#11151B] divide-y divide-white/[0.06]">
            {recentPlays.length > 0 ? (
              recentPlays.slice(0, 4).map((entry) => {
                const sys = getSystemById(entry.systemId);
                const existsInVault = entry.romId
                  ? storedRoms.some((r) => r.id === entry.romId)
                  : false;
                const bundledGame = entry.romUrl
                  ? catalogGames.find((g) => g.bundledRomUrl === entry.romUrl)
                  : undefined;

                return (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#171C24] text-slate-300">
                        <SystemIcon systemId={entry.systemId} className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{entry.title}</p>
                        <p className="text-xs text-slate-400 truncate">
                          {sys?.shortName ?? entry.systemId} · {entry.romFileName}
                        </p>
                      </div>
                    </div>

                    {entry.romId && existsInVault ? (
                      <button
                        type="button"
                        onClick={() => void onPlayStoredRom(entry.romId!, entry.title)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.08] px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-500 hover:text-slate-950 transition-colors shrink-0 cursor-pointer"
                      >
                        <Play className="h-3 w-3 fill-current" aria-hidden="true" />
                        <span>Resume</span>
                      </button>
                    ) : bundledGame ? (
                      <button
                        type="button"
                        onClick={() => void onPlayBundled(bundledGame)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.08] px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-500 hover:text-slate-950 transition-colors shrink-0 cursor-pointer"
                      >
                        <Play className="h-3 w-3 fill-current" aria-hidden="true" />
                        <span>Play</span>
                      </button>
                    ) : entry.embedUrl || entry.romUrl ? (
                      <button
                        type="button"
                        onClick={() =>
                          onPlayExternalUrl(entry.embedUrl || entry.romUrl!, {
                            systemId: entry.systemId,
                            core: entry.core,
                            title: entry.title,
                          })
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.08] px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-500 hover:text-slate-950 transition-colors shrink-0 cursor-pointer"
                      >
                        <Play className="h-3 w-3 fill-current" aria-hidden="true" />
                        <span>Launch</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onNavigate('roms')}
                        className="text-xs text-slate-400 hover:text-white shrink-0 cursor-pointer"
                      >
                        Reload
                      </button>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="p-6 text-center">
                <p className="text-sm font-medium text-slate-300">No recent sessions yet</p>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                  Click Play Now on any featured game below, or drop a ROM on the left.
                </p>
              </div>
            )}
          </div>

          {storedRoms.length > 0 && (
            <div className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-[#0D1016] px-4 py-2.5 text-xs text-slate-400">
              <span>
                {storedRoms.length} ROM{storedRoms.length === 1 ? '' : 's'} cached locally
              </span>
              <span className="tabular-nums font-mono text-slate-300">
                {formatBytes(storedRoms.reduce((acc, r) => acc + r.sizeBytes, 0))}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* System Quick Jump */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-white">Systems &amp; Cores</h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Select a hardware platform to inspect extensions, BIOS requirements, and compatible titles.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('systems')}
            className="text-xs font-medium text-orange-400 hover:text-orange-300 whitespace-nowrap cursor-pointer"
          >
            All {systems.length} systems →
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {systems.slice(0, 6).map((sys) => (
            <button
              key={sys.id}
              type="button"
              onClick={() => onNavigate('library', { systemFilter: sys.id })}
              className="group flex flex-col items-start rounded-xl border border-white/[0.08] bg-[#11151B] p-4 text-left transition-colors hover:border-white/[0.18] hover:bg-[#151A22] cursor-pointer"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#171C24] text-slate-300 group-hover:text-orange-400 transition-colors">
                <SystemIcon systemId={sys.id} className="h-5 w-5" />
              </div>
              <span className="mt-3 font-display text-sm font-semibold text-white">
                {sys.shortName}
              </span>
              <span className="mt-0.5 font-mono text-[11px] text-slate-500">
                {sys.core}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Featured Instant-Play Homebrew & Arcade Embeds */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-white">
              Featured Instant-Play Games
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Bundled open-source ROMs and playable Internet Archive embeds ready to launch with one click.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => onNavigate('archive')}
              className="text-xs font-medium text-slate-300 hover:text-white whitespace-nowrap cursor-pointer"
            >
              MAME Archive →
            </button>
            <button
              type="button"
              onClick={() => onNavigate('embeds')}
              className="text-xs font-medium text-orange-400 hover:text-orange-300 whitespace-nowrap cursor-pointer"
            >
              Playable Embeds →
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {featuredGames.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              boundRomId={catalogBindings[game.id]}
              onPlayBound={(g, romId) => void onPlayStoredRom(romId, g.title)}
              onPlayBundled={onPlayBundled}
              onPlayEmbed={onPlayEmbed}
              onAttachRom={onAttachRom}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
