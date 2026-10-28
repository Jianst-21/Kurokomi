# Pull-Up to Next Chapter (Overscroll / Drag Transition) Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mengganti tombol klik manual next chapter dengan interaksi "Pull Up / Scroll ke Atas saat Mentok Bawah" yang menampilkan animasi circular loading progress. Jika tarikan mencapai 100%, otomatis berpindah ke chapter berikutnya; jika dilepas sebelum penuh, animasi reset/batal dan tidak berpindah.

**Architecture:**
- Buat komponen terisolasi `components/PullUpNextChapter.tsx`:
  - Menerima `nextChapter?: { id: string; chapter: string }`, `mangaId?: string`, `onTriggerNext: () => void`.
  - Mengelola visual SVG circular progress ring (0 s/d 100%).
  - Menampilkan instruksi dinamis: "Tarik ke atas untuk Ch. X" (< 100%) dan "Lepas untuk membaca Ch. X" (== 100%).
  - Support **Mobile Touch (Android & iPhone Safari)** via `onTouchStart`, `onTouchMove`, `onTouchEnd` saat scroll mentok bawah (`window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 10`).
  - Support **Desktop Mouse Wheel / Touchpad (Chrome, Edge, Safari macOS, Firefox)** via `wheel` event saat mentok bawah dengan accumulator jarak overscroll yang secara bertahap reset jika scrolling berhenti.
  - Hapus tombol klik manual lama ("Lanjut ke Chapter X"), ganti dengan `PullUpNextChapter`.
  - Jika tidak ada chapter berikutnya, tetap tampilkan pesan "Kamu telah membaca chapter terbaru!".

**Cross-Platform Constraints (Android, iPhone, Safari, Chrome):**
- **iOS Safari:** iOS memiliki elastisitas overscroll (*rubber-banding*). Pastikan event listener tidak conflict dengan bounce effect Safari dengan menggunakan threshold jarak tarikan yang terkalibrasi (~70px - 90px pull distance).
- **Desktop (Touchpad/Mouse Wheel):** Deteksi `e.deltaY > 0` saat `isAtBottom` tercapai, kumpulkan `pullDistance`, jalankan timeout reset halus jika user tidak lanjut scroll.
- **Android Touch:** Bekerja mulus tanpa memblokir scroll normal di atas halaman.

**Tech Stack:** Next.js (App Router), React, TypeScript, Tailwind CSS, Lucide React, Vitest.

---

### Task 1: Create `PullUpNextChapter` Component and Unit Tests

**Files:**
- Create: `components/PullUpNextChapter.tsx`
- Create: `test/PullUpNextChapter.test.tsx`

**Interfaces:**
- Produces: `PullUpNextChapter({ nextChapter, mangaId, onTriggerNext })`

- [ ] **Step 1: Write unit test in `test/PullUpNextChapter.test.tsx`**
Test cases:
1. Render empty / latest message when `nextChapter` is null.
2. Render circular loader and chapter target info when `nextChapter` exists.
3. Call `onTriggerNext` when pull progress reaches 100%.

- [ ] **Step 2: Run test to verify it fails**
Run: `npm test test/PullUpNextChapter.test.tsx`

- [ ] **Step 3: Implement `PullUpNextChapter.tsx`**
Implement touch drag & wheel detection with circular SVG progress bar.

- [ ] **Step 4: Run test to verify it passes**
Run: `npm test test/PullUpNextChapter.test.tsx`

---

### Task 2: Integrate `PullUpNextChapter` in `app/chapter/[id]/page.tsx`

**Files:**
- Modify: `app/chapter/[id]/page.tsx`

- [ ] **Step 1: Replace old button section with `PullUpNextChapter`**
Remove old Link button and insert `<PullUpNextChapter nextChapter={nextChapter} mangaId={mangaId} onTriggerNext={...} />`.

- [ ] **Step 2: Run all tests to verify green status**
Run: `npm test`
Expected: Seluruh test pass.
