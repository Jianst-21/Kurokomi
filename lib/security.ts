/**
 * Security utilities for input sanitization, safe URL handling, and proxy filtering.
 */

const ALLOWED_MANGADEX_PREFIXES = ['manga', 'chapter', 'cover', 'at-home/server'];

/**
 * Strips path traversal sequences, URL components, and special characters from a slug.
 * Allows only alphanumeric, hyphen, and underscore characters up to 150 characters.
 */
export function sanitizeSlug(raw: string | null | undefined): string {
  if (!raw) return '';
  return raw
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 150);
}

/**
 * Enforces HTTPS on image or API URLs to prevent browser Mixed Content blocking.
 */
export function ensureHttps(url: string | null | undefined): string {
  if (!url) return '';
  return url.trim().replace(/^http:\/\//i, 'https://');
}

/**
 * Validates subpaths for MangaDex reverse proxying against an allowed prefix list.
 * Explicitly rejects directory traversal, protocol schemes, and user authentication endpoints.
 */
export function isAllowedMangaDexSubpath(subpath: string | null | undefined): boolean {
  if (!subpath) return false;
  const trimmed = subpath.trim();

  // Reject path traversal, schemes, credentials, or dangerous symbols
  if (
    trimmed.includes('..') ||
    trimmed.includes('://') ||
    trimmed.includes('@') ||
    trimmed.includes('\\')
  ) {
    return false;
  }

  const clean = trimmed.replace(/^\/+/, '');
  return ALLOWED_MANGADEX_PREFIXES.some(
    prefix => clean === prefix || clean.startsWith(`${prefix}/`)
  );
}

/**
 * Allowed domains and CDNs for image proxying.
 */
const ALLOWED_IMAGE_HOSTS = [
  'mangadex.org',
  'uploads.mangadex.org',
  'komik.im',
  'softdevices.my.id',
  'komiku.org',
  'thumbnail.komiku.org',
  'img.komiku.org',
  'komiku.id',
  'komiku.com',
  'komikindo.ch',
  'komikindo.tv',
  'komikindo.co',
  'mangapill.com',
  'readdetectiveconan.com',
  'googleusercontent.com',
  'wp.com',
  'blogger.com',
  'bp.blogspot.com',
  'ggpht.com',
];

/**
 * Validates an image URL for the image proxy to prevent SSRF and unapproved external fetches.
 */
export function isAllowedImageProxyUrl(rawUrl: string | null | undefined): boolean {
  if (!rawUrl) return false;
  try {
    const parsed = new URL(rawUrl);

    // Only allow http or https
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }

    const hostname = parsed.hostname.toLowerCase();

    // Block localhost, link-local, loopback, private IPv4 and IPv6
    if (
      hostname === 'localhost' ||
      hostname.endsWith('.localhost') ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('169.254.') ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
    ) {
      return false;
    }

    // Must match one of our approved comic domains or dynamic .lol Komikindo CDN
    if (hostname.endsWith('.lol')) {
      return true;
    }

    return ALLOWED_IMAGE_HOSTS.some(
      allowed => hostname === allowed || hostname.endsWith(`.${allowed}`)
    );
  } catch {
    return false;
  }
}

/**
 * Clamps numeric query parameters within safe boundaries.
 */
export function clampInteger(
  val: string | null | undefined,
  min: number,
  max: number,
  defaultVal: number
): number {
  if (!val) return defaultVal;
  const parsed = parseInt(val, 10);
  if (isNaN(parsed)) return defaultVal;
  return Math.max(min, Math.min(max, parsed));
}

const PROHIBITED_KEYWORDS = [
  'smut',
  'erotica',
  'porn',
  'hentai',
  'adult',
  'mature',
  '18+',
  '17+',
  'nsfw',
  'r18',
  'r-18',
  'dewasa',
  'seksual',
  'sexual violence',
];

/**
 * Checks if a genre label contains prohibited 18+ / smut / ecchi terms.
 */
export function isSafeGenre(genre: string | null | undefined): boolean {
  if (!genre) return true;
  const lower = genre.toLowerCase().trim();
  return !PROHIBITED_KEYWORDS.some(k => lower === k || lower.includes(k));
}

/**
 * Filters an array of genre strings to only keep clean, safe genres.
 */
export function filterSafeGenres(genres: string[] | undefined | null): string[] {
  if (!genres || !Array.isArray(genres)) return [];
  return genres.filter(isSafeGenre);
}

/**
 * Validates whether a cover URL is a real comic poster and not a site logo, placeholder, or data URI.
 */
export function isValidCoverUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const lower = url.trim().toLowerCase();
  if (
    !lower.startsWith('http') ||
    lower.includes('logo.') ||
    lower.includes('/logo') ||
    lower.includes('favicon') ||
    lower.includes('default-pp') ||
    lower.includes('placeholder') ||
    lower.includes('blank.gif') ||
    lower.startsWith('data:')
  ) {
    return false;
  }
  return true;
}

/**
 * Validates a comic item against 18+, smut, erotica, and adult filters.
 * Returns false if the comic contains any prohibited rating, genre, or explicit tag.
 */
export function isSafeContent(item: {
  title?: string;
  genres?: string[];
  contentRating?: string;
} | null | undefined): boolean {
  if (!item) return false;

  // 1. Content rating check
  if (item.contentRating) {
    const cr = item.contentRating.toLowerCase().trim();
    if (cr === 'erotica' || cr === 'pornographic' || cr === '18+' || cr === 'adult' || cr === 'mature') {
      return false;
    }
  }

  // 2. Genres check
  if (item.genres && Array.isArray(item.genres)) {
    for (const g of item.genres) {
      if (!isSafeGenre(g)) {
        return false;
      }
    }
  }

  // 3. Title check for explicit 18+ tags
  if (item.title) {
    const lowerTitle = item.title.toLowerCase();
    const explicitTitlePatterns = ['(18+)', '[18+]', ' 18+', 'hentai', 'uncensored 18+', 'dewasa 18+'];
    if (explicitTitlePatterns.some(p => lowerTitle.includes(p))) {
      return false;
    }
  }

  return true;
}
