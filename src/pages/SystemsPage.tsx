import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { SystemIcon } from '../components/SystemIcon';
import { systems } from '../services/dataService';
import type { ModuleRoute, StoredBiosMeta, StoredRomMeta } from '../types';

interface SystemsPageProps {
  storedRoms: StoredRomMeta[];
  storedBios: StoredBiosMeta[];
  onNavigate: (route: ModuleRoute, opts?: { systemFilter?: string }) => void;
}

export function SystemsPage({ storedRoms, storedBios, onNavigate }: SystemsPageProps) {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-white">
            System Browser
          </h1>
          <p className="mt-1 text-sm text-slate-400 max-w-2xl">
            Hardware platforms, EmulatorJS WebAssembly cores, supported ROM extensions, and BIOS compatibility status.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('bios')}
          className="rounded-lg border border-white/[0.12] bg-white/[0.04] px-4 py-2 text-xs font-medium text-white hover:bg-white/[0.08] whitespace-nowrap self-start sm:self-auto cursor-pointer"
        >
          Open BIOS Compatibility
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {systems.map((sys) => {
          const romCount = storedRoms.filter((r) => r.systemId === sys.id).length;
          const biosCount = storedBios.filter((b) => b.systemId === sys.id).length;

          return (
            <article
              key={sys.id}
              className="flex flex-col justify-between rounded-xl border border-white/[0.08] bg-[#11151B] p-5"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#171C24] text-orange-400">
                      <SystemIcon systemId={sys.id} className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="font-display text-base font-bold text-white">{sys.name}</h2>
                      <p className="text-xs text-slate-400">
                        {sys.manufacturer} · <span className="tabular-nums">{sys.year}</span> ·{' '}
                        {sys.generation}
                      </p>
                    </div>
                  </div>
                </div>

                <p className="mt-3 text-xs text-slate-300 leading-relaxed">{sys.description}</p>

                <dl className="mt-4 space-y-2 border-t border-white/[0.06] pt-3 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-slate-500">EmulatorJS Core</dt>
                    <dd className="font-mono text-slate-200">
                      {sys.core}{' '}
                      <span className="text-slate-500">
                        ({sys.selfHostedCore ? 'Bundled' : 'On-demand'})
                      </span>
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-slate-500">Extensions</dt>
                    <dd className="font-mono text-slate-200">{sys.extensions.join(', ')}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-slate-500">Vault ROMs</dt>
                    <dd className="tabular-nums text-slate-200">{romCount}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-slate-500">BIOS Status</dt>
                    <dd className="flex items-center gap-1.5">
                      {sys.biosRequirement === 'none' && (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                          <span className="text-emerald-300">No BIOS Needed</span>
                        </>
                      )}
                      {sys.biosRequirement === 'optional' && (
                        <>
                          <Info className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
                          <span className="text-sky-300">
                            Optional {biosCount > 0 ? `(${biosCount} loaded)` : '(HLE Built-in)'}
                          </span>
                        </>
                      )}
                      {sys.biosRequirement === 'required' && (
                        <>
                          {biosCount > 0 ? (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                              <span className="text-emerald-300">{biosCount} BIOS Ready</span>
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
                              <span className="text-amber-300">Required for Boot</span>
                            </>
                          )}
                        </>
                      )}
                    </dd>
                  </div>
                </dl>

                <p className="mt-3 text-[11px] text-slate-400 leading-relaxed">{sys.biosNotes}</p>
              </div>

              <div className="mt-4 flex items-center gap-2 pt-3 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => onNavigate('library', { systemFilter: sys.id })}
                  className="flex-1 rounded-lg border border-white/[0.12] bg-white/[0.04] px-3 py-2 text-xs font-medium text-white hover:bg-white/[0.09] transition-colors cursor-pointer"
                >
                  View Games
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('roms', { systemFilter: sys.id })}
                  className="flex-1 rounded-lg bg-orange-500 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-orange-400 transition-colors cursor-pointer"
                >
                  Load {sys.shortName} ROM
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
