interface SystemIconProps {
  systemId: string;
  className?: string;
}

export function SystemIcon({ systemId, className = 'w-6 h-6' }: SystemIconProps) {
  switch (systemId) {
    case 'nes':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
          <rect x="2" y="6" width="20" height="12" rx="2" />
          <path d="M6.5 10v4M4.5 12h4" strokeLinecap="round" />
          <rect x="10.5" y="13.5" width="2" height="1" rx="0.5" fill="currentColor" />
          <rect x="13.5" y="13.5" width="2" height="1" rx="0.5" fill="currentColor" />
          <circle cx="17.5" cy="11.5" r="1" fill="currentColor" />
          <circle cx="19.5" cy="11.5" r="1" fill="currentColor" />
        </svg>
      );
    case 'snes':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
          <rect x="2" y="6.5" width="20" height="11" rx="5.5" />
          <path d="M7 10v4M5 12h4" strokeLinecap="round" />
          <circle cx="16.5" cy="10.2" r="0.9" fill="currentColor" />
          <circle cx="18.5" cy="12" r="0.9" fill="currentColor" />
          <circle cx="16.5" cy="13.8" r="0.9" fill="currentColor" />
          <circle cx="14.5" cy="12" r="0.9" fill="currentColor" />
        </svg>
      );
    case 'gb':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
          <rect x="5" y="2.5" width="14" height="19" rx="2" />
          <rect x="7.5" y="5" width="9" height="6.5" rx="1" />
          <path d="M8.5 14.5v3M7 16h3" strokeLinecap="round" />
          <circle cx="15.5" cy="15.2" r="0.9" fill="currentColor" />
          <circle cx="13.5" cy="16.8" r="0.9" fill="currentColor" />
        </svg>
      );
    case 'gba':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
          <rect x="2" y="6" width="20" height="12" rx="4.5" />
          <rect x="7.5" y="8.2" width="9" height="7.6" rx="1" />
          <path d="M4.8 10.5v3M3.3 12h3" strokeLinecap="round" />
          <circle cx="19" cy="11.2" r="0.9" fill="currentColor" />
          <circle cx="18.2" cy="13.4" r="0.9" fill="currentColor" />
        </svg>
      );
    case 'segaMD':
    case 'segaMS':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
          <path d="M3 10.5C3 7.5 5.5 6 8.5 6h7c3 0 5.5 1.5 5.5 4.5v2.5c0 2.5-1.8 4.5-4 4.5-1.5 0-2.5-.8-5-.8s-3.5.8-5 .8c-2.2 0-4-2-4-4.5v-2.5z" />
          <circle cx="7.5" cy="11.5" r="2" />
          <circle cx="14.5" cy="12" r="0.8" fill="currentColor" />
          <circle cx="16.8" cy="11" r="0.8" fill="currentColor" />
          <circle cx="18.8" cy="10" r="0.8" fill="currentColor" />
        </svg>
      );
    case 'pce':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <rect x="6" y="8" width="12" height="3.5" rx="0.5" />
          <path d="M7 15.5h3M15 15.5h2" strokeLinecap="round" />
        </svg>
      );
    case 'atari2600':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
          <rect x="4" y="14" width="16" height="6" rx="1.5" />
          <path d="M12 14V6" strokeLinecap="round" />
          <circle cx="12" cy="5.5" r="2" />
          <circle cx="7" cy="17" r="1" fill="currentColor" />
        </svg>
      );
    case 'psx':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="2.5" />
          <path d="M12 3v3M12 18v3" strokeLinecap="round" />
        </svg>
      );
    case 'n64':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
          <path d="M4 9c0-2 2-3.5 5-3.5h6c3 0 5 1.5 5 3.5l-1.5 9c-.3 1.5-1.7 1.5-2.2 0L14.5 13h-5L7.7 18c-.5 1.5-1.9 1.5-2.2 0L4 9z" />
          <circle cx="12" cy="10.5" r="1.3" />
        </svg>
      );
    case 'nds':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
          <rect x="5" y="2.5" width="14" height="8.5" rx="1.5" />
          <rect x="5" y="13" width="14" height="8.5" rx="1.5" />
          <path d="M8 11h8" strokeLinecap="round" />
        </svg>
      );
    case 'arcade':
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
          <path d="M6 21V9l2-5h8l2 5v12H6z" />
          <rect x="8.5" y="8" width="7" height="5" rx="0.8" />
          <path d="M9 16.5h6" strokeLinecap="round" />
        </svg>
      );
  }
}
