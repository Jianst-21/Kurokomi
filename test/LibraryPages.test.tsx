import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

  it('renders minimalist Ekspor and Impor action buttons on favorites page', () => {
    render(<FavoritesPage />);
    expect(screen.getByRole('button', { name: 'Ekspor' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Impor' })).toBeInTheDocument();
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

  it('allows removing a single comic from history list', async () => {
    saveHistory({
      mangaId: 'comic-to-delete',
      title: 'Comic To Delete',
      coverUrl: '',
      type: 'manhwa',
      chapterId: 'ch1',
      chapterNumber: '1',
      readAt: new Date().toISOString(),
    });

    render(<HistoryPage />);
    expect(screen.getByText('Comic To Delete')).toBeInTheDocument();

    const deleteBtn = screen.getByRole('button', { name: /hapus comic to delete dari riwayat/i });
    expect(deleteBtn).toBeInTheDocument();

    fireEvent.click(deleteBtn);

    expect(screen.queryByText('Comic To Delete')).not.toBeInTheDocument();
  });
});
