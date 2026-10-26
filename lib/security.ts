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
