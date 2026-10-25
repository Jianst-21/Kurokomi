import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HorizontalComicCard } from '@/components/HorizontalComicCard';
import { ComicCardItem } from '@/lib/types';

describe('HorizontalComicCard', () => {
  const mockComic: ComicCardItem = {
    id: 'md-extra-survival',
    title: "The Extra's Academy Survival Guide",
    altTitle: 'Surviving The Academy',
    coverUrl: 'http://img.jpg',
    type: 'manhwa',
    latestChapter: 'Ch. 129',
    genres: ['Action', 'Fantasy', 'Magic'],
  };

  it('renders cover, title, alt title, latest chapter and genres', () => {
    render(<HorizontalComicCard comic={mockComic} />);
    expect(screen.getByText("The Extra's Academy Survival Guide")).toBeDefined();
    expect(screen.getByText(/Surviving The Academy/)).toBeDefined();
    expect(screen.getByText('Ch. 129')).toBeDefined();
    expect(screen.getByText('Action')).toBeDefined();
    expect(screen.getByText('Baca')).toBeDefined();
  });

  it('links to /manga/[id]', () => {
    render(<HorizontalComicCard comic={mockComic} />);
    const link = screen.getByRole('link', { name: /The Extra's Academy Survival Guide/i });
    expect(link.getAttribute('href')).toBe('/manga/md-extra-survival');
  });

  it('handles wide landscape covers without zoom using object-contain', () => {
    const wideComic: ComicCardItem = {
      ...mockComic,
      coverUrl: 'https://thumbnail.komiku.org/banner.jpg?resize=450,235',
    };
    const { container } = render(<HorizontalComicCard comic={wideComic} />);
    const img = container.querySelector('img');
    expect(img?.className).toContain('object-contain');
  });
});
