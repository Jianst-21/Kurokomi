import { describe, it, expect, beforeEach } from 'vitest';
import {
  getFavorites,
  toggleFavorite,
  isFavorite,
  getHistory,
  saveHistory,
  getComicLastRead,
  clearHistory,
  markChapterAsRead,
  isChapterRead,
  getReadChapterIds,
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
});
