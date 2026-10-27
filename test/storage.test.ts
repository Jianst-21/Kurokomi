import { describe, it, expect, beforeEach } from 'vitest';
import {
  getFavorites,
  toggleFavorite,
  isFavorite,
  getHistory,
  saveHistory,
  getComicLastRead,
  removeFromHistory,
  clearHistory,
  markChapterAsRead,
  isChapterRead,
  getReadChapterIds,
  exportUserData,
  importUserData,
  getSavedLatestSectionState,
  saveLatestSectionState,
  getSavedTopSectionState,
  saveTopSectionState,
  saveHomeScrollPosition,
  getSavedHomeScrollPosition,
  saveChapterScrollPosition,
  getSavedChapterScrollPosition,
  clearChapterScrollPosition,
} from '@/lib/storage';
import { ComicCardItem, ReadingHistoryItem } from '@/lib/types';

describe('LocalStorage Helper', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('toggles favorites and persists to localStorage', () => {
    const comic: ComicCardItem = {
      id: 'm1',
      title: 'Solo Leveling',
      coverUrl: 'https://example.com/cover.jpg',
      type: 'manhwa',
    };

    expect(isFavorite('m1')).toBe(false);
    expect(getFavorites()).toEqual([]);

    // Toggle on
    const added = toggleFavorite(comic);
    expect(added).toBe(true);
    expect(isFavorite('m1')).toBe(true);
    expect(getFavorites().length).toBe(1);
    expect(getFavorites()[0].title).toBe('Solo Leveling');

    // Toggle off
    const removed = toggleFavorite(comic);
    expect(removed).toBe(false);
    expect(isFavorite('m1')).toBe(false);
    expect(getFavorites()).toEqual([]);
  });

  it('saves reading history and keeps latest read item at index 0', () => {
    const item1: ReadingHistoryItem = {
      mangaId: 'm1',
      title: 'Solo Leveling',
      coverUrl: 'https://example.com/c1.jpg',
      type: 'manhwa',
      chapterId: 'ch1',
      chapterNumber: '1',
      readAt: '2023-01-01T10:00:00Z',
    };

    const item2: ReadingHistoryItem = {
      mangaId: 'm2',
      title: 'One Piece',
      coverUrl: 'https://example.com/c2.jpg',
      type: 'manga',
      chapterId: 'ch1000',
      chapterNumber: '1000',
      readAt: '2023-01-01T11:00:00Z',
    };

    saveHistory(item1);
    saveHistory(item2);

    const history = getHistory();
    expect(history.length).toBe(2);
    // item2 should be first
    expect(history[0].mangaId).toBe('m2');
    expect(history[1].mangaId).toBe('m1');

    // Read item1 again with new chapter
    const item1Update: ReadingHistoryItem = {
      ...item1,
      chapterId: 'ch2',
      chapterNumber: '2',
      readAt: '2023-01-01T12:00:00Z',
    };
    saveHistory(item1Update);

    const updatedHistory = getHistory();
    expect(updatedHistory.length).toBe(2);
    expect(updatedHistory[0].mangaId).toBe('m1');
    expect(updatedHistory[0].chapterNumber).toBe('2');

    expect(getComicLastRead('m1')?.chapterNumber).toBe('2');

    clearHistory();
    expect(getHistory()).toEqual([]);
  });

  it('removes a single comic from history with removeFromHistory', () => {
    saveHistory({
      mangaId: 'm1',
      title: 'Solo Leveling',
      coverUrl: '',
      type: 'manhwa',
      chapterId: 'ch1',
      chapterNumber: '1',
      readAt: '2023-01-01T10:00:00Z',
    });
    saveHistory({
      mangaId: 'm2',
      title: 'One Piece',
      coverUrl: '',
      type: 'manga',
      chapterId: 'ch2',
      chapterNumber: '2',
      readAt: '2023-01-01T11:00:00Z',
    });

    expect(getHistory().length).toBe(2);
    removeFromHistory('m1');

    const history = getHistory();
    expect(history.length).toBe(1);
    expect(history[0].mangaId).toBe('m2');
  });

  it('marks and tracks read chapter IDs in localStorage', () => {
    expect(isChapterRead('ch-100')).toBe(false);
    expect(getReadChapterIds()).toEqual([]);

    markChapterAsRead('ch-100');
    expect(isChapterRead('ch-100')).toBe(true);
    expect(getReadChapterIds()).toEqual(['ch-100']);

    // Reading another chapter
    markChapterAsRead('ch-101');
    expect(isChapterRead('ch-101')).toBe(true);
    expect(getReadChapterIds()).toEqual(['ch-100', 'ch-101']);
  });

  it('exports user data to JSON and imports it back seamlessly', () => {
    toggleFavorite({
      id: 'fav-1',
      title: 'Solo Leveling',
      coverUrl: 'http://img.jpg',
      type: 'manhwa',
    });
    saveHistory({
      mangaId: 'fav-1',
      title: 'Solo Leveling',
      coverUrl: 'http://img.jpg',
      type: 'manhwa',
      chapterId: 'ch-10',
      chapterNumber: '10',
      readAt: '2026-10-27T00:00:00Z',
    });
    markChapterAsRead('ch-10');

    const exportedJson = exportUserData();
    expect(typeof exportedJson).toBe('string');
    const parsed = JSON.parse(exportedJson);
    expect(parsed.version).toBe(1);
    expect(parsed.favorites).toHaveLength(1);
    expect(parsed.history).toHaveLength(1);
    expect(parsed.readChapters).toContain('ch-10');

    // Clear local storage to simulate a new device or cleared cache
    localStorage.clear();
    expect(getFavorites()).toHaveLength(0);
    expect(getHistory()).toHaveLength(0);
    expect(getReadChapterIds()).toHaveLength(0);

    // Import data
    const result = importUserData(exportedJson);
    expect(result.success).toBe(true);
    expect(result.count).toBeGreaterThan(0);
    expect(getFavorites()).toHaveLength(1);
    expect(getFavorites()[0].id).toBe('fav-1');
    expect(getHistory()).toHaveLength(1);
    expect(isChapterRead('ch-10')).toBe(true);
  });

  it('handles invalid JSON gracefully during import', () => {
    const invalidRes = importUserData('invalid json string');
    expect(invalidRes.success).toBe(false);
    expect(invalidRes.error).toBeDefined();

    const emptyObjRes = importUserData('{}');
    expect(emptyObjRes.success).toBe(true);
    expect(emptyObjRes.count).toBe(0);
  });

  it('persists and restores latest section, top section, and chapter scroll positions', () => {
    // 1. Latest section pagination & type
    saveLatestSectionState('manga', 3);
    expect(getSavedLatestSectionState()).toEqual({ type: 'manga', page: 3 });

    // 2. Top section pagination & category
    saveTopSectionState('manhua', 2);
    expect(getSavedTopSectionState()).toEqual({ category: 'manhua', page: 2 });

    // 3. Home scroll position
    saveHomeScrollPosition(450);
    expect(getSavedHomeScrollPosition()).toBe(450);

    // 4. Chapter scroll position
    saveChapterScrollPosition('chapter-abc', 1250, 4);
    const savedScroll = getSavedChapterScrollPosition('chapter-abc');
    expect(savedScroll).toEqual({ y: 1250, pageIndex: 4 });

    clearChapterScrollPosition('chapter-abc');
    expect(getSavedChapterScrollPosition('chapter-abc')).toBeNull();
  });
});
