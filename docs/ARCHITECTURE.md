# ngames Architecture

`ngames` is a static-first retro gaming portal designed to run completely in the browser with zero mandatory backend, database, or authentication services.

## Modules

1. **Home (`/`)**: Quick-launch workbench, featured open-source homebrew showcase, recent session resume, and instant drag-and-drop ROM entry.
2. **Game Library (`#library`)**: Searchable and filterable catalog merging curated open-source/public-domain metadata with locally uploaded ROMs stored in IndexedDB.
3. **System Browser (`#systems`)**: Console and arcade hardware index mapping file extensions to EmulatorJS cores and BIOS compatibility rules.
4. **Player (`#player`)**: Isolated `<iframe>` hosting `public/player/index.html` and the self-hosted EmulatorJS v4.2.3 runtime.
5. **ROMs (`#roms`)**: Local file selection, drag-and-drop ingestion, `.zip` archive inspection via JSZip, extension validation, and authorized external URL loading.
6. **BIOS (`#bios`)**: Client-side SHA-256 and CRC32 verification against `data/bios-database.json` (aligned with `Abdess/retrobios` metadata) and local IndexedDB storage.

## Data Persistence

- **IndexedDB (`ngames-vault`)**: Stores local ROM binaries (`roms` store) and verified BIOS binaries (`bios` store) across browser sessions without uploading files to any server.
- **LocalStorage**: Stores recent play history, active player preferences, and catalog-to-ROM bindings.
