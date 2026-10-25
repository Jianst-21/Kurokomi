import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TopComicsSection } from '@/components/TopComicsSection';
import * as md from '@/lib/mangadex';

describe('TopComicsSection', () => {
  it('renders category filter buttons', async () => {
    vi.spyOn(md, 'fetchTopComics').mockResolvedValue([]);
    render(<TopComicsSection />);
    expect(screen.getByRole('button', { name: /semua top/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /top manhwa/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /top manga/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /top manhua/i })).toBeDefined();
  });

  it('resets page to 1 when changing category', async () => {
    vi.spyOn(md, 'fetchTopComics').mockResolvedValue([]);
    render(<TopComicsSection />);
    const manhwaBtn = screen.getByRole('button', { name: /top manhwa/i });
    fireEvent.click(manhwaBtn);
    await waitFor(() => {
      expect(screen.getByText('1')).toBeDefined();
    });
  });
});
