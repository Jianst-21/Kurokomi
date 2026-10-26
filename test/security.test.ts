import { describe, it, expect } from 'vitest';
import {
  sanitizeSlug,
  ensureHttps,
  isAllowedMangaDexSubpath,
  clampInteger,
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
});
