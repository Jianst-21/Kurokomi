import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CleanPagination } from '@/components/CleanPagination';

describe('CleanPagination', () => {
  it('renders single page number cleanly without dots or fraction', () => {
    render(
      <CleanPagination
        page={1}
        hasPrev={false}
        hasNext={true}
        onPrev={vi.fn()}
        onNext={vi.fn()}
      />
    );
    expect(screen.getByText('1')).toBeDefined();
    expect(screen.queryByText('1/10')).toBeNull();
  });

  it('disables Prev button when hasPrev is false', () => {
    const onPrev = vi.fn();
    render(
      <CleanPagination
        page={1}
        hasPrev={false}
        hasNext={true}
        onPrev={onPrev}
        onNext={vi.fn()}
      />
    );
    const prevBtn = screen.getByRole('button', { name: /sebelumnya/i });
    expect(prevBtn).toHaveProperty('disabled', true);
  });

  it('calls onNext when Next button is clicked', () => {
    const onNext = vi.fn();
    render(
      <CleanPagination
        page={1}
        hasPrev={false}
        hasNext={true}
        onPrev={vi.fn()}
        onNext={onNext}
      />
    );
    const nextBtn = screen.getByRole('button', { name: /selanjutnya/i });
    fireEvent.click(nextBtn);
    expect(onNext).toHaveBeenCalledOnce();
  });
});
