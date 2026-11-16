import {
  ArrowRight,
  FolderUp,
  ImagePlus,
  Layers,
  LayoutGrid,
  Play,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { GameCard } from '../components/GameCard';
import { SystemIcon } from '../components/SystemIcon';
import { findLibretroCoverUrl, processLocalCoverImage } from '../services/coverArtService';
import {
  catalogGames,
  categories,
  formatBytes,
  getSystemById,
  systems,
} from '../services/dataService';
import type { CatalogGame, ModuleRoute, StoredRomMeta } from '../types';

interface LibraryPageProps {
  initialSystemFilter: string;
  storedRoms: StoredRomMeta[];
  catalogBindings: Record<string, string>;
  onNavigate: (route: ModuleRoute) => void;
  onPlayStoredRom: (romId: string, overrideTitle?: string) => Promise<void>;
  onPlayBundled: (game: CatalogGame) => Promise<void>;
  onPlayEmbed: (game: CatalogGame) => void;
  onDeleteStoredRom: (romId: string) => Promise<void>;
  onUpdateRomCover: (romId: string, coverDataUrl: string | undefined) => Promise<void>;
  onUpdateRomCategory: (romId: string, category: string) => Promise<void>;
  onAttachRom: (game: CatalogGame) => void;
}

function VaultRomCoverCard({
  rom,
  onPlay,
  onDelete,
  onUpdateCover,
  onUpdateCategory,
}: {
  rom: StoredRomMeta;
  onPlay: () => void;
  onDelete: () => void;
  onUpdateCover: (coverDataUrl: string | undefined) => Promise<void>;
  onUpdateCategory: (category: string) => Promise<void>;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [imgError, setImgError] = useState(false);
  const [fetchingCover, setFetchingCover] = useState(false);
  const [coverNotice, setCoverNotice] = useState<string | null>(null);
  const sys = getSystemById(rom.systemId);
  const genreOptions = categories.filter((c) => c.id !== 'all');

  useEffect(() => {
    setImgError(false);
  }, [rom.coverDataUrl]);

  const handleUploadCover = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setCoverNotice(null);
    setFetchingCover(true);
    try {
      const dataUrl = await processLocalCoverImage(files[0]);
      await onUpdateCover(dataUrl);
      setCoverNotice('Cover saved');
    } catch (err) {
      setCoverNotice(err instanceof Error ? err.message : 'Invalid image');
    } finally {
      setFetchingCover(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAutoFetchCover = async () => {
    setCoverNotice(null);
    setFetchingCover(true);
    try {
      const url = await findLibretroCoverUrl(rom.title, rom.systemId, rom.fileName);
      if (url) {
        await onUpdateCover(url);
        setCoverNotice('Libretro art applied');
      } else {
        setCoverNotice('No match on Libretro CDN');
      }
    } finally {
      setFetchingCover(false);
    }
  };

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-[#11151B] transition-colors hover:border-white/[0.16]">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#0D1016]">
        {!imgError && rom.coverDataUrl ? (
          <img
            src={rom.coverDataUrl}
            alt={`${rom.title} cover art`}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#161D28] to-[#0B0E14] p-5 text-center">
            <SystemIcon systemId={rom.systemId} className="h-10 w-10 text-orange-400/80 mb-2.5" />
            <span className="font-display text-sm font-semibold text-slate-200 line-clamp-2">
              {rom.title}
            </span>
            <span className="mt-1 font-mono text-[11px] text-slate-500">{rom.extension}</span>
          </div>
        )}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-[#11151B] via-[#11151B]/50 to-transparent"
        />

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(e) => void handleUploadCover(e.target.files)}
          className="hidden"
          aria-label={`Upload cover art for ${rom.title}`}
        />

        <div className="absolute right-2.5 top-2.5 flex items-center gap-1.5">
          <button
            type="button"
            disabled={fetchingCover}
            onClick={() => void handleAutoFetchCover()}
            title="Auto-fetch boxart from Libretro Thumbnails"
            aria-label={`Auto-fetch cover art for ${rom.title}`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.14] bg-[#090B0E]/85 text-slate-200 hover:border-orange-500/60 hover:text-orange-400 disabled:opacity-50 backdrop-blur-sm cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            disabled={fetchingCover}
            onClick={() => fileInputRef.current?.click()}
            title="Upload local cover art image"
            aria-label={`Upload local cover art for ${rom.title}`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.14] bg-[#090B0E]/85 text-slate-200 hover:border-orange-500/60 hover:text-orange-400 disabled:opacity-50 backdrop-blur-sm cursor-pointer"
          >
            <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <span>{sys?.shortName ?? rom.systemId}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono">{rom.core}</span>
          {rom.headerInfo?.region && (
            <>
              <span aria-hidden="true">·</span>
              <span>{rom.headerInfo.region}</span>
            </>
          )}
        </div>

        <h3 className="mt-1.5 font-display text-base font-semibold text-white truncate">
          {rom.title}
        </h3>

        <p className="mt-1 font-mono text-[11px] text-slate-500 truncate">
          {rom.fileName} · {formatBytes(rom.sizeBytes)}
        </p>

        <div className="mt-3 flex items-center justify-between gap-2">
          <select
            value={rom.category || 'action'}
            onChange={(e) => void onUpdateCategory(e.target.value)}
            aria-label={`Genre for ${rom.title}`}
            className="h-7 rounded-md border border-white/[0.1] bg-[#090B0E] px-2 text-[11px] text-slate-300 focus:border-orange-500 focus:outline-none"
          >
            {genreOptions.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          {coverNotice && (
            <span className="text-[11px] text-orange-300 truncate">{coverNotice}</span>
          )}
        </div>

        <div className="mt-3 flex items-center gap-2 pt-3 border-t border-white/[0.06]">
          <button
            type="button"
            onClick={onPlay}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-orange-500 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-orange-400 transition-colors cursor-pointer"
          >
            <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
            <span>Launch Game</span>
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label={`Delete ${rom.title} from local vault`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] text-slate-400 hover:border-red-500/40 hover:text-red-400 transition-colors cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  );
}

export function LibraryPage({
  initialSystemFilter,
  storedRoms,
  catalogBindings,
  onNavigate,
  onPlayStoredRom,
  onPlayBundled,
  onPlayEmbed,
  onDeleteStoredRom,
  onUpdateRomCover,
  onUpdateRomCategory,
  onAttachRom,
}: LibraryPageProps) {
  const [search, setSearch] = useState('');
  const [selectedSystem, setSelectedSystem] = useState<string>(initialSystemFilter || 'all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'title' | 'year'>('title');
  const [groupByGenre, setGroupByGenre] = useState(true);

  useEffect(() => {
    setSelectedSystem(initialSystemFilter || 'all');
  }, [initialSystemFilter]);

  const filteredVaultRoms = useMemo(() => {
    const q = search.trim().toLowerCase();
    return storedRoms.filter((rom) => {
      const matchesSys = selectedSystem === 'all' || rom.systemId === selectedSystem;
      const romGenre = rom.category || 'action';
      const matchesCat = selectedCategory === 'all' || romGenre === selectedCategory;
      const matchesQuery =
        !q ||
        rom.title.toLowerCase().includes(q) ||
        rom.fileName.toLowerCase().includes(q) ||
        rom.core.toLowerCase().includes(q) ||
        (rom.headerInfo?.internalTitle?.toLowerCase().includes(q) ?? false);
      return matchesSys && matchesCat && matchesQuery;
    });
  }, [storedRoms, selectedSystem, selectedCategory, search]);

  const filteredCatalog = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = catalogGames.filter((game) => {
      const matchesSys = selectedSystem === 'all' || game.systemId === selectedSystem;
      const matchesCat = selectedCategory === 'all' || game.category === selectedCategory;
      const matchesQuery =
        !q ||
        game.title.toLowerCase().includes(q) ||
        game.developer.toLowerCase().includes(q) ||
        game.description.toLowerCase().includes(q);
      return matchesSys && matchesCat && matchesQuery;
    });
    return [...list].sort((a, b) =>
      sortBy === 'year' ? b.year - a.year : a.title.localeCompare(b.title)
    );
  }, [search, selectedSystem, selectedCategory, sortBy]);

  const catalogByGenre = useMemo(() => {
    const genreList = categories.filter((c) => c.id !== 'all');
    return genreList
      .map((genre) => ({
        genre,
        games: filteredCatalog.filter((g) => g.category === genre.id),
      }))
      .filter((group) => group.games.length > 0);
  }, [filteredCatalog]);

  return (
    <div className="space-y-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-white">
            Game Library
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Browse your stored ROM vault and bundled open-source titles grouped by genre, or jump to Archive &amp; Embeds for thousands of external arcade games.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => onNavigate('archive')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.12] bg-[#11151B] px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-white/[0.06] whitespace-nowrap cursor-pointer"
          >
            <span>MAME Archive</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onNavigate('embeds')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.12] bg-[#11151B] px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-white/[0.06] whitespace-nowrap cursor-pointer"
          >
            <span>Embeds</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onNavigate('roms')}
            className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-orange-400 transition-colors whitespace-nowrap cursor-pointer"
          >
            <FolderUp className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Add ROM / ZIP</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="space-y-4 rounded-xl border border-white/[0.08] bg-[#11151B] p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search titles, internal headers, developers, filenames, or cores..."
              aria-label="Search games"
              className="h-10 w-full rounded-lg border border-white/[0.1] bg-[#090B0E] pl-9 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-orange-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={selectedSystem}
              onChange={(e) => setSelectedSystem(e.target.value)}
              aria-label="Filter by console system"
              className="h-10 rounded-lg border border-white/[0.1] bg-[#090B0E] px-3 text-xs font-medium text-slate-200 focus:border-orange-500 focus:outline-none"
            >
              <option value="all">All Systems ({systems.length})</option>
              {systems.map((sys) => (
                <option key={sys.id} value={sys.id}>
                  {sys.shortName} — {sys.name}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'title' | 'year')}
              aria-label="Sort catalog"
              className="h-10 rounded-lg border border-white/[0.1] bg-[#090B0E] px-3 text-xs font-medium text-slate-200 focus:border-orange-500 focus:outline-none"
            >
              <option value="title">Sort: Title (A–Z)</option>
              <option value="year">Sort: Release Year</option>
            </select>

            <div className="inline-flex rounded-lg border border-white/[0.1] bg-[#090B0E] p-1">
              <button
                type="button"
                onClick={() => setGroupByGenre(true)}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                  groupByGenre ? 'bg-orange-500 text-slate-950 font-semibold' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="h-3.5 w-3.5" aria-hidden="true" />
                <span>By Genre</span>
              </button>
              <button
                type="button"
                onClick={() => setGroupByGenre(false)}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                  !groupByGenre ? 'bg-orange-500 text-slate-950 font-semibold' : 'text-slate-400 hover:text-white'
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Flat Grid</span>
              </button>
            </div>
          </div>
        </div>

        {/* Genre segmented tabs */}
        <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Genre filter">
          {categories.map((cat) => {
            const active = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSelectedCategory(cat.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-orange-500 text-slate-950 font-semibold'
                    : 'bg-[#090B0E] text-slate-400 hover:text-white'
                }`}
              >
                {cat.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Stored Local ROMs Cover Grid */}
      <section className="space-y-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-lg font-bold text-white">
              Your Browser ROM Vault ({filteredVaultRoms.length})
            </h2>
            <p className="text-xs text-slate-400">
              Upload local cover images or click the sparkle icon to fetch official Libretro boxart automatically.
            </p>
          </div>
          {storedRoms.length > 0 && (
            <span className="text-xs text-slate-400">Stored locally in IndexedDB</span>
          )}
        </div>

        {filteredVaultRoms.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {filteredVaultRoms.map((rom) => (
              <VaultRomCoverCard
                key={rom.id}
                rom={rom}
                onPlay={() => void onPlayStoredRom(rom.id, rom.title)}
                onDelete={() => void onDeleteStoredRom(rom.id)}
                onUpdateCover={(dataUrl) => onUpdateRomCover(rom.id, dataUrl)}
                onUpdateCategory={(cat) => onUpdateRomCategory(rom.id, cat)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-white/[0.08] bg-[#11151B] p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-200">
                {storedRoms.length === 0
                  ? 'Your browser ROM vault is empty'
                  : 'No stored ROMs match the active filter'}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Upload local .nes, .sfc, .gb, .gbc, .gba, .md, or .zip ROM files, or play an instant-play title below.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('roms')}
              className="rounded-lg border border-white/[0.12] bg-white/[0.05] px-4 py-2 text-xs font-medium text-white hover:bg-white/[0.1] whitespace-nowrap self-start sm:self-auto cursor-pointer"
            >
              Open ROM Loader
            </button>
          </div>
        )}
      </section>

      {/* Catalog Grouped by Genre (categories.json) or Flat Grid */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-bold text-white">
              Homebrew &amp; Instant-Play Catalog ({filteredCatalog.length})
            </h2>
            <p className="text-xs text-slate-400">
              Bundled open-source ROMs and featured embeds organized by genre
            </p>
          </div>
        </div>

        {filteredCatalog.length > 0 ? (
          groupByGenre && selectedCategory === 'all' ? (
            <div className="space-y-8">
              {catalogByGenre.map(({ genre, games }) => (
                <div key={genre.id} className="space-y-3">
                  <div className="flex items-baseline justify-between border-b border-white/[0.08] pb-2">
                    <div>
                      <h3 className="font-display text-base font-bold text-white">{genre.name}</h3>
                      <p className="text-xs text-slate-400">{genre.description}</p>
                    </div>
                    <span className="text-xs font-mono text-slate-400 tabular-nums">
                      {games.length} {games.length === 1 ? 'title' : 'titles'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    {games.map((game) => {
                      const boundId = catalogBindings[game.id];
                      const isBoundValid =
                        boundId && storedRoms.some((r) => r.id === boundId) ? boundId : undefined;
                      return (
                        <GameCard
                          key={game.id}
                          game={game}
                          boundRomId={isBoundValid}
                          onPlayBound={(g, romId) => void onPlayStoredRom(romId, g.title)}
                          onPlayBundled={onPlayBundled}
                          onPlayEmbed={onPlayEmbed}
                          onAttachRom={onAttachRom}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {filteredCatalog.map((game) => {
                const boundId = catalogBindings[game.id];
                const isBoundValid =
                  boundId && storedRoms.some((r) => r.id === boundId) ? boundId : undefined;
                return (
                  <GameCard
                    key={game.id}
                    game={game}
                    boundRomId={isBoundValid}
                    onPlayBound={(g, romId) => void onPlayStoredRom(romId, g.title)}
                    onPlayBundled={onPlayBundled}
                    onPlayEmbed={onPlayEmbed}
                    onAttachRom={onAttachRom}
                  />
                );
              })}
            </div>
          )
        ) : (
          <div className="rounded-xl border border-white/[0.08] bg-[#11151B] p-10 text-center">
            <p className="text-sm font-medium text-slate-200">No catalog entries match your filters</p>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setSelectedSystem('all');
                setSelectedCategory('all');
              }}
              className="mt-3 rounded-lg border border-white/[0.12] px-4 py-2 text-xs font-medium text-white hover:bg-white/[0.06] cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
