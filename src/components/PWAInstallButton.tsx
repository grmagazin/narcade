import { Download, Smartphone } from 'lucide-react';
import { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'primary' | 'subtle';
}

export function PWAInstallButton({ variant = 'subtle' }: PWAInstallButtonProps) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
          variant === 'primary'
            ? 'bg-orange-500 text-slate-950 hover:bg-orange-400'
            : 'border border-white/[0.14] bg-white/[0.05] text-white hover:bg-white/[0.1]'
        }`}
      >
        <Download className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Install App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.14] bg-white/[0.05] px-3.5 py-2 text-xs font-medium text-white hover:bg-white/[0.1] whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Smartphone className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Install on iOS</span>
        </button>

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ios-install-title"
          >
            <div className="w-full max-w-sm rounded-xl border border-white/[0.12] bg-[#11151B] p-6 shadow-2xl">
              <h3 id="ios-install-title" className="font-display text-lg font-bold text-white">
                Install ngames on iPhone / iPad
              </h3>
              <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                1. Tap the <strong>Share</strong> button in Safari&apos;s toolbar.
                <br />
                2. Scroll down and tap <strong>Add to Home Screen</strong> to launch ngames offline in standalone mode.
              </p>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full rounded-lg bg-orange-500 py-2 text-xs font-semibold text-slate-950 hover:bg-orange-400 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
}
