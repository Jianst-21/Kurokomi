import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import MangaDetailPage from '@/app/manga/[id]/page';
import * as aggregatorModule from '@/lib/aggregator';

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'solo-leveling' }),
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  usePathname: () => '/manga/solo-leveling',
}));

describe('MangaDetailPage Desktop Layout', () => {
  it('renders desktop container with max-w-6xl and 2-column grid structure', async () => {
    vi.spyOn(aggregatorModule, 'fetchUnifiedComicDetail').mockResolvedValue({
      id: 'solo-leveling',
      title: 'Solo Leveling',
      altTitles: ['Na Honjaman Level Up'],
      coverUrl: 'https://thumbnail.komiku.org/uploads/manga/solo-leveling.png',
      description: 'Sung Jin-Woo adalah hunter rank E...',
      type: 'manhwa',
      status: 'ongoing',
      genres: ['Action', 'Fantasy'],
      isFullColor: true,
      author: 'Chugong',
      year: 2018,
    });

    vi.spyOn(aggregatorModule, 'fetchUnifiedChapters').mockResolvedValue({
      idChapters: [
        { id: 'chap-1', chapter: '1', title: 'Chapter 1', publishAt: '2024-01-01', pagesCount: 20 }
      ],
      enChapters: [],
    });

    const { container } = render(<MangaDetailPage />);
    
    // Check loading container max-w-6xl
    const loadingMain = container.querySelector('main');
    expect(loadingMain).toHaveClass('max-w-6xl');

    // Wait for content render
    await screen.findAllByText('Solo Leveling');

    const main = container.querySelector('main');
    expect(main).toHaveClass('max-w-6xl');
    
    // Check grid layout on laptop/desktop
    const gridContainer = container.querySelector('.grid.grid-cols-1');
    expect(gridContainer).toBeInTheDocument();
    expect(gridContainer).toHaveClass('md:grid-cols-[280px_1fr]');
  });

  it('renders DesktopNavbar and hides mobile header on md+ screens', async () => {
    vi.spyOn(aggregatorModule, 'fetchUnifiedComicDetail').mockResolvedValue({
      id: 'solo-leveling',
      title: 'Solo Leveling',
      altTitles: [],
      coverUrl: 'https://thumbnail.komiku.org/uploads/manga/solo-leveling.png',
      description: 'Sung Jin-Woo',
      type: 'manhwa',
      status: 'ongoing',
      genres: [],
      isFullColor: false,
    });

    vi.spyOn(aggregatorModule, 'fetchUnifiedChapters').mockResolvedValue({
      idChapters: [],
      enChapters: [],
    });

    const { container } = render(<MangaDetailPage />);
    await screen.findAllByText('Solo Leveling');

    const headers = container.querySelectorAll('header');
    const mobileHeader = Array.from(headers).find((h) => h.className.includes('md:hidden'));
    expect(mobileHeader).toBeInTheDocument();

    const desktopNav = Array.from(headers).find((h) => h.className.includes('md:flex'));
    expect(desktopNav).toBeInTheDocument();
  });
});
