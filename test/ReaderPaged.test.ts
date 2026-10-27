import { describe, it, expect } from 'vitest';
import {
  getPagedTouchZone,
  getSwipeDirection,
  getNextPageIndex,
  getPrevPageIndex,
  getStoredReaderMode,
  setStoredReaderMode,
} from '@/lib/paged-reader';

describe('Paged Reader Logic & Hybrid Touch Helpers', () => {
  it('detects 3 touch zones: left (prev), center (toggle HUD), right (next)', () => {
    const width = 1000;
    // Left zone: 0 to 300px
    expect(getPagedTouchZone(150, width)).toBe('left');
    expect(getPagedTouchZone(299, width)).toBe('left');

    // Center zone: 300px to 700px
    expect(getPagedTouchZone(301, width)).toBe('center');
    expect(getPagedTouchZone(500, width)).toBe('center');
    expect(getPagedTouchZone(699, width)).toBe('center');

    // Right zone: 700px to 1000px
    expect(getPagedTouchZone(701, width)).toBe('right');
    expect(getPagedTouchZone(900, width)).toBe('right');
  });

  it('detects swipe directions with 50px threshold', () => {
    // Swipe left (startX 200, endX 100 -> deltaX +100): next page
    expect(getSwipeDirection(200, 100)).toBe('next');

    // Swipe right (startX 100, endX 200 -> deltaX -100): prev page
    expect(getSwipeDirection(100, 200)).toBe('prev');

    // Below threshold (startX 100, endX 120 -> deltaX -20): none
    expect(getSwipeDirection(100, 120)).toBe('none');
    expect(getSwipeDirection(100, 100)).toBe('none');
  });

  it('calculates page index transitions properly', () => {
    const totalPages = 20;

    // Next page inside chapter
    expect(getNextPageIndex(0, totalPages)).toBe(1);
    expect(getNextPageIndex(5, totalPages)).toBe(6);

    // Next page at boundary (last page index 19)
    expect(getNextPageIndex(19, totalPages)).toBe('next-chapter');

    // Prev page inside chapter
    expect(getPrevPageIndex(5)).toBe(4);
    expect(getPrevPageIndex(1)).toBe(0);

    // Prev page at boundary (page 0)
    expect(getPrevPageIndex(0)).toBe('prev-chapter');
  });

  it('stores and retrieves reader mode preference in localStorage', () => {
    localStorage.clear();
    // Default when unset is 'webtoon'
    expect(getStoredReaderMode()).toBe('webtoon');

    setStoredReaderMode('paged');
    expect(getStoredReaderMode()).toBe('paged');

    setStoredReaderMode('webtoon');
    expect(getStoredReaderMode()).toBe('webtoon');
  });
});
