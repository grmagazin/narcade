import { AlertCircle, CheckCircle2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { getSupportedExtensions, systems } from '../services/dataService';

interface RomDropzoneProps {
  onFilesSelected: (files: File[], systemOverride?: string) => Promise<void>;
  compact?: boolean;
  defaultSystemId?: string;
}

export function RomDropzone({
  onFilesSelected,
  compact = false,
  defaultSystemId = 'auto',
}: RomDropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [systemId, setSystemId] = useState<string>(defaultSystemId);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const acceptList = getSupportedExtensions().join(',');

  const processFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    setBusy(true);
    try {
      const files = Array.from(fileList);
      await onFilesSelected(files, systemId === 'auto' ? undefined : systemId);
      setSuccessMsg(
        files.length === 1
          ? `Loaded "${files[0].name}" into your browser ROM vault.`
          : `Loaded ${files.length} ROM files into your browser ROM vault.`
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to validate ROM file.');
    } finally {
      setBusy(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void processFiles(e.dataTransfer.files);
        }}
        className={`rounded-xl border border-dashed transition-colors ${
          dragging
            ? 'border-orange-500 bg-orange-500/[0.07]'
            : 'border-white/[0.14] bg-[#11151B] hover:border-white/[0.24]'
        } ${compact ? 'p-5' : 'p-8'}`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={acceptList}
          onChange={(e) => void processFiles(e.target.files)}
          className="hidden"
          aria-label="Select ROM or ZIP files"
        />

        <div className="flex flex-col items-center text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/[0.1] bg-[#171C24] text-orange-400">
            <Upload className="h-5 w-5" aria-hidden="true" />
          </div>

          <h3 className="mt-3 font-display text-base font-semibold text-white">
            {busy ? 'Validating and storing ROM...' : 'Drop ROM or ZIP files here'}
          </h3>
          <p className="mt-1 text-xs text-slate-400 max-w-md leading-relaxed">
            Supports .nes, .sfc, .smc, .gb, .gbc, .gba, .md, .bin, .sms, .pce, .a26, .n64, .z64, .nds, .iso, .cue, .chd, and .zip archives. Files never leave your device.
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <select
              value={systemId}
              onChange={(e) => setSystemId(e.target.value)}
              aria-label="Target console system"
              className="h-9 rounded-lg border border-white/[0.12] bg-[#0B0E14] px-3 text-xs text-slate-200 focus:border-orange-500 focus:outline-none"
            >
              <option value="auto">Auto-detect system by extension</option>
              {systems.map((sys) => (
                <option key={sys.id} value={sys.id}>
                  {sys.name} ({sys.core})
                </option>
              ))}
            </select>

            <button
              type="button"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
              className="h-9 rounded-lg bg-orange-500 px-4 text-xs font-semibold text-slate-950 transition-colors hover:bg-orange-400 disabled:opacity-50 whitespace-nowrap cursor-pointer"
            >
              {busy ? 'Inspecting...' : 'Choose Local File'}
            </button>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-lg border border-red-500/30 bg-red-950/30 px-3.5 py-2.5 text-xs text-red-200"
        >
          <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-950/25 px-3.5 py-2.5 text-xs text-emerald-200"
        >
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{successMsg}</span>
        </div>
      )}
    </div>
  );
}
