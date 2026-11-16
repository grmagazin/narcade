const LIBRETRO_SYSTEM_DIR: Record<string, string> = {
  nes: 'Nintendo - Nintendo Entertainment System',
  snes: 'Nintendo - Super Nintendo Entertainment System',
  gb: 'Nintendo - Game Boy',
  gba: 'Nintendo - Game Boy Advance',
  segaMD: 'Sega - Mega Drive - Genesis',
  segaMS: 'Sega - Master System - Mark III',
  pce: 'NEC - PC Engine - TurboGrafx 16',
  atari2600: 'Atari - 2600',
  psx: 'Sony - PlayStation',
  n64: 'Nintendo - Nintendo 64',
  nds: 'Nintendo - Nintendo DS',
  arcade: 'FBNeo - Arcade Games',
};

function sanitizeTitleForLibretro(title: string): string {
  return title
    .replace(/[&*/:`<>?\\|"]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildLibretroThumbnailCandidates(
  title: string,
  systemId: string,
  fileName?: string
): string[] {
  const sysDir = LIBRETRO_SYSTEM_DIR[systemId];
  if (!sysDir) return [];

  const encodedDir = encodeURIComponent(sysDir);
  const candidates: string[] = [];

  if (systemId === 'arcade' && fileName) {
    const baseName = fileName.replace(/\.[^.]+$/, '');
    candidates.push(
      `https://thumbnails.libretro.com/MAME/Named_Boxarts/${encodeURIComponent(baseName)}.png`
    );
    candidates.push(
      `https://thumbnails.libretro.com/MAME/Named_Titles/${encodeURIComponent(baseName)}.png`
    );
  }

  const clean = sanitizeTitleForLibretro(title);
  if (clean) {
    const variants = [
      clean,
      `${clean} (USA)`,
      `${clean} (World)`,
      `${clean} (USA, Europe)`,
      `${clean} (Europe)`,
      `${clean} (Japan)`,
    ];
    for (const variant of variants) {
      candidates.push(
        `https://thumbnails.libretro.com/${encodedDir}/Named_Boxarts/${encodeURIComponent(variant)}.png`
      );
    }
    if (systemId === 'gb') {
      const gbcDir = encodeURIComponent('Nintendo - Game Boy Color');
      candidates.push(
        `https://thumbnails.libretro.com/${gbcDir}/Named_Boxarts/${encodeURIComponent(clean)}.png`,
        `https://thumbnails.libretro.com/${gbcDir}/Named_Boxarts/${encodeURIComponent(`${clean} (USA)`)}.png`
      );
    }
  }

  return Array.from(new Set(candidates));
}

function testImageLoad(url: string, timeoutMs = 4500): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.referrerPolicy = 'no-referrer';
    let settled = false;
    const timer = window.setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(false);
      }
    }, timeoutMs);

    img.onload = () => {
      if (!settled) {
        settled = true;
        window.clearTimeout(timer);
        resolve(true);
      }
    };
    img.onerror = () => {
      if (!settled) {
        settled = true;
        window.clearTimeout(timer);
        resolve(false);
      }
    };
    img.src = url;
  });
}

export async function findLibretroCoverUrl(
  title: string,
  systemId: string,
  fileName?: string
): Promise<string | null> {
  const candidates = buildLibretroThumbnailCandidates(title, systemId, fileName);
  for (const url of candidates) {
    const ok = await testImageLoad(url);
    if (ok) return url;
  }
  return null;
}

export async function processLocalCoverImage(file: File): Promise<string> {
  if (!file || !file.type.startsWith('image/')) {
    throw new Error('Please choose a PNG, JPEG, or WebP image file.');
  }
  if (file.size > 15 * 1024 * 1024) {
    throw new Error('Cover image exceeds 15 MB.');
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Could not decode the selected image.'));
      el.src = objectUrl;
    });

    const maxWidth = 480;
    const scale = img.width > maxWidth ? maxWidth / img.width : 1;
    const targetW = Math.max(1, Math.round(img.width * scale));
    const targetH = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context unavailable.');
    }
    ctx.drawImage(img, 0, 0, targetW, targetH);
    return canvas.toDataURL('image/jpeg', 0.86);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
