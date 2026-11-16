import type {
  MultiDiscSet,
  RecentPlayEntry,
  StoredBios,
  StoredBiosMeta,
  StoredRom,
  StoredRomMeta,
} from '../types';

const DB_NAME = 'ngames-vault';
const DB_VERSION = 2;
const ROMS_STORE = 'roms';
const BIOS_STORE = 'bios';
const DISC_SETS_STORE = 'discSets';

const RECENT_PLAYS_KEY = 'ngames_recent_plays_v1';
const CATALOG_BINDINGS_KEY = 'ngames_catalog_bindings_v1';

function openVaultDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is unavailable in this browser context.'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(ROMS_STORE)) {
        db.createObjectStore(ROMS_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(BIOS_STORE)) {
        db.createObjectStore(BIOS_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(DISC_SETS_STORE)) {
        db.createObjectStore(DISC_SETS_STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB.'));
  });
}

function stripRomData(item: StoredRom): StoredRomMeta {
  const { data: _data, ...meta } = item;
  return meta;
}

function stripBiosData(item: StoredBios): StoredBiosMeta {
  const { data: _data, ...meta } = item;
  return meta;
}

export async function saveRomToVault(rom: StoredRom): Promise<void> {
  const db = await openVaultDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ROMS_STORE, 'readwrite');
    tx.objectStore(ROMS_STORE).put(rom);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Failed to save ROM to IndexedDB.'));
  });
}

export async function listRomsFromVault(): Promise<StoredRomMeta[]> {
  const db = await openVaultDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ROMS_STORE, 'readonly');
    const req = tx.objectStore(ROMS_STORE).getAll();
    req.onsuccess = () => {
      const items = (req.result as StoredRom[]) ?? [];
      resolve(items.map(stripRomData).sort((a, b) => b.addedAt - a.addedAt));
    };
    req.onerror = () => reject(req.error ?? new Error('Failed to read ROMs from IndexedDB.'));
  });
}

export async function getRomFromVault(id: string): Promise<StoredRom | undefined> {
  const db = await openVaultDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ROMS_STORE, 'readonly');
    const req = tx.objectStore(ROMS_STORE).get(id);
    req.onsuccess = () => resolve(req.result as StoredRom | undefined);
    req.onerror = () => reject(req.error ?? new Error('Failed to load ROM data.'));
  });
}

export async function deleteRomFromVault(id: string): Promise<void> {
  const db = await openVaultDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ROMS_STORE, 'readwrite');
    tx.objectStore(ROMS_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Failed to remove ROM.'));
  });
}

export async function updateRomMetadata(
  id: string,
  patch: Partial<Pick<StoredRom, 'title' | 'coverDataUrl' | 'category'>>
): Promise<void> {
  const existing = await getRomFromVault(id);
  if (!existing) {
    throw new Error('ROM record not found in IndexedDB.');
  }
  await saveRomToVault({ ...existing, ...patch });
}

export async function saveMultiDiscSet(setItem: MultiDiscSet): Promise<void> {
  const db = await openVaultDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DISC_SETS_STORE, 'readwrite');
    tx.objectStore(DISC_SETS_STORE).put(setItem);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Failed to save multi-disc playlist.'));
  });
}

export async function listMultiDiscSets(): Promise<MultiDiscSet[]> {
  const db = await openVaultDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DISC_SETS_STORE, 'readonly');
    const req = tx.objectStore(DISC_SETS_STORE).getAll();
    req.onsuccess = () => {
      const items = (req.result as MultiDiscSet[]) ?? [];
      resolve(items.sort((a, b) => b.createdAt - a.createdAt));
    };
    req.onerror = () => reject(req.error ?? new Error('Failed to read multi-disc playlists.'));
  });
}

export async function deleteMultiDiscSet(id: string): Promise<void> {
  const db = await openVaultDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DISC_SETS_STORE, 'readwrite');
    tx.objectStore(DISC_SETS_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Failed to remove multi-disc playlist.'));
  });
}

export async function saveBiosToVault(bios: StoredBios): Promise<void> {
  const db = await openVaultDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(BIOS_STORE, 'readwrite');
    tx.objectStore(BIOS_STORE).put(bios);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Failed to save BIOS to IndexedDB.'));
  });
}

export async function listBiosFromVault(): Promise<StoredBiosMeta[]> {
  const db = await openVaultDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(BIOS_STORE, 'readonly');
    const req = tx.objectStore(BIOS_STORE).getAll();
    req.onsuccess = () => {
      const items = (req.result as StoredBios[]) ?? [];
      resolve(items.map(stripBiosData).sort((a, b) => b.addedAt - a.addedAt));
    };
    req.onerror = () => reject(req.error ?? new Error('Failed to read BIOS files from IndexedDB.'));
  });
}

export async function getBiosForSystemFromVault(systemId: string): Promise<StoredBios[]> {
  const db = await openVaultDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(BIOS_STORE, 'readonly');
    const req = tx.objectStore(BIOS_STORE).getAll();
    req.onsuccess = () => {
      const items = (req.result as StoredBios[]) ?? [];
      resolve(items.filter((b) => b.systemId === systemId));
    };
    req.onerror = () => reject(req.error ?? new Error('Failed to load BIOS data.'));
  });
}

export async function deleteBiosFromVault(id: string): Promise<void> {
  const db = await openVaultDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(BIOS_STORE, 'readwrite');
    tx.objectStore(BIOS_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Failed to remove BIOS file.'));
  });
}

export function getRecentPlays(): RecentPlayEntry[] {
  try {
    const raw = localStorage.getItem(RECENT_PLAYS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function recordRecentPlay(entry: RecentPlayEntry): RecentPlayEntry[] {
  const existing = getRecentPlays().filter((item) => item.id !== entry.id);
  const next = [entry, ...existing].slice(0, 8);
  try {
    localStorage.setItem(RECENT_PLAYS_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage quota errors in restricted browsing modes
  }
  return next;
}

export function getCatalogBindings(): Record<string, string> {
  try {
    const raw = localStorage.getItem(CATALOG_BINDINGS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function setCatalogBinding(catalogGameId: string, romId: string): Record<string, string> {
  const current = getCatalogBindings();
  const next = { ...current, [catalogGameId]: romId };
  try {
    localStorage.setItem(CATALOG_BINDINGS_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage quota errors
  }
  return next;
}
