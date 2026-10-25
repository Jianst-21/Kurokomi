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
});
