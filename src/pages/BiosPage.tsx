import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Info,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { biosDatabase, formatBytes, getSystemById, sourcesData } from '../services/dataService';
import type { StoredBiosMeta } from '../types';

interface BiosPageProps {
  storedBios: StoredBiosMeta[];
  onIngestBiosFiles: (files: File[], fallbackSystemId?: string) => Promise<void>;
  onDeleteBios: (biosId: string) => Promise<void>;
}

export function BiosPage({ storedBios, onIngestBiosFiles, onDeleteBios }: BiosPageProps) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [selectedSystem, setSelectedSystem] = useState<string>('all');
  const [fallbackSystemId, setFallbackSystemId] = useState<string>('psx');
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const uniqueSystems = useMemo(() => {
    const ids = Array.from(new Set(biosDatabase.entries.map((e) => e.systemId)));
    return ids.map((id) => ({
      id,
      name: getSystemById(id)?.shortName || id,
    }));
  }, []);

  const filteredEntries = useMemo(() => {
    if (selectedSystem === 'all') return biosDatabase.entries;
    return biosDatabase.entries.filter((e) => e.systemId === selectedSystem);
  }, [selectedSystem]);

  const handleFiles = async (list: FileList | null) => {
    if (!list || list.length === 0) return;
    setErrorMsg(null);
    setStatusMsg(null);
    setBusy(true);
    try {
      const files = Array.from(list);
      await onIngestBiosFiles(files, fallbackSystemId);
      setStatusMsg(
        `Processed ${files.length} local BIOS file${files.length === 1 ? '' : 's'} and stored in IndexedDB.`
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to verify BIOS file.');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-white">
          BIOS Compatibility &amp; Local Vault
        </h1>
        <p className="mt-1 text-sm text-slate-400 max-w-3xl">
          Inspect system firmware requirements, verify checksums of your legally dumped BIOS files locally via Web Crypto SHA-256, and attach them automatically to EmulatorJS sessions.
        </p>
      </div>

      {/* Licensing & RetroBIOS Reference Notice */}
      <section className="rounded-xl border border-white/[0.08] bg-[#11151B] p-5 space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <Info className="h-4 w-4 text-orange-400 shrink-0" aria-hidden="true" />
          <span>Licensing &amp; BIOS Fallback Notice (Abdess/retrobios)</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          {biosDatabase.metadata.licenseNote} {biosDatabase.metadata.policy} For SNK Neo Geo titles on{' '}
          <code className="font-mono text-slate-200">fbneo</code> or{' '}
          <code className="font-mono text-slate-200">mame2003_plus</code>, <code className="font-mono text-slate-200">ngames</code>{' '}
          uses your uploaded <code className="font-mono text-slate-200">neogeo.zip</code> from the local BIOS Vault when present and otherwise automatically falls back to the permanent self-hosted{' '}
          <code className="font-mono text-orange-300">/bios/neogeo.zip</code>.
        </p>
        <div className="pt-1">
          <a
            href={biosDatabase.metadata.referenceRepository}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-orange-400 hover:text-orange-300"
          >
            <span>Inspect RetroBIOS Documentation &amp; Schemas</span>
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </div>
      </section>

      {/* Local BIOS Verification Uploader */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-5 rounded-xl border border-white/[0.08] bg-[#11151B] p-6 space-y-4">
          <h2 className="font-display text-base font-bold text-white">
            Verify &amp; Load Local BIOS File
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Select a BIOS binary (such as <code className="font-mono text-slate-200">scph5501.bin</code>,{' '}
            <code className="font-mono text-slate-200">gba_bios.bin</code>, or{' '}
            <code className="font-mono text-slate-200">bios_CD_U.bin</code>). Hashes are computed locally in your browser and matched against our database.
          </p>

          <div>
            <label htmlFor="bios-fallback-sys" className="block text-xs font-medium text-slate-300 mb-1.5">
              Fallback System (if hash is unrecognized)
            </label>
            <select
              id="bios-fallback-sys"
              value={fallbackSystemId}
              onChange={(e) => setFallbackSystemId(e.target.value)}
              className="h-9 w-full rounded-lg border border-white/[0.12] bg-[#090B0E] px-3 text-xs text-slate-200 focus:border-orange-500 focus:outline-none"
            >
              {uniqueSystems.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <input
            ref={fileRef}
            type="file"
            multiple
            onChange={(e) => void handleFiles(e.target.files)}
            className="hidden"
            aria-label="Select local BIOS files"
          />

          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-xs font-semibold text-slate-950 hover:bg-orange-400 disabled:opacity-50 transition-colors cursor-pointer"
          >
            <Upload className="h-4 w-4" aria-hidden="true" />
            <span>{busy ? 'Computing SHA-256 & CRC32...' : 'Select Local BIOS File(s)'}</span>
          </button>

          {errorMsg && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-950/30 p-3 text-xs text-red-200"
            >
              <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{errorMsg}</span>
            </div>
          )}

          {statusMsg && (
            <div
              role="status"
              className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-950/25 p-3 text-xs text-emerald-200"
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{statusMsg}</span>
            </div>
          )}
        </div>

        {/* Stored Local BIOS Files */}
        <div className="lg:col-span-7 rounded-xl border border-white/[0.08] bg-[#11151B] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-white">
              Your Browser BIOS Vault ({storedBios.length})
            </h2>
            <span className="text-xs text-slate-400">Auto-attached on EmulatorJS launch</span>
          </div>

          {storedBios.length > 0 ? (
            <div className="divide-y divide-white/[0.06] rounded-lg border border-white/[0.08] bg-[#090B0E]">
              {storedBios.map((item) => {
                const sys = getSystemById(item.systemId);
                return (
                  <div
                    key={item.id}
                    className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-white">
                          {item.fileName}
                        </span>
                        <span className="text-xs text-slate-400">
                          · {sys?.shortName ?? item.systemId}
                        </span>
                        <span className="text-xs text-slate-400 tabular-nums">
                          · {formatBytes(item.sizeBytes)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px]">
                        {item.status === 'exact_match' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-300">
                            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                            Verified Checksum Match
                          </span>
                        ) : item.status === 'size_match' ? (
                          <span className="inline-flex items-center gap-1 text-sky-300">
                            <Info className="h-3.5 w-3.5" aria-hidden="true" />
                            Filename &amp; Size Match
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-300">
                            <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                            Unlisted Revision (CRC {item.crc32})
                          </span>
                        )}
                        <span className="font-mono text-slate-500 truncate">
                          SHA-256 {item.sha256.slice(0, 16)}…
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => void onDeleteBios(item.id)}
                      aria-label={`Remove ${item.fileName}`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.1] text-slate-400 hover:border-red-500/40 hover:text-red-400 self-end sm:self-center shrink-0 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-lg border border-white/[0.06] bg-[#090B0E] p-8 text-center">
              <p className="text-sm font-medium text-slate-300">No BIOS files loaded</p>
              <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
                8-bit and 16-bit cartridge cores (NES, SNES, GB, GBA, Genesis, Atari 2600) run immediately without BIOS files. Load PlayStation, Sega CD, or Neo Geo BIOS files here when needed.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Compatibility Reference Table */}
      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-display text-xl font-bold text-white">
            BIOS Compatibility Reference ({filteredEntries.length})
          </h2>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedSystem('all')}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                selectedSystem === 'all'
                  ? 'bg-orange-500 text-slate-950 font-semibold'
                  : 'bg-[#11151B] text-slate-400 hover:text-white'
              }`}
            >
              All Systems
            </button>
            {uniqueSystems.map((sys) => (
              <button
                key={sys.id}
                type="button"
                onClick={() => setSelectedSystem(sys.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                  selectedSystem === sys.id
                    ? 'bg-orange-500 text-slate-950 font-semibold'
                    : 'bg-[#11151B] text-slate-400 hover:text-white'
                }`}
              >
                {sys.name}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/[0.08] bg-[#11151B]">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/[0.08] bg-[#0D1016] text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Filename</th>
                <th className="px-4 py-3 font-medium">System / Core</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Size</th>
                <th className="px-4 py-3 font-medium">CRC32 / SHA-256</th>
                <th className="px-4 py-3 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {filteredEntries.map((entry) => {
                const isLoaded = storedBios.some(
                  (b) =>
                    b.matchedEntryId === entry.id ||
                    b.fileName.toLowerCase() === entry.filename.toLowerCase()
                );
                return (
                  <tr key={entry.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3.5 font-mono font-medium text-white whitespace-nowrap">
                      {entry.filename}
                    </td>
                    <td className="px-4 py-3.5 text-slate-300 whitespace-nowrap">
                      {entry.systemName}{' '}
                      <span className="font-mono text-slate-500">· {entry.core}</span>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {isLoaded ? (
                        <span className="inline-flex items-center gap-1 text-emerald-300">
                          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                          Loaded
                        </span>
                      ) : entry.required ? (
                        <span className="text-amber-300">Required</span>
                      ) : (
                        <span className="text-slate-400">Optional</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono tabular-nums text-slate-300 whitespace-nowrap">
                      {formatBytes(entry.sizeBytes)}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-[11px] text-slate-400 tabular-nums">
                      <div>CRC32: {entry.crc32}</div>
                      <div className="text-slate-500">
                        SHA256: {entry.sha256 === 'varies' ? 'varies' : `${entry.sha256.slice(0, 16)}…`}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-300 max-w-xs leading-relaxed">
                      {entry.notes}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Authorized Reference Sources */}
      <section className="space-y-4">
        <h2 className="font-display text-xl font-bold text-white">
          Authorized Documentation &amp; Tooling Sources
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {sourcesData.biosSources.map((src) => (
            <article
              key={src.id}
              className="flex flex-col justify-between rounded-xl border border-white/[0.08] bg-[#11151B] p-5"
            >
              <div>
                <p className="text-xs text-slate-400">{src.license}</p>
                <h3 className="mt-1 font-display text-base font-bold text-white">{src.name}</h3>
                <p className="mt-2 text-xs text-slate-300 leading-relaxed">{src.description}</p>
                <p className="mt-2 text-[11px] text-slate-500 leading-relaxed">{src.notes}</p>
              </div>
              <div className="mt-4 pt-3 border-t border-white/[0.06]">
                <a
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-orange-400 hover:text-orange-300"
                >
                  <span>Open Reference</span>
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
