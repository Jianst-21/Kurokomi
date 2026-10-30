# Favorite Update Red Dot Indicator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menampilkan indikator titik merah (*red dot*) pada menu navigasi Favorit (BottomNav & DesktopNavbar) dan pada cover ComicCard ketika ada update chapter baru komik favorit yang belum dibaca.

**Architecture:** Tambahkan utility functions di `lib/storage.ts` untuk memeriksa apakah komik favorit memiliki update chapter yang belum dibaca (`hasComicUpdate` dan `hasAnyFavoriteUpdate`). Integrasikan status ini ke komponen `ComicCard`, `BottomNav`, dan `DesktopNavbar` dengan rendering reaktif terhadap event storage/riwayat baca.

**Tech Stack:** Next.js, React, TypeScript, Tailwind CSS, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-30-favorite-update-indicator-design.md`

## Global Constraints
- Menggunakan local storage keys yang sudah ada: `kurokomi_favorites_v1`, `kurokomi_history_v1`, `kurokomi_read_chapters_v1`.
- Tampilan titik dot merah harus berpenampilan minimalis, halus, dan pas dengan palet tema gelap kurokomi.

## Review Focus
- Komik favorit yang belum pernah dibaca sama sekali (tidak ada di history bacaan) tidak boleh salah mengidentifikasi seluruh chapter sebagai "update baru yang mengganggu", atau harus ditangani secara logis (dianggap ada chapter baru jika difavoritkan).
- Ketika user membuka komik atau membaca chapter terbaru, badge dot merah langsung hilang tanpa harus me-refresh browser.

---

### Task 1: Update Detection Logic di `lib/storage.ts` & Unit Test

**Files:**
- Modify: `lib/storage.ts`
- Test: `test/storage.test.ts`

**Interfaces:**
- Produces:
  - `hasComicUpdate(comic: ComicCardItem): boolean`
  - `hasAnyFavoriteUpdate(): boolean`

- [ ] **Step 1: Write tests for `hasComicUpdate` and `hasAnyFavoriteUpdate` in `test/storage.test.ts`**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement `hasComicUpdate` and `hasAnyFavoriteUpdate` in `lib/storage.ts`**
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Commit changes**

---

### Task 2: Tambahkan Titik Dot Merah di `ComicCard.tsx`

**Files:**
- Modify: `components/ComicCard.tsx`
- Test: `test/ComicCard.test.tsx` (atau `test/horizontal-card.test.tsx` / card test baru)

**Interfaces:**
- Consumes: `hasComicUpdate(comic)` dari `lib/storage.ts`, `isFavorite(comic.id)`
- Produces: Visual red dot indicator di sudut kanan atas cover komik jika komik difavoritkan dan memiliki update baru yang belum dibaca.

- [ ] **Step 1: Write test verifying red dot renders on ComicCard when comic has unread update**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement red dot indicator in `components/ComicCard.tsx`**
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Commit changes**

---

### Task 3: Tambahkan Titik Dot Merah di `BottomNav.tsx` dan `DesktopNavbar.tsx`

**Files:**
- Modify: `components/BottomNav.tsx`
- Modify: `components/DesktopNavbar.tsx`
- Test: `test/DesktopNavbar.test.tsx` and BottomNav tests

**Interfaces:**
- Consumes: `hasAnyFavoriteUpdate()` dari `lib/storage.ts`
- Produces: Badge titik dot merah di samping/atas ikon 'Favorit' pada mobile BottomNav dan desktop DesktopNavbar.

- [ ] **Step 1: Write tests for red dot indicator in BottomNav and DesktopNavbar**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement red dot indicator in `components/BottomNav.tsx` & `components/DesktopNavbar.tsx`**
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Commit changes**

---

### Task 4: Verifikasi Menyeluruh & Testing Lint/Build

**Files:**
- Test: Semua unit test di `test/`
- Command: `npm test` atau `npm run build`

- [ ] **Step 1: Jalankan semua test suite vitest**
- [ ] **Step 2: Verifikasi interaksi ketika chapter dibaca, dot merah hilang**
- [ ] **Step 3: Final commit**
