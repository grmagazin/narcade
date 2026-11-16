import type { RomHeaderInfo } from '../types';

function readAscii(bytes: Uint8Array, start: number, length: number): string {
  let out = '';
  const end = Math.min(bytes.length, start + length);
  for (let i = start; i < end; i++) {
    const ch = bytes[i];
    if (ch === 0) break;
    if (ch >= 32 && ch <= 126) {
      out += String.fromCharCode(ch);
    }
  }
  return out.replace(/\s+/g, ' ').trim();
}

function parseNesHeader(bytes: Uint8Array): RomHeaderInfo | undefined {
  if (bytes.length < 16) return undefined;
  // iNES magic: "NES\x1A"
  if (bytes[0] !== 0x4e || bytes[1] !== 0x45 || bytes[2] !== 0x53 || bytes[3] !== 0x1a) {
    return undefined;
  }
  const prgKb = bytes[4] * 16;
  const chrKb = bytes[5] * 8;
  const flags6 = bytes[6];
  const flags7 = bytes[7];
  const isNes2 = (flags7 & 0x0c) === 0x08;
  const mapper = (flags6 >> 4) | (flags7 & 0xf0);
  const mirroring = flags6 & 0x01 ? 'Vertical' : 'Horizontal';
  const battery = Boolean(flags6 & 0x02);

  return {
    format: isNes2 ? 'NES 2.0' : 'iNES',
    region: 'NTSC / Multi',
    mapperOrHardware: `Mapper ${mapper}`,
    details: `${prgKb} KB PRG · ${chrKb} KB CHR · ${mirroring} mirroring${battery ? ' · Battery RAM' : ''}`,
  };
}

function parseGameBoyHeader(bytes: Uint8Array): RomHeaderInfo | undefined {
  if (bytes.length < 0x150) return undefined;
  // Nintendo logo check bytes at 0x0104..0x0107
  if (bytes[0x104] !== 0xce || bytes[0x105] !== 0xed) {
    return undefined;
  }
  const cgbFlag = bytes[0x143];
  const titleLen = cgbFlag === 0x80 || cgbFlag === 0xc0 ? 11 : 16;
  const internalTitle = readAscii(bytes, 0x134, titleLen);
  const cartType = bytes[0x147];
  const romSizeCode = bytes[0x148];
  const romKb = 32 << (romSizeCode & 0x0f);

  // Header checksum across 0x0134..0x014C
  let x = 0;
  for (let addr = 0x134; addr <= 0x14c; addr++) {
    x = (x - bytes[addr] - 1) & 0xff;
  }
  const checksumValid = x === bytes[0x14d];

  const cgbLabel =
    cgbFlag === 0xc0 ? 'GBC Only' : cgbFlag === 0x80 ? 'GBC + DMG' : 'DMG Classic';
  const mbcLabel =
    cartType === 0x00
      ? 'ROM Only'
      : cartType <= 0x03
        ? 'MBC1'
        : cartType <= 0x13
          ? 'MBC3'
          : cartType <= 0x1e
            ? 'MBC5'
            : `Cart 0x${cartType.toString(16).toUpperCase()}`;

  return {
    format: cgbFlag === 0x80 || cgbFlag === 0xc0 ? 'Game Boy Color' : 'Game Boy',
    internalTitle: internalTitle || undefined,
    region: bytes[0x14a] === 0x00 ? 'Japan' : 'International',
    mapperOrHardware: `${cgbLabel} · ${mbcLabel}`,
    checksumValid,
    details: `${romKb} KB ROM`,
  };
}

function parseGbaHeader(bytes: Uint8Array): RomHeaderInfo | undefined {
  if (bytes.length < 0xc0) return undefined;
  if (bytes[0xb2] !== 0x96) return undefined;

  const internalTitle = readAscii(bytes, 0xa0, 12);
  const gameCode = readAscii(bytes, 0xac, 4);
  const regionChar = gameCode.length === 4 ? gameCode[3] : '';
  const regionMap: Record<string, string> = {
    E: 'USA (NTSC)',
    P: 'Europe (PAL)',
    J: 'Japan',
    F: 'France',
    D: 'Germany',
    S: 'Spain',
    I: 'Italy',
  };

  let chk = 0;
  for (let i = 0xa0; i <= 0xbc; i++) {
    chk = (chk - bytes[i]) & 0xff;
  }
  chk = (chk - 0x19) & 0xff;
  const checksumValid = chk === bytes[0xbd];

  return {
    format: 'Game Boy Advance',
    internalTitle: internalTitle || undefined,
    gameCode: gameCode || undefined,
    region: regionMap[regionChar] || 'Worldwide / Homebrew',
    mapperOrHardware: 'ARM7TDMI ROM',
    checksumValid,
  };
}

function scoreSnesHeader(bytes: Uint8Array, baseOffset: number): number {
  if (baseOffset + 0x40 > bytes.length) return -1;
  const comp = bytes[baseOffset + 0x1c] | (bytes[baseOffset + 0x1d] << 8);
  const sum = bytes[baseOffset + 0x1e] | (bytes[baseOffset + 0x1f] << 8);
  let score = 0;
  if ((comp ^ sum) === 0xffff) score += 4;
  const mapMode = bytes[baseOffset + 0x15] & 0x0f;
  if (mapMode === 0 || mapMode === 1 || mapMode === 5) score += 1;
  return score;
}

function parseSnesHeader(bytes: Uint8Array): RomHeaderInfo | undefined {
  const smcOffset = bytes.length % 1024 === 512 ? 512 : 0;
  const loOffset = smcOffset + 0x7fc0;
  const hiOffset = smcOffset + 0xffc0;

  const loScore = scoreSnesHeader(bytes, loOffset);
  const hiScore = scoreSnesHeader(bytes, hiOffset);
  const bestOffset = hiScore > loScore ? hiOffset : loOffset;
  const bestScore = Math.max(loScore, hiScore);
  if (bestScore < 0) return undefined;

  const internalTitle = readAscii(bytes, bestOffset, 21);
  const mapByte = bytes[bestOffset + 0x15];
  const countryByte = bytes[bestOffset + 0x19];
  const comp = bytes[bestOffset + 0x1c] | (bytes[bestOffset + 0x1d] << 8);
  const sum = bytes[bestOffset + 0x1e] | (bytes[bestOffset + 0x1f] << 8);

  const countryMap: Record<number, string> = {
    0x00: 'Japan',
    0x01: 'USA (NTSC)',
    0x02: 'Europe (PAL)',
    0x03: 'Sweden',
    0x06: 'France',
    0x09: 'Germany',
    0x0d: 'South Korea',
  };

  const layout = bestOffset === hiOffset ? 'HiROM' : 'LoROM';
  const speed = mapByte & 0x10 ? 'FastROM' : 'SlowROM';

  return {
    format: smcOffset ? 'SNES (SMC Headered)' : 'SNES Cartridge',
    internalTitle: internalTitle || undefined,
    region: countryMap[countryByte] || `Region 0x${countryByte.toString(16)}`,
    mapperOrHardware: `${layout} · ${speed}`,
    checksumValid: (comp ^ sum) === 0xffff,
  };
}

function parseGenesisHeader(bytes: Uint8Array): RomHeaderInfo | undefined {
  if (bytes.length < 0x200) return undefined;
  const sig = readAscii(bytes, 0x100, 16);
  if (!sig.toUpperCase().includes('SEGA')) return undefined;

  const overseasTitle = readAscii(bytes, 0x150, 48);
  const domesticTitle = readAscii(bytes, 0x120, 48);
  const serial = readAscii(bytes, 0x180, 14);
  const regionStr = readAscii(bytes, 0x1f0, 16);

  return {
    format: 'Sega Mega Drive / Genesis',
    internalTitle: overseasTitle || domesticTitle || undefined,
    gameCode: serial || undefined,
    region: regionStr || 'Multi-Region',
    mapperOrHardware: 'Motorola 68000',
  };
}

export function parseRomHeader(
  buffer: ArrayBuffer,
  extension: string
): RomHeaderInfo | undefined {
  const bytes = new Uint8Array(buffer);
  const ext = extension.toLowerCase();

  if (ext === '.nes') return parseNesHeader(bytes);
  if (ext === '.gb' || ext === '.gbc' || ext === '.sgb') return parseGameBoyHeader(bytes);
  if (ext === '.gba') return parseGbaHeader(bytes);
  if (ext === '.sfc' || ext === '.smc' || ext === '.fig' || ext === '.swc') {
    return parseSnesHeader(bytes);
  }
  if (ext === '.md' || ext === '.gen' || ext === '.bin' || ext === '.smd') {
    return parseGenesisHeader(bytes);
  }
  return undefined;
}
