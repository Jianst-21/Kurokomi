# Home Page Rework (2-Section Dual Layout) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework halaman Home Kurokomi menjadi 2 section utama (Section 1: Update Komik Terbaru dengan horizontal scroll card full-width & pagination bersih 1-angka, dan Section 2: Top 15 Rekomendasi Populer dengan grid 3-kolom & pagination) dengan isolasi state dan render yang optimal.

**Architecture:** Memisahkan data fetching dan state logic menjadi modul-modul independen (`fetchLatestComicsByType`, `fetchTopComics`), membuat reusable visual components (`HorizontalComicCard`, `CleanPagination`), membungkus masing-masing seksi ke dalam komponen terisolasi (`LatestUpdatesSection`, `TopComicsSection`), lalu merakitnya secara clean di `app/page.tsx`.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS 4, Vitest, Lucide React.

**Spec:** `docs/superpowers/specs/2026-10-25-home-page-rework-design.md`

## Global Constraints
- Bahasa antarmuka: Bahasa Indonesia.
- Tema: Dark mode zinc-950, aksen biru dan amber, tanpa border tajam header/navigasi bawah.
- Section 1: 10 kartu per halaman, scroll horizontal 1-per-1 snap card, pilihan tipe Manhwa / Manga / Manhua, pagination 1 angka bersih tanpa titik dan tanpa pecahan.
- Section 2: Top 15 kartu per halaman (grid 3 kolom), filter kategori (Semua, Manhwa, Manga, Manhua), pagination 1 angka bersih.
- Optimasi rendering: Render terisolasi per section, tidak ada re-render lintas section.

## Review Focus
1. Tipe data `ComicCardItem` mendukung field `genres?: string[]` untuk card horizontal.
2. Navigasi pagination tidak boleh tembus angka < 1 saat tombol Prev ditekan di halaman 1.
3. Pergantian tab (Manga/Manhwa/Manhua) di Section 1 harus mereset halaman kembali ke 1.
4. Pergantian filter di Section 2 harus mereset halaman kembali ke 1.
5. Tombol "Baca" pada kartu horizontal langsung menuju halaman detail komik `/manga/[id]`.

---

### Task 1: Extend Type & API Query Functions for Latest & Top Comics

**Files:**
- Modify: `lib/types.ts`
- Modify: `lib/mangadex.ts`
- Test: `test/home-data.test.ts`

**Interfaces:**
- Produces:
  - `fetchLatestComicsByType(type: ComicType, limit?: number, offset?: number): Promise<ComicCardItem[]>`
  - `fetchTopComics(type: ComicType, limit?: number, offset?: number): Promise<ComicCardItem[]>`
  - `ComicCardItem` with optional `genres?: string[]`

- [ ] **Step 1: Write the failing test for `fetchLatestComicsByType` and `fetchTopComics`**

Create `test/home-data.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { buildSearchQueryUrl } from '@/lib/mangadex';

describe('Home Data Queries', () => {
  it('builds query with order[latestUploadedChapter]=desc for latest updates', () => {
    const url = buildSearchQueryUrl({
      type: 'manhwa',
      limit: 10,
      offset: 0,
      order: { latestUploadedChapter: 'desc' },
    });
    expect(url).toContain('order%5BlatestUploadedChapter%5D=desc');
    expect(url).toContain('originalLanguage%5B%5D=ko');
    expect(url).toContain('limit=10');
  });

  it('builds query with order[followedCount]=desc for top recommendations', () => {
    const url = buildSearchQueryUrl({
      type: 'manga',
      limit: 15,
      offset: 0,
      order: { followedCount: 'desc' },
    });
    expect(url).toContain('order%5BfollowedCount%5D=desc');
    expect(url).toContain('originalLanguage%5B%5D=ja');
    expect(url).toContain('limit=15');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/home-data.test.ts`
Expected: FAIL (or missing properties)

- [ ] **Step 3: Update `lib/types.ts` and `lib/mangadex.ts`**

In `lib/types.ts`:
Add `genres?: string[];` to `ComicCardItem`.
In `lib/mangadex.ts`:
Add `order?: Record<string, 'asc' | 'desc'>;` support in `FilterOptions` and `buildSearchQueryUrl`, and implement `fetchLatestComicsByType` and `fetchTopComics`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/home-data.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/types.ts lib/mangadex.ts test/home-data.test.ts
git commit -m "feat: add fetchLatestComicsByType and fetchTopComics with order support"
```

---

### Task 2: Create CleanPagination Component

**Files:**
- Create: `components/CleanPagination.tsx`
- Test: `test/CleanPagination.test.tsx`

**Interfaces:**
- Produces:
  - `<CleanPagination page={number} hasPrev={boolean} hasNext={boolean} onPrev={() => void} onNext={() => void} activeColorClass?: string />`

- [ ] **Step 1: Write the failing test for `CleanPagination`**

Create `test/CleanPagination.test.tsx`:
```tsx
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CleanPagination } from '@/components/CleanPagination';

describe('CleanPagination', () => {
  it('renders single page number cleanly without dots or fraction', () => {
    render(<CleanPagination page={1} hasPrev={false} hasNext={true} onPrev={vi.fn()} onNext={vi.fn()} />);
    expect(screen.getByText('1')).toBeDefined();
    expect(screen.queryByText('1/10')).toBeNull();
  });

  it('disables Prev button when hasPrev is false', () => {
    const onPrev = vi.fn();
    render(<CleanPagination page={1} hasPrev={false} hasNext={true} onPrev={onPrev} onNext={vi.fn()} />);
    const prevBtn = screen.getByRole('button', { name: /sebelumnya/i });
    expect(prevBtn).toHaveProperty('disabled', true);
  });

  it('calls onNext when Next button is clicked', () => {
    const onNext = vi.fn();
    render(<CleanPagination page={1} hasPrev={false} hasNext={true} onPrev={vi.fn()} onNext={onNext} />);
    const nextBtn = screen.getByRole('button', { name: /selanjutnya/i });
    fireEvent.click(nextBtn);
    expect(onNext).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/CleanPagination.test.tsx`
Expected: FAIL (CleanPagination not found)

- [ ] **Step 3: Implement `CleanPagination` in `components/CleanPagination.tsx`**

Build clean pagination with Prev and Next buttons, and a clean single page number box in the center.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/CleanPagination.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/CleanPagination.tsx test/CleanPagination.test.tsx
git commit -m "feat: add CleanPagination component with clean single page number badge"
```

---

### Task 3: Create HorizontalComicCard Component

**Files:**
- Create: `components/HorizontalComicCard.tsx`
- Test: `test/HorizontalComicCard.test.tsx`

**Interfaces:**
- Produces:
  - `<HorizontalComicCard comic={ComicCardItem} />`

- [ ] **Step 1: Write the failing test for `HorizontalComicCard`**

Create `test/HorizontalComicCard.test.tsx`:
```tsx
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HorizontalComicCard } from '@/components/HorizontalComicCard';
import { ComicCardItem } from '@/lib/types';

describe('HorizontalComicCard', () => {
  const mockComic: ComicCardItem = {
    id: 'md-extra-survival',
    title: "The Extra's Academy Survival Guide",
    altTitle: 'Surviving The Academy',
    coverUrl: 'http://img.jpg',
    type: 'manhwa',
    latestChapter: 'Ch. 129',
    genres: ['Action', 'Fantasy', 'Magic'],
  };

  it('renders cover, title, alt title, latest chapter and genres', () => {
    render(<HorizontalComicCard comic={mockComic} />);
    expect(screen.getByText("The Extra's Academy Survival Guide")).toBeDefined();
    expect(screen.getByText(/Surviving The Academy/)).toBeDefined();
    expect(screen.getByText('Ch. 129')).toBeDefined();
    expect(screen.getByText('Action')).toBeDefined();
    expect(screen.getByText('Baca')).toBeDefined();
  });

  it('links to /manga/[id]', () => {
    render(<HorizontalComicCard comic={mockComic} />);
    const link = screen.getByRole('link', { name: /The Extra's Academy Survival Guide/i });
    expect(link.getAttribute('href')).toBe('/manga/md-extra-survival');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/HorizontalComicCard.test.tsx`
Expected: FAIL (HorizontalComicCard not found)

- [ ] **Step 3: Implement `HorizontalComicCard` in `components/HorizontalComicCard.tsx`**

Implement full-width snap card with left cover poster, type badge, and right information panel with direct link to `/manga/[id]`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/HorizontalComicCard.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/HorizontalComicCard.tsx test/HorizontalComicCard.test.tsx
git commit -m "feat: add HorizontalComicCard component for section 1"
```

---

### Task 4: Implement LatestUpdatesSection Component

**Files:**
- Create: `components/LatestUpdatesSection.tsx`
- Test: `test/LatestUpdatesSection.test.tsx`

**Interfaces:**
- Produces:
  - `<LatestUpdatesSection />` (self-contained with 10 cards per page, horizontal scroll, 3 category tabs, clean pagination)

- [ ] **Step 1: Write the failing test for `LatestUpdatesSection`**

Create `test/LatestUpdatesSection.test.tsx`:
```tsx
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { LatestUpdatesSection } from '@/components/LatestUpdatesSection';
import * as md from '@/lib/mangadex';

describe('LatestUpdatesSection', () => {
  it('renders Manhwa, Manga, and Manhua tabs', async () => {
    vi.spyOn(md, 'fetchLatestComicsByType').mockResolvedValue([]);
    render(<LatestUpdatesSection />);
    expect(screen.getByRole('button', { name: /manhwa/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /manga/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /manhua/i })).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/LatestUpdatesSection.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement `LatestUpdatesSection` in `components/LatestUpdatesSection.tsx`**

Include:
- Local state: `activeType` ('manhwa' | 'manga' | 'manhua'), `page`, `comics`, `isLoading`.
- Smooth horizontal snap scroll container with `snap-x mandatory` and `no-scrollbar`.
- CleanPagination integration.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/LatestUpdatesSection.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/LatestUpdatesSection.tsx test/LatestUpdatesSection.test.tsx
git commit -m "feat: implement LatestUpdatesSection with horizontal snap scroll"
```

---

### Task 5: Implement TopComicsSection Component

**Files:**
- Create: `components/TopComicsSection.tsx`
- Test: `test/TopComicsSection.test.tsx`

**Interfaces:**
- Produces:
  - `<TopComicsSection />` (self-contained with Top 15 comics in 3-column grid, category filters, and clean pagination)

- [ ] **Step 1: Write the failing test for `TopComicsSection`**

Create `test/TopComicsSection.test.tsx`:
```tsx
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TopComicsSection } from '@/components/TopComicsSection';
import * as md from '@/lib/mangadex';

describe('TopComicsSection', () => {
  it('renders category filter buttons', async () => {
    vi.spyOn(md, 'fetchTopComics').mockResolvedValue([]);
    render(<TopComicsSection />);
    expect(screen.getByRole('button', { name: /semua top/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /top manhwa/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /top manga/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /top manhua/i })).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/TopComicsSection.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement `TopComicsSection` in `components/TopComicsSection.tsx`**

Include:
- Local state: `category` ('all' | 'manhwa' | 'manga' | 'manhua'), `page`, `comics`, `isLoading`.
- Grid 3 kolom with rank badge (#1, #2, etc.) based on `(page - 1) * 15 + index + 1`.
- CleanPagination integration.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/TopComicsSection.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/TopComicsSection.tsx test/TopComicsSection.test.tsx
git commit -m "feat: implement TopComicsSection with 3-column top 15 grid"
```

---

### Task 6: Integrate Reworked Sections into `app/page.tsx` & Verification

**Files:**
- Modify: `app/page.tsx`
- Test: All tests + build

- [ ] **Step 1: Update `app/page.tsx`**

Integrate `LatestUpdatesSection` and `TopComicsSection` into `app/page.tsx`. Keep the header seamless (without border) and `BottomNav`.

- [ ] **Step 2: Run all tests to verify**

Run: `npm test`
Expected: All tests pass (>= 35 tests).

- [ ] **Step 3: Run production build**

Run: `npm run build`
Expected: Next.js build succeeds with static & dynamic routes intact.

- [ ] **Step 4: Commit and Push**

```bash
git add app/page.tsx
git commit -m "feat: integrate reworked home page with latest updates and top 15 recommendations"
git push origin main
```
