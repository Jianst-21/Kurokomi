import { describe, it, expect } from 'vitest';
import {
  sanitizeSlug,
  ensureHttps,
  isAllowedMangaDexSubpath,
  clampInteger,
  isAllowedImageProxyUrl,
  isSafeContent,
  filterSafeGenres,
  isValidCoverUrl,
} from '@/lib/security';

describe('Security Utilities', () => {
  it('sanitizes malicious slug inputs preventing path traversal', () => {
    expect(sanitizeSlug('../../admin')).toBe('admin');
    expect(sanitizeSlug('hello-world_123')).toBe('hello-world_123');
    expect(sanitizeSlug('slug?secret=1')).toBe('slugsecret1');
    expect(sanitizeSlug('slug/with/slash')).toBe('slugwithslash');
    expect(sanitizeSlug('')).toBe('');
    expect(sanitizeSlug(null)).toBe('');
  });

  it('ensures all image URLs use HTTPS to prevent Mixed Content blocking', () => {
    expect(ensureHttps('http://img.komiku.org/test.jpg')).toBe('https://img.komiku.org/test.jpg');
    expect(ensureHttps('https://img.komiku.org/test.jpg')).toBe('https://img.komiku.org/test.jpg');
    expect(ensureHttps('')).toBe('');
  });

  it('validates MangaDex proxy subpaths against allowlist', () => {
    // Allowed
    expect(isAllowedMangaDexSubpath('manga')).toBe(true);
    expect(isAllowedMangaDexSubpath('manga/12345/feed')).toBe(true);
    expect(isAllowedMangaDexSubpath('chapter/abcdef')).toBe(true);
    expect(isAllowedMangaDexSubpath('cover')).toBe(true);
    expect(isAllowedMangaDexSubpath('at-home/server/xyz')).toBe(true);

    // Disallowed
    expect(isAllowedMangaDexSubpath('auth/login')).toBe(false);
    expect(isAllowedMangaDexSubpath('user/delete')).toBe(false);
    expect(isAllowedMangaDexSubpath('../secret')).toBe(false);
    expect(isAllowedMangaDexSubpath('manga/../../admin')).toBe(false);
    expect(isAllowedMangaDexSubpath('http://evil.com')).toBe(false);
    expect(isAllowedMangaDexSubpath('')).toBe(false);
  });

  it('clamps pagination integers safely', () => {
    expect(clampInteger('5', 1, 100, 10)).toBe(5);
    expect(clampInteger('999999', 1, 100, 10)).toBe(100);
    expect(clampInteger('-10', 1, 100, 10)).toBe(1);
    expect(clampInteger('abc', 1, 100, 10)).toBe(10);
    expect(clampInteger(null, 1, 100, 10)).toBe(10);
  });

  it('validates image proxy URLs against allowed comic CDN hosts and blocks SSRF', () => {
    // Valid comic CDNs
    expect(isAllowedImageProxyUrl('https://image.komik.im/softkomik/test.webp')).toBe(true);
    expect(isAllowedImageProxyUrl('https://cover.softdevices.my.id/softkomik-cover/test.jpg')).toBe(true);
    expect(isAllowedImageProxyUrl('https://uploads.mangadex.org/data/123/456.jpg')).toBe(true);
    expect(isAllowedImageProxyUrl('https://thumbnail.komiku.org/uploads/manga/test.png')).toBe(true);
    expect(isAllowedImageProxyUrl('https://komikindo.ch/wp-content/uploads/2026/04/test.png')).toBe(true);
    expect(isAllowedImageProxyUrl('https://amatipolanyatirudesainnya.lol/media/2114308/chapter-63/1.webp')).toBe(true);
    expect(isAllowedImageProxyUrl('https://blogger.googleusercontent.com/img/b/123.jpg')).toBe(true);

    // SSRF / Malicious attacks
    expect(isAllowedImageProxyUrl('http://localhost:3000/api/secret')).toBe(false);
    expect(isAllowedImageProxyUrl('http://127.0.0.1/admin')).toBe(false);
    expect(isAllowedImageProxyUrl('http://169.254.169.254/latest/meta-data')).toBe(false);
    expect(isAllowedImageProxyUrl('file:///etc/passwd')).toBe(false);
    expect(isAllowedImageProxyUrl('ftp://example.com/test.jpg')).toBe(false);
    expect(isAllowedImageProxyUrl('https://evil-phishing-site.com/image.jpg')).toBe(false);
  });

  it('filters out 18+, smut, ecchi, erotica, mature, and adult content strictly', () => {
    // Safe items
    expect(isSafeContent({ title: 'One Piece', genres: ['Action', 'Adventure'], contentRating: 'safe' })).toBe(true);
    expect(isSafeContent({ title: 'Solo Leveling', genres: ['Action', 'Fantasy'], contentRating: 'normal' })).toBe(true);

    // Smut / 18+ items to block
    expect(isSafeContent({ title: 'Some Comic', genres: ['Smut'] })).toBe(false);
    expect(isSafeContent({ title: 'Some Comic', genres: ['Hentai'] })).toBe(false);
    expect(isSafeContent({ title: 'Some Comic', genres: ['Mature'] })).toBe(false);
    expect(isSafeContent({ title: 'Some Comic', genres: ['Adult'] })).toBe(false);
    expect(isSafeContent({ title: 'Some Comic', genres: ['Erotica'] })).toBe(false);
    expect(isSafeContent({ title: 'Some Comic', genres: ['Dewasa (18+)'] })).toBe(false);
    expect(isSafeContent({ title: 'Explicit Title (18+)', genres: ['Romance'] })).toBe(false);
    expect(isSafeContent({ title: 'Some Comic', contentRating: 'erotica' })).toBe(false);
    expect(isSafeContent({ title: 'Some Comic', contentRating: 'pornographic' })).toBe(false);

    // Ecchi genre is allowed per user request
    expect(isSafeContent({ title: 'Comedy Manga', genres: ['Comedy', 'Ecchi'] })).toBe(true);
  });

  it('filters safe genres list removing all prohibited tags while permitting ecchi', () => {
    const rawGenres = ['Action', 'Smut', 'Fantasy', 'Ecchi', 'Mature', 'Drama', 'Adult', 'Hentai', 'Comedy'];
    const safeGenres = filterSafeGenres(rawGenres);
    expect(safeGenres).toEqual(['Action', 'Fantasy', 'Ecchi', 'Drama', 'Comedy']);
  });

  it('validates cover image URLs and rejects site logos or placeholders', () => {
    // Valid comic posters
    expect(isValidCoverUrl('https://komikindo.ch/wp-content/uploads/komik-one-piece.jpg')).toBe(true);
    expect(isValidCoverUrl('https://thumbnail.komiku.org/uploads/manga/solo-leveling.png')).toBe(true);

    // Site logos or placeholders that ruin posters
    expect(isValidCoverUrl('https://komikindo.ch/assets/img/logo.png')).toBe(false);
    expect(isValidCoverUrl('https://example.com/favicon.ico')).toBe(false);
    expect(isValidCoverUrl('https://example.com/default-pp.png')).toBe(false);
    expect(isValidCoverUrl('https://example.com/placeholder.webp')).toBe(false);
    expect(isValidCoverUrl('data:image/svg+xml;base64,...')).toBe(false);
    expect(isValidCoverUrl('')).toBe(false);
    expect(isValidCoverUrl(null)).toBe(false);
  });
});
