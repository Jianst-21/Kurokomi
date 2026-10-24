import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import FavoritesPage from '@/app/favorites/page';
import HistoryPage from '@/app/history/page';
import { toggleFavorite, saveHistory } from '@/lib/storage';

describe('Favorites and History Pages', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders empty states when no favorites or history exist', () => {
    const { unmount } = render(<FavoritesPage />);
    expect(screen.getByText(/Belum Ada Komik Favorit/i)).toBeInTheDocument();
    unmount();

    render(<HistoryPage />);
    expect(screen.getByText(/Belum Ada Riwayat Bacaan/i)).toBeInTheDocument();
  });

  it('renders favorite comics when populated', () => {
    toggleFavorite({
      id: 'm1',
      title: 'Solo Leveling',
      coverUrl: '',
      type: 'manhwa',
    });

    render(<FavoritesPage />);
    expect(screen.getByRole('heading', { name: 'Solo Leveling' })).toBeInTheDocument();
  });

  it('renders history items with last read chapter when populated', () => {
    saveHistory({
      mangaId: 'm1',
      title: 'Solo Leveling',
      coverUrl: '',
      type: 'manhwa',
      chapterId: 'ch142',
      chapterNumber: '142',
      readAt: new Date().toISOString(),
    });

    render(<HistoryPage />);
    expect(screen.getByText('Solo Leveling')).toBeInTheDocument();
    expect(screen.getByText(/Chapter 142/i)).toBeInTheDocument();
  });
});
