import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ReaderImage } from '@/components/ReaderImage';

describe('ReaderImage retry functionality', () => {
  it('renders single reload button by default on error', () => {
    render(
      <ReaderImage
        src="https://example.com/broken.jpg"
        pageIndex={0}
      />
    );

    const img = screen.getByRole('img');
    fireEvent.error(img); // first fallback proxy
    fireEvent.error(screen.getByRole('img')); // error state triggered

    expect(screen.getByText('Gagal memuat halaman 1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /muat ulang/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /muat ulang semua/i })).not.toBeInTheDocument();
  });

  it('renders "Muat Ulang Semua" button on the top error card when onRetryAll is provided and isTopError is true', () => {
    const handleRetryAll = vi.fn();
    render(
      <ReaderImage
        src="https://example.com/broken.jpg"
        pageIndex={0}
        isTopError={true}
        onRetryAll={handleRetryAll}
      />
    );

    const img = screen.getByRole('img');
    fireEvent.error(img);
    fireEvent.error(screen.getByRole('img'));

    const reloadAllBtn = screen.getByRole('button', { name: /muat ulang semua/i });
    expect(reloadAllBtn).toBeInTheDocument();

    fireEvent.click(reloadAllBtn);
    expect(handleRetryAll).toHaveBeenCalledTimes(1);
  });

  it('triggers auto-recovery when window becomes visible and image is incomplete', () => {
    const { container } = render(
      <ReaderImage
        src="https://example.com/hanging.jpg"
        pageIndex={0}
      />
    );

    const img = container.querySelector('img') as HTMLImageElement;
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('data-retry-key', '0');

    // Simulate incomplete image
    Object.defineProperty(img, 'complete', { value: false, configurable: true });
    Object.defineProperty(img, 'naturalWidth', { value: 0, configurable: true });

    // Trigger visibilitychange to visible
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    fireEvent(document, new Event('visibilitychange'));

    // Should increment retry key to re-mount and reconnect socket
    const newImg = container.querySelector('img') as HTMLImageElement;
    expect(newImg).toHaveAttribute('data-retry-key', '1');
  });
});
