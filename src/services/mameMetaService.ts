import type { ArchiveBrowserEntry } from '../types';

export type MameCategoryId =
  | 'all'
  | 'shooter'
  | 'fighter'
  | 'platformer'
  | 'racing'
  | 'puzzle'
  | 'sports'
  | 'neogeo'
  | 'arcade';

export type MameEraId = 'all' | 'classic' | 'golden' | 'mid90s' | 'late';

export interface MameCategoryDef {
  id: MameCategoryId;
  label: string;
}

export interface MameEraDef {
  id: MameEraId;
  label: string;
}

export const MAME_CATEGORIES: MameCategoryDef[] = [
  { id: 'all', label: 'All Categories' },
  { id: 'shooter', label: 'Shooters' },
  { id: 'fighter', label: 'Fighters & Beat \'em Up' },
  { id: 'platformer', label: 'Platformers & Action' },
  { id: 'racing', label: 'Racing & Driving' },
  { id: 'puzzle', label: 'Puzzle & Maze' },
  { id: 'sports', label: 'Sports' },
  { id: 'neogeo', label: 'Neo Geo' },
  { id: 'arcade', label: 'Arcade Classics' },
];

export const MAME_ERAS: MameEraDef[] = [
  { id: 'all', label: 'All Years' },
  { id: 'classic', label: '~1978–1984 (Classic)' },
  { id: 'golden', label: '~1985–1991 (Golden Era)' },
  { id: 'mid90s', label: '~1992–1997 (16/32-Bit)' },
  { id: 'late', label: '~1998+ (Late Arcade)' },
];

export const LETTER_FILTERS: string[] = [
  'ALL',
  '0-9',
  ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
];

export interface IaMameMetaRecord {
  t?: string;
  y?: number;
  g?: string;
}

const IA_META_STORAGE_KEY = 'ngames_ia_mame_meta_v1';

// Curated fast metadata for iconic MAME drivers so years/categories work offline immediately
const CURATED_MAME_META: Record<string, { title: string; year: number; category: MameCategoryId }> = {
  '005': { title: '005', year: 1981, category: 'shooter' },
  '10yard': { title: '10-Yard Fight', year: 1983, category: 'sports' },
  '1941': { title: '1941: Counter Attack', year: 1990, category: 'shooter' },
  '1942': { title: '1942', year: 1984, category: 'shooter' },
  '1943': { title: '1943: The Battle of Midway', year: 1987, category: 'shooter' },
  '1944': { title: '1944: The Loop Master', year: 2000, category: 'shooter' },
  '19xx': { title: '19XX: The War Against Destiny', year: 1995, category: 'shooter' },
  aburner2: { title: 'After Burner II', year: 1987, category: 'shooter' },
  altbeast: { title: 'Altered Beast', year: 1988, category: 'fighter' },
  arkanoid: { title: 'Arkanoid', year: 1986, category: 'puzzle' },
  asteroid: { title: 'Asteroids', year: 1979, category: 'shooter' },
  bionicc: { title: 'Bionic Commando', year: 1987, category: 'platformer' },
  bombjack: { title: 'Bomb Jack', year: 1984, category: 'platformer' },
  btime: { title: 'BurgerTime', year: 1982, category: 'puzzle' },
  bublbobl: { title: 'Bubble Bobble', year: 1986, category: 'platformer' },
  captcomm: { title: 'Captain Commando', year: 1991, category: 'fighter' },
  centiped: { title: 'Centipede', year: 1980, category: 'shooter' },
  chasehq: { title: 'Chase H.Q.', year: 1988, category: 'racing' },
  commando: { title: 'Commando', year: 1985, category: 'shooter' },
  contra: { title: 'Contra', year: 1987, category: 'platformer' },
  ddragon: { title: 'Double Dragon', year: 1987, category: 'fighter' },
  ddragon2: { title: 'Double Dragon II: The Revenge', year: 1988, category: 'fighter' },
  defender: { title: 'Defender', year: 1981, category: 'shooter' },
  digdug: { title: 'Dig Dug', year: 1982, category: 'puzzle' },
  dkong: { title: 'Donkey Kong', year: 1981, category: 'platformer' },
  dkongjr: { title: 'Donkey Kong Junior', year: 1982, category: 'platformer' },
  ddonpach: { title: 'DoDonPachi', year: 1997, category: 'shooter' },
  ffight: { title: 'Final Fight', year: 1989, category: 'fighter' },
  frogger: { title: 'Frogger', year: 1981, category: 'puzzle' },
  galaga: { title: 'Galaga', year: 1981, category: 'shooter' },
  galaga88: { title: 'Galaga \'88', year: 1987, category: 'shooter' },
  galaxian: { title: 'Galaxian', year: 1979, category: 'shooter' },
  gauntlet: { title: 'Gauntlet', year: 1985, category: 'fighter' },
  ghouls: { title: 'Ghouls\'n Ghosts', year: 1988, category: 'platformer' },
  gng: { title: 'Ghosts\'n Goblins', year: 1985, category: 'platformer' },
  goldnaxe: { title: 'Golden Axe', year: 1989, category: 'fighter' },
  gradius: { title: 'Gradius', year: 1985, category: 'shooter' },
  hangon: { title: 'Hang-On', year: 1985, category: 'racing' },
  ikari: { title: 'Ikari Warriors', year: 1986, category: 'shooter' },
  joust: { title: 'Joust', year: 1982, category: 'arcade' },
  jrpacman: { title: 'Jr. Pac-Man', year: 1983, category: 'puzzle' },
  kof94: { title: 'The King of Fighters \'94', year: 1994, category: 'neogeo' },
  kof98: { title: 'The King of Fighters \'98', year: 1998, category: 'neogeo' },
  mario: { title: 'Mario Bros.', year: 1983, category: 'platformer' },
  mk: { title: 'Mortal Kombat', year: 1992, category: 'fighter' },
  mk2: { title: 'Mortal Kombat II', year: 1993, category: 'fighter' },
  mk3: { title: 'Mortal Kombat 3', year: 1995, category: 'fighter' },
  mslug: { title: 'Metal Slug', year: 1996, category: 'neogeo' },
  mslug2: { title: 'Metal Slug 2', year: 1998, category: 'neogeo' },
  mslug3: { title: 'Metal Slug 3', year: 2000, category: 'neogeo' },
  mslugx: { title: 'Metal Slug X', year: 1999, category: 'neogeo' },
  mspacman: { title: 'Ms. Pac-Man', year: 1981, category: 'puzzle' },
  nbajam: { title: 'NBA Jam', year: 1993, category: 'sports' },
  outrun: { title: 'OutRun', year: 1986, category: 'racing' },
  pacman: { title: 'Pac-Man', year: 1980, category: 'puzzle' },
  pacplus: { title: 'Pac-Man Plus', year: 1982, category: 'puzzle' },
  paperboy: { title: 'Paperboy', year: 1984, category: 'racing' },
  polepos: { title: 'Pole Position', year: 1982, category: 'racing' },
  popeye: { title: 'Popeye', year: 1982, category: 'platformer' },
  punisher: { title: 'The Punisher', year: 1993, category: 'fighter' },
  raiden: { title: 'Raiden', year: 1990, category: 'shooter' },
  rtype: { title: 'R-Type', year: 1987, category: 'shooter' },
  samsho: { title: 'Samurai Shodown', year: 1993, category: 'neogeo' },
  sf2: { title: 'Street Fighter II: The World Warrior', year: 1991, category: 'fighter' },
  sf2ce: { title: 'Street Fighter II\': Champion Edition', year: 1992, category: 'fighter' },
  shinobi: { title: 'Shinobi', year: 1987, category: 'platformer' },
  simpsons: { title: 'The Simpsons', year: 1991, category: 'fighter' },
  snowbros: { title: 'Snow Bros.', year: 1990, category: 'platformer' },
  spyhunt: { title: 'Spy Hunter', year: 1983, category: 'racing' },
  strider: { title: 'Strider', year: 1989, category: 'platformer' },
  tapper: { title: 'Tapper', year: 1983, category: 'arcade' },
  tmnt: { title: 'Teenage Mutant Ninja Turtles', year: 1989, category: 'fighter' },
  trackfld: { title: 'Track & Field', year: 1983, category: 'sports' },
  willow: { title: 'Willow', year: 1989, category: 'platformer' },
  xevious: { title: 'Xevious', year: 1982, category: 'shooter' },
  xmen: { title: 'X-Men', year: 1992, category: 'fighter' },
};

const NEOGEO_SHORTNAME_RE =
  /^(kof|mslug|samsh|fatfur|rbff|artof|aof|garou|lastbl|sengok|wakuwak|ssideki|turfmast|blazstar|pulstar|viewpoin|magdrop|pbobbl|bstars|2020bb|tophuntr|cyberlip|nam1975|matrimee|doubledr|ctomaday|neobombe|neocup98|neodrift|neomrdo|ninjamas|nitd|overtop|panicbom|preisle2|pspikes2|ragnagrd|rotd|shocktr|socbrawl|sonicwi2|sonicwi3|spinmast|stakwin|strhoop|superspy|svc|twinspri|tws96|vliner|wh1|wh2|whp|windjamm|wjammers|zedblade|zintrckb|zupapa|androdun|alpham2|bakatono|bangbead|bjourney|breakers|breakrev|burningf|cabalng|crswd2bl|crsword|diggerma|eightman|fbfrenzy|fightfev|flipshot|galaxyfg|ganryu|ghostlop|goalx3|gowcaizr|gpilots|gururin|irrmaze|janshin|jockeygp|joyjoy|kabukikl|karnovr|kf2k|kizuna|kotm|lbowling|legendos|lresort|maglord|marukodq|miexchng|minasan|moshougi|mutnat|ncombat|ncommand|neogeo|pgoal|pnyaa|popbounc|powgear|puzzldpr|quizdai|quizkof|ridhero|roboarmy|s1945p|savagere|sdodgeb|trally|neopong)/i;

export function isNeoGeoShortname(stem: string): boolean {
  const clean = stem.replace(/\.(zip|7z|rar|chd)$/i, '').trim().toLowerCase();
  return Boolean(clean && NEOGEO_SHORTNAME_RE.test(clean));
}

export function isNeoGeoSession(opts: {
  romFileName?: string;
  romUrl?: string;
  gameName?: string;
  category?: string;
  isNeoGeo?: boolean;
}): boolean {
  if (opts.isNeoGeo || opts.category === 'neogeo') return true;
  const candidates = [opts.romFileName, opts.romUrl];
  for (const raw of candidates) {
    if (!raw) continue;
    const tail = raw.split('#')[0].split('?')[0].split('/').pop() || '';
    let decoded = tail;
    try {
      decoded = decodeURIComponent(tail);
    } catch {
      // ignore decode error
    }
    if (isNeoGeoShortname(decoded)) return true;
  }
  if (opts.gameName && /neo[\s-]*geo/i.test(opts.gameName)) return true;
  return false;
}

function mapIaGenreToCategory(genreRaw: string, stem: string, title: string): MameCategoryId {
  const g = genreRaw.toLowerCase();
  const text = `${stem} ${title}`.toLowerCase();

  if (isNeoGeoShortname(stem)) {
    return 'neogeo';
  }

  if (g.includes('shooter') || g.includes('shmup')) return 'shooter';
  if (g.includes('fighter') || g.includes('beat') || g.includes('brawler')) return 'fighter';
  if (g.includes('platform') || g.includes('climbing')) return 'platformer';
  if (g.includes('driv') || g.includes('rac')) return 'racing';
  if (g.includes('puzzle') || g.includes('maze') || g.includes('breakout') || g.includes('mahjong')) {
    return 'puzzle';
  }
  if (g.includes('sport') || g.includes('pool') || g.includes('golf') || g.includes('soccer')) {
    return 'sports';
  }

  // Fallback keyword classification from MAME shortname / title
  if (
    /(shoot|galag|galax|rtype|raiden|gradius|xevious|194|star|wing|aero|gun|sniper|strike|twin|sonicw|donpachi|viper|defender|missile|space|invad|contra|ikari|commando|merc|rambo|sky|air|jet|chopper|tiger|cobr)/.test(
      text
    )
  ) {
    return 'shooter';
  }
  if (
    /(fight|sf2|sfa|sfiii|mk\d|kombat|dragon|ddragon|xmen|avsp|captcomm|punisher|simpsons|tmnt|knight|warrior|brawl|punch|karate|kung|ninja|samur|fatfury|street|smash|goldnaxe|altbeast)/.test(
      text
    )
  ) {
    return 'fighter';
  }
  if (
    /(race|racer|run|outrun|drift|rally|f1|indy|turbo|speed|kart|moto|bike|gp|chase|hangon|polepos|road|truck|taxi|wheel|daytona|ridge|cruis)/.test(
      text
    )
  ) {
    return 'racing';
  }
  if (
    /(puzz|tetris|puyo|klax|columns|pac|maze|digdug|frog|btime|burger|arkanoid|bomb|block|bubbl|mahjong|shanghai|chess|card|slot|casino|poker|qix|pengo|pop|jewel|gem)/.test(
      text
    )
  ) {
    return 'puzzle';
  }
  if (
    /(soccer|footb|yard|basket|dunk|nba|nfl|golf|tennis|bowl|baseb|homerun|box|wrestl|track|olymp|swim|hockey|volleyball|rugby|cricket)/.test(
      text
    )
  ) {
    return 'sports';
  }
  if (
    /(mario|kong|shinobi|strider|ghoul|ghost|gng|popeye|snowbro|wonder|bionic|metal|sonic|alex|joust|rainbow|toki|caveman|pang|tumble)/.test(
      text
    )
  ) {
    return 'platformer';
  }

  return 'arcade';
}

export function yearToEra(year: number | undefined, sizeBytes?: number): MameEraId {
  if (year && year > 1970) {
    if (year <= 1984) return 'classic';
    if (year <= 1991) return 'golden';
    if (year <= 1997) return 'mid90s';
    return 'late';
  }
  // Size-based era approximation for unannotated MAME zips
  if (typeof sizeBytes === 'number' && sizeBytes > 0) {
    if (sizeBytes < 140 * 1024) return 'classic';
    if (sizeBytes < 1.6 * 1024 * 1024) return 'golden';
    if (sizeBytes < 12 * 1024 * 1024) return 'mid90s';
    return 'late';
  }
  return 'golden';
}

export function classifyMameEntry(
  entry: ArchiveBrowserEntry,
  iaMeta: Record<string, IaMameMetaRecord>
): {
  displayTitle: string;
  year?: number;
  category: MameCategoryId;
  era: MameEraId;
  firstLetter: string;
} {
  const stem = entry.fileName.replace(/\.[^.]+$/, '').toLowerCase();
  const curated = CURATED_MAME_META[stem];
  const ia = iaMeta[stem];

  const displayTitle = curated?.title || ia?.t || entry.title;
  const year = curated?.year || ia?.y;
  const category =
    curated?.category || mapIaGenreToCategory(ia?.g || '', stem, displayTitle);
  const era = yearToEra(year, entry.sizeBytes);

  const firstChar = (displayTitle || stem).trim().charAt(0).toUpperCase();
  const firstLetter = /^[0-9]$/.test(firstChar)
    ? '0-9'
    : /^[A-Z]$/.test(firstChar)
      ? firstChar
      : '0-9';

  return {
    displayTitle,
    year,
    category,
    era,
    firstLetter,
  };
}

export function loadCachedIaMameMeta(): Record<string, IaMameMetaRecord> {
  try {
    const raw = localStorage.getItem(IA_META_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export async function fetchIaMameMetaIfNeeded(): Promise<Record<string, IaMameMetaRecord>> {
  const existing = loadCachedIaMameMeta();
  if (Object.keys(existing).length > 500) {
    return existing;
  }

  try {
    const url =
      'https://archive.org/advancedsearch.php?q=collection%3Ainternetarcade+AND+mediatype%3Asoftware' +
      '&fl[]=identifier,title,year,genre&rows=3000&page=1&output=json';
    const res = await fetch(url);
    if (!res.ok) return existing;

    const json = (await res.json()) as {
      response?: {
        docs?: Array<{
          identifier?: string;
          title?: string;
          year?: number | string;
          genre?: string | string[];
        }>;
      };
    };
    const docs = json.response?.docs ?? [];
    const map: Record<string, IaMameMetaRecord> = {};
    for (const d of docs) {
      if (!d.identifier) continue;
      const stem = d.identifier.replace(/^arcade_/, '').toLowerCase();
      const yNum = d.year ? Number(String(d.year).slice(0, 4)) : undefined;
      const gStr = Array.isArray(d.genre) ? d.genre[0] : d.genre;
      map[stem] = {
        t: d.title || undefined,
        y: yNum && Number.isFinite(yNum) ? yNum : undefined,
        g: gStr || undefined,
      };
    }

    try {
      localStorage.setItem(IA_META_STORAGE_KEY, JSON.stringify(map));
    } catch {
      // Ignore storage quota errors
    }
    return map;
  } catch {
    return existing;
  }
}
