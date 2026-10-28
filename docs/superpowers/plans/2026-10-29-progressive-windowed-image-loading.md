# Progressive 2-Image Windowed Lazy Loading Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mengimplementasikan progressive windowed lazy loading gambar chapter (hanya load gambar terlihat + 2 gambar di depan/depan buffer) dengan aman di Android, iOS Safari, dan Desktop, mencegah layout shift dan network congestion.

**Architecture:**
- Di Webtoon reader mode (`components/ReaderImage.tsx`):
  - Tambahkan prop `shouldLoad?: boolean` (default: true jika paged mode atau tidak ditentukan).
  - Ketika `shouldLoad` adalah `false`: Jangan set `src` pada tag `img` (atau render placeholder/skeleton aspect-ratio yang menjaga kestabilan tinggi scroll).
  - Di `app/chapter/[id]/page.tsx`, kelola status `maxVisibleIndex` (indeks gambar tertinggi yang sudah terdeteksi masuk viewport atau dilewati) menggunakan `IntersectionObserver` efisien (dengan fallback scroll position jika observer tidak didukung).
  - Rule: Gambar dengan index `idx <= Math.max(1, maxVisibleIndex + 2)` akan di-flag `shouldLoad = true`.
  - Sekali suatu gambar di-flag `shouldLoad = true`, gambar tersebut **tetap di-load/dipertahankan di DOM (tidak di-unmount)** agar saat pembaca scroll balik ke atas, gambarnya tidak perlu diunduh ulang (menghindari flickering dan bug layout shift di Safari iOS).
  - Di Paged mode (`effectiveMode === 'paged'`): Gambar aktif (`currentPageIndex`) dan 2 gambar berikutnya (`currentPageIndex + 1`, `currentPageIndex + 2`) otomatis di-preload di background, sehingga saat tombol next ditekan halaman berikutnya instan terbuka.

**Cross-Platform Considerations:**
- **iOS Safari / iPhone:** Menghindari layout shift dengan mempertahankan `min-h-[50vh]` atau aspect ratio placeholder, dan sekali gambar dimuat jangan di-unload agar tidak terjadi lonjakan scroll position khas WebKit.
- **Android Chrome:** IntersectionObserver bekerja mulus dengan threshold yang ringan.
- **Desktop:** Viewport lebih tinggi, buffer + 2 (dan initial 2-3 gambar) langsung aktif dengan bandwidth optimal tanpa membuat 30 gambar bersaing bersamaan.

**Tech Stack:** Next.js (App Router), React, TypeScript, Tailwind CSS, IntersectionObserver API, Vitest.

---

### Task 1: Update `ReaderImage` to support `shouldLoad` & Skeleton Placeholder

**Files:**
- Modify: `components/ReaderImage.tsx`
- Modify: `test/ReaderImage.test.tsx`

**Interfaces:**
- Consumes: `shouldLoad?: boolean` prop in `ReaderImageProps` (default: `true`).
- Produces: Efficient placeholder skeleton when `shouldLoad === false` that maintains height without network request.

- [ ] **Step 1: Write failing test in `test/ReaderImage.test.tsx`**
Tambah test: jika `shouldLoad={false}`, elemen `img` tidak memuat URL asli atau menampilkan placeholder loading/skeleton tanpa request image.

- [ ] **Step 2: Run test to verify it fails**
Run: `npm test test/ReaderImage.test.tsx`

- [ ] **Step 3: Implement `shouldLoad` logic in `ReaderImage.tsx`**
Ketika `shouldLoad === false`:
Render placeholder dengan min-height yang konsisten dan subtle pulse animation khas Kurokomi agar layout tidak jump/shift.

- [ ] **Step 4: Run test to verify it passes**
Run: `npm test test/ReaderImage.test.tsx`

---

### Task 2: Implement Windowed Visibility Tracker in `app/chapter/[id]/page.tsx`

**Files:**
- Modify: `app/chapter/[id]/page.tsx`
- Modify: `test/ReaderDesktop.test.tsx` (or new reader test)

**Interfaces:**
- Consumes: `ReaderImage` with `shouldLoad`.

- [ ] **Step 1: Implement progressive window calculation**
Hitung gambar yang boleh di-load:
- Awalnya gambar 0 dan 1 (2 gambar pertama) langsung aktif.
- Observer mendeteksi elemen gambar saat masuk ke viewport (dengan margin `rootMargin: '200px 0px'`).
- Saat elemen index $N$ terlihat, set `maxLoadedIndex = Math.max(maxLoadedIndex, N + 2)`.
- Prop `shouldLoad = idx <= maxLoadedIndex`.

- [ ] **Step 2: Paged Mode Preload optimization**
Di Paged mode: Preload halaman `currentPageIndex + 1` dan `currentPageIndex + 2` secara silent (background prefetch atau hidden render) agar pergantian halaman instan tanpa menunggu.

- [ ] **Step 3: Run all unit tests**
Run: `npm test`
Expected: Seluruh test pass.
