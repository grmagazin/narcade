import JSZip from 'jszip';

const EJS_STATES_DB = 'EmulatorJS-states';
const EJS_STATES_STORE = 'states';
const CATALOG_BINDINGS_KEY = 'ngames_catalog_bindings_v1';
const RECENT_PLAYS_KEY = 'ngames_recent_plays_v1';

interface BackupEntryMeta {
  key: string;
  fileName: string;
}

interface BackupManifest {
  app: 'ngames';
  version: 1;
  exportedAt: string;
  entries: BackupEntryMeta[];
  recentPlays: unknown[];
  catalogBindings: Record<string, string>;
}

export interface SaveBackupStats {
  stateCount: number;
  totalBytes: number;
}

function openEjsStatesDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is unavailable in this browser.'));
      return;
    }
    const req = indexedDB.open(EJS_STATES_DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(EJS_STATES_STORE)) {
        db.createObjectStore(EJS_STATES_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Unable to open EmulatorJS states DB.'));
  });
}

async function readAllEjsStates(): Promise<Array<{ key: string; value: unknown }>> {
  const db = await openEjsStatesDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(EJS_STATES_STORE, 'readonly');
    const store = tx.objectStore(EJS_STATES_STORE);
    const keysReq = store.getAllKeys();
    const valsReq = store.getAll();

    tx.oncomplete = () => {
      const keys = keysReq.result as string[];
      const vals = valsReq.result as unknown[];
      const entries: Array<{ key: string; value: unknown }> = [];
      for (let i = 0; i < keys.length; i++) {
        if (keys[i] === '?EJS_KEYS!') continue;
        entries.push({ key: String(keys[i]), value: vals[i] });
      }
      resolve(entries);
    };
    tx.onerror = () => reject(tx.error ?? new Error('Failed to read EmulatorJS save data.'));
  });
}

async function writeEjsStateEntry(key: string, value: Uint8Array): Promise<void> {
  const db = await openEjsStatesDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(EJS_STATES_STORE, 'readwrite');
    const store = tx.objectStore(EJS_STATES_STORE);
    store.put(value, key);

    const keysReq = store.get('?EJS_KEYS!');
    keysReq.onsuccess = () => {
      const existing = Array.isArray(keysReq.result) ? (keysReq.result as string[]) : [];
      if (!existing.includes(key)) {
        existing.push(key);
        store.put(existing, '?EJS_KEYS!');
      }
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Failed to write save state entry.'));
  });
}

function toUint8Array(val: unknown): Uint8Array | null {
  if (val instanceof Uint8Array) return val;
  if (val instanceof ArrayBuffer) return new Uint8Array(val);
  if (ArrayBuffer.isView(val)) {
    return new Uint8Array(val.buffer, val.byteOffset, val.byteLength);
  }
  if (val && typeof val === 'object' && 'data' in val) {
    return toUint8Array((val as { data: unknown }).data);
  }
  return null;
}

export async function getSaveBackupStats(): Promise<SaveBackupStats> {
  try {
    const items = await readAllEjsStates();
    let totalBytes = 0;
    for (const item of items) {
      const bytes = toUint8Array(item.value);
      if (bytes) totalBytes += bytes.byteLength;
    }
    return { stateCount: items.length, totalBytes };
  } catch {
    return { stateCount: 0, totalBytes: 0 };
  }
}

export async function exportSavesBackupZip(): Promise<{ blob: Blob; fileName: string; count: number }> {
  const zip = new JSZip();
  const items = await readAllEjsStates();
  const entriesMeta: BackupEntryMeta[] = [];

  items.forEach((item, idx) => {
    const bytes = toUint8Array(item.value);
    if (!bytes) return;
    const safeName = `saves/${idx}_${item.key.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    zip.file(safeName, bytes);
    entriesMeta.push({ key: item.key, fileName: safeName });
  });

  let recentPlays: unknown[] = [];
  let catalogBindings: Record<string, string> = {};
  try {
    const rp = localStorage.getItem(RECENT_PLAYS_KEY);
    if (rp) recentPlays = JSON.parse(rp);
  } catch {
    recentPlays = [];
  }
  try {
    const cb = localStorage.getItem(CATALOG_BINDINGS_KEY);
    if (cb) catalogBindings = JSON.parse(cb);
  } catch {
    catalogBindings = {};
  }

  const manifest: BackupManifest = {
    app: 'ngames',
    version: 1,
    exportedAt: new Date().toISOString(),
    entries: entriesMeta,
    recentPlays,
    catalogBindings,
  };

  zip.file('manifest.json', JSON.stringify(manifest, null, 2));
  const blob = await zip.generateAsync({ type: 'blob' });
  const dateStr = new Date().toISOString().slice(0, 10);
  return {
    blob,
    fileName: `ngames-save-backup-${dateStr}.zip`,
    count: entriesMeta.length,
  };
}

export async function importSavesBackupZip(file: File): Promise<{ restoredStates: number }> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(await file.arrayBuffer());
  } catch {
    throw new Error('Invalid backup file. Choose a .zip archive exported by ngames.');
  }

  const manifestFile = zip.file('manifest.json');
  if (!manifestFile) {
    throw new Error('Backup archive is missing manifest.json.');
  }

  let manifest: BackupManifest;
  try {
    manifest = JSON.parse(await manifestFile.async('string')) as BackupManifest;
  } catch {
    throw new Error('Could not parse manifest.json inside the backup archive.');
  }

  if (manifest.app !== 'ngames' || !Array.isArray(manifest.entries)) {
    throw new Error('Archive does not appear to be a valid ngames save backup.');
  }

  let restoredStates = 0;
  for (const entry of manifest.entries) {
    const archived = zip.file(entry.fileName);
    if (!archived) continue;
    const bytes = await archived.async('uint8array');
    await writeEjsStateEntry(entry.key, bytes);
    restoredStates++;
  }

  if (manifest.catalogBindings && typeof manifest.catalogBindings === 'object') {
    try {
      const existing = JSON.parse(localStorage.getItem(CATALOG_BINDINGS_KEY) || '{}');
      localStorage.setItem(
        CATALOG_BINDINGS_KEY,
        JSON.stringify({ ...existing, ...manifest.catalogBindings })
      );
    } catch {
      // Ignore storage quota issues
    }
  }

  return { restoredStates };
}
