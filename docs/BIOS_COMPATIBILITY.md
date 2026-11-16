# BIOS Compatibility & Licensing

`ngames` references the open-source metadata, checksum standards, and documentation structure of **Abdess/retrobios** (`https://github.com/Abdess/retrobios`).

## Licensing Policy

- **Metadata & Tooling**: Checksum tables, file size specifications, and core compatibility notes in `data/bios-database.json` follow open metadata conventions.
- **No Copyrighted Binaries**: `ngames` does not bundle, host, or redistribute proprietary console BIOS, firmware, or key binaries.
- **Local Verification**: Users can drop or select their own legally obtained BIOS files in the **BIOS** module. The browser calculates SHA-256 (via Web Crypto API) and CRC32 locally, verifies compatibility, stores the file in IndexedDB, and forwards it to EmulatorJS via `EJS_biosUrl` when launching matching systems.
