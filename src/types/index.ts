export type ModuleRoute = 'home' | 'library' | 'archive' | 'embeds' | 'systems' | 'player' | 'roms' | 'bios';

export type BiosRequirement = 'required' | 'optional' | 'none';

export type ShaderPreset =
  | 'disabled'
  | 'crt-easymode.glslp'
  | 'crt-geom.glslp'
  | 'crt-aperture.glslp'
  | '2xScaleHQ.glslp'
  | 'bicubic';

export interface RomHeaderInfo {
  format: string;
  internalTitle?: string;
  region?: string;
  gameCode?: string;
  mapperOrHardware?: string;
  checksumValid?: boolean;
  details?: string;
}

export interface SystemSpec {
  id: string;
  name: string;
  shortName: string;
  manufacturer: string;
  year: number;
  generation: string;
  core: string;
  ejsSystem: string;
  extensions: string[];
  biosRequirement: BiosRequirement;
  biosNotes: string;
  selfHostedCore: boolean;
  accentColor: string;
  description: string;
}

export interface CategorySpec {
  id: string;
  name: string;
  description: string;
}

export interface EmbedCatalogItem {
  id: string;
  title: string;
  systemId: string;
  category: string;
  provider: string;
  embedUrl: string;
  coverUrl?: string;
  detailsUrl?: string;
}

export interface CatalogGame {
  id: string;
  title: string;
  systemId: string;
  category: string;
  year: number;
  developer: string;
  license: string;
  description: string;
  cover: string;
  romFormat: string;
  bundledRomUrl?: string;
  embedUrl?: string;
  authorizedPageUrl: string;
  controlsHint: string;
  featured?: boolean;
}

export interface StoredRom {
  id: string;
  title: string;
  fileName: string;
  extension: string;
  systemId: string;
  core: string;
  sizeBytes: number;
  crc32: string;
  sha256: string;
  headerInfo?: RomHeaderInfo;
  coverDataUrl?: string;
  category?: string;
  sourceType: 'local' | 'url' | 'bundled';
  sourceUrl?: string;
  zipEntries?: string[];
  addedAt: number;
  lastPlayedAt?: number;
  data: ArrayBuffer;
}

export type StoredRomMeta = Omit<StoredRom, 'data'>;

export interface MultiDiscSet {
  id: string;
  title: string;
  systemId: string;
  core: string;
  discRomIds: string[];
  discFileNames: string[];
  createdAt: number;
}

export interface BiosDatabaseEntry {
  id: string;
  systemId: string;
  systemName: string;
  core: string;
  filename: string;
  region: string;
  required: boolean;
  sizeBytes: number;
  crc32: string;
  md5: string;
  sha256: string;
  notes: string;
}

export interface BiosDatabase {
  metadata: {
    referenceRepository: string;
    licenseNote: string;
    policy: string;
  };
  entries: BiosDatabaseEntry[];
}

export type BiosVerificationStatus =
  | 'exact_match'
  | 'size_match'
  | 'unrecognized';

export interface StoredBios {
  id: string;
  matchedEntryId?: string;
  systemId: string;
  fileName: string;
  sizeBytes: number;
  crc32: string;
  sha256: string;
  status: BiosVerificationStatus;
  addedAt: number;
  data: ArrayBuffer;
}

export type StoredBiosMeta = Omit<StoredBios, 'data'>;

export interface RomSourceItem {
  id: string;
  name: string;
  url: string;
  systems: string[];
  license: string;
  description: string;
  directLoadSupported: boolean;
}

export interface ArchivePreset {
  id: string;
  label: string;
  itemId: string;
  defaultSystemId: string;
  defaultCore: string;
  description: string;
}

export interface BiosSourceItem {
  id: string;
  name: string;
  url: string;
  license: string;
  description: string;
  notes: string;
}

export interface SourcesData {
  romSources: RomSourceItem[];
  archivePresets?: ArchivePreset[];
  biosSources: BiosSourceItem[];
}

export interface ArchiveBrowserEntry {
  id: string;
  title: string;
  fileName: string;
  sizeBytes?: number;
  year?: string;
  creator?: string;
  systemId: string;
  core: string;
  mode: 'rom' | 'embed';
  launchUrl: string;
  coverUrl?: string;
  detailsUrl: string;
}

export interface GamepadMappingProfile {
  bButton: number;
  aButton: number;
  yButton: number;
  xButton: number;
  lButton: number;
  rButton: number;
  selectButton: number;
  startButton: number;
  deadzone: number;
}

export interface PlaySession {
  id: string;
  title: string;
  systemId: string;
  core: string;
  category?: string;
  isNeoGeo?: boolean;
  romId?: string;
  romFileName: string;
  romBuffer?: ArrayBuffer;
  romUrl?: string;
  embedUrl?: string;
  extraDiscFiles?: Array<{ name: string; buffer: ArrayBuffer }>;
  headerInfo?: RomHeaderInfo;
  isMultiDisc?: boolean;
  startedAt: number;
}

export interface RecentPlayEntry {
  id: string;
  title: string;
  systemId: string;
  core: string;
  romId?: string;
  romFileName: string;
  romUrl?: string;
  embedUrl?: string;
  playedAt: number;
}

export interface MissingBiosPrompt {
  romTitle: string;
  systemId: string;
  isNeoGeo: boolean;
  missingEntries: BiosDatabaseEntry[];
}

