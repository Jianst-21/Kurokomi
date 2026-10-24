import { ComicCardItem, ReadingHistoryItem } from './types';

const FAVORITES_KEY = 'kurokomi_favorites_v1';
const HISTORY_KEY = 'kurokomi_history_v1';

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
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
