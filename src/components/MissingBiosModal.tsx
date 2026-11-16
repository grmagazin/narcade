import { AlertTriangle, CheckCircle2, ShieldAlert, Upload, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { formatBytes, getSystemById } from '../services/dataService';
import type { MissingBiosPrompt, ModuleRoute } from '../types';

interface MissingBiosModalProps {
  prompt: MissingBiosPrompt | null;
  onClose: () => void;
  onUploadBiosFiles: (files: File[], fallbackSystemId?: string) => Promise<void>;
  onNavigate: (route: ModuleRoute) => void;
}

export function MissingBiosModal({
  prompt,
  onClose,
  onUploadBiosFiles,
  onNavigate,
}: MissingBiosModalProps) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!prompt) return null;

  const system = getSystemById(prompt.systemId);

  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setError(null);
    setSuccessMsg(null);
    setBusy(true);
    try {
      const files = Array.from(fileList);
      await onUploadBiosFiles(files, prompt.systemId);
      setSuccessMsg(`Stored ${files.map((f) => f.name).join(', ')} in your local BIOS Vault.`);
      window.setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to verify and store BIOS file.');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="missing-bios-title"
    >
      <div className="w-full max-w-lg rounded-xl border border-amber-500/30 bg-[#11151B] p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400">
              <ShieldAlert className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-medium text-amber-300">
                Missing System BIOS · {prompt.isNeoGeo ? 'SNK Neo Geo' : system?.shortName ?? prompt.systemId}
              </p>
              <h2 id="missing-bios-title" className="mt-0.5 font-display text-lg font-bold text-white">
                BIOS Required for {prompt.romTitle}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] text-slate-400 hover:bg-white/[0.05] hover:text-white cursor-pointer"
            aria-label="Close missing BIOS dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-4 text-xs text-slate-300 leading-relaxed">
          {prompt.isNeoGeo
            ? 'This ROM was detected as a Neo Geo title, and neogeo.zip could not be verified automatically in your local BIOS Vault. Upload neogeo.zip below so FBNeo / MAME 2003+ can boot it reliably.'
            : 'This ROM requires system firmware that is not yet present in your local BIOS Vault. Upload the missing BIOS file below to store it in IndexedDB.'}
        </p>

        <div className="mt-4 space-y-2">
          {prompt.missingEntries.map((entry) => (
            <div
              key={entry.id}
              className="rounded-lg border border-white/[0.08] bg-[#090B0E] p-3 text-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono font-semibold text-orange-400">{entry.filename}</span>
                <span className="font-mono text-[11px] text-slate-400">
                  {formatBytes(entry.sizeBytes)}
                  {entry.crc32 !== 'varies' ? ` · CRC32 ${entry.crc32}` : ''}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">{entry.notes}</p>
            </div>
          ))}
        </div>

        <input
          ref={fileRef}
          type="file"
          multiple
          onChange={(e) => void handleUpload(e.target.files)}
          className="hidden"
          aria-label="Upload required BIOS file"
        />

        {error && (
          <div
            role="alert"
            className="mt-4 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-950/30 p-3 text-xs text-red-200"
          >
            <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div
            role="status"
            className="mt-4 flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-950/25 p-3 text-xs text-emerald-200"
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-xs font-semibold text-slate-950 hover:bg-orange-400 disabled:opacity-50 transition-colors cursor-pointer"
          >
            <Upload className="h-4 w-4" aria-hidden="true" />
            <span>{busy ? 'Verifying BIOS...' : 'Upload BIOS File(s)'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onNavigate('bios');
            }}
            className="inline-flex items-center justify-center rounded-lg border border-white/[0.12] bg-white/[0.04] px-3.5 py-2.5 text-xs font-medium text-slate-200 hover:bg-white/[0.08] cursor-pointer"
          >
            Open BIOS Vault
          </button>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-lg border border-white/[0.08] px-3.5 py-2.5 text-xs font-medium text-slate-400 hover:text-white cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
