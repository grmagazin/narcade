import {
  AlertCircle,
  Check,
  Code2,
  Copy,
  ExternalLink,
  Globe,
  Play,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { SystemIcon } from '../components/SystemIcon';
import {
  extractEmbedUrl,
  searchInternetArcadeEmbeds,
} from '../services/archiveBrowserService';
import { categories, defaultEmbeds, getSystemById } from '../services/dataService';
import type { ArchiveBrowserEntry, EmbedCatalogItem } from '../types';

interface EmbedsPageProps {
  onPlayEmbed: (title: string, embedUrl: string, systemId?: string) => void;
}

const CUSTOM_EMBEDS_KEY = 'ngames_custom_embeds_v1';

function normalizeEmbedUrl(url: string): string {
  return url.trim().replace(/\/+$/, '').toLowerCase();
}

function loadCustomEmbeds(): EmbedCatalogItem[] {
  try {
    const raw = localStorage.getItem(CUSTOM_EMBEDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCustomEmbeds(items: EmbedCatalogItem[]) {
  try {
    localStorage.setItem(CUSTOM_EMBEDS_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage quota errors
  }
}

function EmbedCard({
  item,
  isCustom,
  onPlay,
  onDeleteCustom,
}: {
  item: EmbedCatalogItem;
  isCustom?: boolean;
  onPlay: () => void;
  onDeleteCustom?: () => void;
}) {
  const [imgError, setImgError] = useState(false);
  const [copied, setCopied] = useState(false);
  const sys = getSystemById(item.systemId);

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const base = window.location.origin + window.location.pathname;
    const qp = new URLSearchParams();
    qp.set('play', item.embedUrl);
    qp.set('system', item.systemId);
    qp.set('title', item.title);
    return `${base}?${qp.toString()}`;
  }, [item]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Ignore clipboard errors
    }
  };

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-[#11151B] transition-colors hover:border-white/[0.16]">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#0D1016]">
        {!imgError && item.coverUrl ? (
          <img
            src={item.coverUrl}
            alt={`${item.title} cover art`}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#161D28] to-[#0B0E14] p-5 text-center">
            <SystemIcon systemId={item.systemId} className="h-10 w-10 text-orange-400/80 mb-2" />
            <span className="font-display text-sm font-semibold text-slate-200 line-clamp-2">
              {item.title}
            </span>
            <span className="mt-1 text-[11px] text-slate-500">{item.provider}</span>
          </div>
        )}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-[#11151B] via-[#11151B]/50 to-transparent"
        />
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <span>{sys?.shortName ?? item.systemId}</span>
          <span aria-hidden="true">·</span>
          <span className="capitalize">{item.category}</span>
          <span aria-hidden="true">·</span>
          <span className="truncate">{item.provider}</span>
        </div>

        <h3 className="mt-1.5 font-display text-sm font-semibold text-white line-clamp-1">
          {item.title}
        </h3>

        <p className="mt-1 font-mono text-[11px] text-slate-500 truncate">
          {item.embedUrl.replace(/^https?:\/\//, '')}
        </p>

        <div className="mt-3 flex items-center gap-2 pt-3 border-t border-white/[0.06]">
          <button
            type="button"
            onClick={onPlay}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-orange-500 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-orange-400 transition-colors cursor-pointer"
          >
            <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
            <span>Play Embed</span>
          </button>

          <button
            type="button"
            onClick={() => void handleCopy()}
            title="Copy ?play= embed link"
            aria-label={`Copy ?play= link for ${item.title}`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] text-slate-400 hover:border-white/[0.2] hover:text-white transition-colors cursor-pointer"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
            ) : (
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </button>

          {isCustom && onDeleteCustom ? (
            <button
              type="button"
              onClick={onDeleteCustom}
              title="Remove saved custom embed"
              aria-label={`Remove ${item.title}`}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] text-slate-400 hover:border-red-500/40 hover:text-red-400 transition-colors cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          ) : (
            item.detailsUrl && (
              <a
                href={item.detailsUrl}
                target="_blank"
                rel="noopener noreferrer"
                title={`Source page for ${item.title}`}
                aria-label={`Open source page for ${item.title}`}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] text-slate-400 hover:border-white/[0.2] hover:text-white transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            )
          )}
        </div>
      </div>
    </article>
  );
}

export function EmbedsPage({ onPlayEmbed }: EmbedsPageProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [customEmbeds, setCustomEmbeds] = useState<EmbedCatalogItem[]>(() => loadCustomEmbeds());

  // Add / Launch custom <iframe> form
  const [iframeInput, setIframeInput] = useState('');
  const [iframeTitle, setIframeTitle] = useState('');
  const [iframeCategory, setIframeCategory] = useState('arcade');
  const [formError, setFormError] = useState<string | null>(null);
  const [formNotice, setFormNotice] = useState<string | null>(null);

  // Live Archive.org Internet Arcade Search
  const [iaSearchQuery, setIaSearchQuery] = useState('');
  const [iaResults, setIaResults] = useState<ArchiveBrowserEntry[]>([]);
  const [iaLoading, setIaLoading] = useState(false);
  const [iaError, setIaError] = useState<string | null>(null);

  // Combine custom + default embeds with strict URL deduplication
  const allEmbeds = useMemo(() => {
    const seen = new Set<string>();
    const combined: Array<EmbedCatalogItem & { isCustom?: boolean }> = [];

    for (const item of customEmbeds) {
      const key = normalizeEmbedUrl(item.embedUrl);
      if (seen.has(key)) continue;
      seen.add(key);
      combined.push({ ...item, isCustom: true });
    }
    for (const item of defaultEmbeds) {
      const key = normalizeEmbedUrl(item.embedUrl);
      if (seen.has(key)) continue;
      seen.add(key);
      combined.push(item);
    }
    return combined;
  }, [customEmbeds]);

  const filteredEmbeds = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allEmbeds.filter((item) => {
      const matchesCat = selectedCategory === 'all' || item.category === selectedCategory;
      const matchesQuery =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.provider.toLowerCase().includes(q) ||
        item.embedUrl.toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    });
  }, [allEmbeds, search, selectedCategory]);

  const handleAddOrLaunchEmbed = (saveToCollection: boolean) => {
    setFormError(null);
    setFormNotice(null);
    const extracted = extractEmbedUrl(iframeInput);
    if (!extracted) {
      setFormError(
        'Paste a valid <iframe src="..."> snippet or direct https:// embed URL.'
      );
      return;
    }

    const fallbackTitle =
      iframeTitle.trim() ||
      decodeURIComponent(extracted.split('/').filter(Boolean).pop() || 'External Embed')
        .replace(/^arcade_/i, '')
        .replace(/[_-]+/g, ' ');

    if (!saveToCollection) {
      onPlayEmbed(fallbackTitle, extracted, 'arcade');
      return;
    }

    const norm = normalizeEmbedUrl(extracted);
    const duplicate = allEmbeds.some((e) => normalizeEmbedUrl(e.embedUrl) === norm);
    if (duplicate) {
      setFormError('This embed URL is already in your Embeds collection (duplicate skipped).');
      return;
    }

    const newItem: EmbedCatalogItem = {
      id: `custom_embed_${Date.now()}`,
      title: fallbackTitle,
      systemId: 'arcade',
      category: iframeCategory,
      provider: extracted.includes('archive.org') ? 'Internet Archive' : 'Custom Embed',
      embedUrl: extracted,
    };
    const next = [newItem, ...customEmbeds];
    setCustomEmbeds(next);
    saveCustomEmbeds(next);
    setIframeInput('');
    setIframeTitle('');
    setFormNotice(`Added "${fallbackTitle}" to your Embeds collection.`);
  };

  const handleDeleteCustom = (id: string) => {
    const next = customEmbeds.filter((item) => item.id !== id);
    setCustomEmbeds(next);
    saveCustomEmbeds(next);
  };

  const handleSearchInternetArcade = async (e: React.FormEvent) => {
    e.preventDefault();
    setIaLoading(true);
    setIaError(null);
    try {
      const results = await searchInternetArcadeEmbeds(iaSearchQuery, 32);
      const existingUrls = new Set(allEmbeds.map((item) => normalizeEmbedUrl(item.embedUrl)));
      // Deduplicate against already listed default/custom embeds
      setIaResults(
        results.filter((entry) => !existingUrls.has(normalizeEmbedUrl(entry.launchUrl)))
      );
    } catch (err) {
      setIaError(
        err instanceof Error ? err.message : 'Unable to search Internet Archive embeds.'
      );
    } finally {
      setIaLoading(false);
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-white">
            Internet Arcade &amp; Playable Embeds
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {allEmbeds.length} curated deduplicated arcade, console, and web embeds ready to launch centered inside the Player.
          </p>
        </div>
      </div>

      {/* Add Custom Iframe Embed */}
      <section className="rounded-xl border border-white/[0.08] bg-[#11151B] p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Code2 className="h-4 w-4 text-orange-400" aria-hidden="true" />
          <h2 className="font-display text-base font-bold text-white">
            Add or Launch Custom <code className="font-mono text-orange-300">&lt;iframe&gt;</code> Embed
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <input
            type="text"
            value={iframeInput}
            onChange={(e) => setIframeInput(e.target.value)}
            placeholder='Paste <iframe src="https://archive.org/embed/..."> or embed URL...'
            aria-label="Iframe code or embed URL"
            className="md:col-span-5 h-10 rounded-lg border border-white/[0.12] bg-[#090B0E] px-3 font-mono text-xs text-white placeholder:text-slate-500 focus:border-orange-500 focus:outline-none"
          />
          <input
            type="text"
            value={iframeTitle}
            onChange={(e) => setIframeTitle(e.target.value)}
            placeholder="Title (optional)..."
            aria-label="Custom embed title"
            className="md:col-span-2 h-10 rounded-lg border border-white/[0.12] bg-[#090B0E] px-3 text-xs text-white placeholder:text-slate-500 focus:border-orange-500 focus:outline-none"
          />
          <select
            value={iframeCategory}
            onChange={(e) => setIframeCategory(e.target.value)}
            aria-label="Custom embed genre"
            className="md:col-span-2 h-10 rounded-lg border border-white/[0.12] bg-[#090B0E] px-2.5 text-xs text-slate-200 focus:border-orange-500 focus:outline-none"
          >
            {categories
              .filter((c) => c.id !== 'all')
              .map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
          </select>
          <div className="md:col-span-3 flex items-center gap-2">
            <button
              type="button"
              disabled={!iframeInput.trim()}
              onClick={() => handleAddOrLaunchEmbed(true)}
              className="flex-1 h-10 inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/[0.12] bg-white/[0.06] px-3 text-xs font-medium text-white hover:bg-white/[0.12] disabled:opacity-40 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Save</span>
            </button>
            <button
              type="button"
              disabled={!iframeInput.trim()}
              onClick={() => handleAddOrLaunchEmbed(false)}
              className="flex-1 h-10 inline-flex items-center justify-center gap-1.5 rounded-lg bg-orange-500 px-3 text-xs font-semibold text-slate-950 hover:bg-orange-400 disabled:opacity-40 cursor-pointer"
            >
              <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
              <span>Play</span>
            </button>
          </div>
        </div>

        {formError && (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-950/30 px-3 py-2 text-xs text-red-200"
          >
            <AlertCircle className="h-4 w-4 text-red-400 shrink-0" aria-hidden="true" />
            <span>{formError}</span>
          </div>
        )}
        {formNotice && (
          <div
            role="status"
            className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-950/25 px-3 py-2 text-xs text-emerald-200"
          >
            <Check className="h-4 w-4 text-emerald-400 shrink-0" aria-hidden="true" />
            <span>{formNotice}</span>
          </div>
        )}
      </section>

      {/* Filter & Genre Tabs */}
      <div className="space-y-4 rounded-xl border border-white/[0.08] bg-[#11151B] p-4">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter curated embeds by title, provider (Internet Archive, RetroGames.cc, PlayPager)..."
            aria-label="Filter playable embeds"
            className="h-10 w-full rounded-lg border border-white/[0.1] bg-[#090B0E] pl-9 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-orange-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Embed genre filter">
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

      {/* Curated Deduplicated Embeds Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-white">
            Default &amp; Saved Embeds ({filteredEmbeds.length})
          </h2>
          <span className="text-xs text-slate-400">Duplicates automatically removed</span>
        </div>

        {filteredEmbeds.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {filteredEmbeds.map((item) => (
              <EmbedCard
                key={item.id}
                item={item}
                isCustom={item.isCustom}
                onPlay={() => onPlayEmbed(item.title, item.embedUrl, item.systemId)}
                onDeleteCustom={item.isCustom ? () => handleDeleteCustom(item.id) : undefined}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-white/[0.08] bg-[#11151B] p-8 text-center text-xs text-slate-400">
            No curated embeds match your search filter.
          </div>
        )}
      </section>

      {/* Live Search Internet Archive: collection:internetarcade */}
      <section className="space-y-4 rounded-xl border border-white/[0.08] bg-[#11151B] p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-orange-400" aria-hidden="true" />
            <div>
              <h2 className="font-display text-lg font-bold text-white">
                Search Full Internet Arcade Catalog (Archive.org)
              </h2>
              <p className="text-xs text-slate-400">
                Query thousands of additional playable arcade embeds directly from Archive.org.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={(e) => void handleSearchInternetArcade(e)} className="flex flex-col gap-2 sm:flex-row">
          <input
            type="search"
            value={iaSearchQuery}
            onChange={(e) => setIaSearchQuery(e.target.value)}
            placeholder="Search Internet Arcade (e.g. donkey, defender, space invaders, gaunt, street fighter)..."
            aria-label="Search Internet Archive arcade embeds"
            className="h-10 flex-1 rounded-lg border border-white/[0.1] bg-[#090B0E] px-3 text-xs text-white placeholder:text-slate-500 focus:border-orange-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={iaLoading}
            className="h-10 rounded-lg bg-orange-500 px-5 text-xs font-semibold text-slate-950 hover:bg-orange-400 disabled:opacity-50 whitespace-nowrap cursor-pointer"
          >
            {iaLoading ? 'Searching...' : 'Search Internet Arcade'}
          </button>
        </form>

        {iaError && (
          <p className="text-xs text-amber-300">{iaError}</p>
        )}

        {iaResults.length > 0 && (
          <div className="grid grid-cols-1 gap-5 pt-2 sm:grid-cols-2 lg:grid-cols-4">
            {iaResults.map((entry) => (
              <EmbedCard
                key={entry.id}
                item={{
                  id: entry.id,
                  title: entry.title,
                  systemId: entry.systemId,
                  category: 'arcade',
                  provider: 'Internet Archive',
                  embedUrl: entry.launchUrl,
                  coverUrl: entry.coverUrl,
                  detailsUrl: entry.detailsUrl,
                }}
                onPlay={() => onPlayEmbed(entry.title, entry.launchUrl, entry.systemId)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
