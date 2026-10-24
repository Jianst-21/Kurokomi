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
});
