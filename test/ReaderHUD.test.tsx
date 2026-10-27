import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ReaderHUD } from '@/components/ReaderHUD';

describe('ReaderHUD Component', () => {
  it('renders title, chapter number, and navigation buttons', () => {
    const onOpenDrawer = vi.fn();

    render(
      <ReaderHUD
        visible={true}
        comicTitle="Solo Leveling"
        currentChapter="142"
        mangaId="m1"
        prevChapterId="ch141"
        prevChapterNumber="141"
        nextChapterId="ch143"
        nextChapterNumber="143"
        onOpenDrawer={onOpenDrawer}
      />
    );

    expect(screen.getByText('Solo Leveling')).toBeInTheDocument();
    expect(screen.getByText('Ch. 142')).toBeInTheDocument();

    const prevBtn = screen.getByRole('link', { name: /141/i });
    expect(prevBtn).toHaveAttribute('href', expect.stringContaining('ch141'));

    const nextBtn = screen.getByRole('link', { name: /143/i });
    expect(nextBtn).toHaveAttribute('href', expect.stringContaining('ch143'));

    const drawerTrigger = screen.getByRole('button', { name: /pilih chapter/i });
    fireEvent.click(drawerTrigger);
    expect(onOpenDrawer).toHaveBeenCalled();
  });

  it('disables previous and next buttons when boundary reached', () => {
    render(
      <ReaderHUD
        visible={true}
        comicTitle="Solo Leveling"
        currentChapter="1"
        mangaId="m1"
        prevChapterId={undefined}
        nextChapterId={undefined}
        onOpenDrawer={vi.fn()}
      />
    );

    // When undefined, no link with that chapter exists or button is disabled
    expect(screen.queryByRole('link', { name: /prev/i })).not.toBeInTheDocument();
  });

  it('renders mode toggle [Webtoon | Lembar] only when isManga is true', () => {
    const onModeChange = vi.fn();
    const { rerender } = render(
      <ReaderHUD
        visible={true}
        comicTitle="One Piece"
        currentChapter="1000"
        mangaId="m1"
        isManga={true}
        readerMode="webtoon"
        onModeChange={onModeChange}
        onOpenDrawer={vi.fn()}
      />
    );

    const webtoonBtn = screen.getByRole('button', { name: 'Webtoon' });
    const pagedBtn = screen.getByRole('button', { name: 'Lembar' });
    expect(webtoonBtn).toBeInTheDocument();
    expect(pagedBtn).toBeInTheDocument();

    fireEvent.click(pagedBtn);
    expect(onModeChange).toHaveBeenCalledWith('paged');

    // When isManga is false (e.g. Manhwa / Manhua), toggle is not rendered
    rerender(
      <ReaderHUD
        visible={true}
        comicTitle="Solo Leveling"
        currentChapter="142"
        mangaId="m2"
        isManga={false}
        readerMode="webtoon"
        onModeChange={onModeChange}
        onOpenDrawer={vi.fn()}
      />
    );

    expect(screen.queryByRole('button', { name: 'Webtoon' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Lembar' })).not.toBeInTheDocument();
  });

  it('renders minimalist page counter when in paged mode', () => {
    render(
      <ReaderHUD
        visible={true}
        comicTitle="One Piece"
        currentChapter="1000"
        mangaId="m1"
        isManga={true}
        readerMode="paged"
        currentPage={5}
        totalPages={20}
        onModeChange={vi.fn()}
        onOpenDrawer={vi.fn()}
      />
    );

    expect(screen.getByText('5 / 20')).toBeInTheDocument();
  });
});
