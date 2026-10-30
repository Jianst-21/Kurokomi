import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { HorizontalComicCard } from '../components/HorizontalComicCard';
import { ComicCardItem } from '../lib/types';

describe('HorizontalComicCard Ambient Tint and Heart Icon', () => {
  it('renders ambient tint border style based on comic source and favorite heart icon', () => {
    // Mock localStorage favorite
    const comic: ComicCardItem = {
      id: 'komiku--solo-leveling',
      title: 'Solo Leveling',
      coverUrl: '',
      type: 'manhwa',
      latestChapter: 'Ch. 179',
      updatedAt: '5 menit lalu',
      source: 'komiku',
    };

    localStorage.setItem('kurokomi_favorites_v1', JSON.stringify([comic]));

    const { container } = render(<HorizontalComicCard comic={comic} />);

    // Favorite heart icon check
    expect(screen.getByLabelText(/favorit/i)).toBeDefined();

    // Check ambient border styling for komiku
    const linkEl = container.querySelector('a');
    expect(linkEl?.className).toContain('border-amber-');
  });

  it('renders red dot update badge on favorite heart icon when comic has unread update', () => {
    const comic: ComicCardItem = {
      id: 'komiku--tower-of-god',
      title: 'Tower of God',
      coverUrl: '',
      type: 'manhwa',
      latestChapter: 'Ch. 600',
      latestChapterId: 'ch-600',
    };

    localStorage.setItem('kurokomi_favorites_v1', JSON.stringify([comic]));
    render(<HorizontalComicCard comic={comic} />);

    expect(screen.getByLabelText('Update baru')).toBeDefined();
  });
});
