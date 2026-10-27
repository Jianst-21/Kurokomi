# Desain & Rencana Implementasi Responsif Desktop/Laptop Kurokomi

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mengoptimalkan tampilan dan pengalaman membaca Kurokomi di laptop dan layar desktop (lebar adaptif hingga 1200px, 2 kolom detail komik, top navbar, grid padat) tanpa stiker, minim ikon, dan bebas bahasa slop.

**Architecture:** Menerapkan pendekatan *responsive CSS breakpoints* (Tailwind `md:`, `lg:`) di mana tampilan mobile (< 768px) tetap utuh menggunakan BottomNav, sedangkan tampilan laptop/desktop (≥ 768px) beralih ke Top Navbar, kontainer `max-w-6xl`, grid multi-kolom, dan lebar baca reader optimal.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind CSS v4, Lucide React (ikon esensial saja), Vitest, React Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-28-laptop-desktop-responsive-design.md`

## Global Constraints
- Tidak menggunakan stiker atau ilustrasi pemanis dekoratif.
- Minimalkan ikon: hanya gunakan ikon esensial untuk fungsi penting (pencarian, navigasi kembali, menu chapter). Selebihnya menggunakan teks murni yang jelas.
- Bebas bahasa AI Slop: gunakan Bahasa Indonesia alami, ringkas, dan manusiawi (contoh: "Beranda", "Favorit", "Riwayat", "Cari komik...").
- Tidak merusak performa atau fitur mobile iOS yang sudah dioptimasi sebelumnya.

## Review Focus
1. Tampilan BottomNav tidak boleh bocor muncul di layar desktop (harus `md:hidden`).
2. Kolom pencarian di Top Navbar desktop harus bisa langsung menerima ketikan dan mengarahkan ke `/search?q=...` dengan lancar.
3. Grid komik terbaru di desktop tidak boleh overflow horizontal atau berdesakan.
4. Halaman detail komik di layar desktop harus proporsional (poster sisi kiri tidak gepeng/terpotong, sinopsis dan daftar chapter sisi kanan fleksibel).
5. Pembaca webtoon di laptop tidak boleh melebar hingga 100% layar (harus dibatasi `max-w-2xl` ~672px agar nyaman di mata).

---

### Task 1: Komponen Desktop Navbar & Penyesuaian BottomNav

**Files:**
- Create: `components/DesktopNavbar.tsx`
- Modify: `components/BottomNav.tsx`
- Test: `test/DesktopNavbar.test.tsx`

**Interfaces:**
- Produces: `DesktopNavbar` component (`export function DesktopNavbar()`)
- Consumes: Next.js `usePathname`, `useRouter`, `Link`, Lucide `Search` icon

- [ ] **Step 1: Tulis tes unit failing untuk DesktopNavbar**

```tsx
// test/DesktopNavbar.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { DesktopNavbar } from '@/components/DesktopNavbar';

describe('DesktopNavbar Component', () => {
  it('renders logo and navigation links without stickers', () => {
    render(<DesktopNavbar />);
    expect(screen.getByText('KUROKOMI')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Beranda' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Favorit' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Riwayat' })).toBeInTheDocument();
  });

  it('renders quick search input for desktop', () => {
    render(<DesktopNavbar />);
    const input = screen.getByPlaceholderText(/Cari komik.../i);
    expect(input).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Jalankan tes untuk memastikan gagal (Red)**

Run: `npm test test/DesktopNavbar.test.tsx`
Expected: FAIL (Cannot find module '@/components/DesktopNavbar')

- [ ] **Step 3: Implementasikan `DesktopNavbar.tsx` dan tambahkan `md:hidden` di `BottomNav.tsx`**
  - Buat `components/DesktopNavbar.tsx` dengan header `hidden md:flex sticky top-0 z-40 bg-zinc-950/95 border-b border-zinc-850 px-6 py-3`.
  - Tambahkan navigasi tautan teks: Beranda (`/`), Favorit (`/favorites`), Riwayat (`/history`).
  - Tambahkan input pencarian instan yang men-submit ke `/search?q=...`.
  - Di `components/BottomNav.tsx`, tambahkan class `md:hidden` pada elemen `<nav>`.

- [ ] **Step 4: Jalankan tes untuk memastikan berhasil (Green)**

Run: `npm test test/DesktopNavbar.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/DesktopNavbar.tsx components/BottomNav.tsx test/DesktopNavbar.test.tsx
git commit -m "feat(desktop): add clean DesktopNavbar and hide BottomNav on md screens"
```

---

### Task 2: Tata Letak Lebar Beranda (Home Page Rework)

**Files:**
- Modify: `app/page.tsx`
- Modify: `components/LatestUpdatesSection.tsx`
- Modify: `components/TopComicsSection.tsx`
- Test: `test/HomePageResponsive.test.tsx`

**Interfaces:**
- Produces: Responsive homepage layout with wide 6xl container and multi-column grids
- Consumes: `DesktopNavbar`, `LatestUpdatesSection`, `TopComicsSection`

- [ ] **Step 1: Tulis tes unit untuk verifikasi layout grid responsif**

```tsx
// test/HomePageResponsive.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import HomePage from '@/app/page';

describe('HomePage Desktop Responsiveness', () => {
  it('renders desktop navbar and wide main container classes', () => {
    const { container } = render(<HomePage />);
    const main = container.querySelector('main');
    expect(main).toHaveClass('max-w-6xl');
  });
});
```

- [ ] **Step 2: Jalankan tes untuk memastikan gagal (Red)**

Run: `npm test test/HomePageResponsive.test.tsx`
Expected: FAIL (expected class 'max-w-6xl' but got 'max-w-md')

- [ ] **Step 3: Implementasikan layout responsif di `app/page.tsx`, `LatestUpdatesSection.tsx`, dan `TopComicsSection.tsx`**
  - Di `app/page.tsx`:
    - Pasang `<DesktopNavbar />`.
    - Ubah mobile header menjadi `md:hidden`.
    - Ubah `<main className="flex-1 max-w-md mx-auto w-full px-4 pt-2 flex flex-col gap-6">` menjadi `className="flex-1 max-w-6xl mx-auto w-full px-4 pt-4 flex flex-col gap-8"`.
  - Di `components/LatestUpdatesSection.tsx`:
    - Ubah container daftar komik dari `<div className="flex flex-col gap-2.5">` menjadi `<div className="grid grid-cols-1 md:grid-cols-2 gap-3">`.
  - Di `components/TopComicsSection.tsx`:
    - Ubah grid rekomendasi dari `grid-cols-3 gap-2.5` menjadi `grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3`.

- [ ] **Step 4: Jalankan tes untuk memastikan berhasil (Green)**

Run: `npm test test/HomePageResponsive.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx components/LatestUpdatesSection.tsx components/TopComicsSection.tsx test/HomePageResponsive.test.tsx
git commit -m "feat(desktop): make homepage adapt to wide 6xl grid on laptop screens"
```

---

### Task 3: Tata Letak Responsif Halaman Pencarian & Riwayat/Favorit

**Files:**
- Modify: `app/search/page.tsx`
- Modify: `app/favorites/page.tsx`
- Modify: `app/history/page.tsx`
- Test: `test/SearchAndLibraryDesktop.test.tsx`

**Interfaces:**
- Produces: Wide grid responsive search, favorites, and history pages
- Consumes: `DesktopNavbar`, `ComicCard`, `BottomNav`

- [ ] **Step 1: Tulis tes verifikasi layout lebar pada halaman pencarian dan perpustakaan**

```tsx
// test/SearchAndLibraryDesktop.test.tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import SearchPage from '@/app/search/page';

describe('SearchPage Desktop Layout', () => {
  it('contains max-w-6xl container on desktop', () => {
    const { container } = render(<SearchPage />);
    const main = container.querySelector('main');
    expect(main).toHaveClass('max-w-6xl');
  });
});
```

- [ ] **Step 2: Jalankan tes untuk memastikan gagal (Red)**

Run: `npm test test/SearchAndLibraryDesktop.test.tsx`
Expected: FAIL (missing max-w-6xl)

- [ ] **Step 3: Implementasikan layout responsif di Search, Favorites, dan History**
  - Pasang `DesktopNavbar` di `app/search/page.tsx`, `app/favorites/page.tsx`, dan `app/history/page.tsx`.
  - Mobile header diberi `md:hidden`.
  - Kontainer konten diubah dari `max-w-md` menjadi `max-w-6xl mx-auto w-full px-4`.
  - Grid komik diubah menjadi `grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3`.

- [ ] **Step 4: Jalankan tes untuk memastikan berhasil (Green)**

Run: `npm test test/SearchAndLibraryDesktop.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/search/page.tsx app/favorites/page.tsx app/history/page.tsx test/SearchAndLibraryDesktop.test.tsx
git commit -m "feat(desktop): adapt search, favorites, and history pages to wide screen"
```

---

### Task 4: Tata Letak 2-Kolom Halaman Detail Komik (`app/manga/[id]`)

**Files:**
- Modify: `app/manga/[id]/page.tsx`
- Test: `test/MangaDetailDesktop.test.tsx`

**Interfaces:**
- Produces: 2-column layout for manga details on laptop (left: cover & actions, right: metadata, synopsis, & chapter grid)
- Consumes: `DesktopNavbar`, `ChapterList`

- [ ] **Step 1: Tulis tes unit untuk verifikasi layout 2 kolom**

```tsx
// test/MangaDetailDesktop.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import MangaDetailPage from '@/app/manga/[id]/page';

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'solo-leveling' }),
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}));

describe('MangaDetailPage Desktop Layout', () => {
  it('renders desktop container with 2-column grid classes', () => {
    const { container } = render(<MangaDetailPage />);
    const main = container.querySelector('main');
    expect(main).toHaveClass('max-w-6xl');
  });
});
```

- [ ] **Step 2: Jalankan tes untuk memastikan gagal (Red)**

Run: `npm test test/MangaDetailDesktop.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implementasikan tata letak 2 kolom desktop di `app/manga/[id]/page.tsx`**
  - Sertakan `DesktopNavbar`.
  - Di laptop (`md:`):
    - Kontainer utama: `max-w-6xl mx-auto px-4 py-6`.
    - Grid: `grid grid-cols-1 md:grid-cols-[280px_1fr] gap-8`.
    - Kolom kiri: Cover poster besar (`w-full aspect-[3/4] rounded-2xl`), tombol "Mulai Baca", tombol "Favorit", info status & tipe.
    - Kolom kanan: Judul komik besar, tab bahasa, sinopsis rapi, daftar chapter yang tertata luas.

- [ ] **Step 4: Jalankan tes untuk memastikan berhasil (Green)**

Run: `npm test test/MangaDetailDesktop.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/manga/[id]/page.tsx test/MangaDetailDesktop.test.tsx
git commit -m "feat(desktop): implement 2-column desktop layout on manga detail page"
```

---

### Task 5: Optimasi Reader di Laptop (`app/chapter/[id]` & `ReaderHUD`)

**Files:**
- Modify: `app/chapter/[id]/page.tsx`
- Modify: `components/ReaderHUD.tsx`
- Test: `test/ReaderDesktop.test.tsx`

**Interfaces:**
- Produces: Optimal reading width constraint (`max-w-2xl` ~672px) on desktop to avoid image stretching, wider HUD container
- Consumes: `ReaderHUD`, `ReaderImage`

- [ ] **Step 1: Tulis tes unit untuk batas lebar reader webtoon**

```tsx
// test/ReaderDesktop.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import ReaderPage from '@/app/chapter/[id]/page';

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'test-chap' }),
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}));

describe('ReaderPage Desktop Constraints', () => {
  it('applies comfortable max-w-2xl constraint in webtoon mode', () => {
    const { container } = render(<ReaderPage />);
    // Main container has max-w-2xl
    const main = container.querySelector('main');
    expect(main).toHaveClass('max-w-2xl');
  });
});
```

- [ ] **Step 2: Jalankan tes untuk memastikan gagal (Red)**

Run: `npm test test/ReaderDesktop.test.tsx`
Expected: FAIL (was max-w-lg)

- [ ] **Step 3: Implementasikan batas lebar nyaman di `app/chapter/[id]/page.tsx` dan `ReaderHUD.tsx`**
  - Di `app/chapter/[id]/page.tsx`:
    - Ubah `className="reader-container flex-1 max-w-lg mx-auto ..."` menjadi `className="reader-container flex-1 max-w-2xl mx-auto w-full flex flex-col items-center bg-black cursor-pointer pt-0"`.
  - Di `components/ReaderHUD.tsx`:
    - Ubah top header dan footer dari `max-w-md mx-auto` menjadi `max-w-3xl mx-auto` agar kontrol navigasi di laptop lebih leluasa dan proporsional.

- [ ] **Step 4: Jalankan tes untuk memastikan berhasil (Green)**

Run: `npm test test/ReaderDesktop.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/chapter/[id]/page.tsx components/ReaderHUD.tsx test/ReaderDesktop.test.tsx
git commit -m "feat(desktop): optimize webtoon reading width and HUD controls for laptop"
```

---

### Task 6: Verifikasi Akhir Seluruh Test Suite & Build

**Files:**
- All modified and test files

- [ ] **Step 1: Jalankan seluruh test suite Vitest**

Run: `npm test`
Expected: All test files pass with 0 failures

- [ ] **Step 2: Jalankan Next.js Production Build**

Run: `npm run build`
Expected: Exit 0 (Compiled successfully)
