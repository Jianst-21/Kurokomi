import { ComicCardItem, ReadingHistoryItem } from './types';

const FAVORITES_KEY = 'kurokomi_favorites_v1';
const HISTORY_KEY = 'kurokomi_history_v1';
const READ_CHAPTERS_KEY = 'kurokomi_read_chapters_v1';
const LATEST_PAGE_KEY = 'kurokomi_latest_page_v1';
const TOP_PAGE_KEY = 'kurokomi_top_page_v1';
const CHAPTER_SCROLL_PREFIX = 'kurokomi_ch_scroll_';
const HOME_SCROLL_KEY = 'kurokomi_home_scroll_v1';

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function getReadChapterIds(): string[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(READ_CHAPTERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function isChapterRead(chapterId: string): boolean {
  if (!isBrowser() || !chapterId) return false;
  const ids = getReadChapterIds();
  return ids.includes(chapterId);
}

export function markChapterAsRead(chapterId: string): void {
  if (!isBrowser() || !chapterId) return;
  try {
    const ids = getReadChapterIds();
    if (!ids.includes(chapterId)) {
      ids.push(chapterId);
      if (ids.length > 500) {
        ids.shift();
      }
      localStorage.setItem(READ_CHAPTERS_KEY, JSON.stringify(ids));
    }
  } catch (err) {
    console.error('Failed to mark chapter as read:', err);
  }
}

export function getFavorites(): ComicCardItem[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function isFavorite(comicId: string): boolean {
  const list = getFavorites();
  return list.some(c => c.id === comicId);
}

export function toggleFavorite(comic: ComicCardItem): boolean {
  if (!isBrowser()) return false;
  try {
    const list = getFavorites();
    const index = list.findIndex(c => c.id === comic.id);

    if (index >= 0) {
      list.splice(index, 1);
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(list));
      return false;
    } else {
      list.unshift(comic);
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(list));
      return true;
    }
  } catch {
    return false;
  }
}

export function getHistory(): ReadingHistoryItem[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getComicLastRead(mangaId: string): ReadingHistoryItem | undefined {
  const list = getHistory();
  return list.find(h => h.mangaId === mangaId);
}

export function saveHistory(item: ReadingHistoryItem): void {
  if (!isBrowser()) return;
  try {
    if (item.chapterId) {
      markChapterAsRead(item.chapterId);
    }

    let list = getHistory();
    // Remove if manga already in history so we can move it to front
    list = list.filter(h => h.mangaId !== item.mangaId);
    list.unshift(item);

    // Keep at most 100 recent entries
    if (list.length > 100) {
      list = list.slice(0, 100);
    }

    localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('Failed to save reading history:', err);
  }
}

export function clearHistory(): void {
  if (!isBrowser()) return;
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch {
    // ignore
  }
}

export function removeFromHistory(mangaId: string): void {
  if (!isBrowser() || !mangaId) return;
  try {
    const list = getHistory().filter(h => h.mangaId !== mangaId);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('Failed to remove item from history:', err);
  }
}

export interface BackupData {
  version: number;
  exportedAt: string;
  favorites: ComicCardItem[];
  history: ReadingHistoryItem[];
  readChapters: string[];
}

export function exportUserData(): string {
  if (!isBrowser()) return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), favorites: [], history: [], readChapters: [] });
  const data: BackupData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    favorites: getFavorites(),
    history: getHistory(),
    readChapters: getReadChapterIds(),
  };
  return JSON.stringify(data, null, 2);
}

export function importUserData(jsonString: string): { success: boolean; count: number; error?: string } {
  if (!isBrowser()) return { success: false, count: 0, error: 'Browser environment required' };
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || typeof parsed !== 'object') {
      return { success: false, count: 0, error: 'Format file tidak valid' };
    }

    let restoredCount = 0;

    // 1. Restore & Merge Favorites
    if (Array.isArray(parsed.favorites)) {
      const currentFavs = getFavorites();
      const favMap = new Map<string, ComicCardItem>();
      for (const item of currentFavs) {
        if (item && item.id) favMap.set(item.id, item);
      }
      for (const item of parsed.favorites) {
        if (item && item.id && !favMap.has(item.id)) {
          favMap.set(item.id, item);
          restoredCount++;
        }
      }
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(favMap.values())));
    }

    // 2. Restore & Merge History
    if (Array.isArray(parsed.history)) {
      const currentHistory = getHistory();
      const historyMap = new Map<string, ReadingHistoryItem>();
      for (const item of currentHistory) {
        if (item && item.mangaId) historyMap.set(item.mangaId, item);
      }
      for (const item of parsed.history) {
        if (item && item.mangaId) {
          const existing = historyMap.get(item.mangaId);
          if (!existing) {
            historyMap.set(item.mangaId, item);
            restoredCount++;
          } else {
            // Pick newest readAt
            const existingTime = existing.readAt ? new Date(existing.readAt).getTime() : 0;
            const itemTime = item.readAt ? new Date(item.readAt).getTime() : 0;
            if (itemTime > existingTime) {
              historyMap.set(item.mangaId, item);
            }
          }
        }
      }
      // Sort history descending by readAt
      const sortedHistory = Array.from(historyMap.values()).sort((a, b) => {
        const timeA = a.readAt ? new Date(a.readAt).getTime() : 0;
        const timeB = b.readAt ? new Date(b.readAt).getTime() : 0;
        return timeB - timeA;
      }).slice(0, 100);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(sortedHistory));
    }

    // 3. Restore & Merge Read Chapters
    if (Array.isArray(parsed.readChapters)) {
      const currentChapters = new Set(getReadChapterIds());
      for (const chId of parsed.readChapters) {
        if (typeof chId === 'string' && chId.trim()) {
          if (!currentChapters.has(chId)) {
            currentChapters.add(chId);
            restoredCount++;
          }
        }
      }
      localStorage.setItem(READ_CHAPTERS_KEY, JSON.stringify(Array.from(currentChapters).slice(-500)));
    }

    return { success: true, count: restoredCount };
  } catch {
    return { success: false, count: 0, error: 'Gagal memproses file cadangan' };
  }
}

// ---------------------------------------------------------
// Navigation & Pagination State Persistence (SessionStorage)
// ---------------------------------------------------------

export function getSavedLatestSectionState(): { type: 'manhwa' | 'manga' | 'manhua'; page: number } {
  if (typeof window === 'undefined') return { type: 'manhwa', page: 1 };
  try {
    const raw = sessionStorage.getItem(LATEST_PAGE_KEY);
    if (!raw) return { type: 'manhwa', page: 1 };
    const parsed = JSON.parse(raw);
    return {
      type: ['manhwa', 'manga', 'manhua'].includes(parsed.type) ? parsed.type : 'manhwa',
      page: typeof parsed.page === 'number' && parsed.page > 0 ? parsed.page : 1,
    };
  } catch {
    return { type: 'manhwa', page: 1 };
  }
}

export function saveLatestSectionState(type: 'manhwa' | 'manga' | 'manhua', page: number): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(LATEST_PAGE_KEY, JSON.stringify({ type, page }));
  } catch {
    // ignore
  }
}

export function getSavedTopSectionState(): { category: string; page: number } {
  if (typeof window === 'undefined') return { category: 'all', page: 1 };
  try {
    const raw = sessionStorage.getItem(TOP_PAGE_KEY);
    if (!raw) return { category: 'all', page: 1 };
    const parsed = JSON.parse(raw);
    return {
      category: parsed.category || 'all',
      page: typeof parsed.page === 'number' && parsed.page > 0 ? parsed.page : 1,
    };
  } catch {
    return { category: 'all', page: 1 };
  }
}

export function saveTopSectionState(category: string, page: number): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(TOP_PAGE_KEY, JSON.stringify({ category, page }));
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------
// Scroll Position Persistence (SessionStorage & LocalStorage)
// ---------------------------------------------------------

export function saveHomeScrollPosition(y: number): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(HOME_SCROLL_KEY, String(Math.max(0, Math.round(y))));
  } catch {
    // ignore
  }
}

export function getSavedHomeScrollPosition(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = sessionStorage.getItem(HOME_SCROLL_KEY);
    return raw ? Number(raw) || 0 : 0;
  } catch {
    return 0;
  }
}

export function saveChapterScrollPosition(chapterId: string, scrollY: number, pageIndex: number = 0): void {
  if (!isBrowser() || !chapterId) return;
  try {
    const key = `${CHAPTER_SCROLL_PREFIX}${chapterId}`;
    localStorage.setItem(
      key,
      JSON.stringify({
        y: Math.max(0, Math.round(scrollY)),
        pageIndex,
        savedAt: Date.now(),
      })
    );
  } catch {
    // ignore
  }
}

export function getSavedChapterScrollPosition(chapterId: string): { y: number; pageIndex: number } | null {
  if (!isBrowser() || !chapterId) return null;
  try {
    const key = `${CHAPTER_SCROLL_PREFIX}${chapterId}`;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      y: typeof parsed.y === 'number' ? parsed.y : 0,
      pageIndex: typeof parsed.pageIndex === 'number' ? parsed.pageIndex : 0,
    };
  } catch {
    return null;
  }
}

export function clearChapterScrollPosition(chapterId: string): void {
  if (!isBrowser() || !chapterId) return;
  try {
    localStorage.removeItem(`${CHAPTER_SCROLL_PREFIX}${chapterId}`);
  } catch {
    // ignore
  }
}

