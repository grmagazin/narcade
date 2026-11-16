import { ExternalLink, FolderUp, Play } from 'lucide-react';
import { useState } from 'react';
import { getSystemById } from '../services/dataService';
import type { CatalogGame } from '../types';
import { SystemIcon } from './SystemIcon';

interface GameCardProps {
  game: CatalogGame;
  boundRomId?: string;
  onPlayBound: (game: CatalogGame, romId: string) => void;
  onPlayBundled?: (game: CatalogGame) => void;
  onPlayEmbed?: (game: CatalogGame) => void;
  onAttachRom: (game: CatalogGame) => void;
}

export function GameCard({
  game,
  boundRomId,
  onPlayBound,
  onPlayBundled,
  onPlayEmbed,
  onAttachRom,
}: GameCardProps) {
  const [imgError, setImgError] = useState(false);
  const [launching, setLaunching] = useState(false);
  const system = getSystemById(game.systemId);

  const handlePlayBundled = async () => {
    if (!onPlayBundled || launching) return;
    setLaunching(true);
    try {
      await onPlayBundled(game);
    } finally {
      setLaunching(false);
    }
  };

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-[#11151B] transition-colors duration-150 hover:border-white/[0.16]">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#0D1016]">
        {!imgError && game.cover ? (
          <img
            src={game.cover}
            alt={`${game.title} cover art`}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#161D28] to-[#0B0E14] p-5 text-center">
            <SystemIcon systemId={game.systemId} className="h-10 w-10 text-slate-500 mb-2.5" />
            <span className="font-display text-sm font-semibold text-slate-300">{game.title}</span>
          </div>
        )}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-[#11151B] via-[#11151B]/50 to-transparent"
        />
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <span>{system?.shortName ?? game.systemId}</span>
          <span aria-hidden="true">·</span>
          <span className="capitalize">{game.category}</span>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">{game.year}</span>
        </div>

        <h3 className="mt-1.5 font-display text-base font-semibold text-white leading-snug line-clamp-1">
          {game.title}
        </h3>

        <p className="mt-1.5 text-xs text-slate-400 leading-relaxed line-clamp-2 flex-1">
          {game.description}
        </p>

        <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2 text-xs text-slate-400">
          <span className="truncate">
            {game.license}
            {game.bundledRomUrl ? ' · Instant Play' : game.embedUrl ? ' · External Frame' : ''}
          </span>
          <span className="font-mono text-[11px] text-slate-500 shrink-0">{game.romFormat}</span>
        </div>

        <div className="mt-3 flex items-center gap-2">
          {boundRomId ? (
            <button
              type="button"
              onClick={() => onPlayBound(game, boundRomId)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-orange-500 px-3 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-orange-400 whitespace-nowrap cursor-pointer"
            >
              <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
              <span>Play Game</span>
            </button>
          ) : game.bundledRomUrl && onPlayBundled ? (
            <button
              type="button"
              disabled={launching}
              onClick={() => void handlePlayBundled()}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-orange-500 px-3 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-orange-400 disabled:opacity-60 whitespace-nowrap cursor-pointer"
            >
              <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
              <span>{launching ? 'Loading...' : 'Play Now'}</span>
            </button>
          ) : game.embedUrl && onPlayEmbed ? (
            <button
              type="button"
              onClick={() => onPlayEmbed(game)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-orange-500 px-3 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-orange-400 whitespace-nowrap cursor-pointer"
            >
              <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
              <span>Play Embed</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onAttachRom(game)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/[0.12] bg-white/[0.04] px-3 py-2 text-xs font-medium text-slate-100 transition-colors hover:bg-white/[0.08] whitespace-nowrap cursor-pointer"
            >
              <FolderUp className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Attach ROM</span>
            </button>
          )}

          <a
            href={game.authorizedPageUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={`Authorized release page for ${game.title}`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] text-slate-400 transition-colors hover:border-white/[0.18] hover:text-white shrink-0"
            aria-label={`Open authorized release page for ${game.title}`}
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </div>
      </div>
    </article>
  );
}
