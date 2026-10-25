# Design Spec: Home Page Rework (2-Section Dual Layout)

## Intent and Why
Pengguna menginginkan halaman utama (Home) yang lebih terstruktur dan kaya visual, terbagi menjadi dua bagian utama:
1. **Section 1 (Update Komik Terbaru)**: Menampilkan 10 komik yang baru saja di-update dalam bentuk scroll kartu horizontal (full-width widescreen snap card: poster cover di sisi kiri, informasi judul, alt title, genre, waktu update, dan tombol baca langsung di sisi kanan), dengan pilihan tipe (Manhwa / Manga / Manhua) dan pagination bersih (Prev / Next dengan 1 angka nomor halaman di tengah, tanpa dots, tanpa pecahan 1/10).
2. **Section 2 (Top 15 Rekomendasi / Populer)**: Menampilkan 15 komik terbaik/paling banyak diikuti dengan grid 3-kolom, filter kategori (Semua, Top Manhwa, Top Manga, Top Manhua), dan pagination halaman sendiri.
3. **Performa Rendering**: Rendering dioptimasi dengan isolasi state dan komponen independen sehingga perpindahan tab/halaman di Section 1 tidak memicu render ulang (re-render) pada Section 2 dan sebaliknya.

---

## Architectural Breakdown

### 1. Data Layer (`lib/mangadex.ts` & `lib/types.ts`)
- **Tipe Data**:
  - Memastikan `ComicCardItem` mendukung `genres?: string[]` opsional agar genre dapat ditampilkan pada kartu horizontal Section 1.
- **Fungsi Query**:
  - `fetchLatestComicsByType(type: 'manhwa' | 'manga' | 'manhua' | 'all', limit: number = 10, offset: number = 0): Promise<ComicCardItem[]>`
    Mengambil komik dengan urutan `order[latestUploadedChapter]=desc` dan `availableTranslatedLanguage[]=id`, menyertakan cover art dan genres.
  - `fetchTopComics(type: 'manhwa' | 'manga' | 'manhua' | 'all', limit: number = 15, offset: number = 0): Promise<ComicCardItem[]>`
    Mengambil komik dengan urutan `order[followedCount]=desc` dan `availableTranslatedLanguage[]=id`, menyertakan cover art.

### 2. UI Components
- **`components/HorizontalComicCard.tsx`**:
  - Kartu horizontal full-width snap-center.
  - Sisi kiri: Poster sampul (3:4 ratio), rounded-xl, type badge (MANHWA / MANGA / MANHUA).
  - Sisi kanan: Latest chapter badge, relative time/date, judul utama (Inggris/Populer), alt title tagline italic, chip genres (maks 3), provider sub indo, dan tombol "Baca".
- **`components/CleanPagination.tsx`**:
  - Komponen pagination minimalis: Tombol `Prev`, kotak nomor halaman tunggal di tengah (`1`, `2`, dst.), dan tombol `Next`.
  - Disabled state saat halaman pertama atau saat loading.
- **`components/LatestUpdatesSection.tsx`**:
  - State independen: `activeType`, `page`, `comics`, `isLoading`.
  - Tab 3 jenis: Manhwa, Manga, Manhua.
  - Scroll horizontal container dengan CSS `snap-x mandatory` dan `no-scrollbar`.
  - Navigasi CleanPagination.
- **`components/TopComicsSection.tsx`**:
  - State independen: `activeCategory`, `page`, `comics`, `isLoading`.
  - Filter chips: Semua Top, Top Manhwa, Top Manga, Top Manhua.
  - Grid 3 kolom (15 items) dengan badge rank (#1 s/d #15).
  - Navigasi CleanPagination.

### 3. Home Page (`app/page.tsx`)
- Komponen container ringan yang menyatukan header atas, `LatestUpdatesSection`, `TopComicsSection`, dan `BottomNav`.
- Menghindari re-render gabungan dengan memisahkan logic fetch data ke masing-masing komponen seksi.
