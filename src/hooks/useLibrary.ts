import { useCallback, useEffect, useState } from 'react';
import { isLikelyIframeEmbedUrl, toArchiveCorsUrl } from '../services/archiveBrowserService';
import { checkRequiredBiosForRom } from '../services/biosService';
import { findLibretroCoverUrl } from '../services/coverArtService';
import { detectSystemFromExtension, getSystemById } from '../services/dataService';
import { logDebug } from '../services/debugLogService';
import { parseRomHeader } from '../services/romHeaderService';
import {
  validateAndFetchExternalRomUrl,
  validateAndIngestRomFile,
} from '../services/romService';
import {
  deleteMultiDiscSet,
  deleteRomFromVault,
  getCatalogBindings,
  getRecentPlays,
  getRomFromVault,
  listMultiDiscSets,
  listRomsFromVault,
  recordRecentPlay,
  saveMultiDiscSet,
  setCatalogBinding,
  updateRomMetadata,
} from '../services/storageService';
import type {
  CatalogGame,
  MissingBiosPrompt,
  MultiDiscSet,
  PlaySession,
  RecentPlayEntry,
  StoredBiosMeta,
  StoredRomMeta,
} from '../types';

export interface UseLibraryOptions {
  storedBios?: StoredBiosMeta[];
  onBiosAutoInstalled?: () => Promise<void> | void;
  onMissingBiosDetected?: (prompt: MissingBiosPrompt) => void;
}

export function useLibrary(options?: UseLibraryOptions) {
  const [storedRoms, setStoredRoms] = useState<StoredRomMeta[]>([]);
  const [discSets, setDiscSets] = useState<MultiDiscSet[]>([]);
  const [recentPlays, setRecentPlays] = useState<RecentPlayEntry[]>(() => getRecentPlays());
  const [catalogBindings, setCatalogBindings] = useState<Record<string, string>>(() =>
    getCatalogBindings()
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [items, sets] = await Promise.all([listRomsFromVault(), listMultiDiscSets()]);
      setStoredRoms(items);
      setDiscSets(sets);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read stored ROMs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const tryAutoFetchCoverInBackground = useCallback(
    (rom: { id: string; title: string; systemId: string; fileName: string; coverDataUrl?: string }) => {
      if (rom.coverDataUrl) return;
      void findLibretroCoverUrl(rom.title, rom.systemId, rom.fileName).then(async (url) => {
        if (!url) return;
        try {
          await updateRomMetadata(rom.id, { coverDataUrl: url });
          await refresh();
        } catch {
          // Ignore background update failure if ROM was removed
        }
      });
    },
    [refresh]
  );

  const verifyRequiredBiosAfterIngest = useCallback(
    async (rom: {
      title: string;
      systemId: string;
      fileName: string;
      extension?: string;
      sourceUrl?: string;
    }) => {
      const result = await checkRequiredBiosForRom(rom, options?.storedBios);
      if (result.autoInstalledNeoGeo) {
        logDebug(
          'info',
          'bios',
          `Auto-cached self-hosted neogeo.zip in BIOS Vault for ${rom.title}`
        );
        await options?.onBiosAutoInstalled?.();
      }
      if (result.missingEntries.length > 0) {
        const names = result.missingEntries.map((e) => e.filename).join(', ');
        logDebug('error', 'bios', `Missing required BIOS (${names}) for ${rom.title}`);
        options?.onMissingBiosDetected?.({
          romTitle: rom.title,
          systemId: rom.systemId,
          isNeoGeo: result.isNeoGeo,
          missingEntries: result.missingEntries,
        });
      }
    },
    [options]
  );

  const ingestFiles = useCallback(
    async (files: FileList | File[], overrideSystemId?: string, bindCatalogId?: string) => {
      const list = Array.from(files);
      if (list.length === 0) return [];
      const results = [];
      for (const file of list) {
        const outcome = await validateAndIngestRomFile(file, overrideSystemId);
        results.push(outcome);
        if (bindCatalogId) {
          const next = setCatalogBinding(bindCatalogId, outcome.rom.id);
          setCatalogBindings(next);
        }
        tryAutoFetchCoverInBackground(outcome.rom);
        await verifyRequiredBiosAfterIngest(outcome.rom);
      }
      await refresh();
      return results;
    },
    [refresh, tryAutoFetchCoverInBackground, verifyRequiredBiosAfterIngest]
  );

  const ingestUrl = useCallback(
    async (url: string, overrideSystemId?: string, bindCatalogId?: string) => {
      const outcome = await validateAndFetchExternalRomUrl(url, overrideSystemId);
      if (bindCatalogId) {
        const next = setCatalogBinding(bindCatalogId, outcome.rom.id);
        setCatalogBindings(next);
      }
      tryAutoFetchCoverInBackground(outcome.rom);
      await verifyRequiredBiosAfterIngest(outcome.rom);
      await refresh();
      return outcome;
    },
    [refresh, tryAutoFetchCoverInBackground, verifyRequiredBiosAfterIngest]
  );

  const removeRom = useCallback(
    async (romId: string) => {
      await deleteRomFromVault(romId);
      await refresh();
    },
    [refresh]
  );

  const updateRomCover = useCallback(
    async (romId: string, coverDataUrl: string | undefined) => {
      await updateRomMetadata(romId, { coverDataUrl });
      await refresh();
    },
    [refresh]
  );

  const updateRomCategory = useCallback(
    async (romId: string, category: string) => {
      await updateRomMetadata(romId, { category });
      await refresh();
    },
    [refresh]
  );

  const createDiscSet = useCallback(
    async (title: string, systemId: string, discRomIds: string[]): Promise<MultiDiscSet> => {
      const sys = getSystemById(systemId);
      if (!sys) throw new Error('Selected console system is unknown.');
      if (discRomIds.length < 2) {
        throw new Error('Select at least 2 disc images to build a multi-disc .m3u playlist.');
      }

      const discFileNames: string[] = [];
      for (const rid of discRomIds) {
        const meta = storedRoms.find((r) => r.id === rid);
        if (!meta) throw new Error('One of the selected discs is missing from the ROM vault.');
        discFileNames.push(meta.fileName);
      }

      const setItem: MultiDiscSet = {
        id: `m3u_${Date.now()}`,
        title: title.trim() || 'Multi-Disc Collection',
        systemId: sys.id,
        core: sys.core,
        discRomIds,
        discFileNames,
        createdAt: Date.now(),
      };
      await saveMultiDiscSet(setItem);
      await refresh();
      return setItem;
    },
    [storedRoms, refresh]
  );

  const removeDiscSet = useCallback(
    async (setId: string) => {
      await deleteMultiDiscSet(setId);
      await refresh();
    },
    [refresh]
  );

  const bindCatalogGame = useCallback((catalogGameId: string, romId: string) => {
    const next = setCatalogBinding(catalogGameId, romId);
    setCatalogBindings(next);
  }, []);

  const buildPlaySessionFromRomId = useCallback(
    async (romId: string, overrideTitle?: string): Promise<PlaySession> => {
      const rom = await getRomFromVault(romId);
      if (!rom) {
        throw new Error('This ROM is no longer stored in browser IndexedDB.');
      }
      const title = overrideTitle || rom.title;
      const nextRecents = recordRecentPlay({
        id: rom.id,
        title,
        systemId: rom.systemId,
        core: rom.core,
        romId: rom.id,
        romFileName: rom.fileName,
        romUrl: rom.sourceUrl,
        playedAt: Date.now(),
      });
      setRecentPlays(nextRecents);

      return {
        id: `${rom.id}_${Date.now()}`,
        title,
        systemId: rom.systemId,
        core: rom.core,
        romId: rom.id,
        romFileName: rom.fileName,
        romBuffer: rom.data,
        romUrl: rom.sourceUrl,
        headerInfo: rom.headerInfo,
        startedAt: Date.now(),
      };
    },
    []
  );

  const buildPlaySessionFromBundledGame = useCallback(
    async (game: CatalogGame): Promise<PlaySession> => {
      if (!game.bundledRomUrl) {
        throw new Error('This catalog entry does not include a bundled ROM binary.');
      }
      const sys = getSystemById(game.systemId);
      if (!sys) {
        throw new Error(`Unknown system "${game.systemId}" for bundled game.`);
      }

      const res = await fetch(game.bundledRomUrl);
      if (!res.ok) {
        throw new Error(`Unable to load bundled ROM (${res.status}).`);
      }
      const buffer = await res.arrayBuffer();
      const fileName = game.bundledRomUrl.split('/').pop() || `${game.id}${game.romFormat}`;
      const headerInfo = parseRomHeader(buffer, game.romFormat);

      const nextRecents = recordRecentPlay({
        id: `bundled_${game.id}`,
        title: game.title,
        systemId: game.systemId,
        core: sys.core,
        romFileName: fileName,
        romUrl: game.bundledRomUrl,
        playedAt: Date.now(),
      });
      setRecentPlays(nextRecents);

      return {
        id: `bundled_${game.id}_${Date.now()}`,
        title: game.title,
        systemId: game.systemId,
        core: sys.core,
        romFileName: fileName,
        romBuffer: buffer,
        headerInfo,
        startedAt: Date.now(),
      };
    },
    []
  );

  const buildPlaySessionFromEmbed = useCallback(
    (title: string, embedUrl: string, systemId = 'arcade'): PlaySession => {
      const cleanTitle = title.trim() || 'External Archive Embed';
      const nextRecents = recordRecentPlay({
        id: `embed_${embedUrl}`,
        title: cleanTitle,
        systemId,
        core: 'embed',
        romFileName: embedUrl.split('/').pop() || 'embed',
        embedUrl,
        playedAt: Date.now(),
      });
      setRecentPlays(nextRecents);

      return {
        id: `embed_${Date.now()}`,
        title: cleanTitle,
        systemId,
        core: 'embed',
        romFileName: embedUrl.split('/').pop() || 'Archive Embed',
        embedUrl,
        startedAt: Date.now(),
      };
    },
    []
  );

  const buildPlaySessionFromExternalUrl = useCallback(
    (
      rawUrl: string,
      opts?: {
        systemId?: string;
        core?: string;
        title?: string;
        category?: string;
        isNeoGeo?: boolean;
      }
    ): PlaySession => {
      const trimmed = rawUrl.trim();
      const parsed = new URL(trimmed);

      if (isLikelyIframeEmbedUrl(parsed.toString())) {
        const title =
          opts?.title ||
          decodeURIComponent(parsed.pathname.split('/').pop() || 'Archive Embed').replace(
            /^arcade_/i,
            ''
          );
        return buildPlaySessionFromEmbed(title, parsed.toString(), opts?.systemId || 'arcade');
      }

      const corsSafeUrl = toArchiveCorsUrl(parsed.toString());
      const fileName = decodeURIComponent(parsed.pathname.split('/').pop() || 'external-rom.zip');
      const inferredSystem =
        (opts?.systemId ? getSystemById(opts.systemId) : undefined) ||
        detectSystemFromExtension(fileName) ||
        getSystemById('arcade');

      const systemId = opts?.systemId || inferredSystem?.id || 'arcade';
      const core =
        opts?.core ||
        (systemId === 'arcade' && trimmed.includes('MAME0.139')
          ? 'mame2003_plus'
          : inferredSystem?.core || 'fbneo');

      const title =
        opts?.title ||
        fileName
          .replace(/\.[^.]+$/, '')
          .replace(/[_]+/g, ' ')
          .trim() ||
        'External ROM';

      const nextRecents = recordRecentPlay({
        id: `ext_${corsSafeUrl}`,
        title,
        systemId,
        core,
        romFileName: fileName,
        romUrl: corsSafeUrl,
        playedAt: Date.now(),
      });
      setRecentPlays(nextRecents);

      return {
        id: `ext_${Date.now()}`,
        title,
        systemId,
        core,
        category: opts?.category,
        isNeoGeo: opts?.isNeoGeo,
        romFileName: fileName,
        romUrl: corsSafeUrl,
        startedAt: Date.now(),
      };
    },
    [buildPlaySessionFromEmbed]
  );

  const buildPlaySessionFromDiscSet = useCallback(async (setItem: MultiDiscSet): Promise<PlaySession> => {
    const extraDiscFiles: Array<{ name: string; buffer: ArrayBuffer }> = [];
    const m3uLines: string[] = [];

    for (let i = 0; i < setItem.discRomIds.length; i++) {
      const rom = await getRomFromVault(setItem.discRomIds[i]);
      if (!rom) {
        throw new Error(`Disc ${i + 1} (${setItem.discFileNames[i]}) is missing from vault.`);
      }
      const safeName = rom.fileName.replace(/[/\\]/g, '_');
      extraDiscFiles.push({ name: safeName, buffer: rom.data });
      m3uLines.push(`${safeName}|Disc ${i + 1}`);
    }

    const m3uText = m3uLines.join('\n');
    const m3uBytes = new TextEncoder().encode(m3uText);
    const playlistName = `${setItem.title.replace(/[^a-zA-Z0-9._-]/g, '_')}.m3u`;

    const nextRecents = recordRecentPlay({
      id: setItem.id,
      title: setItem.title,
      systemId: setItem.systemId,
      core: setItem.core,
      romFileName: playlistName,
      playedAt: Date.now(),
    });
    setRecentPlays(nextRecents);

    return {
      id: `${setItem.id}_${Date.now()}`,
      title: setItem.title,
      systemId: setItem.systemId,
      core: setItem.core,
      romFileName: playlistName,
      romBuffer: m3uBytes.buffer,
      extraDiscFiles,
      isMultiDisc: true,
      startedAt: Date.now(),
    };
  }, []);

  return {
    storedRoms,
    discSets,
    recentPlays,
    catalogBindings,
    loading,
    error,
    refresh,
    ingestFiles,
    ingestUrl,
    removeRom,
    updateRomCover,
    updateRomCategory,
    createDiscSet,
    removeDiscSet,
    bindCatalogGame,
    buildPlaySessionFromRomId,
    buildPlaySessionFromBundledGame,
    buildPlaySessionFromEmbed,
    buildPlaySessionFromExternalUrl,
    buildPlaySessionFromDiscSet,
  };
}
