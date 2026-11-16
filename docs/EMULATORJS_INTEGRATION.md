# EmulatorJS Integration

`ngames` embeds the official **EmulatorJS v4.2.3** runtime under `public/emulator/data/` and isolates it from the React UI using a dedicated iframe page (`public/player/index.html`).

## Why Iframe Isolation

- Keeps EmulatorJS global `EJS_*` variables, WebGL canvas bindings, and AudioContext lifecycles completely separated from React state.
- Remounting the iframe cleanly resets WebAssembly memory and audio streams when switching between consoles or ROMs.
- Communicates securely over same-origin `window.postMessage` (`NGAMES_LOAD_GAME`, `NGAMES_EMULATOR_READY`, `NGAMES_GAME_STARTED`, `NGAMES_PLAYER_ERROR`).

## Self-Hosted Assets

The following core files are hosted directly inside `public/emulator/data/`:

- `loader.js`, `emulator.min.js`, `emulator.min.css`, `version.json`
- `compression/` and `localization/`
- Pre-bundled WebAssembly cores in `cores/`: `fceumm`, `snes9x`, `gambatte`, `mgba`, `genesis_plus_gx`, `mednafen_pce`, `stella2014` along with `cores/reports/*.json`.

Additional cores (`pcsx_rearmed`, `mupen64plus_next`, `melonds`, `fbneo`) resolve automatically through EmulatorJS core loading when launched.
