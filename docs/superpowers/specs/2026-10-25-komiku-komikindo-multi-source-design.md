# Desain Integrasi Multi-Sumber Komik (Komiku & Komikindo) dan Tanggal Rilis Chapter

## 1. Latar Belakang & Tujuan
Website Kurokomi sebelumnya mengandalkan MangaDex sebagai penyedia katalog utama, sementara Komiku hanya digunakan sebagai fallback pencarian pasif di halaman detail. Hal ini menyebabkan:
- Judul komik di web berbahasa Romanisasi Korea/Jepang (misal *Na Honjaman Level Up*, *Item-ppal*) alih-alih nama populer Indonesia (*Solo Leveling*, *Overgeared*).
- Banyak komik tidak ditemukan saat dicari dengan nama Indonesia.
- Pencocokan chapter ke Komiku sering gagal karena kueri terpotong, salah bahasa, atau salah memilih komik spin-off.
- Banyak komik populer tidak memiliki chapter bahasa Indonesia.

**Tujuan Implementasi:**
1. Mengintegrasikan **Komikindo** sebagai penyedia alternatif bersama **Komiku** untuk menjamin kelengkapan komik & chapter Sub Indo.
2. Mengutamakan metadata/tampilan dari **Komiku** terlebih dahulu. Jika tidak ada di Komiku, gunakan **Komikindo**, dan bila tidak ada di keduanya baru gunakan **MangaDex**.
3. Menggabungkan chapter dari penyedia secara real-time (*who updates first / latest appears at the top*).
4. Menampilkan tanggal rilis pada setiap baris chapter dalam format ringkas: `DD/MM/YYYY` (contoh: `25/10/2026`).
5. Memastikan pembaca gambar (*reader*) dapat memuat gambar dari kedua penyedia secara lancar.

---

## 2. Arsitektur & Komponen

### A. Penyedia Komikindo (`lib/komikindo.ts`)
- `searchKomikindo(query: string): Promise<ComicCardItem[]>`: Mencari komik di Komikindo.
- `fetchKomikindoDetail(slug: string): Promise<ComicDetail | null>`: Mengambil detail, sinopsis, genre, dan status.
- `fetchKomikindoChapters(slug: string): Promise<ChapterItem[]>`: Mengambil seluruh chapter beserta tanggal rilisnya (diparsing ke format ISO/string dan diformat ke `DD/MM/YYYY`).
- `fetchKomikindoChapterImages(chapterSlug: string): Promise<ChapterPageItem[]>`: Mengambil daftar URL gambar dari halaman baca Komikindo.

### B. Penyempurnaan Penyedia Komiku (`lib/komiku.ts`)
- **Pencarian Cerdas (Smart Matching):** Menghapus batas `slice(0, 3)` yang kaku. Mencari judul alternatif yang relevan, menormalisasi judul (membersihkan simbol seperti `: `, `(Official Colored)`, dll.), dan membandingkan kemiripan judul (*exact match* atau *levenshtein/token match*) agar tidak salah memilih spin-off (seperti menghindari *One Piece: Ace Story* saat mencari *One Piece*).
- **Pengambilan Tanggal Rilis:** Membaca tanggal rilis chapter dari elemen Komiku (misal kolom tanggal pada tabel daftar chapter) dan menyimpannya dalam `publishAt`.

### C. Agregator Terpadu (`lib/comic-aggregator.ts` / API Routes)
- **ID Komik & Routing Polimorfik:**
  Mendukung format ID:
  - `komiku--<slug>` (komik dari Komiku)
  - `komikindo--<slug>` (komik dari Komikindo)
  - UUID (komik dari MangaDex)
  Sehingga komik eksklusif dari Komiku/Komikindo dapat dibuka, difavoritkan, dan disimpan di riwayat baca secara transparan.
- **Pencarian Terpadu (`searchComicsUnified`):**
  1. Cari di Komiku dan Komikindo secara paralel.
  2. Lakukan deduplikasi judul (utamakan Komiku jika ada di keduanya).
  3. Lengkapi dengan hasil MangaDex untuk komik yang belum tercakup.
- **Penggabungan Chapter (`mergeChapters`):**
  1. Ambil chapter dari Komiku dan Komikindo secara paralel (serta MangaDex jika komik terhubung dengan MangaDex UUID).
  2. Normalisasi nomor chapter (contoh: Ch. 180).
  3. Jika suatu nomor chapter ada di lebih dari satu server, pilih yang tanggal rilisnya lebih baru / server prioritas (Komiku -> Komikindo -> MangaDex). Validasi gambar dilakukan secara on-demand saat chapter dibuka di reader, bukan saat loading daftar chapter untuk menjaga performa cepat dan bebas rate-limit.
  4. Urutkan chapter dari yang paling baru di paling atas.
- **Dukungan Halaman Beranda (Homepage):**
  Terapkan judul cerdas dan fallback terjemahan populer Indonesia pada katalog beranda sehingga judul tidak lagi membingungkan dengan Romanisasi asing.

### D. Tampilan Daftar Chapter (`components/ChapterList.tsx`)
- Menampilkan tanggal rilis di setiap baris chapter dalam format `DD/MM/YYYY` (misal: `25/10/2026`), ditempatkan berdampingan dengan nama grup scanlation atau di sisi kanan sebelum ikon panah.
- Menampilkan tag sumber chapter (`Komiku` / `Komikindo` / `MangaDex`) secara rapi.

### E. Unified Chapter Reader (`app/chapter/[id]/page.tsx` & `lib/mangadex.ts` / `lib/storage.ts`)
- Mendukung ID chapter dengan prefix:
  - `komiku--<chapterSlug>` -> diteruskan ke pemuat gambar Komiku.
  - `komikindo--<chapterSlug>` -> diteruskan ke pemuat gambar Komikindo.
  - UUID standar -> diteruskan ke MangaDex At-Home server.
- On-demand fallback: Jika gambar dari server utama gagal dimuat di reader, pembaca secara otomatis mencoba memuat gambar dari server alternatif yang tersedia.

---

## 3. Format Tanggal Rilis
- Format baku tampilan: `DD/MM/YYYY` (contoh: `25/10/2026`).
- Fungsi utilitas `formatChapterDate(dateStr: string): string` untuk mengonversi berbagai format tanggal mentah penyedia menjadi format `DD/MM/YYYY`.

---

## 4. Rencana Pengujian
1. Verifikasi pencarian komik populer (*Solo Leveling*, *One Piece*, *Eleceed*, *Return of the Mount Hua Sect*).
2. Verifikasi chapter berhasil muncul lengkap (tidak lagi 0 atau terpotong).
3. Verifikasi tanggal rilis chapter muncul dengan format `DD/MM/YYYY`.
4. Verifikasi halaman baca gambar chapter dari Komiku dan Komikindo dapat terbuka tanpa error.
