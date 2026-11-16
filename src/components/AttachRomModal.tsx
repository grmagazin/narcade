import { AlertCircle, Link2, Play, Upload, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { formatBytes, getSupportedExtensions, getSystemById } from '../services/dataService';
import type { CatalogGame, StoredRomMeta } from '../types';

interface AttachRomModalProps {
  game: CatalogGame | null;
  storedRoms: StoredRomMeta[];
  onClose: () => void;
  onBindExisting: (game: CatalogGame, romId: string, launchNow: boolean) => Promise<void>;
  onUploadAndBind: (game: CatalogGame, file: File, launchNow: boolean) => Promise<void>;
  onFetchUrlAndBind: (game: CatalogGame, url: string, launchNow: boolean) => Promise<void>;
}

export function AttachRomModal({
  game,
  storedRoms,
  onClose,
  onBindExisting,
  onUploadAndBind,
  onFetchUrlAndBind,
}: AttachRomModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!game) return null;

  const system = getSystemById(game.systemId);
  const matchingStored = storedRoms.filter((r) => r.systemId === game.systemId);

  const handleFileChange = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setError(null);
    setBusy(true);
    try {
      await onUploadAndBind(game, fileList[0], true);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to attach ROM file.');
    } finally {
      setBusy(false);
    }
  };

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await onFetchUrlAndBind(game, urlInput, true);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch ROM URL.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="attach-rom-title"
    >
      <div className="w-full max-w-lg rounded-xl border border-white/[0.12] bg-[#11151B] p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-slate-400">
              {system?.name ?? game.systemId} · {game.romFormat}
            </p>
            <h2 id="attach-rom-title" className="mt-1 font-display text-lg font-bold text-white">
              Attach ROM for {game.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] text-slate-400 hover:bg-white/[0.05] hover:text-white cursor-pointer"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 space-y-5">
          {/* Local file upload */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept={getSupportedExtensions().join(',')}
              onChange={(e) => void handleFileChange(e.target.files)}
              className="hidden"
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-xs font-semibold text-slate-950 transition-colors hover:bg-orange-400 disabled:opacity-50 cursor-pointer"
            >
              <Upload className="h-4 w-4" aria-hidden="true" />
              <span>{busy ? 'Loading ROM...' : 'Select Local ROM / ZIP and Play'}</span>
            </button>
          </div>

          {/* Authorized external URL */}
          <form onSubmit={(e) => void handleUrlSubmit(e)} className="space-y-2">
            <label htmlFor="attach-rom-url" className="block text-xs font-medium text-slate-300">
              Or load from an authorized external ROM/ZIP URL
            </label>
            <div className="flex gap-2">
              <input
                id="attach-rom-url"
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder={`https://example.org/roms/game${game.romFormat}`}
                className="flex-1 rounded-lg border border-white/[0.12] bg-[#090B0E] px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-orange-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={busy || !urlInput.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.12] bg-white/[0.05] px-3.5 py-2 text-xs font-medium text-white hover:bg-white/[0.1] disabled:opacity-40 whitespace-nowrap cursor-pointer"
              >
                <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Load URL</span>
              </button>
            </div>
          </form>

          {/* Existing stored ROMs for this system */}
          {matchingStored.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-300">
                Or bind a ROM already stored in your browser vault
              </p>
              <div className="max-h-40 overflow-y-auto divide-y divide-white/[0.06] rounded-lg border border-white/[0.08] bg-[#090B0E]">
                {matchingStored.map((rom) => (
                  <div
                    key={rom.id}
                    className="flex items-center justify-between gap-3 px-3 py-2.5 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-slate-200 truncate">{rom.fileName}</p>
                      <p className="text-[11px] text-slate-500 tabular-nums">
                        {formatBytes(rom.sizeBytes)} · CRC32 {rom.crc32}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setBusy(true);
                        void onBindExisting(game, rom.id, true)
                          .then(onClose)
                          .catch((err) =>
                            setError(err instanceof Error ? err.message : 'Unable to bind ROM.')
                          )
                          .finally(() => setBusy(false));
                      }}
                      className="inline-flex items-center gap-1 rounded-md bg-white/[0.08] px-2.5 py-1.5 text-xs font-medium text-white hover:bg-orange-500 hover:text-slate-950 transition-colors shrink-0 cursor-pointer"
                    >
                      <Play className="h-3 w-3 fill-current" aria-hidden="true" />
                      <span>Bind & Play</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-950/30 p-3 text-xs text-red-200"
            >
              <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
