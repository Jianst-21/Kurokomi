// test/ReaderDesktop.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import ReaderPage from '@/app/chapter/[id]/page';
import { ReaderHUD } from '@/components/ReaderHUD';

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'softkomik--solo-leveling__1' }),
  useSearchParams: () => new URLSearchParams('mangaId=softkomik--solo-leveling'),
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}));

vi.mock('@/lib/mangadex', () => ({
  fetchChapterPages: vi.fn().mockResolvedValue([
    { url: 'https://example.com/1.jpg', fallbackUrl: 'https://example.com/1-fallback.jpg' }
  ]),
  fetchComicChapters: vi.fn().mockResolvedValue([]),
  fetchComicDetail: vi.fn().mockResolvedValue({ id: 'softkomik--solo-leveling', title: 'Solo Leveling', type: 'manhwa' }),
  fetchMangaIdFromChapter: vi.fn().mockResolvedValue('softkomik--solo-leveling'),
  sortChapters: vi.fn().mockReturnValue([]),
}));

vi.mock('@/lib/aggregator', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/aggregator')>();
  return {
    ...actual,
    fetchUnifiedComicDetail: vi.fn().mockResolvedValue({ id: 'softkomik--solo-leveling', title: 'Solo Leveling', type: 'manhwa' }),
    fetchUnifiedChapters: vi.fn().mockResolvedValue({ idChapters: [], enChapters: [] }),
  };
});

vi.mock('@/lib/storage', () => ({
  saveHistory: vi.fn(),
  getSavedChapterScrollPosition: vi.fn().mockReturnValue(null),
  saveChapterScrollPosition: vi.fn(),
  getComicLastRead: vi.fn().mockReturnValue(undefined),
}));

describe('Reader Desktop Constraints', () => {
  it('applies comfortable max-w-2xl constraint in webtoon mode for ReaderPage', async () => {
    const { container } = render(<ReaderPage />);
    
    await waitFor(() => {
      const main = container.querySelector('main');
      expect(main).toBeInTheDocument();
      expect(main).toHaveClass('max-w-2xl');
    });
  });

  it('applies max-w-3xl constraint to ReaderHUD top and bottom bars', () => {
    const { container } = render(
      <ReaderHUD
        visible={true}
        comicTitle="Solo Leveling"
        currentChapter="142"
        mangaId="m1"
        onOpenDrawer={vi.fn()}
      />
    );

    const headerInner = container.querySelector('header > div');
    const footerInner = container.querySelector('footer > div');

    expect(headerInner).toHaveClass('max-w-3xl');
    expect(footerInner).toHaveClass('max-w-3xl');
  });
});
