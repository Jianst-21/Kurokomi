import { describe, it, expect } from 'vitest';
import { formatChapterDate, formatRelativeTime, parseDateScore } from '@/lib/date';

describe('formatChapterDate', () => {
  it('formats standard ISO dates to DD/MM/YYYY', () => {
    expect(formatChapterDate('2026-10-25T14:30:00Z')).toBe('25/10/2026');
    expect(formatChapterDate('2023-01-05')).toBe('05/01/2023');
  });

  it('formats Indonesian text dates like "25 Oktober 2026" or "1 Januari 2024"', () => {
    expect(formatChapterDate('25 Oktober 2026')).toBe('25/10/2026');
    expect(formatChapterDate('1 Januari 2024')).toBe('01/01/2024');
    expect(formatChapterDate('15 Mei 2025')).toBe('15/05/2025');
  });

  it('preserves and normalizes DD/MM/YYYY dates', () => {
    expect(formatChapterDate('20/10/2026')).toBe('20/10/2026');
    expect(formatChapterDate('5/1/2024')).toBe('05/01/2024');
  });

  it('handles relative dates by returning a valid DD/MM/YYYY string or fallback', () => {
    // Relative dates like "5 hari lalu" should either calculate a date or provide a reasonable date
    const res = formatChapterDate('5 hari lalu');
    expect(res).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });

  it('gracefully returns empty string for undefined or invalid date string', () => {
    expect(formatChapterDate(undefined)).toBe('');
    expect(formatChapterDate('')).toBe('');
    expect(formatChapterDate('invalid-date')).toBe('');
  });
});

describe('formatRelativeTime', () => {
  it('formats dates under 1 hour to minutes (e.g. "15 menit lalu")', () => {
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    expect(formatRelativeTime(fifteenMinsAgo)).toBe('15 menit lalu');

    const fortyFiveMinsAgo = new Date(Date.now() - 45 * 60 * 1000).toISOString();
    expect(formatRelativeTime(fortyFiveMinsAgo)).toBe('45 menit lalu');
  });

  it('formats dates under 60 seconds to "Baru saja"', () => {
    const twentySecsAgo = new Date(Date.now() - 20 * 1000).toISOString();
    expect(formatRelativeTime(twentySecsAgo)).toBe('Baru saja');
  });

  it('converts awkward "0 jam lalu" to "Baru saja"', () => {
    expect(formatRelativeTime('0 jam lalu')).toBe('Baru saja');
    expect(formatRelativeTime('0 jam yang lalu')).toBe('Baru saja');
    expect(formatRelativeTime('Baru saja')).toBe('Baru saja');
  });

  it('preserves existing relative Indonesian strings', () => {
    expect(formatRelativeTime('5 menit lalu')).toBe('5 menit lalu');
    expect(formatRelativeTime('2 jam lalu')).toBe('2 jam lalu');
    expect(formatRelativeTime('3 hari lalu')).toBe('3 hari lalu');
  });

  it('translates English relative strings to Indonesian', () => {
    expect(formatRelativeTime('10 minutes ago')).toBe('10 menit lalu');
    expect(formatRelativeTime('2 hours ago')).toBe('2 jam lalu');
    expect(formatRelativeTime('3 days ago')).toBe('3 hari lalu');
  });

  it('formats dates under 24 hours to hours (e.g. "3 jam lalu")', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 3600 * 1000).toISOString();
    expect(formatRelativeTime(threeHoursAgo)).toBe('3 jam lalu');
  });

  it('formats dates older than 7 days to DD/MM/YYYY format', () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 86400 * 1000).toISOString();
    expect(formatRelativeTime(tenDaysAgo)).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });
});

describe('parseDateScore', () => {
  it('scores "Baru saja" and "0 jam lalu" as the latest timestamp', () => {
    const scoreBaruSaja = parseDateScore('Baru saja');
    const score10Min = parseDateScore('10 menit lalu');
    const score2Jam = parseDateScore('2 jam lalu');

    expect(scoreBaruSaja).toBeGreaterThan(score10Min);
    expect(score10Min).toBeGreaterThan(score2Jam);
  });

  it('scores relative minutes higher than hours', () => {
    const score15Min = parseDateScore('15 menit lalu');
    const score1Jam = parseDateScore('1 jam lalu');
    expect(score15Min).toBeGreaterThan(score1Jam);
  });
});
