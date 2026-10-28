# Reader Scroll-to-Top Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menambahkan tombol floating "Scroll to Top" (icon-only, tanpa teks) di ReaderHUD yang tersinkronisasi dengan status visibilitas HUD (muncul saat HUD tampil saat tap tengah layar, dan tersembunyi saat di-scroll atau tap tengah ditutup).

**Architecture:** 
- Tambahkan prop opsional atau handler `onScrollToTop` pada `ReaderHUD`.
- Tampilkan tombol floating icon-only (menggunakan icon `ArrowUp` dari `lucide-react`) dengan styling modern/glassmorphic konsisten di ReaderHUD. Posisi diletakkan di atas bottom navigation bar (misalnya di pojok kanan bawah container HUD atau floating action yang rapi).
- Saat tombol ditekan, eksekusi `window.scrollTo({ top: 0, behavior: 'smooth' })`. Pada mode `paged`, juga reset atau arahkan `currentPageIndex` ke `0`.
- Karena tombol diletakkan di dalam container/tree HUD yang dikontrol oleh state `visible` (dengan kelas animasi opacity dan pointer-events), tombol otomatis muncul saat layar tengah di-klik dan tersembunyi saat di-scroll atau HUD ditutup.

**Tech Stack:** Next.js (App Router), React, TypeScript, Tailwind CSS, Lucide React, Vitest, React Testing Library.

**Spec:** Permintaan pengguna: tombol hanya icon (tanpa teks) untuk langsung ke atas pada reader chapter, tersembunyi saat di-scroll atau saat ditutup, dan tampil saat ditekan tengahnya saja.

## Global Constraints
- Ikon saja tanpa teks label visual (`aria-label="Kembali ke atas"` untuk aksesibilitas).
- Tersembunyi saat di-scroll atau HUD hidden (`visible === false`).
- Smooth scrolling ke posisi `top: 0`.

## Review Focus
- Memastikan `onClick` tombol tidak melakukan propagasi yang menutup/membuka HUD secara liar jika ada nested handler.
- Memastikan tombol dapat diakses (accessible label) dan tetap terlihat jelas di tema gelap (zinc-950/zinc-900).
- Memastikan semua unit test yang ada tetap lulus.

---

### Task 1: Update `ReaderHUD` Component and Tests

**Files:**
- Modify: `components/ReaderHUD.tsx`
- Modify: `test/ReaderHUD.test.tsx`

**Interfaces:**
- Consumes: `onScrollToTop?: () => void` in `ReaderHUDProps`.
- Produces: Floating icon-only button with `aria-label="Kembali ke atas"` inside `ReaderHUD`.

- [ ] **Step 1: Write unit tests in `test/ReaderHUD.test.tsx`**
Tambahkan test case yang memverifikasi bahwa:
1. Tombol dengan `aria-label="Kembali ke atas"` dirender di `ReaderHUD`.
2. Saat tombol diklik, callback `onScrollToTop` dipanggil.
3. Tombol tidak memiliki label teks visual (hanya ikon).

- [ ] **Step 2: Jalankan test untuk memverifikasi kegagalan**
Run: `npm test test/ReaderHUD.test.tsx`
Expected: FAIL karena tombol scroll to top belum ada.

- [ ] **Step 3: Implementasi tombol Scroll to Top di `components/ReaderHUD.tsx`**
1. Import `ArrowUp` dari `lucide-react`.
2. Tambahkan `onScrollToTop?: () => void` ke `ReaderHUDProps`.
3. Tambahkan tombol bulat floating icon-only tepat di atas bottom-bar atau di sisi kanan dalam kontrol bottom bar HUD dengan styling Tailwind:
   ```tsx
   <button
     type="button"
     onClick={(e) => {
       e.stopPropagation();
       onScrollToTop?.();
     }}
     aria-label="Kembali ke atas"
     className="fixed right-4 bottom-20 z-40 p-2.5 rounded-full bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/80 shadow-lg backdrop-blur-md transition-all active:scale-95 hover:text-white"
   >
     <ArrowUp className="w-5 h-5" />
   </button>
   ```
   (Tombol diatur transisi opacity & pointer-events mengikuti prop `visible`).

- [ ] **Step 4: Jalankan test untuk memastikan lulus**
Run: `npm test test/ReaderHUD.test.tsx`
Expected: PASS.

---

### Task 2: Integrasi Handler `onScrollToTop` di `app/chapter/[id]/page.tsx`

**Files:**
- Modify: `app/chapter/[id]/page.tsx`

**Interfaces:**
- Consumes: `ReaderHUD` with `onScrollToTop`.

- [ ] **Step 1: Buat handler scroll to top di ReaderPage**
Tambahkan fungsi `handleScrollToTop`:
```tsx
const handleScrollToTop = () => {
  if (effectiveMode === 'paged') {
    setCurrentPageIndex(0);
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
};
```

- [ ] **Step 2: Hubungkan `handleScrollToTop` ke `ReaderHUD`**
Pass `onScrollToTop={handleScrollToTop}` pada komponen `<ReaderHUD ... />` di `app/chapter/[id]/page.tsx`.

- [ ] **Step 3: Jalankan verifikasi lint dan full test suite**
Run: `npm test`
Expected: Semua test suite (termasuk `ReaderDesktop.test.tsx` dan `ReaderHUD.test.tsx`) PASS.
