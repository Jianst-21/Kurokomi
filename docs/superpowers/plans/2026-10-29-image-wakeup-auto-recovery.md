# Background Tab Wakeup & Network Disconnect Auto-Recovery Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menambahkan mekanisme pemulihan otomatis (auto-recovery) ketika pengguna keluar/beralih tab aplikasi di HP (background suspend) atau mengalami pemutusan jaringan sementara, sehingga gambar yang menggantung (stuck pending) otomatis di-refresh saat tab kembali aktif.

**Architecture:**
- Di `components/ReaderImage.tsx`:
  - Gunakan `imgRef` untuk mengecek status `complete` dan `naturalWidth` dari elemen `<img>`.
  - Pasang listener `visibilitychange` dan `online` pada window.
  - Ketika dokumen kembali terlihat (`document.visibilityState === 'visible'`) atau koneksi kembali `online`:
    - Periksa apakah elemen gambar belum selesai dimuat (`!img.complete || img.naturalWidth === 0`).
    - Jika belum selesai dan bukan dalam mode error final, lakukan *silent reload*: increment `retryKey` atau re-trigger load agar browser membuka socket koneksi HTTP baru.
  - Pasang juga safety timeout (misal: jika sebuah gambar sudah mulai di-request tetapi tidak kunjung `load` atau `error` dalam 15 detik), otomatis alihkan ke Kurokomi image proxy atau coba reload sekali lagi secara transparan.

**Tech Stack:** Next.js (App Router), React, TypeScript, Vitest, React Testing Library.

---

### Task 1: Add Auto-Recovery on VisibilityChange & Online in `ReaderImage`

**Files:**
- Modify: `components/ReaderImage.tsx`
- Modify: `test/ReaderImage.test.tsx`

**Interfaces:**
- Produces: Resilient image loading with auto-recovery on tab wakeup and network reconnect.

- [ ] **Step 1: Write test case in `test/ReaderImage.test.tsx`**
Tambahkan test yang memverifikasi bahwa listener `visibilitychange` aktif dan memicu reload jika gambar belum `complete`.

- [ ] **Step 2: Run test to verify it fails**
Run: `npm test test/ReaderImage.test.tsx`

- [ ] **Step 3: Implement Auto-Recovery in `components/ReaderImage.tsx`**
1. Simpan ref `imgRef = useRef<HTMLImageElement>(null)`.
2. Listener `document.addEventListener('visibilitychange', ...)` dan `window.addEventListener('online', ...)`.
3. Jika tab kembali visible dan `imgRef.current && (!imgRef.current.complete || imgRef.current.naturalWidth === 0)`, set `retryKey(k => k + 1)`.
4. Tambahkan safety load timeout (15s) untuk fallback ke image-proxy jika koneksi CDN gantung.

- [ ] **Step 4: Run test to verify it passes**
Run: `npm test test/ReaderImage.test.tsx`

---

### Task 2: Verifikasi Full Test Suite & Push

- [ ] **Step 1: Jalankan semua unit test**
Run: `npm test`
Expected: Seluruh test pass.

- [ ] **Step 2: Commit dan push ke main**
Commit dan push perubahan ke GitHub.
