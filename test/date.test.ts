import { describe, it, expect } from 'vitest';
import { formatChapterDate } from '@/lib/date';

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
