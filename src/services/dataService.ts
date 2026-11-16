import gamesJson from '../../data/games.json';
import systemsJson from '../../data/systems.json';
import biosJson from '../../data/bios-database.json';
import sourcesJson from '../../data/sources.json';
import categoriesJson from '../../data/categories.json';
import embedsJson from '../../data/embeds.json';
import type {
  BiosDatabase,
  CatalogGame,
  CategorySpec,
  EmbedCatalogItem,
  SourcesData,
  SystemSpec,
} from '../types';

export const catalogGames: CatalogGame[] = gamesJson as CatalogGame[];
export const systems: SystemSpec[] = systemsJson as SystemSpec[];
export const biosDatabase: BiosDatabase = biosJson as BiosDatabase;
export const sourcesData: SourcesData = sourcesJson as SourcesData;
export const categories: CategorySpec[] = categoriesJson as CategorySpec[];
export const defaultEmbeds: EmbedCatalogItem[] = embedsJson as EmbedCatalogItem[];

export function getSystemById(systemId: string): SystemSpec | undefined {
  return systems.find((s) => s.id === systemId);
}

export function getSupportedExtensions(): string[] {
  const extSet = new Set<string>(['.zip']);
  for (const sys of systems) {
    for (const ext of sys.extensions) {
      extSet.add(ext.toLowerCase());
    }
  }
  return Array.from(extSet);
}

export function detectSystemFromExtension(fileName: string): SystemSpec | undefined {
  const lower = fileName.toLowerCase();
  const dotIdx = lower.lastIndexOf('.');
  if (dotIdx === -1) return undefined;
  const ext = lower.slice(dotIdx);

  // Prefer deterministic cartridge/handheld matches over generic .bin/.zip
  if (ext === '.bin') {
    return systems.find((s) => s.id === 'segaMD');
  }
  return systems.find((s) => s.extensions.some((e) => e.toLowerCase() === ext));
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(2)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}
