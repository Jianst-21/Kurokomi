/**
 * Helpers and state logic for Manga Paged Mode & Hybrid Navigation.
 */

export type ReaderMode = 'webtoon' | 'paged';
export type TouchZone = 'left' | 'center' | 'right';
export type SwipeDirection = 'prev' | 'next' | 'none';

const READER_MODE_KEY = 'kurokomi_reader_mode';

/**
 * Calculates which of the 3 touch zones was tapped:
 * - Left 30%: previous page
 * - Center 40%: toggle HUD
 * - Right 30%: next page
 */
export function getPagedTouchZone(clientX: number, containerWidth: number): TouchZone {
  if (containerWidth <= 0) return 'center';
  const ratio = clientX / containerWidth;
  if (ratio < 0.3) return 'left';
  if (ratio > 0.7) return 'right';
  return 'center';
}

/**
 * Calculates horizontal swipe direction with a 50px threshold:
 * - Swipe left (startX - endX > 50): next page
 * - Swipe right (endX - startX > 50): prev page
 */
export function getSwipeDirection(startX: number, endX: number, threshold: number = 50): SwipeDirection {
  const deltaX = startX - endX;
  if (deltaX > threshold) return 'next';
  if (deltaX < -threshold) return 'prev';
  return 'none';
}

/**
 * Calculates next page index or boundary transition to next chapter.
 */
export function getNextPageIndex(currentIndex: number, totalPages: number): number | 'next-chapter' {
  if (currentIndex + 1 >= totalPages) {
    return 'next-chapter';
  }
  return currentIndex + 1;
}

/**
 * Calculates previous page index or boundary transition to previous chapter.
 */
export function getPrevPageIndex(currentIndex: number): number | 'prev-chapter' {
  if (currentIndex <= 0) {
    return 'prev-chapter';
  }
  return currentIndex - 1;
}

/**
 * Reads reader mode preference from localStorage (defaults to 'webtoon').
 */
export function getStoredReaderMode(): ReaderMode {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return 'webtoon';
  }
  try {
    const val = localStorage.getItem(READER_MODE_KEY);
    return val === 'paged' ? 'paged' : 'webtoon';
  } catch {
    return 'webtoon';
  }
}

/**
 * Saves reader mode preference to localStorage.
 */
export function setStoredReaderMode(mode: ReaderMode): void {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(READER_MODE_KEY, mode);
  } catch {
    // ignore
  }
}
