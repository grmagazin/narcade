import { useCallback, useEffect, useState } from 'react';
import type { ModuleRoute } from '../types';

const VALID_ROUTES: ModuleRoute[] = ['home', 'library', 'archive', 'embeds', 'systems', 'player', 'roms', 'bios'];

function parseHash(): { route: ModuleRoute; systemFilter: string } {
  if (typeof window === 'undefined') {
    return { route: 'home', systemFilter: 'all' };
  }
  const raw = window.location.hash.replace(/^#/, '');
  const [routePart, queryPart] = raw.split('?');
  const normalized = routePart.toLowerCase() as ModuleRoute;
  const route = VALID_ROUTES.includes(normalized) ? normalized : 'home';
  const params = new URLSearchParams(queryPart || '');
  const systemFilter = params.get('system') || 'all';
  return { route, systemFilter };
}

export function useNavigation() {
  const [navState, setNavState] = useState<{ route: ModuleRoute; systemFilter: string }>(() =>
    parseHash()
  );

  useEffect(() => {
    const onHashChange = () => {
      setNavState(parseHash());
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = useCallback((route: ModuleRoute, opts?: { systemFilter?: string }) => {
    const nextHash =
      opts?.systemFilter && opts.systemFilter !== 'all'
        ? `#${route}?system=${encodeURIComponent(opts.systemFilter)}`
        : `#${route}`;
    if (window.location.hash !== nextHash) {
      window.location.hash = nextHash;
    } else {
      setNavState({ route, systemFilter: opts?.systemFilter || 'all' });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return {
    route: navState.route,
    systemFilter: navState.systemFilter,
    navigate,
  };
}
