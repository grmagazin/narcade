# GitHub Pages Deployment

`ngames` is configured for static deployment on GitHub Pages, including repository subdirectories such as `https://<username>.github.io/ngames/`.

## Build Configuration

- `vite.config.ts` sets `base: './'` so all JavaScript, CSS, and image paths resolve relative to the deployed document URL.
- Routing uses URL hashes (`#home`, `#library`, `#systems`, `#player`, `#roms`, `#bios`) rather than server-dependent History API paths.
- `public/player/index.html` references `../emulator/data/loader.js` and sets `EJS_pathtodata = '../emulator/data/'`.

## Deploying

1. Run `npm install`
2. Run `npm run build`
3. Publish the generated `dist/` directory to GitHub Pages (`gh-pages` branch or GitHub Actions `actions/deploy-pages`).
