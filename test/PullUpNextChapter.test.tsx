import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { PullUpNextChapter } from '@/components/PullUpNextChapter';

describe('PullUpNextChapter Component', () => {
  it('renders completion message when nextChapter is not provided', () => {
    render(
      <PullUpNextChapter
        nextChapter={undefined}
        onTriggerNext={vi.fn()}
      />
    );

    expect(screen.getByText('Kamu telah membaca chapter terbaru!')).toBeInTheDocument();
    expect(screen.queryByTestId('pull-up-progress-ring')).not.toBeInTheDocument();
  });

  it('renders target chapter and circular pull-up indicator when nextChapter exists', () => {
    render(
      <PullUpNextChapter
        nextChapter={{ id: 'ch2', chapter: '2' }}
        onTriggerNext={vi.fn()}
      />
    );

    expect(screen.getByTestId('pull-up-container')).toBeInTheDocument();
    expect(screen.getByTestId('pull-up-progress-ring')).toBeInTheDocument();
    expect(screen.getByText(/Chapter 2/i)).toBeInTheDocument();
  });
});
