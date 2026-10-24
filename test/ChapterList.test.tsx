import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ChapterList } from '@/components/ChapterList';
import { ChapterItem } from '@/lib/types';

describe('ChapterList Component', () => {
  const mockChapters: ChapterItem[] = [
    { id: 'c1', chapter: '1', title: 'Awal Perjalanan', publishAt: '2023-01-01', pagesCount: 20 },
    { id: 'c2', chapter: '2', title: 'Musuh Muncul', publishAt: '2023-01-02', pagesCount: 22 },
    { id: 'c10', chapter: '10', title: 'Pertarungan Sengit', publishAt: '2023-01-03', pagesCount: 25 },
  ];

  it('renders chapters and toggles sorting order', () => {
    render(<ChapterList mangaId="m1" chapters={mockChapters} lastReadChapterId="c2" />);

    // By default desc order: 10, 2, 1
    const chapterLinks = screen.getAllByRole('link');
    expect(chapterLinks[0]).toHaveTextContent('Chapter 10');
    expect(chapterLinks[2]).toHaveTextContent('Chapter 1');

    // Click sort button
    const sortBtn = screen.getByRole('button', { name: /urutan/i });
    fireEvent.click(sortBtn);

    // Now asc order: 1, 2, 10
    const reorderedLinks = screen.getAllByRole('link');
    expect(reorderedLinks[0]).toHaveTextContent('Chapter 1');
    expect(reorderedLinks[2]).toHaveTextContent('Chapter 10');
  });

  it('highlights last read chapter', () => {
    render(<ChapterList mangaId="m1" chapters={mockChapters} lastReadChapterId="c2" />);
    expect(screen.getByText(/Terakhir Dibaca/i)).toBeInTheDocument();
  });
});
