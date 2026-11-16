import { useCallback, useEffect, useState } from 'react';
import { AttachRomModal } from './components/AttachRomModal';
import { Footer } from './components/Footer';
import { MissingBiosModal } from './components/MissingBiosModal';
import { Navbar } from './components/Navbar';
import { OfflineIndicator } from './components/OfflineIndicator';
import { useBios } from './hooks/useBios';
import { useLibrary } from './hooks/useLibrary';
import { useNavigation } from './hooks/useNavigation';
import { ArchivePage } from './pages/ArchivePage';
import { BiosPage } from './pages/BiosPage';
import { EmbedsPage } from './pages/EmbedsPage';
import { HomePage } from './pages/HomePage';
import { LibraryPage } from './pages/LibraryPage';
import { PlayerPage } from './pages/PlayerPage';
import { RomsPage } from './pages/RomsPage';
import { SystemsPage } from './pages/SystemsPage';
import { extractEmbedUrl } from './services/archiveBrowserService';
import { logDebug } from './services/debugLogService';
import type { CatalogGame, MissingBiosPrompt, MultiDiscSet, PlaySession } from './types';

export default function App() {
  const { route, systemFilter, navigate } = useNavigation();
  const { storedBios, refresh: refreshBios, ingestBiosFiles, removeBios } = useBios();

  const [activeSession, setActiveSession] = useState<PlaySession | null>(null);
  const [attachingGame, setAttachingGame] = useState<CatalogGame | null>(null);
  const [missingBiosPrompt, setMissingBiosPrompt] = useState<MissingBiosPrompt | null>(null);

  const {
    storedRoms,
    discSets,
    recentPlays,
    catalogBindings,
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
  } = useLibrary({
    storedBios,
    onBiosAutoInstalled: refreshBios,
    onMissingBiosDetected: setMissingBiosPrompt,
  });

  const playStoredRom = useCallback(
    async (romId: string, overrideTitle?: string) => {
      logDebug('loading', 'vault', `Reading ROM "${overrideTitle || romId}" from IndexedDB...`);
      const session = await buildPlaySessionFromRomId(romId, overrideTitle);
      setActiveSession(session);
      navigate('player');
    },
    [buildPlaySessionFromRomId, navigate]
  );

  const playBundledGame = useCallback(
    async (game: CatalogGame) => {
      logDebug('loading', 'catalog', `Loading bundled ROM: ${game.title}`);
      const session = await buildPlaySessionFromBundledGame(game);
      setActiveSession(session);
      navigate('player');
    },
    [buildPlaySessionFromBundledGame, navigate]
  );

  const playEmbedUrl = useCallback(
    (title: string, embedUrl: string, systemId = 'arcade') => {
      logDebug('info', 'embeds', `Launching iframe embed: ${title}`);
      const session = buildPlaySessionFromEmbed(title, embedUrl, systemId);
      setActiveSession(session);
      navigate('player');
    },
    [buildPlaySessionFromEmbed, navigate]
  );

  const playCatalogEmbed = useCallback(
    (game: CatalogGame) => {
      if (!game.embedUrl) return;
      playEmbedUrl(game.title, game.embedUrl, game.systemId);
    },
    [playEmbedUrl]
  );

  const playExternalUrl = useCallback(
    (
      url: string,
      opts?: {
        systemId?: string;
        core?: string;
        title?: string;
        category?: string;
        isNeoGeo?: boolean;
      }
    ) => {
      logDebug('loading', 'external', `Launching ${opts?.title || 'external ROM'} (${opts?.core || 'auto'})`);
      const session = buildPlaySessionFromExternalUrl(url, opts);
      setActiveSession(session);
      navigate('player');
    },
    [buildPlaySessionFromExternalUrl, navigate]
  );

  const playDiscSet = useCallback(
    async (setItem: MultiDiscSet) => {
      logDebug('loading', 'vault', `Mounting multi-disc set: ${setItem.title}`);
      const session = await buildPlaySessionFromDiscSet(setItem);
      setActiveSession(session);
      navigate('player');
    },
    [buildPlaySessionFromDiscSet, navigate]
  );

  // Direct game launching via URL parameters (?play=ROM_URL or ?embed=URL)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const playParam = params.get('play');
    const embedParam = params.get('embed');
    const systemParam = params.get('system') || undefined;
    const coreParam = params.get('core') || undefined;
    const titleParam = params.get('title') || undefined;

    if (playParam) {
      try {
        const session = buildPlaySessionFromExternalUrl(playParam, {
          systemId: systemParam,
          core: coreParam,
          title: titleParam,
        });
        setActiveSession(session);
        navigate('player');
      } catch {
        // Ignore invalid ?play= query string
      }
    } else if (embedParam) {
      const cleanEmbed = extractEmbedUrl(embedParam);
      if (cleanEmbed) {
        const session = buildPlaySessionFromEmbed(
          titleParam || 'External Embed',
          cleanEmbed,
          systemParam || 'arcade'
        );
        setActiveSession(session);
        navigate('player');
      }
    }
    // Run only once on initial mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleIngestFiles = useCallback(
    async (files: File[], systemOverride?: string, launchAfter = true) => {
      const outcomes = await ingestFiles(files, systemOverride);
      if (launchAfter && outcomes.length > 0) {
        const first = outcomes[0];
        await playStoredRom(first.rom.id, first.rom.title);
      }
    },
    [ingestFiles, playStoredRom]
  );

  const handleIngestUrl = useCallback(
    async (url: string, systemOverride?: string, launchAfter = true) => {
      const outcome = await ingestUrl(url, systemOverride);
      if (launchAfter) {
        await playStoredRom(outcome.rom.id, outcome.rom.title);
      }
    },
    [ingestUrl, playStoredRom]
  );

  const handleBindExistingAndPlay = useCallback(
    async (game: CatalogGame, romId: string, launchNow: boolean) => {
      bindCatalogGame(game.id, romId);
      if (launchNow) {
        await playStoredRom(romId, game.title);
      }
    },
    [bindCatalogGame, playStoredRom]
  );

  const handleUploadAndBind = useCallback(
    async (game: CatalogGame, file: File, launchNow: boolean) => {
      const outcomes = await ingestFiles([file], game.systemId, game.id);
      if (launchNow && outcomes.length > 0) {
        await playStoredRom(outcomes[0].rom.id, game.title);
      }
    },
    [ingestFiles, playStoredRom]
  );

  const handleFetchUrlAndBind = useCallback(
    async (game: CatalogGame, url: string, launchNow: boolean) => {
      const outcome = await ingestUrl(url, game.systemId, game.id);
      if (launchNow) {
        await playStoredRom(outcome.rom.id, game.title);
      }
    },
    [ingestUrl, playStoredRom]
  );

  const handleSwitchCore = useCallback((nextCore: string) => {
    logDebug('info', 'player', `Switched runtime core to ${nextCore}`);
    setActiveSession((prev) =>
      prev
        ? {
            ...prev,
            core: nextCore,
            id: `${prev.id.split('_')[0]}_${Date.now()}`,
          }
        : null
    );
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#090B0E] text-[#F1F5F9]">
      <Navbar
        currentRoute={route}
        activeSession={activeSession}
        onNavigate={(nextRoute) => navigate(nextRoute)}
      />

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {route === 'home' && (
          <HomePage
            storedRoms={storedRoms}
            recentPlays={recentPlays}
            catalogBindings={catalogBindings}
            biosCount={storedBios.length}
            onNavigate={navigate}
            onQuickUploadAndPlay={(files, sysOverride) =>
              handleIngestFiles(files, sysOverride, true)
            }
            onPlayStoredRom={playStoredRom}
            onPlayBundled={playBundledGame}
            onPlayEmbed={playCatalogEmbed}
            onPlayExternalUrl={playExternalUrl}
            onAttachRom={setAttachingGame}
          />
        )}

        {route === 'library' && (
          <LibraryPage
            initialSystemFilter={systemFilter}
            storedRoms={storedRoms}
            catalogBindings={catalogBindings}
            onNavigate={(nextRoute) => navigate(nextRoute)}
            onPlayStoredRom={playStoredRom}
            onPlayBundled={playBundledGame}
            onPlayEmbed={playCatalogEmbed}
            onDeleteStoredRom={removeRom}
            onUpdateRomCover={updateRomCover}
            onUpdateRomCategory={updateRomCategory}
            onAttachRom={setAttachingGame}
          />
        )}

        {route === 'archive' && (
          <ArchivePage onPlayExternalUrl={playExternalUrl} />
        )}

        {route === 'embeds' && (
          <EmbedsPage onPlayEmbed={playEmbedUrl} />
        )}

        {route === 'systems' && (
          <SystemsPage
            storedRoms={storedRoms}
            storedBios={storedBios}
            onNavigate={navigate}
          />
        )}

        {route === 'player' && (
          <PlayerPage
            session={activeSession}
            storedRoms={storedRoms}
            storedBios={storedBios}
            onNavigate={(nextRoute) => navigate(nextRoute)}
            onPlayStoredRom={playStoredRom}
            onSwitchCore={handleSwitchCore}
            onEjectSession={() => setActiveSession(null)}
            onBiosUpdated={refreshBios}
            onMissingBiosDetected={setMissingBiosPrompt}
          />
        )}

        {route === 'roms' && (
          <RomsPage
            initialSystemFilter={systemFilter}
            storedRoms={storedRoms}
            discSets={discSets}
            onIngestFiles={handleIngestFiles}
            onIngestUrl={handleIngestUrl}
            onPlayStoredRom={playStoredRom}
            onPlayEmbed={playEmbedUrl}
            onPlayExternalUrl={playExternalUrl}
            onDeleteStoredRom={removeRom}
            onCreateDiscSet={async (title, sysId, discIds) => {
              await createDiscSet(title, sysId, discIds);
            }}
            onPlayDiscSet={playDiscSet}
            onDeleteDiscSet={removeDiscSet}
          />
        )}

        {route === 'bios' && (
          <BiosPage
            storedBios={storedBios}
            onIngestBiosFiles={async (files, fallback) => {
              await ingestBiosFiles(files, fallback);
            }}
            onDeleteBios={removeBios}
          />
        )}
      </main>

      <Footer onNavigate={(nextRoute) => navigate(nextRoute)} />

      <OfflineIndicator />

      <AttachRomModal
        game={attachingGame}
        storedRoms={storedRoms}
        onClose={() => setAttachingGame(null)}
        onBindExisting={handleBindExistingAndPlay}
        onUploadAndBind={handleUploadAndBind}
        onFetchUrlAndBind={handleFetchUrlAndBind}
      />

      <MissingBiosModal
        prompt={missingBiosPrompt}
        onClose={() => setMissingBiosPrompt(null)}
        onUploadBiosFiles={async (files, fallbackSys) => {
          await ingestBiosFiles(files, fallbackSys);
        }}
        onNavigate={(nextRoute) => navigate(nextRoute)}
      />
    </div>
  );
}
