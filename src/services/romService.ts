import JSZip from 'jszip';
import type { RomHeaderInfo, StoredRom, SystemSpec } from '../types';
import { detectSystemFromExtension, getSupportedExtensions, getSystemById } from './dataService';
import { computeCrc32, computeSha256 } from './hashService';
import { parseRomHeader } from './romHeaderService';
import { saveRomToVault } from './storageService';

const MAX_ROM_SIZE_BYTES = 512 * 1024 * 1024; // 512 MB browser memory safety limit

export interface RomValidationOutcome {
  rom: StoredRom;
  detectedSystem: SystemSpec;
}

function getExtension(fileName: string): string {
  const lower = fileName.toLowerCase();
  const dot = lower.lastIndexOf('.');
  return dot === -1 ? '' : lower.slice(dot);
}

function cleanTitleFromFileName(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  const base = dot === -1 ? fileName : fileName.slice(0, dot);
  return base.replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim();
}

export async function validateAndIngestRomFile(
  file: File,
  overrideSystemId?: string
): Promise<RomValidationOutcome> {
  if (!file || file.size === 0) {
    throw new Error('The selected file is empty (0 bytes). Please choose a valid ROM or ZIP archive.');
  }
  if (file.size > MAX_ROM_SIZE_BYTES) {
    throw new Error('File exceeds the 512 MB in-browser memory limit.');
  }

  const ext = getExtension(file.name);
  const supported = getSupportedExtensions();
  if (!ext || !supported.includes(ext)) {
    throw new Error(
      `Unsupported file format "${ext || 'unknown'}". Supported formats: ${supported.join(', ')}.`
    );
  }

  const buffer = await file.arrayBuffer();
  let detectedSystem: SystemSpec | undefined = overrideSystemId
    ? getSystemById(overrideSystemId)
    : undefined;
  let zipEntries: string[] | undefined;
  let headerInfo: RomHeaderInfo | undefined;

  if (ext === '.zip') {
    let zip: JSZip;
    try {
      zip = await JSZip.loadAsync(buffer);
    } catch {
      throw new Error('Unable to read ZIP archive. The file may be corrupted or not a standard ZIP.');
    }

    const entryNames = Object.keys(zip.files).filter((name) => !zip.files[name].dir);
    if (entryNames.length === 0) {
      throw new Error('The ZIP archive contains no files.');
    }
    zipEntries = entryNames;

    for (const entryName of entryNames) {
      const match = detectSystemFromExtension(entryName);
      if (match) {
        if (!detectedSystem) detectedSystem = match;
        const innerExt = getExtension(entryName);
        if (!headerInfo && innerExt) {
          const innerBuf = await zip.files[entryName].async('arraybuffer');
          headerInfo = parseRomHeader(innerBuf, innerExt);
        }
        break;
      }
    }

    if (!detectedSystem) {
      const hasArcadeParts = entryNames.some((n) => {
        const entryExt = getExtension(n);
        return entryExt === '.rom' || entryExt === '.bin' || n.toLowerCase().includes('rom');
      });
      if (hasArcadeParts) {
        detectedSystem = getSystemById('arcade');
      }
    }
  } else {
    if (!detectedSystem) {
      detectedSystem = detectSystemFromExtension(file.name);
    }
    headerInfo = parseRomHeader(buffer, ext);
  }

  if (!detectedSystem) {
    throw new Error(
      `Could not automatically identify a console core for "${file.name}". Select the target system manually before loading.`
    );
  }

  const crc32 = computeCrc32(buffer);
  const sha256 = await computeSha256(buffer);
  const id = `rom_${crc32}_${Date.now()}`;

  const rom: StoredRom = {
    id,
    title: cleanTitleFromFileName(file.name),
    fileName: file.name,
    extension: ext,
    systemId: detectedSystem.id,
    core: detectedSystem.core,
    sizeBytes: file.size,
    crc32,
    sha256,
    headerInfo,
    sourceType: 'local',
    zipEntries,
    addedAt: Date.now(),
    data: buffer,
  };

  await saveRomToVault(rom);
  return { rom, detectedSystem };
}

export async function validateAndFetchExternalRomUrl(
  rawUrl: string,
  overrideSystemId?: string
): Promise<RomValidationOutcome> {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    throw new Error('Enter an authorized external ROM or ZIP URL.');
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error('Invalid URL format. Include https:// and a valid hostname.');
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('Only HTTP and HTTPS external ROM URLs are supported.');
  }

  const pathParts = parsed.pathname.split('/').filter(Boolean);
  const inferredName = decodeURIComponent(pathParts[pathParts.length - 1] || 'external-rom.zip');
  const ext = getExtension(inferredName);
  const supported = getSupportedExtensions();

  if (!ext || !supported.includes(ext)) {
    throw new Error(
      `URL must point directly to a supported ROM or ZIP file (${supported.slice(0, 10).join(', ')}, etc.).`
    );
  }

  let response: Response;
  try {
    response = await fetch(parsed.toString());
  } catch {
    throw new Error(
      'Network or CORS error fetching the external URL. The remote host must allow browser cross-origin (CORS) downloads, or download the file locally and drop it here.'
    );
  }

  if (!response.ok) {
    throw new Error(`Remote server returned HTTP ${response.status} while fetching the ROM.`);
  }

  const buffer = await response.arrayBuffer();
  if (buffer.byteLength === 0) {
    throw new Error('The downloaded file is empty (0 bytes).');
  }
  if (buffer.byteLength > MAX_ROM_SIZE_BYTES) {
    throw new Error('Downloaded ROM exceeds the 512 MB browser memory limit.');
  }

  const file = new File([buffer], inferredName, { type: 'application/octet-stream' });
  const outcome = await validateAndIngestRomFile(file, overrideSystemId);
  outcome.rom.sourceType = 'url';
  outcome.rom.sourceUrl = parsed.toString();
  await saveRomToVault(outcome.rom);
  return outcome;
}
