import { Gamepad2, RotateCcw, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useGamepad } from '../hooks/useGamepad';
import type { GamepadMappingProfile } from '../types';

interface GamepadConfigModalProps {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

const BUTTON_FIELDS: Array<{ key: keyof Omit<GamepadMappingProfile, 'deadzone'>; label: string }> = [
  { key: 'bButton', label: 'B / South' },
  { key: 'aButton', label: 'A / East' },
  { key: 'yButton', label: 'Y / West' },
  { key: 'xButton', label: 'X / North' },
  { key: 'lButton', label: 'L Shoulder' },
  { key: 'rButton', label: 'R Shoulder' },
  { key: 'selectButton', label: 'Select' },
  { key: 'startButton', label: 'Start' },
];

export function GamepadConfigModal({ open, onClose, onSaved }: GamepadConfigModalProps) {
  const { gamepads, mapping, updateMapping, resetMapping } = useGamepad(open);
  const [capturingKey, setCapturingKey] = useState<keyof Omit<GamepadMappingProfile, 'deadzone'> | null>(
    null
  );

  const activePad = gamepads[0];
  const firstPressedButton = activePad?.pressedButtons[0];

  useEffect(() => {
    if (!open || !capturingKey || firstPressedButton === undefined) return;
    if (mapping[capturingKey] !== firstPressedButton) {
      updateMapping({ ...mapping, [capturingKey]: firstPressedButton });
      onSaved?.();
    }
    setCapturingKey(null);
  }, [open, capturingKey, firstPressedButton, mapping, updateMapping, onSaved]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gamepad-config-title"
    >
      <div className="w-full max-w-xl rounded-xl border border-white/[0.12] bg-[#11151B] p-6 shadow-2xl space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#171C24] text-orange-400">
              <Gamepad2 className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="gamepad-config-title" className="font-display text-lg font-bold text-white">
                Gamepad Detection &amp; Mapping
              </h2>
              <p className="text-xs text-slate-400">
                Web Gamepad API live diagnostics and button profile
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] text-slate-400 hover:bg-white/[0.05] hover:text-white cursor-pointer"
            aria-label="Close gamepad configuration"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Connected Controllers */}
        <div className="rounded-lg border border-white/[0.08] bg-[#090B0E] p-4 space-y-3">
          {activePad ? (
            <>
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="font-medium text-emerald-300">
                  Connected: {activePad.id}
                </span>
                <span className="font-mono text-slate-400 tabular-nums">
                  {activePad.buttonsCount} buttons · {activePad.axesCount} axes
                </span>
              </div>

              <div>
                <p className="text-[11px] text-slate-500 mb-1.5">
                  Live Button Activity (press any button on your controller)
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {Array.from({ length: Math.min(activePad.buttonsCount, 16) }).map((_, idx) => {
                    const pressed = activePad.pressedButtons.includes(idx);
                    return (
                      <span
                        key={idx}
                        className={`inline-flex h-7 w-7 items-center justify-center rounded-md font-mono text-[11px] tabular-nums transition-colors ${
                          pressed
                            ? 'bg-orange-500 text-slate-950 font-bold'
                            : 'bg-[#141923] text-slate-400 border border-white/[0.06]'
                        }`}
                      >
                        {idx}
                      </span>
                    );
                  })}
                </div>
              </div>

              {activePad.axes.length > 0 && (
                <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] font-mono text-slate-400 sm:grid-cols-4">
                  {activePad.axes.slice(0, 4).map((val, idx) => (
                    <div
                      key={idx}
                      className="rounded border border-white/[0.06] bg-[#141923] px-2 py-1 tabular-nums"
                    >
                      Axis {idx}: {val.toFixed(2)}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-slate-400 leading-relaxed">
              No controller detected yet. Connect a USB or Bluetooth gamepad and press any button to wake it up in your browser.
            </p>
          )}
        </div>

        {/* Mapping Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-white">RetroPad Button Mapping</h3>
            <button
              type="button"
              onClick={() => {
                resetMapping();
                onSaved?.();
              }}
              className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" aria-hidden="true" />
              <span>Reset Defaults</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {BUTTON_FIELDS.map((field) => {
              const isCapturing = capturingKey === field.key;
              return (
                <div
                  key={field.key}
                  className="rounded-lg border border-white/[0.08] bg-[#090B0E] p-2.5 text-xs"
                >
                  <span className="text-slate-400 block text-[11px]">{field.label}</span>
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <span className="font-mono font-semibold text-white tabular-nums">
                      Btn {mapping[field.key]}
                    </span>
                    <button
                      type="button"
                      disabled={!activePad}
                      onClick={() => setCapturingKey(isCapturing ? null : field.key)}
                      className={`rounded px-2 py-1 text-[11px] font-medium transition-colors cursor-pointer disabled:opacity-40 ${
                        isCapturing
                          ? 'bg-orange-500 text-slate-950'
                          : 'bg-white/[0.07] text-slate-200 hover:bg-white/[0.14]'
                      }`}
                    >
                      {isCapturing ? 'Press...' : 'Map'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-4 pt-1 text-xs">
            <label htmlFor="gamepad-deadzone" className="text-slate-400">
              Analog Stick Deadzone ({Math.round(mapping.deadzone * 100)}%)
            </label>
            <input
              id="gamepad-deadzone"
              type="range"
              min="0.05"
              max="0.5"
              step="0.05"
              value={mapping.deadzone}
              onChange={(e) => {
                updateMapping({ ...mapping, deadzone: Number(e.target.value) });
                onSaved?.();
              }}
              className="w-40 accent-orange-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
