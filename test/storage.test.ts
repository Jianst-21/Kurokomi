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
  saveHistoryScrollPosition,
  getSavedHistoryScrollPosition,
  saveChapterScrollPosition,
  getSavedChapterScrollPosition,
  clearChapterScrollPosition,
  hasComicUpdate,
  hasAnyFavoriteUpdate,
  updateFavoriteComic,
  sortFavoritesByLatestUpdate,
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

    // 3b. History scroll position
    saveHistoryScrollPosition(680);
    expect(getSavedHistoryScrollPosition()).toBe(680);

    // 4. Chapter scroll position
    saveChapterScrollPosition('chapter-abc', 1250, 4);
    const savedScroll = getSavedChapterScrollPosition('chapter-abc');
    expect(savedScroll).toEqual({ y: 1250, pageIndex: 4 });

    // When progress ratio >= 0.95 (finished chapter), it resets position so next visit starts at top
    saveChapterScrollPosition('chapter-abc', 9500, 20, 0.96);
    expect(getSavedChapterScrollPosition('chapter-abc')).toEqual({ y: 0, pageIndex: 0 });

    clearChapterScrollPosition('chapter-abc');
    expect(getSavedChapterScrollPosition('chapter-abc')).toBeNull();
  });

  describe('Favorite Update Detection', () => {
    it('detects update when comic is in favorites, has a latestChapter, and latestChapter is unread', () => {
      const comic: ComicCardItem = {
        id: 'comic-1',
        title: 'One Piece',
        coverUrl: 'https://example.com/op.jpg',
        type: 'manga',
        latestChapter: 'Ch. 1100',
        latestChapterId: 'ch-1100',
      };

      // Not favorited yet -> should not flag as favorite update
      expect(hasComicUpdate(comic)).toBe(false);

      // Add to favorites
      toggleFavorite(comic);
      expect(hasComicUpdate(comic)).toBe(true);
      expect(hasAnyFavoriteUpdate()).toBe(true);

      // Read the latest chapter
      markChapterAsRead('ch-1100');
      saveHistory({
        mangaId: 'comic-1',
        title: 'One Piece',
        coverUrl: 'https://example.com/op.jpg',
        type: 'manga',
        chapterId: 'ch-1100',
        chapterNumber: 'Ch. 1100',
        readAt: new Date().toISOString(),
      });

      // Now it's read -> update should be false
      expect(hasComicUpdate(comic)).toBe(false);
      expect(hasAnyFavoriteUpdate()).toBe(false);
    });

    it('works when only latestChapter title is available without latestChapterId', () => {
      const comic: ComicCardItem = {
        id: 'comic-2',
        title: 'Jujutsu Kaisen',
        coverUrl: 'https://example.com/jjk.jpg',
        type: 'manga',
        latestChapter: 'Chapter 250',
      };

      toggleFavorite(comic);
      expect(hasComicUpdate(comic)).toBe(true);

      // History has older chapter
      saveHistory({
        mangaId: 'comic-2',
        title: 'Jujutsu Kaisen',
        coverUrl: 'https://example.com/jjk.jpg',
        type: 'manga',
        chapterId: 'ch-249',
        chapterNumber: 'Chapter 249',
        readAt: new Date().toISOString(),
      });
      expect(hasComicUpdate(comic)).toBe(true);

      // History updated to Chapter 250
      saveHistory({
        mangaId: 'comic-2',
        title: 'Jujutsu Kaisen',
        coverUrl: 'https://example.com/jjk.jpg',
        type: 'manga',
        chapterId: 'ch-250',
        chapterNumber: 'Chapter 250',
        readAt: new Date().toISOString(),
      });
      expect(hasComicUpdate(comic)).toBe(false);
    });

    it('updates favorite comic latestChapter metadata with updateFavoriteComic', () => {
      const comic: ComicCardItem = {
        id: 'comic-3',
        title: 'Bleach',
        coverUrl: 'https://example.com/bleach.jpg',
        type: 'manga',
      };

      toggleFavorite(comic);
      expect(hasComicUpdate(getFavorites()[0])).toBe(false); // No latestChapter yet

      // Background update syncs new chapter
      updateFavoriteComic('comic-3', {
        latestChapter: 'Ch. 686',
        latestChapterId: 'ch-686',
      });

      const updated = getFavorites().find(c => c.id === 'comic-3')!;
      expect(updated.latestChapter).toBe('Ch. 686');
      expect(hasComicUpdate(updated)).toBe(true);
      expect(hasAnyFavoriteUpdate()).toBe(true);
    });

    it('correctly compares numeric chapter numbers without false positive red marks', () => {
      const comic: ComicCardItem = {
        id: 'komikindo--solo-leveling',
        title: 'Solo Leveling',
        coverUrl: 'https://example.com/sl.jpg',
        type: 'manhwa',
        latestChapter: 'Ch. 179',
      };

      toggleFavorite(comic);

      // User has read chapter '179' (stored as plain numeric string in reader)
      saveHistory({
        mangaId: 'komikindo--solo-leveling',
        title: 'Solo Leveling',
        coverUrl: 'https://example.com/sl.jpg',
        type: 'manhwa',
        chapterId: 'komikindo--chapter-179',
        chapterNumber: '179',
        readAt: new Date().toISOString(),
      });

      // Since user already read 179, hasComicUpdate must be FALSE (no red mark)
      expect(hasComicUpdate(comic)).toBe(false);
      expect(hasAnyFavoriteUpdate()).toBe(false);

      // If a new chapter Ch. 180 is published and synced to favorites
      updateFavoriteComic('komikindo--solo-leveling', { latestChapter: 'Ch. 180' });
      const updatedComic = getFavorites().find(c => c.id === 'komikindo--solo-leveling')!;
      expect(hasComicUpdate(updatedComic)).toBe(true);
      expect(hasAnyFavoriteUpdate()).toBe(true);

      // If user reads chapter 180, it returns to FALSE
      saveHistory({
        mangaId: 'komikindo--solo-leveling',
        title: 'Solo Leveling',
        coverUrl: 'https://example.com/sl.jpg',
        type: 'manhwa',
        chapterId: 'komikindo--chapter-180',
        chapterNumber: '180',
        readAt: new Date().toISOString(),
      });
      expect(hasComicUpdate(comic)).toBe(false);

      // If user is ahead (read 181), it should also be FALSE
      saveHistory({
        mangaId: 'komikindo--solo-leveling',
        title: 'Solo Leveling',
        coverUrl: 'https://example.com/sl.jpg',
        type: 'manhwa',
        chapterId: 'komikindo--chapter-181',
        chapterNumber: '181',
        readAt: new Date().toISOString(),
      });
      expect(hasComicUpdate(comic)).toBe(false);
    });

    it('matches reading history across different provider prefixes', () => {
      const comic: ComicCardItem = {
        id: 'softkomik--nano-machine',
        title: 'Nano Machine',
        coverUrl: 'https://example.com/nm.jpg',
        type: 'manhwa',
        latestChapter: 'Ch. 200',
      };

      toggleFavorite(comic);

      // History was saved from komikindo provider
      saveHistory({
        mangaId: 'komikindo--nano-machine',
        title: 'Nano Machine',
        coverUrl: 'https://example.com/nm.jpg',
        type: 'manhwa',
        chapterId: 'komikindo--chapter-200',
        chapterNumber: '200',
        readAt: new Date().toISOString(),
      });

      // Must find the history entry via slug match and return false
      expect(hasComicUpdate(comic)).toBe(false);
    });

    it('moves updated comic to index 0 (top-left) when updateFavoriteComic receives newer chapter or updatedAt', () => {
      const comic1: ComicCardItem = { id: 'fav-1', title: 'Comic 1', coverUrl: '', type: 'manga' };
      const comic2: ComicCardItem = { id: 'fav-2', title: 'Comic 2', coverUrl: '', type: 'manga' };
      toggleFavorite(comic1);
      toggleFavorite(comic2);

      // Initially comic2 is at 0 because it was toggled second
      expect(getFavorites()[0].id).toBe('fav-2');

      // Now comic1 gets a new chapter update
      updateFavoriteComic('fav-1', {
        latestChapter: 'Ch. 100',
        updatedAt: '5 menit lalu',
      });

      // comic1 should have moved to index 0 (top-left)
      expect(getFavorites()[0].id).toBe('fav-1');
    });

    it('sorts favorites so that comic with newest update is at index 0 (top-left)', () => {
      const comicA: ComicCardItem = {
        id: 'c-a',
        title: 'Comic A',
        coverUrl: '',
        type: 'manhwa',
        latestChapter: 'Ch. 10',
        updatedAt: '10 menit lalu',
      };
      const comicB: ComicCardItem = {
        id: 'c-b',
        title: 'Comic B',
        coverUrl: '',
        type: 'manhwa',
        latestChapter: 'Ch. 50',
        updatedAt: '2 jam lalu',
      };
      const comicC: ComicCardItem = {
        id: 'c-c',
        title: 'Comic C',
        coverUrl: '',
        type: 'manhwa',
        latestChapter: 'Ch. 5',
        updatedAt: '3 hari lalu',
      };

      // Add to favorites
      toggleFavorite(comicC);
      toggleFavorite(comicB);
      toggleFavorite(comicA);

      // Comic A updated 10 minutes ago, Comic B updated 2 hours ago, Comic C 3 days ago.
      // All 3 have unread updates, so comic A (newest) must be at index 0 (top-left)
      const sorted = sortFavoritesByLatestUpdate(getFavorites());
      expect(sorted[0].id).toBe('c-a');
      expect(sorted[1].id).toBe('c-b');
      expect(sorted[2].id).toBe('c-c');

      // If user reads comic A, but comic B still has an unread update:
      saveHistory({
        mangaId: 'c-a',
        title: 'Comic A',
        coverUrl: '',
        type: 'manhwa',
        chapterNumber: 'Ch. 10',
        chapterId: 'ch-10',
        readAt: new Date().toISOString(),
      });

      // Comic B now has unread update, so it moves to index 0 (top-left)!
      const reSorted = sortFavoritesByLatestUpdate(getFavorites());
      expect(reSorted[0].id).toBe('c-b');
    });
  });
});
