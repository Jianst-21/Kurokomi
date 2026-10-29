import { describe, it, expect } from 'vitest';
import { extractChapterNumber, findChapterMatch } from '@/lib/aggregator';
import { ChapterItem } from '@/lib/types';

describe('extractChapterNumber and findChapterMatch', () => {
  describe('extractChapterNumber', () => {
    it('extracts chapter number from Softkomik ID format', () => {
      expect(extractChapterNumber('softkomik--lookism__480')).toBe('480');
      expect(extractChapterNumber('softkomik--magic-emperor__55.5')).toBe('55.5');
      expect(extractChapterNumber('softkomik--solo-leveling__01')).toBe('1');
    });

    it('extracts chapter number from Komiku ID format', () => {
      expect(extractChapterNumber('komiku--one-piece-chapter-1100-indo')).toBe('1100');
      expect(extractChapterNumber('komiku--ch/lookism-chapter-480')).toBe('480');
      expect(extractChapterNumber('komiku--naruto-ch-700')).toBe('700');
    });

    it('extracts chapter number from Komikindo ID format', () => {
      expect(extractChapterNumber('komikindo--lookism-chapter-480-bahasa-indonesia')).toBe('480');
      expect(extractChapterNumber('komikindo--solo-leveling-chapter-179')).toBe('179');
    });

    it('extracts chapter number from MangaPill ID format', () => {
      expect(extractChapterNumber('mangapill--chapters___1234-10050000___one-piece-chapter-1100')).toBe('1100');
    });

    it('returns null for non-chapter formats or MangaDex UUID without chapter indicator', () => {
      expect(extractChapterNumber('c7a6e118-2041-4770-b80c-b258e7275084')).toBeNull();
      expect(extractChapterNumber('')).toBeNull();
    });
  });

  describe('findChapterMatch', () => {
    const mockChapters: ChapterItem[] = [
      {
        id: 'komiku--lookism-chapter-480',
        chapter: '480',
        title: 'Chapter 480',
        scanlationGroup: 'Komiku',
        publishAt: '2023-01-01',
        pagesCount: 0,
      },
      {
        id: 'komiku--lookism-chapter-479',
        chapter: '479',
        title: 'Chapter 479',
        scanlationGroup: 'Komiku',
        publishAt: '2023-01-01',
        pagesCount: 0,
      },
    ];

    it('finds chapter by exact ID', () => {
      const match = findChapterMatch(mockChapters, 'komiku--lookism-chapter-480');
      expect(match).toBeDefined();
      expect(match?.chapter).toBe('480');
    });

    it('finds chapter by number when ID is from Softkomik and deduplicated in list', () => {
      const match = findChapterMatch(mockChapters, 'softkomik--lookism__480');
      expect(match).toBeDefined();
      expect(match?.chapter).toBe('480');
    });

    it('finds chapter by number when ID is from Komikindo and deduplicated in list', () => {
      const match = findChapterMatch(mockChapters, 'komikindo--lookism-chapter-480-bahasa-indonesia');
      expect(match).toBeDefined();
      expect(match?.chapter).toBe('480');
    });

    it('finds chapter by number when ID is from MangaPill', () => {
      const match = findChapterMatch(mockChapters, 'mangapill--chapters___123___lookism-chapter-479');
      expect(match).toBeDefined();
      expect(match?.chapter).toBe('479');
    });

    it('returns null if no chapter matches ID or number', () => {
      const match = findChapterMatch(mockChapters, 'softkomik--lookism__999');
      expect(match).toBeNull();
    });
  });
});
