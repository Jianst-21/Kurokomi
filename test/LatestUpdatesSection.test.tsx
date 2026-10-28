import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { LatestUpdatesSection } from '@/components/LatestUpdatesSection';
import * as md from '@/lib/mangadex';

describe('LatestUpdatesSection', () => {
  it('renders Manhwa, Manga, and Manhua tabs', async () => {
    vi.spyOn(md, 'fetchLatestComicsByType').mockResolvedValue([]);
    render(<LatestUpdatesSection />);
    expect(screen.getByRole('button', { name: /manhwa/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /manga/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /manhua/i })).toBeDefined();
  });

  it('resets page to 1 when changing type tab', async () => {
    vi.spyOn(md, 'fetchLatestComicsByType').mockResolvedValue([]);
    render(<LatestUpdatesSection />);
    const mangaTab = screen.getByRole('button', { name: /manga/i });
    fireEvent.click(mangaTab);
    await waitFor(() => {
      expect(screen.getByText('1')).toBeDefined();
    });
  });

  it('renders comics in chronologically descending order', async () => {
    const mockComics = [
      { id: '1', title: 'Comic 1', coverUrl: '1.jpg', updatedAt: '3 bulan lalu', type: 'manhua' as const },
      { id: '2', title: 'Comic 2', coverUrl: '2.jpg', updatedAt: '2 hari lalu', type: 'manhua' as const },
      { id: '3', title: 'Comic 3', coverUrl: '3.jpg', updatedAt: '1 jam lalu', type: 'manhua' as const },
    ];
    // fetchLatestComicsByType will sort them chronologically
    vi.spyOn(md, 'fetchLatestComicsByType').mockResolvedValue([
      mockComics[2],
      mockComics[1],
      mockComics[0],
    ]);

    render(<LatestUpdatesSection />);
    await waitFor(() => {
      expect(screen.getByText('Comic 3')).toBeDefined();
    });
    const cards = screen.getAllByRole('heading', { level: 3 });
    expect(cards[0].textContent).toBe('Comic 3');
    expect(cards[1].textContent).toBe('Comic 2');
    expect(cards[2].textContent).toBe('Comic 1');
  });
});
