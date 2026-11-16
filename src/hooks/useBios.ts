import { useCallback, useEffect, useState } from 'react';
import { verifyAndStoreBiosFile } from '../services/biosService';
import { deleteBiosFromVault, listBiosFromVault } from '../services/storageService';
import type { StoredBiosMeta } from '../types';

export function useBios() {
  const [storedBios, setStoredBios] = useState<StoredBiosMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const items = await listBiosFromVault();
      setStoredBios(items);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read stored BIOS files.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const ingestBiosFiles = useCallback(
    async (files: FileList | File[], fallbackSystemId?: string) => {
      const list = Array.from(files);
      const outcomes = [];
      for (const file of list) {
        const res = await verifyAndStoreBiosFile(file, fallbackSystemId);
        outcomes.push(res);
      }
      await refresh();
      return outcomes;
    },
    [refresh]
  );

  const removeBios = useCallback(
    async (biosId: string) => {
      await deleteBiosFromVault(biosId);
      await refresh();
    },
    [refresh]
  );

  return {
    storedBios,
    loading,
    error,
    refresh,
    ingestBiosFiles,
    removeBios,
  };
}
