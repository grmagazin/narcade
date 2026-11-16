import type { ArchiveBrowserEntry } from '../types';
import { logDebug } from './debugLogService';

const metadataCache = new Map<string, ArchiveBrowserEntry[]>();

export function clearArchiveCache(): void {
  metadataCache.clear();
}

interface ArchiveMetadataFile {
  name?: string;
  size?: string | number;
  format?: string;
}

interface ArchiveSearchDoc {
  identifier?: string;
  title?: string;
  year?: string | number;
  creator?: string;
}

export function extractEmbedUrl(rawInput: string): string | null {
  const trimmed = rawInput.trim();
  if (!trimmed) return null;

  // Support pasting full <iframe src="...">...</iframe> snippet
  const iframeMatch = trimmed.match(/<iframe[^>]+src=["']([^"']+)["']/i);
  const candidate = iframeMatch ? iframeMatch[1].trim() : trimmed;

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export function isLikelyIframeEmbedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.toLowerCase();
    return (
      parsed.hostname.includes('archive.org') && path.startsWith('/embed/')
    );
  } catch {
    return false;
  }
}

export function toArchiveCorsUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.hostname === 'archive.org' && parsed.pathname.startsWith('/download/')) {
      return `https://cors.archive.org/cors/${parsed.pathname.slice('/download/'.length)}`;
    }
    return rawUrl;
  } catch {
    return rawUrl;
  }
}

export async function fetchArchiveFilesCollection(
  itemId: string,
  defaultSystemId = 'arcade',
  defaultCore = 'mame2003_plus'
): Promise<ArchiveBrowserEntry[]> {
  const cleanId = itemId
    .replace(/^https?:\/\/(cors\.)?archive\.org\/(details|download|cors)\//i, '')
    .split('/')[0]
    .trim();

  if (!cleanId) {
    throw new Error('Enter a valid Archive.org item identifier.');
  }

  const cacheKey = `${cleanId}:${defaultSystemId}:${defaultCore}`;
  if (metadataCache.has(cacheKey)) {
    const cached = metadataCache.get(cacheKey)!;
    logDebug('success', 'archive', `Loaded ${cached.length} cached ROM entries from ${cleanId}`);
    return cached;
  }

  logDebug('loading', 'archive', `Fetching Archive.org file index for ${cleanId}...`);

  const res = await fetch(`https://archive.org/metadata/${encodeURIComponent(cleanId)}/files`);
  if (!res.ok) {
    const msg = `Archive.org returned HTTP ${res.status} for "${cleanId}".`;
    logDebug('error', 'archive', msg);
    throw new Error(msg);
  }

  const json = (await res.json()) as { result?: ArchiveMetadataFile[] };
  const files = Array.isArray(json.result) ? json.result : [];

  // Index verified image files actually present inside this Archive.org item to avoid 404s
  const imageByStem = new Map<string, string>();
  for (const f of files) {
    if (!f.name) continue;
    const base = f.name.split('/').pop() || f.name;
    const lower = base.toLowerCase();
    if (lower === '__ia_thumb.jpg') continue;
    if (!/\.(png|jpe?g)$/i.test(lower)) continue;

    if (lower.endsWith('_thumb.jpg')) {
      const stem = lower.slice(0, -'_thumb.jpg'.length);
      if (!imageByStem.has(stem)) {
        imageByStem.set(stem, f.name);
      }
    } else {
      const stem = lower.replace(/\.[^.]+$/, '');
      // Prefer exact PNG/JPG over derivative thumb when available
      imageByStem.set(stem, f.name);
    }
  }

  const supportedExts = [
    '.zip',
    '.nes',
    '.sfc',
    '.smc',
    '.gb',
    '.gbc',
    '.gba',
    '.md',
    '.gen',
    '.bin',
    '.sms',
    '.pce',
    '.a26',
    '.n64',
    '.z64',
    '.nds',
    '.chd',
    '.iso',
  ];

  const entries: ArchiveBrowserEntry[] = [];
  for (const f of files) {
    if (!f.name) continue;
    const lower = f.name.toLowerCase();
    const matchedExt = supportedExts.find((ext) => lower.endsWith(ext));
    if (!matchedExt) continue;
    if (lower.endsWith('_archive.torrent') || lower.includes('__ia_thumb')) continue;

    const baseName = f.name.split('/').pop() || f.name;
    const stem = baseName.replace(/\.[^.]+$/, '');
    const title = stem.replace(/[_]+/g, ' ');
    const encodedPath = f.name
      .split('/')
      .map((part) => encodeURIComponent(part))
      .join('/');

    const matchedImagePath = imageByStem.get(stem.toLowerCase());
    const encodedImagePath = matchedImagePath
      ? matchedImagePath
          .split('/')
          .map((part) => encodeURIComponent(part))
          .join('/')
      : undefined;

    entries.push({
      id: `ia_${cleanId}_${baseName}`,
      title,
      fileName: baseName,
      sizeBytes: f.size ? Number(f.size) : undefined,
      systemId: defaultSystemId,
      core: defaultCore,
      mode: 'rom',
      launchUrl: `https://cors.archive.org/cors/${encodeURIComponent(cleanId)}/${encodedPath}`,
      coverUrl: encodedImagePath
        ? `https://archive.org/download/${encodeURIComponent(cleanId)}/${encodedImagePath}`
        : undefined,
      detailsUrl: `https://archive.org/details/${encodeURIComponent(cleanId)}`,
    });
  }

  metadataCache.set(cacheKey, entries);
  logDebug('success', 'archive', `Indexed ${entries.length} playable ROMs from ${cleanId}`);
  return entries;
}

export function filterMameOriginals(entries: ArchiveBrowserEntry[]): ArchiveBrowserEntry[] {
  const stems = new Set(
    entries.map((e) => e.fileName.replace(/\.[^.]+$/, '').toLowerCase())
  );

  const CLONE_TAIL =
    /^(bl|abl|ebbl|hb|b\d+|bh|j\d+|ja|jb|jc|jd|jp|u\d+|ua|ub|uc|ud|ue|uf|ui|uk|us|e\d+|ea|eb|ec|ed|eu|w\d+|wa|wb|wc|r\d+|v\d+|p\d+|o\d+|m\d+|alt\d*|rev\d*|ver\d*|set\d*|boot\d*|hack\d*|kai|acc|accp\d*|dkot\d*|ce|cej|ceua|ceub|ceuc|hf|hfj|hfu|84|85|86|87|b6|sp|dx|h)$/i;

  return entries.filter((entry) => {
    const stem = entry.fileName.replace(/\.[^.]+$/, '').toLowerCase();
    if (stem === 'mslugx') return true;
    for (let len = 3; len < stem.length; len++) {
      const prefix = stem.slice(0, len);
      if (!stems.has(prefix)) continue;
      const tail = stem.slice(len);
      if (/^[a-wyz]$/.test(tail) || CLONE_TAIL.test(tail)) {
        return false;
      }
    }
    return true;
  });
}

export async function searchInternetArcadeEmbeds(
  query = '',
  rows = 36
): Promise<ArchiveBrowserEntry[]> {
  const qTerm = query.trim()
    ? `collection:internetarcade AND mediatype:software AND (${query.trim()})`
    : 'collection:internetarcade AND mediatype:software';

  const url =
    `https://archive.org/advancedsearch.php?q=${encodeURIComponent(qTerm)}` +
    `&fl[]=identifier,title,year,creator&rows=${rows}&page=1&output=json`;

  logDebug('loading', 'embeds', `Searching Internet Arcade embeds${query.trim() ? `: "${query.trim()}"` : ''}...`);

  const res = await fetch(url);
  if (!res.ok) {
    const msg = `Archive.org search returned HTTP ${res.status}.`;
    logDebug('error', 'embeds', msg);
    throw new Error(msg);
  }

  const data = (await res.json()) as {
    response?: { docs?: ArchiveSearchDoc[] };
  };
  const docs = data.response?.docs ?? [];
  logDebug('success', 'embeds', `Found ${docs.length} Internet Arcade embed results`);

  return docs
    .filter((d) => Boolean(d.identifier))
    .map((doc) => {
      const id = doc.identifier!;
      const shortRom = id.replace(/^arcade_/, '');
      return {
        id: `embed_${id}`,
        title: doc.title || shortRom,
        fileName: `${shortRom} (Embed)`,
        year: doc.year ? String(doc.year) : undefined,
        creator: doc.creator,
        systemId: 'arcade',
        core: 'embed',
        mode: 'embed' as const,
        launchUrl: `https://archive.org/embed/${encodeURIComponent(id)}`,
        coverUrl: `https://archive.org/services/img/${encodeURIComponent(id)}`,
        detailsUrl: `https://archive.org/details/${encodeURIComponent(id)}`,
      };
    });
}
