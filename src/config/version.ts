declare const __NGAMES_VERSION__: string;
declare const __NGAMES_BUILD_ID__: string;

const rawVersion =
  typeof __NGAMES_VERSION__ !== 'undefined' ? __NGAMES_VERSION__ : '1.2.0';

function formatShortVersion(semver: string): string {
  const parts = semver.split('.');
  if (parts.length === 3 && parts[2] === '0') {
    return `${parts[0]}.${parts[1]}`;
  }
  return semver;
}

export const APP_VERSION = formatShortVersion(rawVersion);
export const APP_FULL_VERSION = rawVersion;
export const APP_BUILD_ID =
  typeof __NGAMES_BUILD_ID__ !== 'undefined' ? __NGAMES_BUILD_ID__ : 'dev';
export const APP_VERSION_LABEL = `ngames v${APP_VERSION}`;
