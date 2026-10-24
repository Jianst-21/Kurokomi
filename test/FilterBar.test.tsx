import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { FilterBar } from '@/components/FilterBar';

describe('FilterBar Component', () => {
  it('renders type filters and triggers onTypeChange', () => {
    const onTypeChange = vi.fn();
    const onColorToggle = vi.fn();
    const onGenreChange = vi.fn();

    render(
      <FilterBar
        activeType="all"
        isColor={false}
        activeGenre=""
        onTypeChange={onTypeChange}
        onColorToggle={onColorToggle}
        onGenreChange={onGenreChange}
      />
    );

    const manhwaButton = screen.getByRole('button', { name: /Manhwa/i });
    expect(manhwaButton).toBeInTheDocument();

    fireEvent.click(manhwaButton);
    expect(onTypeChange).toHaveBeenCalledWith('manhwa');

    const colorButton = screen.getByRole('button', { name: /Berwarna/i });
    fireEvent.click(colorButton);
    expect(onColorToggle).toHaveBeenCalled();
  });
});
