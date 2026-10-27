import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { DesktopNavbar } from '@/components/DesktopNavbar';
import { BottomNav } from '@/components/BottomNav';

const mockPush = vi.fn();
let mockPathname = '/';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => mockPathname,
}));

describe('DesktopNavbar Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = '/';
  });

  it('renders logo and navigation links without stickers', () => {
    render(<DesktopNavbar />);
    expect(screen.getByText('KUROKOMI')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Beranda/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Favorit/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Riwayat/i })).toBeInTheDocument();
  });

  it('has responsive class hidden md:flex', () => {
    const { container } = render(<DesktopNavbar />);
    const header = container.querySelector('header');
    expect(header).toBeInTheDocument();
    expect(header?.className).toContain('hidden');
    expect(header?.className).toContain('md:flex');
  });

  it('renders quick search input for desktop and navigates on submit', () => {
    render(<DesktopNavbar />);
    const input = screen.getByPlaceholderText(/Cari komik.../i);
    expect(input).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'solo leveling' } });
    fireEvent.submit(input.closest('form')!);

    expect(mockPush).toHaveBeenCalledWith('/search?q=solo%20leveling');
  });

  it('does not submit when search input is empty or whitespace', () => {
    render(<DesktopNavbar />);
    const input = screen.getByPlaceholderText(/Cari komik.../i);
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.submit(input.closest('form')!);

    expect(mockPush).not.toHaveBeenCalled();
  });

  it('highlights the active navigation link based on pathname', () => {
    mockPathname = '/favorites';
    render(<DesktopNavbar />);
    const favLink = screen.getByRole('link', { name: /Favorit/i });
    expect(favLink.className).toContain('text-blue-500');
  });
});

describe('BottomNav Component Responsive', () => {
  it('includes md:hidden so it is hidden on desktop screens', () => {
    const { container } = render(<BottomNav />);
    const nav = container.querySelector('nav');
    expect(nav).toBeInTheDocument();
    expect(nav?.className).toContain('md:hidden');
  });
});
