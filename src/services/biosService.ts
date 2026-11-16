import type { BiosDatabaseEntry, BiosVerificationStatus, StoredBios, StoredBiosMeta } from '../types';
import { biosDatabase } from './dataService';
import { computeCrc32, computeSha256 } from './hashService';
import { isNeoGeoSession } from './mameMetaService';
import {
  deleteBiosFromVault,
  getBiosForSystemFromVault,
  listBiosFromVault,
  saveBiosToVault,
} from './storageService';

export interface BiosInspectionResult {
  bios: StoredBios;
  matchedEntry?: BiosDatabaseEntry;
}

export async function verifyAndStoreBiosFile(
  file: File,
  fallbackSystemId?: string
): Promise<BiosInspectionResult> {
  if (!file || file.size === 0) {
    throw new Error('Selected BIOS file is empty.');
  }
  if (file.size > 32 * 1024 * 1024) {
    throw new Error('BIOS file exceeds 32 MB limit.');
  }

  const buffer = await file.arrayBuffer();
  const crc32 = computeCrc32(buffer);
  const sha256 = await computeSha256(buffer);
  const lowerName = file.name.toLowerCase();

  let matchedEntry: BiosDatabaseEntry | undefined = biosDatabase.entries.find(
    (entry) =>
      (entry.sha256 !== 'varies' && entry.sha256.toLowerCase() === sha256.toLowerCase()) ||
      (entry.crc32 !== 'varies' && entry.crc32.toLowerCase() === crc32.toLowerCase())
  );

  let status: BiosVerificationStatus = 'unrecognized';
  if (matchedEntry) {
    status = 'exact_match';
  } else {
    matchedEntry = biosDatabase.entries.find(
      (entry) =>
        entry.filename.toLowerCase() === lowerName && entry.sizeBytes === file.size
    );
    if (matchedEntry) {
      status = 'size_match';
    } else {
      matchedEntry = biosDatabase.entries.find(
        (entry) => entry.filename.toLowerCase() === lowerName
      );
    }
  }

  const resolvedSystemId = matchedEntry?.systemId || fallbackSystemId || 'custom';
  const id = `bios_${resolvedSystemId}_${lowerName}_${crc32}`;

  const stored: StoredBios = {
    id,
    matchedEntryId: matchedEntry?.id,
    systemId: resolvedSystemId,
    fileName: matchedEntry?.filename || file.name,
    sizeBytes: file.size,
    crc32,
    sha256,
    status,
    addedAt: Date.now(),
    data: buffer,
  };

  await saveBiosToVault(stored);
  return { bios: stored, matchedEntry };
}

export async function resolveBiosPayloadForSystem(systemId: string): Promise<{
  primary?: { name: string; buffer: ArrayBuffer };
  extras: Array<{ name: string; buffer: ArrayBuffer }>;
}> {
  const items = await getBiosForSystemFromVault(systemId);
  if (items.length === 0) {
    return { extras: [] };
  }

  // Prefer exact checksum match first
  const sorted = [...items].sort((a, b) => {
    if (a.status === 'exact_match' && b.status !== 'exact_match') return -1;
    if (a.status !== 'exact_match' && b.status === 'exact_match') return 1;
    return b.addedAt - a.addedAt;
  });

  const [primaryItem, ...rest] = sorted;
  return {
    primary: { name: primaryItem.fileName, buffer: primaryItem.data },
    extras: rest.map((entry) => ({ name: entry.fileName, buffer: entry.data })),
  };
}

const PREVIOUS_AUTOCACHED_NEOGEO_BYTES = 1858095;
let pendingNeoGeoBiosInstall: Promise<boolean> | null = null;

/**
 * Ensures `neogeo.zip` exists in the user's local IndexedDB BIOS Vault.
 * If not already uploaded/stored (or if an older pre-RetroBIOS auto-cached copy is stored),
 * fetches the self-hosted `/bios/neogeo.zip` (Abdess/retrobios cdbde4e7) and stores it locally.
 */
export async function ensureNeoGeoBiosInVault(): Promise<boolean> {
  const existing = await getBiosForSystemFromVault('arcade');
  const existingNeoGeo = existing.find((entry) => /^neogeo\.zip$/i.test(entry.fileName));
  if (existingNeoGeo && existingNeoGeo.sizeBytes !== PREVIOUS_AUTOCACHED_NEOGEO_BYTES) {
    return false;
  }

  if (pendingNeoGeoBiosInstall) {
    return pendingNeoGeoBiosInstall;
  }

  pendingNeoGeoBiosInstall = (async () => {
    try {
      const baseOriginPath =
        typeof window !== 'undefined'
          ? `${window.location.origin}${window.location.pathname}`
          : '';
      const biosUrl = baseOriginPath
        ? new URL('./bios/neogeo.zip', baseOriginPath).href
        : './bios/neogeo.zip';
      const resp = await fetch(biosUrl);
      if (!resp.ok) {
        return false;
      }
      const buffer = await resp.arrayBuffer();
      if (!buffer || buffer.byteLength === 0) {
        return false;
      }
      const file = new File([buffer], 'neogeo.zip', { type: 'application/zip' });
      await verifyAndStoreBiosFile(file, 'arcade');
      if (existingNeoGeo && existingNeoGeo.sizeBytes === PREVIOUS_AUTOCACHED_NEOGEO_BYTES) {
        await deleteBiosFromVault(existingNeoGeo.id).catch(() => {});
      }
      return true;
    } catch {
      return false;
    } finally {
      pendingNeoGeoBiosInstall = null;
    }
  })();

  return pendingNeoGeoBiosInstall;
}

export interface BiosCheckResult {
  isNeoGeo: boolean;
  autoInstalledNeoGeo: boolean;
  missingEntries: BiosDatabaseEntry[];
}

/**
 * Checks whether required BIOS files for a ROM exist in `storedBios`.
 * For Neo Geo ROMs, attempts to auto-install self-hosted `/bios/neogeo.zip` first,
 * and reports `arcade-neogeo` as missing if it still cannot be verified in `storedBios`.
 */
export async function checkRequiredBiosForRom(
  rom: {
    title: string;
    systemId: string;
    fileName: string;
    extension?: string;
    sourceUrl?: string;
    isNeoGeo?: boolean;
  },
  storedBiosSnapshot?: StoredBiosMeta[]
): Promise<BiosCheckResult> {
  const isNeoGeo = isNeoGeoSession({
    romFileName: rom.fileName,
    romUrl: rom.sourceUrl,
    gameName: rom.title,
    isNeoGeo: rom.isNeoGeo,
  });

  let autoInstalledNeoGeo = false;
  if (isNeoGeo) {
    autoInstalledNeoGeo = await ensureNeoGeoBiosInVault();
  }

  let vaultBios: StoredBiosMeta[] = storedBiosSnapshot ?? [];
  try {
    vaultBios = await listBiosFromVault();
  } catch {
    // Fall back to provided snapshot if IndexedDB read fails
  }

  const hasBiosEntry = (entry: BiosDatabaseEntry) =>
    vaultBios.some(
      (b) =>
        b.fileName.toLowerCase() === entry.filename.toLowerCase() ||
        b.matchedEntryId === entry.id
    );

  const missingEntries: BiosDatabaseEntry[] = [];

  if (isNeoGeo) {
    const neoGeoEntry = biosDatabase.entries.find((e) => e.id === 'arcade-neogeo');
    if (neoGeoEntry && !hasBiosEntry(neoGeoEntry)) {
      missingEntries.push(neoGeoEntry);
    }
  }

  const ext = (rom.extension || `.${rom.fileName.split('.').pop() || ''}`).toLowerCase();
  const isCdImage = ['.cue', '.iso', '.chd', '.bin'].includes(ext);

  if (rom.systemId === 'nes' && ext === '.fds') {
    const fdsEntry = biosDatabase.entries.find((e) => e.id === 'nes-fds');
    if (fdsEntry && !hasBiosEntry(fdsEntry)) {
      missingEntries.push(fdsEntry);
    }
  } else if (rom.systemId === 'psx') {
    const psxEntries = biosDatabase.entries.filter((e) => e.systemId === 'psx' && e.required);
    if (psxEntries.length > 0 && !psxEntries.some(hasBiosEntry)) {
      missingEntries.push(psxEntries[0]);
    }
  } else if (rom.systemId === 'segaMD' && isCdImage) {
    const segacdEntries = biosDatabase.entries.filter(
      (e) => e.systemId === 'segaMD' && e.required
    );
    if (segacdEntries.length > 0 && !segacdEntries.some(hasBiosEntry)) {
      missingEntries.push(segacdEntries[0]);
    }
  } else if (rom.systemId === 'pce' && isCdImage) {
    const pceEntry = biosDatabase.entries.find((e) => e.id === 'pce-syscard3');
    if (pceEntry && !hasBiosEntry(pceEntry)) {
      missingEntries.push(pceEntry);
    }
  }

  return {
    isNeoGeo,
    autoInstalledNeoGeo,
    missingEntries,
  };
}
