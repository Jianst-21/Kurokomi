# Desain Fitur: Manga Paged Mode (Hybrid), PWA Support, dan Backup/Restore Data

## 1. Ringkasan & Tujuan (Intent & Why)
Pengguna menginginkan 3 fitur penyempurnaan utama untuk meningkatkan kenyamanan baca, portabilitas, dan keandalan data pada Kurokomi:
1. **Mode Lembar (Paged Mode) Khusus Manga (Hybrid Navigation):**
   - Komik Jepang (Manga) pada format aslinya dibaca per lembar halaman.
   - Khusus untuk komik bertipe `manga`, pembaca diberikan kontrol pengalih (toggle) minimalis: `[ Webtoon | Lembar ]`. Untuk Manhwa dan Manhua, mode tetap terkunci pada Webtoon scroll vertikal.
   - Navigasi lembar menggunakan pendekatan **hybrid**:
     - Ketukan layar (*tap*): Sisi kanan untuk halaman berikutnya, sisi kiri untuk halaman sebelumnya, sisi tengah untuk toggle menu HUD.
     - Gestur usap (*touch swipe*): Geser horizontal kiri/kanan di ponsel.
     - Keyboard desktop: Panah kiri/kanan (`←`, `→`).
     - Indikator halaman minimalis teks monokrom: `Halaman X / Y`.
2. **Fitur Ekspor & Impor Data (Backup & Restore):**
   - Diletakkan di halaman **Favorit Saya** (`app/favorites/page.tsx`).
   - Tombol teks minimalis dan modern (tanpa stiker, tanpa ikon berlebihan):
     - `Ekspor Data`: Mengunduh file `kurokomi-backup-YYYY-MM-DD.json` berisi data favorit, riwayat bacaan, dan daftar chapter yang sudah dibaca.
     - `Impor Data`: Membaca file JSON cadangan dan menggabungkannya ke `localStorage` secara aman dengan validasi schema.
3. **PWA (Progressive Web App):**
   - File `public/manifest.json` dan konfigurasi metadata PWA di `app/layout.tsx`.
   - Mengizinkan pembaca di Android dan iOS menginstal Kurokomi ke Layar Utama (*Home Screen*) dengan tampilan mandiri (*standalone*) layar penuh tanpa browser chrome.

---

## 2. Batasan Desain & Gaya (Design Constraints)
- **Minimalis & Modern:** Menjunjung tinggi kesederhanaan visual zinc-950/zinc-900.
- **Dilarang Menggunakan Stiker:** Tidak ada stiker grafis dekoratif atau kartun.
- **Batasi Penggunaan Ikon:** Hanya gunakan ikon fungsional yang sangat esensial (seperti ikon panah kembali atau menu), lebih mengutamakan tipografi bersih dan teks kontras.
- **Bahasa:** Seluruh teks dan label antarmuka menggunakan Bahasa Indonesia.

---

## 3. Rincian Teknis & Arsitektur

### A. Fitur 1: PWA (Progressive Web App)
- **`public/manifest.json`**:
  - `name`: "Kurokomi - Baca Komik Bahasa Indonesia"
  - `short_name`: "Kurokomi"
  - `display`: "standalone"
  - `background_color`: "#09090b"
  - `theme_color`: "#09090b"
  - `start_url`: "/"
- **`app/layout.tsx`**:
  - Menghubungkan manifest ke metadata Next.js (`manifest: '/manifest.json'`).
  - Menambahkan Apple Web App capability (`appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Kurokomi' }`).

### B. Fitur 2: Ekspor & Impor Data di Halaman Favorit
- **Modul `lib/storage.ts`**:
  - Fungsi `exportUserData(): string`: Menghasilkan JSON string dari `kurokomi_favorites_v1`, `kurokomi_history_v1`, dan `kurokomi_read_chapters_v1`.
  - Fungsi `importUserData(jsonString: string): { success: boolean; count: number; error?: string }`:
    - Memvalidasi schema JSON cadangan.
    - Menggabungkan (*merge & deduplicate*) ke data lokal tanpa menghapus entri lama yang masih valid.
- **Halaman `app/favorites/page.tsx`**:
  - Di header samping kanan atau di bawah judul, sediakan tombol dropdown atau baris aksi minimalis:
    - Tombol `Cadangkan`: Mengunduh file backup JSON.
    - Tombol `Pulihkan`: Membuka file picker (`<input type="file" accept=".json" />`) lalu menampilkan notifikasi konfirmasi bersih.

### C. Fitur 3: Manga Paged Mode (Hybrid) di Reader
- **State Reader (`app/chapter/[id]/page.tsx`)**:
  - `isManga = comic?.type === 'manga'`
  - State mode baca: `readerMode: 'webtoon' | 'paged'` (default `'webtoon'`, disimpan di `localStorage` preferensi pengguna).
  - State halaman aktif: `currentPageIndex: number` (0 sampai `pages.length - 1`).
- **Komponen HUD (`components/ReaderHUD.tsx`)**:
  - Jika `isManga === true`, tampilkan toggle minimalis pada HUD bawah:
    ```tsx
    <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 text-[11px]">
      <button className={readerMode === 'webtoon' ? 'bg-blue-600 text-white rounded px-2 py-1' : 'text-zinc-400 px-2 py-1'}>
        Webtoon
      </button>
      <button className={readerMode === 'paged' ? 'bg-blue-600 text-white rounded px-2 py-1' : 'text-zinc-400 px-2 py-1'}>
        Lembar
      </button>
    </div>
    ```
- **Tampilan Paged View**:
  - Hanya menampilkan 1 gambar aktif sesuai `currentPageIndex` dengan aspect-fit di tengah layar.
  - **Navigasi Layar 3 Zona (Invisible Touch Zones)**:
    - Zona Kiri (30% lebar layar): Ke halaman sebelumnya (atau lembar berikutnya jika RTL).
    - Zona Tengah (40% lebar layar): Toggle buka/tutup HUD.
    - Zona Kanan (30% lebar layar): Ke halaman berikutnya.
  - **Touch Swipe**: Event `onTouchStart` dan `onTouchEnd` menghitung delta X. Geser > 50px memicu balik halaman.
  - **Keyboard**: ArrowLeft/ArrowRight membalik halaman saat mode paged aktif.
  - **Indikator Monokrom Minimalis**: Teks kecil di HUD bawah atau pojok layar: `14 / 48`.
  - Jika berada di halaman terakhir lalu menekan berikutnya, arahkan ke chapter selanjutnya. Jika di halaman 1 dan menekan sebelumnya, arahkan ke chapter sebelumnya.

---

## 4. Rencana Pengujian
1. **Unit Test Storage (`test/storage.test.ts`)**:
   - Memastikan `exportUserData` mengembalikan format JSON yang valid.
   - Memastikan `importUserData` dapat memulihkan dan menggabungkan data tanpa korupsi.
2. **Reader Test (`test/ReaderHUD.test.tsx` & `test/ReaderPaged.test.ts`)**:
   - Memastikan toggle mode hanya muncul ketika `comic.type === 'manga'`.
   - Memastikan navigasi per lembar mengubah indeks halaman dengan benar.
