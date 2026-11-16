import {
  AlertCircle,
  Archive,
  CheckCircle2,
  Code2,
  Disc,
  Download,
  ExternalLink,
  Link2,
  Play,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { RomDropzone } from '../components/RomDropzone';
import { SystemIcon } from '../components/SystemIcon';
import { extractEmbedUrl } from '../services/archiveBrowserService';
import { formatBytes, getSystemById, sourcesData, systems } from '../services/dataService';
import {
  exportSavesBackupZip,
  getSaveBackupStats,
  importSavesBackupZip,
  type SaveBackupStats,
} from '../services/saveBackupService';
import type { MultiDiscSet, StoredRomMeta } from '../types';

interface RomsPageProps {
  initialSystemFilter: string;
  storedRoms: StoredRomMeta[];
  discSets: MultiDiscSet[];
  onIngestFiles: (files: File[], systemOverride?: string, launchAfter?: boolean) => Promise<void>;
  onIngestUrl: (url: string, systemOverride?: string, launchAfter?: boolean) => Promise<void>;
  onPlayStoredRom: (romId: string, overrideTitle?: string) => Promise<void>;
  onPlayEmbed: (title: string, embedUrl: string, systemId?: string) => void;
  onPlayExternalUrl: (
    url: string,
    opts?: { systemId?: string; core?: string; title?: string }
  ) => void;
  onDeleteStoredRom: (romId: string) => Promise<void>;
  onCreateDiscSet: (title: string, systemId: string, discRomIds: string[]) => Promise<void>;
  onPlayDiscSet: (setItem: MultiDiscSet) => Promise<void>;
  onDeleteDiscSet: (setId: string) => Promise<void>;
}

const CD_SYSTEM_IDS = new Set(['psx', 'segaMD', 'pce']);

export function RomsPage({
  initialSystemFilter,
  storedRoms,
  discSets,
  onIngestFiles,
  onIngestUrl,
  onPlayStoredRom,
  onPlayEmbed,
  onPlayExternalUrl,
  onDeleteStoredRom,
  onCreateDiscSet,
  onPlayDiscSet,
  onDeleteDiscSet,
}: RomsPageProps) {
  const backupInputRef = useRef<HTMLInputElement | null>(null);
  const [launchAfterUpload, setLaunchAfterUpload] = useState(true);
  const [externalUrl, setExternalUrl] = useState('');
  const [urlSystemOverride, setUrlSystemOverride] = useState<string>(
    initialSystemFilter && initialSystemFilter !== 'all' ? initialSystemFilter : 'auto'
  );
  const [urlBusy, setUrlBusy] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [urlSuccess, setUrlSuccess] = useState<string | null>(null);

  // External Iframe Embed / Direct ?play= Stream Launcher
  const [embedInput, setEmbedInput] = useState('');
  const [embedTitle, setEmbedTitle] = useState('');
  const [embedError, setEmbedError] = useState<string | null>(null);

  // Save Backup State
  const [backupStats, setBackupStats] = useState<SaveBackupStats>({ stateCount: 0, totalBytes: 0 });
  const [backupMsg, setBackupMsg] = useState<string | null>(null);
  const [backupError, setBackupError] = useState<string | null>(null);
  const [backupBusy, setBackupBusy] = useState(false);

  // Multi-Disc Builder State
  const [discTitle, setDiscTitle] = useState('');
  const [discSystemId, setDiscSystemId] = useState('psx');
  const [selectedDiscIds, setSelectedDiscIds] = useState<string[]>([]);
  const [discError, setDiscError] = useState<string | null>(null);
  const [discBusy, setDiscBusy] = useState(false);

  useEffect(() => {
    setUrlSystemOverride(
      initialSystemFilter && initialSystemFilter !== 'all' ? initialSystemFilter : 'auto'
    );
  }, [initialSystemFilter]);

  const refreshBackupStats = () => {
    void getSaveBackupStats().then(setBackupStats);
  };

  useEffect(() => {
    refreshBackupStats();
  }, []);

  const cdCandidates = useMemo(
    () =>
      storedRoms.filter(
        (r) =>
          CD_SYSTEM_IDS.has(r.systemId) ||
          ['.iso', '.chd', '.cue', '.pbp', '.bin'].includes(r.extension.toLowerCase())
      ),
    [storedRoms]
  );

  const defaultSys =
    initialSystemFilter && initialSystemFilter !== 'all' ? initialSystemFilter : 'auto';

  const handleUrlLoad = async (e: React.FormEvent) => {
    e.preventDefault();
    setUrlError(null);
    setUrlSuccess(null);
    setUrlBusy(true);
    try {
      await onIngestUrl(
        externalUrl,
        urlSystemOverride === 'auto' ? undefined : urlSystemOverride,
        launchAfterUpload
      );
      setUrlSuccess('External ROM downloaded, validated, and stored in your browser vault.');
      setExternalUrl('');
    } catch (err) {
      setUrlError(err instanceof Error ? err.message : 'Unable to fetch external ROM URL.');
    } finally {
      setUrlBusy(false);
    }
  };

  const handleLaunchEmbedOrDirectUrl = (e: React.FormEvent) => {
    e.preventDefault();
    setEmbedError(null);
    const extracted = extractEmbedUrl(embedInput);
    if (!extracted) {
      setEmbedError(
        'Paste a valid https:// embed URL or full <iframe src="..."> snippet (e.g. https://archive.org/embed/arcade_galaga88).'
      );
      return;
    }

    if (embedInput.toLowerCase().includes('<iframe') || extracted.includes('/embed/')) {
      onPlayEmbed(embedTitle.trim() || 'External Archive Game', extracted, 'arcade');
    } else {
      onPlayExternalUrl(extracted, {
        systemId: urlSystemOverride === 'auto' ? undefined : urlSystemOverride,
        title: embedTitle.trim() || undefined,
      });
    }
  };

  const handleExportBackup = async () => {
    setBackupError(null);
    setBackupMsg(null);
    setBackupBusy(true);
    try {
      const { blob, fileName, count } = await exportSavesBackupZip();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setBackupMsg(`Exported ${count} save state / battery save record(s) to ${fileName}.`);
    } catch (err) {
      setBackupError(err instanceof Error ? err.message : 'Failed to export save backup.');
    } finally {
      setBackupBusy(false);
    }
  };

  const handleImportBackup = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBackupError(null);
    setBackupMsg(null);
    setBackupBusy(true);
    try {
      const { restoredStates } = await importSavesBackupZip(files[0]);
      refreshBackupStats();
      setBackupMsg(`Restored ${restoredStates} save state / SRAM record(s) into browser storage.`);
    } catch (err) {
      setBackupError(err instanceof Error ? err.message : 'Failed to import save backup.');
    } finally {
      setBackupBusy(false);
      if (backupInputRef.current) backupInputRef.current.value = '';
    }
  };

  const toggleDiscSelection = (romId: string) => {
    setSelectedDiscIds((prev) =>
      prev.includes(romId) ? prev.filter((id) => id !== romId) : [...prev, romId]
    );
  };

  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    setDiscError(null);
    setDiscBusy(true);
    try {
      await onCreateDiscSet(discTitle, discSystemId, selectedDiscIds);
      setDiscTitle('');
      setSelectedDiscIds([]);
    } catch (err) {
      setDiscError(err instanceof Error ? err.message : 'Could not build M3U playlist.');
    } finally {
      setDiscBusy(false);
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-white">
            ROM Loader, Embeds &amp; Save Backups
          </h1>
          <p className="mt-1 text-sm text-slate-400 max-w-2xl">
            Load local ROMs, launch external Archive.org iframe embeds or <code className="font-mono text-orange-300">?play=</code> ROM links, bundle multi-disc M3U playlists, and export portable save backups.
          </p>
        </div>

        <label className="inline-flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={launchAfterUpload}
            onChange={(e) => setLaunchAfterUpload(e.target.checked)}
            className="h-4 w-4 rounded border-white/20 bg-[#090B0E] accent-orange-500"
          />
          <span>Launch Player automatically after loading</span>
        </label>
      </div>

      {/* Local Upload & Authorized External URL */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <RomDropzone
            defaultSystemId={defaultSys}
            onFilesSelected={(files, sysOverride) =>
              onIngestFiles(files, sysOverride, launchAfterUpload)
            }
          />
        </div>

        <div className="lg:col-span-5 rounded-xl border border-white/[0.08] bg-[#11151B] p-6 flex flex-col justify-between">
          <div>
            <h2 className="font-display text-base font-bold text-white">
              Authorized External ROM / ZIP URL
            </h2>
            <p className="mt-1 text-xs text-slate-400 leading-relaxed">
              Fetch an open-source or public-domain ROM directly into IndexedDB from a CORS-enabled URL.
            </p>

            <form onSubmit={(e) => void handleUrlLoad(e)} className="mt-4 space-y-3">
              <div>
                <label htmlFor="rom-url-input" className="block text-xs font-medium text-slate-300 mb-1.5">
                  Direct ROM or ZIP URL
                </label>
                <input
                  id="rom-url-input"
                  type="url"
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                  placeholder="https://example.org/homebrew/game.nes"
                  className="h-10 w-full rounded-lg border border-white/[0.12] bg-[#090B0E] px-3 text-xs text-white placeholder:text-slate-500 focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="rom-url-system" className="block text-xs font-medium text-slate-300 mb-1.5">
                  Target System
                </label>
                <select
                  id="rom-url-system"
                  value={urlSystemOverride}
                  onChange={(e) => setUrlSystemOverride(e.target.value)}
                  className="h-10 w-full rounded-lg border border-white/[0.12] bg-[#090B0E] px-3 text-xs text-slate-200 focus:border-orange-500 focus:outline-none"
                >
                  <option value="auto">Auto-detect by file extension</option>
                  {systems.map((sys) => (
                    <option key={sys.id} value={sys.id}>
                      {sys.name} ({sys.core})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={urlBusy || !externalUrl.trim()}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-white/[0.14] bg-white/[0.06] px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/[0.12] disabled:opacity-40 transition-colors cursor-pointer"
              >
                <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{urlBusy ? 'Fetching & Validating...' : 'Fetch & Store in Vault'}</span>
              </button>
            </form>
          </div>

          {urlError && (
            <div
              role="alert"
              className="mt-4 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-950/30 p-3 text-xs text-red-200"
            >
              <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{urlError}</span>
            </div>
          )}

          {urlSuccess && (
            <div
              role="status"
              className="mt-4 flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-950/25 p-3 text-xs text-emerald-200"
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{urlSuccess}</span>
            </div>
          )}
        </div>
      </div>

      {/* External Iframe Embed & Direct ?play= Stream Loader */}
      <section className="rounded-xl border border-white/[0.08] bg-[#11151B] p-6 space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Code2 className="h-5 w-5 text-orange-400" aria-hidden="true" />
            <h2 className="font-display text-lg font-bold text-white">
              External Iframe Embed &amp; Direct <code className="font-mono text-orange-300">?play=</code> Launcher
            </h2>
          </div>
          <button
            type="button"
            onClick={() =>
              onPlayEmbed("Galaga '88", 'https://archive.org/embed/arcade_galaga88', 'arcade')
            }
            className="text-xs font-medium text-orange-400 hover:text-orange-300 self-start sm:self-auto cursor-pointer"
          >
            Try Example: Galaga &apos;88 Embed →
          </button>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed max-w-3xl">
          Paste an external <code className="font-mono text-slate-200">&lt;iframe src=&quot;https://archive.org/embed/...&quot;&gt;</code> embed snippet or a direct ROM URL to launch immediately in the Player without storing binaries in IndexedDB. Supports <code className="font-mono text-slate-200">?play=ROM_URL</code> deep links.
        </p>

        <form onSubmit={handleLaunchEmbedOrDirectUrl} className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="md:col-span-6">
            <input
              type="text"
              value={embedInput}
              onChange={(e) => setEmbedInput(e.target.value)}
              placeholder='<iframe src="https://archive.org/embed/arcade_galaga88" ...> or https://archive.org/download/...'
              aria-label="External iframe HTML or direct ROM URL"
              className="h-10 w-full rounded-lg border border-white/[0.12] bg-[#090B0E] px-3 font-mono text-xs text-white placeholder:text-slate-500 focus:border-orange-500 focus:outline-none"
            />
          </div>
          <div className="md:col-span-3">
            <input
              type="text"
              value={embedTitle}
              onChange={(e) => setEmbedTitle(e.target.value)}
              placeholder="Optional display title..."
              aria-label="Optional display title"
              className="h-10 w-full rounded-lg border border-white/[0.12] bg-[#090B0E] px-3 text-xs text-white placeholder:text-slate-500 focus:border-orange-500 focus:outline-none"
            />
          </div>
          <div className="md:col-span-3">
            <button
              type="submit"
              disabled={!embedInput.trim()}
              className="h-10 w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-orange-500 px-4 text-xs font-semibold text-slate-950 hover:bg-orange-400 disabled:opacity-40 transition-colors cursor-pointer"
            >
              <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
              <span>Launch in Player</span>
            </button>
          </div>
        </form>

        {embedError && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-950/30 p-3 text-xs text-red-200"
          >
            <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{embedError}</span>
          </div>
        )}
      </section>

      {/* Stored ROM Vault Table with Header Inspection */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-white">
            Stored ROMs ({storedRoms.length})
          </h2>
          {storedRoms.length > 0 && (
            <span className="text-xs text-slate-400 tabular-nums">
              Total size: {formatBytes(storedRoms.reduce((s, r) => s + r.sizeBytes, 0))}
            </span>
          )}
        </div>

        {storedRoms.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-white/[0.08] bg-[#11151B]">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/[0.08] bg-[#0D1016] text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Title &amp; File</th>
                  <th className="px-4 py-3 font-medium">Header / Region</th>
                  <th className="px-4 py-3 font-medium">System / Core</th>
                  <th className="px-4 py-3 font-medium text-right">Size</th>
                  <th className="px-4 py-3 font-medium">CRC32</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {storedRoms.map((rom) => {
                  const sys = getSystemById(rom.systemId);
                  return (
                    <tr key={rom.id} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#171C24] text-orange-400">
                            <SystemIcon systemId={rom.systemId} className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium text-white">{rom.title}</p>
                            <p className="font-mono text-[11px] text-slate-500">
                              {rom.fileName}
                              {rom.zipEntries && rom.zipEntries.length > 0
                                ? ` (${rom.zipEntries.length} files in ZIP)`
                                : ''}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-300">
                        {rom.headerInfo ? (
                          <div>
                            <p className="text-slate-200">
                              {rom.headerInfo.internalTitle || rom.headerInfo.format}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {[rom.headerInfo.region, rom.headerInfo.mapperOrHardware]
                                .filter(Boolean)
                                .join(' · ')}
                            </p>
                          </div>
                        ) : (
                          <span className="text-slate-500">No cartridge header</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-slate-300 whitespace-nowrap">
                        {sys?.shortName ?? rom.systemId}{' '}
                        <span className="font-mono text-slate-500">· {rom.core}</span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono tabular-nums text-slate-300 whitespace-nowrap">
                        {formatBytes(rom.sizeBytes)}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-[11px] text-slate-400 tabular-nums whitespace-nowrap">
                        {rom.crc32}
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void onPlayStoredRom(rom.id, rom.title)}
                            className="inline-flex items-center gap-1 rounded-md bg-orange-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-orange-400 cursor-pointer"
                          >
                            <Play className="h-3 w-3 fill-current" aria-hidden="true" />
                            <span>Play</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => void onDeleteStoredRom(rom.id)}
                            aria-label={`Remove ${rom.fileName}`}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/[0.1] text-slate-400 hover:border-red-500/40 hover:text-red-400 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-xl border border-white/[0.08] bg-[#11151B] p-8 text-center">
            <p className="text-sm font-medium text-slate-200">No ROMs loaded yet</p>
            <p className="mt-1 text-xs text-slate-400">
              Drop a local ROM or ZIP archive above to store and inspect its cartridge header.
            </p>
          </div>
        )}
      </section>

      {/* Multi-Disc M3U Builder + Save Backup / Restore */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Multi-Disc M3U Playlist Builder */}
        <div className="lg:col-span-7 rounded-xl border border-white/[0.08] bg-[#11151B] p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Disc className="h-5 w-5 text-orange-400" aria-hidden="true" />
            <h2 className="font-display text-lg font-bold text-white">
              Multi-Disc .m3u Playlist Builder
            </h2>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Combine 2 or more CD images (.chd, .iso, .cue, .bin) stored in your vault into a single EmulatorJS .m3u playlist for seamless in-game disc swapping (PS1, Sega CD, PC Engine CD).
          </p>

          <form onSubmit={(e) => void handleCreatePlaylist(e)} className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input
                type="text"
                value={discTitle}
                onChange={(e) => setDiscTitle(e.target.value)}
                placeholder="Collection title (e.g. Multi-Disc RPG)"
                aria-label="Multi-disc playlist title"
                className="h-9 rounded-lg border border-white/[0.12] bg-[#090B0E] px-3 text-xs text-white placeholder:text-slate-500 focus:border-orange-500 focus:outline-none"
              />
              <select
                value={discSystemId}
                onChange={(e) => setDiscSystemId(e.target.value)}
                aria-label="Multi-disc console system"
                className="h-9 rounded-lg border border-white/[0.12] bg-[#090B0E] px-3 text-xs text-slate-200 focus:border-orange-500 focus:outline-none"
              >
                <option value="psx">PlayStation (pcsx_rearmed)</option>
                <option value="segaMD">Sega CD (genesis_plus_gx)</option>
                <option value="pce">PC Engine CD (mednafen_pce)</option>
              </select>
            </div>

            {cdCandidates.length > 0 ? (
              <div className="max-h-40 overflow-y-auto divide-y divide-white/[0.06] rounded-lg border border-white/[0.08] bg-[#090B0E]">
                {cdCandidates.map((rom) => {
                  const idx = selectedDiscIds.indexOf(rom.id);
                  const checked = idx !== -1;
                  return (
                    <label
                      key={rom.id}
                      className="flex items-center justify-between gap-3 px-3 py-2 text-xs cursor-pointer hover:bg-white/[0.03]"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleDiscSelection(rom.id)}
                          className="h-4 w-4 accent-orange-500"
                        />
                        <span className="truncate text-slate-200">{rom.fileName}</span>
                      </div>
                      <span className="font-mono text-[11px] text-slate-500 shrink-0">
                        {checked ? `Disc ${idx + 1}` : formatBytes(rom.sizeBytes)}
                      </span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-lg border border-white/[0.06] bg-[#090B0E] p-4 text-xs text-slate-500">
                Upload 2 or more .chd, .iso, or .cue disc images above to create a multi-disc playlist.
              </div>
            )}

            <button
              type="submit"
              disabled={discBusy || selectedDiscIds.length < 2}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.08] px-4 py-2 text-xs font-semibold text-white hover:bg-orange-500 hover:text-slate-950 disabled:opacity-40 transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>
                {discBusy
                  ? 'Saving Playlist...'
                  : `Create .m3u Playlist (${selectedDiscIds.length} selected)`}
              </span>
            </button>
          </form>

          {discError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-950/30 p-3 text-xs text-red-200"
            >
              <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{discError}</span>
            </div>
          )}

          {discSets.length > 0 && (
            <div className="pt-3 border-t border-white/[0.06] space-y-2">
              <p className="text-xs font-medium text-slate-300">Saved Multi-Disc Playlists</p>
              <div className="divide-y divide-white/[0.06] rounded-lg border border-white/[0.08] bg-[#090B0E]">
                {discSets.map((setItem) => (
                  <div
                    key={setItem.id}
                    className="flex items-center justify-between gap-3 px-3 py-2.5 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-white truncate">{setItem.title}</p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {setItem.discFileNames.length} discs · {setItem.core}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => void onPlayDiscSet(setItem)}
                        className="inline-flex items-center gap-1 rounded-md bg-orange-500 px-2.5 py-1 text-xs font-semibold text-slate-950 hover:bg-orange-400 cursor-pointer"
                      >
                        <Play className="h-3 w-3 fill-current" aria-hidden="true" />
                        <span>Play</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => void onDeleteDiscSet(setItem.id)}
                        aria-label={`Delete playlist ${setItem.title}`}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/[0.1] text-slate-400 hover:border-red-500/40 hover:text-red-400 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Portable Save State & SRAM Backup */}
        <div className="lg:col-span-5 rounded-xl border border-white/[0.08] bg-[#11151B] p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Archive className="h-5 w-5 text-orange-400" aria-hidden="true" />
              <h2 className="font-display text-lg font-bold text-white">
                Portable Save Data Backup
              </h2>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Export all EmulatorJS quick-save states and battery SRAM files stored in browser IndexedDB as a single portable .zip archive, or restore a backup on any device.
            </p>

            <dl className="grid grid-cols-2 gap-3 rounded-lg border border-white/[0.06] bg-[#090B0E] p-3 text-xs">
              <div>
                <dt className="text-slate-500">Saved States / SRAM</dt>
                <dd className="mt-0.5 font-mono text-sm font-semibold text-white tabular-nums">
                  {backupStats.stateCount}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Backup Footprint</dt>
                <dd className="mt-0.5 font-mono text-sm font-semibold text-white tabular-nums">
                  {formatBytes(backupStats.totalBytes)}
                </dd>
              </div>
            </dl>
          </div>

          <div className="space-y-3">
            <input
              ref={backupInputRef}
              type="file"
              accept=".zip"
              onChange={(e) => void handleImportBackup(e.target.files)}
              className="hidden"
              aria-label="Import ngames save backup ZIP"
            />

            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                disabled={backupBusy}
                onClick={() => void handleExportBackup()}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-orange-500 px-4 py-2.5 text-xs font-semibold text-slate-950 hover:bg-orange-400 disabled:opacity-50 whitespace-nowrap cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Export Saves (.zip)</span>
              </button>

              <button
                type="button"
                disabled={backupBusy}
                onClick={() => backupInputRef.current?.click()}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/[0.12] bg-white/[0.04] px-4 py-2.5 text-xs font-medium text-white hover:bg-white/[0.09] disabled:opacity-50 whitespace-nowrap cursor-pointer"
              >
                <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Restore Backup</span>
              </button>
            </div>

            {backupError && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-950/30 p-3 text-xs text-red-200"
              >
                <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{backupError}</span>
              </div>
            )}

            {backupMsg && (
              <div
                role="status"
                className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-950/25 p-3 text-xs text-emerald-200"
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{backupMsg}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Authorized External Homebrew & Public Domain Sources */}
      <section className="space-y-4">
        <div>
          <h2 className="font-display text-xl font-bold text-white">
            Authorized Homebrew &amp; Public Domain Sources
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Community archives and open-source directories for legally distributable ROMs. Commercial copyrighted ROM collections are never included.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sourcesData.romSources.map((src) => (
            <article
              key={src.id}
              className="flex flex-col justify-between rounded-xl border border-white/[0.08] bg-[#11151B] p-5"
            >
              <div>
                <p className="text-xs text-slate-400">{src.license}</p>
                <h3 className="mt-1 font-display text-base font-bold text-white">{src.name}</h3>
                <p className="mt-2 text-xs text-slate-300 leading-relaxed">{src.description}</p>
                <p className="mt-3 font-mono text-[11px] text-slate-500">
                  Systems: {src.systems.join(', ')}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-white/[0.06]">
                <a
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-orange-400 hover:text-orange-300"
                >
                  <span>Visit Archive</span>
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
