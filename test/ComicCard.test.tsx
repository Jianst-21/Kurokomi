import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ComicCard } from '@/components/ComicCard';
import { ComicCardItem } from '@/lib/types';
import { toggleFavorite } from '@/lib/storage';

describe('ComicCard Red Dot Update Indicator', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders a red dot update badge when comic is favorite and has unread update', () => {
    const comic: ComicCardItem = {
      id: 'manga-123',
      title: 'Chainsaw Man',
      coverUrl: 'https://example.com/csm.jpg',
      type: 'manga',
      latestChapter: 'Ch. 160',
      latestChapterId: 'ch-160',
    };

    // Before favoriting: No red dot
    const { unmount } = render(<ComicCard comic={comic} />);
    expect(screen.queryByLabelText('Update baru')).toBeNull();
    unmount();

    // After favoriting: Has red dot
    toggleFavorite(comic);
    render(<ComicCard comic={comic} />);
    const dot = screen.getByLabelText('Update baru');
    expect(dot).toBeDefined();
  });
});
