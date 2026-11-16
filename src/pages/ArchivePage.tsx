import {
  Check,
  Copy,
  ExternalLink,
  Play,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { SystemIcon } from '../components/SystemIcon';
import {
  fetchArchiveFilesCollection,
  filterMameOriginals,
} from '../services/archiveBrowserService';
import { clearLocalBrowserCache } from '../services/cacheService';
import { formatBytes, sourcesData } from '../services/dataService';
import {
  classifyMameEntry,
  fetchIaMameMetaIfNeeded,
  LETTER_FILTERS,
  loadCachedIaMameMeta,
  MAME_CATEGORIES,
  MAME_ERAS,
  type IaMameMetaRecord,
  type MameCategoryId,
  type MameEraId,
} from '../services/mameMetaService';
import type { ArchiveBrowserEntry } from '../types';

interface ArchivePageProps {
  onPlayExternalUrl: (
    url: string,
    opts?: {
      systemId?: string;
      core?: string;
      title?: string;
      category?: string;
      isNeoGeo?: boolean;
    }
  ) => void;
}

interface EnrichedArchiveEntry {
  entry: ArchiveBrowserEntry;
  displayTitle: string;
  year?: number;
  category: MameCategoryId;
  era: MameEraId;
  firstLetter: string;
}

function ArchiveRomCard({
  item,
  selectedCore,
  onPlay,
}: {
  item: EnrichedArchiveEntry;
  selectedCore: string;
  onPlay: () => void;
}) {
  const { entry, displayTitle, year, category } = item;
  const [imgError, setImgError] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const base = window.location.origin + window.location.pathname;
    const qp = new URLSearchParams();
    qp.set('play', entry.launchUrl);
    qp.set('system', entry.systemId);
    qp.set('core', selectedCore);
    qp.set('title', displayTitle);
    return `${base}?${qp.toString()}`;
  }, [entry, selectedCore, displayTitle]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Ignore clipboard failures
    }
  };

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-[#11151B] transition-colors hover:border-white/[0.16]">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#0D1016]">
        {!imgError && entry.coverUrl ? (
          <img
            src={entry.coverUrl}
            alt={`${displayTitle} arcade boxart`}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#161D28] to-[#0B0E14] p-5 text-center">
            <SystemIcon systemId={entry.systemId} className="h-9 w-9 text-amber-400/80 mb-2" />
            <span className="font-display text-sm font-semibold text-slate-200 line-clamp-2">
              {displayTitle}
            </span>
          </div>
        )}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-[#11151B] via-[#11151B]/50 to-transparent"
        />
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <span className="capitalize">{category}</span>
          {year && (
            <>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{year}</span>
            </>
          )}
          <span aria-hidden="true">·</span>
          <span className="font-mono truncate">{selectedCore}</span>
        </div>

        <h3 className="mt-1.5 font-display text-sm font-semibold text-white line-clamp-1">
          {displayTitle}
        </h3>

        <p className="mt-1 font-mono text-[11px] text-slate-500 truncate">
          {entry.fileName}
          {entry.sizeBytes ? ` · ${formatBytes(entry.sizeBytes)}` : ''}
        </p>

        <div className="mt-3 flex items-center gap-2 pt-3 border-t border-white/[0.06]">
          <button
            type="button"
            onClick={onPlay}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-orange-500 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-orange-400 transition-colors cursor-pointer"
          >
            <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
            <span>Play ROM</span>
          </button>
          <button
            type="button"
            onClick={() => void handleCopyLink()}
            title="Copy direct ?play= URL"
            aria-label={`Copy direct ?play= URL for ${displayTitle}`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] text-slate-400 hover:border-white/[0.2] hover:text-white transition-colors cursor-pointer"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
            ) : (
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </button>
          <a
            href={entry.detailsUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={`View ${displayTitle} on Archive.org`}
            aria-label={`View ${displayTitle} on Archive.org`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] text-slate-400 hover:border-white/[0.2] hover:text-white transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </div>
      </div>
    </article>
  );
}

export function ArchivePage({ onPlayExternalUrl }: ArchivePageProps) {
  const romPresets = useMemo(
    () =>
      (sourcesData.archivePresets ?? []).filter(
        (p) => p.itemId !== 'collection:internetarcade'
      ),
    []
  );

  const [selectedPresetId, setSelectedPresetId] = useState<string>(
    romPresets[0]?.id || 'mame0139-ghostware'
  );
  const [customArchiveId, setCustomArchiveId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [coreOverride, setCoreOverride] = useState<'auto' | 'mame2003_plus' | 'fbneo'>('auto');
  const [hideClones, setHideClones] = useState<boolean>(() => {
    try {
      return localStorage.getItem('ngames_archive_hide_clones_v1') === 'true';
    } catch {
      return false;
    }
  });

  // Smart Filters: Category, ~Era/Year, and First-Letter
  const [selectedCategory, setSelectedCategory] = useState<MameCategoryId>('all');
  const [selectedEra, setSelectedEra] = useState<MameEraId>('all');
  const [selectedLetter, setSelectedLetter] = useState<string>('ALL');

  const [iaMeta, setIaMeta] = useState<Record<string, IaMameMetaRecord>>(() =>
    loadCachedIaMameMeta()
  );
  const [archiveItems, setArchiveItems] = useState<ArchiveBrowserEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cacheMessage, setCacheMessage] = useState<string | null>(null);
  const [limit, setLimit] = useState(16);

  const setCloneMode = (nextHideClones: boolean) => {
    setHideClones(nextHideClones);
    setLimit(16);
    try {
      localStorage.setItem('ngames_archive_hide_clones_v1', String(nextHideClones));
    } catch {
      // Ignore storage failures
    }
  };

  const activePreset = useMemo(
    () => romPresets.find((p) => p.id === selectedPresetId) || romPresets[0],
    [romPresets, selectedPresetId]
  );

  const loadPreset = async (presetId: string) => {
    const preset = romPresets.find((p) => p.id === presetId);
    if (!preset) return;
    setLoading(true);
    setError(null);
    setLimit(16);
    try {
      const items = await fetchArchiveFilesCollection(
        preset.itemId,
        preset.defaultSystemId,
        preset.defaultCore
      );
      setArchiveItems(items);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to reach Archive.org collection metadata.'
      );
      setArchiveItems([]);
    } finally {
      setLoading(false);
    }
  };

  const loadCustomItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customArchiveId.trim()) return;
    setLoading(true);
    setError(null);
    setLimit(16);
    try {
      const items = await fetchArchiveFilesCollection(
        customArchiveId.trim(),
        'arcade',
        coreOverride === 'auto' ? 'mame2003_plus' : coreOverride
      );
      setArchiveItems(items);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to load Archive.org item.'
      );
      setArchiveItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activePreset) {
      void loadPreset(activePreset.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPresetId]);

  // Background enrichment with Archive.org Internet Arcade titles/years/genres
  useEffect(() => {
    let cancelled = false;
    void fetchIaMameMetaIfNeeded().then((map) => {
      if (!cancelled && Object.keys(map).length > 0) {
        setIaMeta(map);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const originalEntries = useMemo(
    () => filterMameOriginals(archiveItems),
    [archiveItems]
  );

  const activeCollectionEntries = hideClones ? originalEntries : archiveItems;

  const enrichedEntries = useMemo<EnrichedArchiveEntry[]>(
    () =>
      activeCollectionEntries.map((entry) => ({
        entry,
        ...classifyMameEntry(entry, iaMeta),
      })),
    [activeCollectionEntries, iaMeta]
  );

  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return enrichedEntries.filter((item) => {
      if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
      if (selectedEra !== 'all' && item.era !== selectedEra) return false;
      if (selectedLetter !== 'ALL' && item.firstLetter !== selectedLetter) return false;
      if (q) {
        const hit =
          item.displayTitle.toLowerCase().includes(q) ||
          item.entry.fileName.toLowerCase().includes(q) ||
          (item.year ? String(item.year).includes(q) : false);
        if (!hit) return false;
      }
      return true;
    });
  }, [enrichedEntries, selectedCategory, selectedEra, selectedLetter, searchQuery]);

  const hasActiveFilters =
    selectedCategory !== 'all' ||
    selectedEra !== 'all' ||
    selectedLetter !== 'ALL' ||
    Boolean(searchQuery.trim());

  const resetFilters = () => {
    setSelectedCategory('all');
    setSelectedEra('all');
    setSelectedLetter('ALL');
    setSearchQuery('');
    setLimit(16);
  };

  const handleClearLocalCache = async () => {
    const res = await clearLocalBrowserCache();
    setCacheMessage(
      `Cleaned ${res.clearedBuckets} cache bucket${res.clearedBuckets === 1 ? '' : 's'}`
    );
    window.setTimeout(() => setCacheMessage(null), 3000);
    if (activePreset) {
      void loadPreset(activePreset.id);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-white">
          External Archive.org Arcade &amp; MAME Directory
        </h1>
        <p className="mt-1 text-sm text-slate-400 max-w-3xl">
          Browse MAME 0.139 &amp; MAME 2010 external ROM collections with smart category, ~era/year, and A–Z filters.
        </p>
      </div>

      {/* Controls & Smart Filters Card */}
      <div className="space-y-4 rounded-xl border border-white/[0.08] bg-[#11151B] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {romPresets.map((preset) => {
              const active = preset.id === selectedPresetId;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setSelectedPresetId(preset.id)}
                  className={`rounded-lg px-3.5 py-2 text-xs font-medium transition-colors cursor-pointer ${
                    active
                      ? 'bg-orange-500 text-slate-950 font-semibold'
                      : 'border border-white/[0.08] bg-[#090B0E] text-slate-300 hover:text-white'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            {/* Load Option Toggle: Normal (All) vs Hide Clones (Originals Only) */}
            <div
              className="inline-flex items-center rounded-lg border border-white/[0.1] bg-[#090B0E] p-0.5"
              role="group"
              aria-label="ROM list clone filter"
            >
              <button
                type="button"
                onClick={() => setCloneMode(false)}
                className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                  !hideClones
                    ? 'bg-orange-500 text-slate-950 font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                All ({archiveItems.length.toLocaleString()})
              </button>
              <button
                type="button"
                onClick={() => setCloneMode(true)}
                className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                  hideClones
                    ? 'bg-orange-500 text-slate-950 font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Hide Clones ({originalEntries.length.toLocaleString()})
              </button>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="archive-core-select" className="text-slate-400">
                Core:
              </label>
              <select
                id="archive-core-select"
                value={coreOverride}
                onChange={(e) =>
                  setCoreOverride(e.target.value as 'auto' | 'mame2003_plus' | 'fbneo')
                }
                className="h-9 rounded-lg border border-white/[0.1] bg-[#090B0E] px-3 text-xs text-slate-200 focus:border-orange-500 focus:outline-none"
              >
                <option value="auto">Auto (Preset Default)</option>
                <option value="mame2003_plus">MAME 2003 Plus (0.78–0.139)</option>
                <option value="fbneo">FinalBurn Neo (Arcade / Neo Geo)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setLimit(16);
              }}
              placeholder="Search title, ROM zip, or year (e.g. 1942, pacman, outrun, 1987)..."
              aria-label="Filter Archive.org MAME ROMs"
              className="h-10 w-full rounded-lg border border-white/[0.1] bg-[#090B0E] pl-9 pr-3 text-xs text-white placeholder:text-slate-500 focus:border-orange-500 focus:outline-none"
            />
          </div>

          <form onSubmit={(e) => void loadCustomItem(e)} className="flex items-center gap-2">
            <input
              type="text"
              value={customArchiveId}
              onChange={(e) => setCustomArchiveId(e.target.value)}
              placeholder="Custom archive.org item ID..."
              aria-label="Custom Archive.org item identifier"
              className="h-10 w-52 sm:w-64 rounded-lg border border-white/[0.1] bg-[#090B0E] px-3 text-xs text-white placeholder:text-slate-500 focus:border-orange-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-white/[0.12] bg-white/[0.06] px-3.5 text-xs font-medium text-white hover:bg-white/[0.12] disabled:opacity-50 whitespace-nowrap cursor-pointer"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              <span>Load ID</span>
            </button>
          </form>
        </div>

        {/* Smart Category, ~Era/Year, Match Count, and Clear Cache Bar */}
        <div className="flex flex-col gap-3 border-t border-white/[0.06] pt-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value as MameCategoryId);
                setLimit(16);
              }}
              aria-label="Filter by category"
              className="h-9 rounded-lg border border-white/[0.1] bg-[#090B0E] px-3 text-xs text-slate-200 focus:border-orange-500 focus:outline-none"
            >
              {MAME_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>

            <select
              value={selectedEra}
              onChange={(e) => {
                setSelectedEra(e.target.value as MameEraId);
                setLimit(16);
              }}
              aria-label="Filter by era or year"
              className="h-9 rounded-lg border border-white/[0.1] bg-[#090B0E] px-3 text-xs text-slate-200 focus:border-orange-500 focus:outline-none"
            >
              {MAME_ERAS.map((era) => (
                <option key={era.id} value={era.id}>
                  {era.label}
                </option>
              ))}
            </select>

            <span className="font-mono text-xs text-slate-300 tabular-nums px-1.5">
              {filteredEntries.length.toLocaleString()} matching
            </span>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs font-medium text-orange-400 hover:text-orange-300 cursor-pointer"
              >
                Reset filters
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {cacheMessage && (
              <span className="text-xs text-emerald-400 font-medium">{cacheMessage}</span>
            )}
            <button
              type="button"
              onClick={() => void handleClearLocalCache()}
              title="Clear local Archive index, metadata, and thumbnail caches (keeps your ROM/BIOS Vault)"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/[0.12] bg-white/[0.04] px-3 text-xs font-medium text-slate-300 hover:border-orange-500/40 hover:text-white transition-colors cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5 text-orange-400" aria-hidden="true" />
              <span>Clear Local Cache</span>
            </button>
          </div>
        </div>

        {/* First-Letter A-Z / 0-9 Index Strip */}
        <div
          className="flex flex-wrap items-center gap-1 border-t border-white/[0.06] pt-3"
          role="group"
          aria-label="Filter ROMs by starting letter"
        >
          {LETTER_FILTERS.map((letter) => {
            const active = selectedLetter === letter;
            return (
              <button
                key={letter}
                type="button"
                onClick={() => {
                  setSelectedLetter(letter);
                  setLimit(16);
                }}
                className={`min-w-[28px] h-7 rounded px-1.5 font-mono text-[11px] font-medium transition-colors cursor-pointer ${
                  active
                    ? 'bg-orange-500 text-slate-950 font-semibold'
                    : 'bg-[#090B0E] text-slate-400 hover:bg-white/[0.08] hover:text-white'
                }`}
              >
                {letter}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-amber-500/30 bg-amber-950/25 p-4 text-xs text-amber-200"
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-64 rounded-xl border border-white/[0.06] bg-[#11151B]"
            />
          ))}
        </div>
      ) : filteredEntries.length > 0 ? (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {filteredEntries.slice(0, limit).map((item) => {
              const targetCore = coreOverride === 'auto' ? item.entry.core : coreOverride;
              return (
                <ArchiveRomCard
                  key={item.entry.id}
                  item={item}
                  selectedCore={targetCore}
                  onPlay={() =>
                    onPlayExternalUrl(item.entry.launchUrl, {
                      systemId: item.entry.systemId,
                      core: targetCore,
                      title: item.displayTitle,
                      category: item.category,
                      isNeoGeo: item.category === 'neogeo',
                    })
                  }
                />
              );
            })}
          </div>

          {filteredEntries.length > limit && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setLimit((n) => n + 20)}
                className="rounded-lg border border-white/[0.12] bg-[#11151B] px-5 py-2.5 text-xs font-medium text-white hover:bg-white/[0.08] cursor-pointer"
              >
                Show More ({filteredEntries.length - limit} remaining)
              </button>
            </div>
          )}
        </>
      ) : (
        !error && (
          <div className="rounded-xl border border-white/[0.08] bg-[#11151B] p-8 text-center text-xs text-slate-400">
            No Archive.org ROM entries match your active filters.
          </div>
        )
      )}
    </div>
  );
}
