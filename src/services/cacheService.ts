import { clearArchiveCache } from './archiveBrowserService';
import { logDebug } from './debugLogService';

const CACHE_LOCALSTORAGE_KEYS = [
  'ngames_ia_mame_meta_v1',
  'ngames_recent_plays_v1',
];

export interface ClearCacheResult {
  clearedBuckets: number;
  clearedStorageKeys: number;
}

export async function clearLocalBrowserCache(): Promise<ClearCacheResult> {
  clearArchiveCache();

  let clearedStorageKeys = 0;
  for (const key of CACHE_LOCALSTORAGE_KEYS) {
    try {
      if (localStorage.getItem(key) !== null) {
        localStorage.removeItem(key);
        clearedStorageKeys++;
      }
    } catch {
      // Ignore storage errors
    }
  }

  let clearedBuckets = 0;
  if (typeof caches !== 'undefined') {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(async (name) => {
          const ok = await caches.delete(name);
          if (ok) clearedBuckets++;
        })
      );
    } catch {
      // Ignore CacheStorage denial
    }
  }

  logDebug(
    'success',
    'cache',
    `Cleared local cache (${clearedBuckets} cache bucket${clearedBuckets === 1 ? '' : 's'}, ${clearedStorageKeys} metadata cache key${clearedStorageKeys === 1 ? '' : 's'}). Vault ROMs/BIOS preserved.`
  );

  return { clearedBuckets, clearedStorageKeys };
}
