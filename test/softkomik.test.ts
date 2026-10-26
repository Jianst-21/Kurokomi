import { describe, it, expect } from 'vitest';
import {
  decryptOpenSSLAES,
  extractNextData,
  formatTimeAgo,
  mapSoftkomikItemToCard,
  SOFTKOMIK_ENCRYPTION_KEY,
} from '@/lib/softkomik';

describe('Softkomik Parser and Decryption', () => {
  it('formats relative time correctly', () => {
    const nowIso = new Date().toISOString();
    expect(formatTimeAgo(nowIso)).toContain('detik lalu');

    const oneHourAgo = new Date(Date.now() - 3600 * 1000).toISOString();
    expect(formatTimeAgo(oneHourAgo)).toBe('1 jam lalu');

    const twoDaysAgo = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
    expect(formatTimeAgo(twoDaysAgo)).toBe('2 hari lalu');
  });

  it('extracts next data from script tag', () => {
    const html = '<html><body><script id="__NEXT_DATA__" type="application/json">{"props":{"pageProps":{"title":"Test"}}}</script></body></html>';
    const data = extractNextData(html) as any;
    expect(data?.props?.pageProps?.title).toBe('Test');
  });

  it('maps softkomik item to comic card item properly', () => {
    const item = {
      title: 'Solo Leveling',
      type: 'manhwa',
      gambar: 'members/cover-test.jpg',
      latest_chapter: '0179',
      updated_at: new Date(Date.now() - 60000).toISOString(),
      title_slug: 'solo-leveling-bahasa-indonesia',
      Genre: ['Action', 'Fantasy', 'Full Color'],
    };

    const card = mapSoftkomikItemToCard(item);
    expect(card.id).toBe('softkomik--solo-leveling-bahasa-indonesia');
    expect(card.title).toBe('Solo Leveling');
    expect(card.type).toBe('manhwa');
    expect(card.latestChapter).toBe('Ch. 179');
    expect(card.isFullColor).toBe(true);
    expect(card.coverUrl).toContain('https://cover.softdevices.my.id/softkomik-cover/members/cover-test.jpg');
    expect(card.updatedAt).toBe('1 menit lalu');
  });

  it('decrypts OpenSSL AES ciphertext with standard key', () => {
    // If input is empty or invalid, it returns empty string without crashing
    expect(decryptOpenSSLAES('')).toBe('');
    expect(decryptOpenSSLAES('invalid_base64')).toBe('');
  });
});
