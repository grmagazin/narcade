import { Menu, Play, X } from 'lucide-react';
import { useState } from 'react';
import { APP_VERSION } from '../config/version';
import type { ModuleRoute, PlaySession } from '../types';

interface NavbarProps {
  currentRoute: ModuleRoute;
  activeSession: PlaySession | null;
  onNavigate: (route: ModuleRoute) => void;
}

const NAV_ITEMS: Array<{ route: ModuleRoute; label: string }> = [
  { route: 'home', label: 'Home' },
  { route: 'library', label: 'Library' },
  { route: 'archive', label: 'Archive' },
  { route: 'embeds', label: 'Embeds' },
  { route: 'systems', label: 'Systems' },
  { route: 'roms', label: 'ROMs' },
  { route: 'bios', label: 'BIOS' },
];

export function Navbar({ currentRoute, activeSession, onNavigate }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNav = (route: ModuleRoute) => {
    setMobileOpen(false);
    onNavigate(route);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#090B0E]/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Wordmark + Build Version */}
        <button
          type="button"
          onClick={() => handleNav('home')}
          className="inline-flex items-baseline gap-2 font-display text-xl font-bold tracking-tight text-white whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded-sm cursor-pointer"
        >
          <span>ngames</span>
          <span className="font-mono text-[11px] font-medium text-slate-400 tracking-normal">
            v{APP_VERSION}
          </span>
        </button>

        {/* Zone 2: Clean single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-5 lg:gap-6" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => {
            const active = currentRoute === item.route;
            return (
              <button
                key={item.route}
                type="button"
                onClick={() => handleNav(item.route)}
                className={`relative py-1 text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded-sm ${
                  active
                    ? 'text-white'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                {item.label}
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 -bottom-[19px] h-[2px] bg-orange-500"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => handleNav('player')}
            className="hidden sm:inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-orange-400 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
          >
            <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
            <span>{activeSession ? 'Resume Player' : 'Open Player'}</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/[0.1] text-slate-300 hover:bg-white/[0.05] hover:text-white md:hidden cursor-pointer"
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="border-t border-white/[0.08] bg-[#0D1016] px-4 py-3 md:hidden">
          <nav className="flex flex-col gap-1" aria-label="Mobile navigation">
            {NAV_ITEMS.map((item) => {
              const active = currentRoute === item.route;
              return (
                <button
                  key={item.route}
                  type="button"
                  onClick={() => handleNav(item.route)}
                  className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors cursor-pointer ${
                    active
                      ? 'bg-white/[0.07] text-white'
                      : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-100'
                  }`}
                >
                  <span>{item.label}</span>
                  {active && <span className="text-xs text-orange-400">Active</span>}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => handleNav('player')}
              className="mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-slate-950 cursor-pointer"
            >
              <Play className="h-4 w-4 fill-current" aria-hidden="true" />
              <span>{activeSession ? 'Resume Player' : 'Open Player'}</span>
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
