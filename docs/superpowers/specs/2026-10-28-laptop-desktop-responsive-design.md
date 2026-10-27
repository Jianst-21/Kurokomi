# Desain Responsif Desktop / Laptop Kurokomi (Opsi A)

## Latar Belakang & Tujuan
Saat ini Kurokomi dirancang dengan tata letak mobile-first (`max-w-md mx-auto`) dan navigasi bawah (`BottomNav`). Ketika dibuka di laptop atau monitor desktop, konten terlihat terjepit di tengah (hanya 448px) dengan ruang kosong yang luas di sisi kiri-kanan, serta navigasi bawah yang kurang lazim untuk pengalaman laptop.

Tujuan proyek ini adalah membuat Kurokomi nyaman digunakan di laptop/desktop tanpa merusak keringkasan dan kecepatan versi mobile yang sudah ada.

## Prinsip Desain
1. **Bebas Stiker & Minim Ikon**: Menghindari elemen dekoratif stiker atau ilustrasi pemanis. Ikon hanya digunakan untuk fungsi esensial (pencarian, panah navigasi, tutup modal). Sisanya menggunakan tipografi yang jelas dan lugas.
2. **Bahasa Manusia (Bebas Slop)**: Label, tombol, dan teks navigasi menggunakan Bahasa Indonesia yang wajar dan ringkas (contoh: "Beranda", "Cari Komik", "Favorit", "Riwayat", bukan kalimat promosi berlebihan).
3. **Pemanfaatan Ruang Layar**: Di desktop, kontainer konten melebar hingga `max-w-6xl` (~1152px) dengan pembagian grid yang proporsional.

---

## Spesifikasi Komponen & Halaman

### 1. Navigasi Global (`Header` & `BottomNav`)
* **Mobile (< 768px)**:
  - Tetap menggunakan Top Bar ringkas dan `BottomNav` di bawah layar seperti saat ini.
* **Desktop (≥ 768px)**:
  - `BottomNav` disembunyikan (`md:hidden`).
  - Disediakan Top Navbar desktop (`md:flex`) yang berisi:
    - Kiri: Logo Kurokomi.
    - Tengah: Kolom pencarian cepat (langsung bisa mengetik tanpa harus pindah halaman dulu).
    - Kanan: Tautan teks navigasi (`Beranda`, `Favorit`, `Riwayat`) dengan status aktif yang jelas.

### 2. Halaman Beranda (`app/page.tsx`)
* **Kontainer**: Melebar dari `max-w-md` menjadi `max-w-6xl mx-auto px-4`.
* **Update Komik Terbaru (`LatestUpdatesSection`)**:
  - Di mobile: daftar vertikal 1 kolom.
  - Di desktop: grid 2 kolom (`md:grid-cols-2 gap-3`), sehingga 10 komik update terbaru terlihat padat dan hemat scroll vertikal.
* **Top 15 Rekomendasi (`TopComicsSection`)**:
  - Di mobile: grid 3 kolom.
  - Di desktop: grid 5 atau 6 kolom poster komik (`md:grid-cols-5 lg:grid-cols-6 gap-3`), menampilkan cover komik beresolusi tajam tanpa pemborosan ruang.

### 3. Halaman Pencarian (`app/search/page.tsx`)
* Kontainer pencarian melebar ke `max-w-6xl`.
* Grid hasil pencarian: 3 kolom di mobile, 4 kolom di tablet (`sm:`), dan 6 kolom di desktop (`lg:`).
* Filter bar dan modal filter tetap bersih dan mudah diklik dengan mouse.

### 4. Halaman Detail Komik (`app/manga/[id]/page.tsx`)
* **Mobile**: Tata letak susun vertikal (cover di atas, detail di tengah, daftar chapter di bawah).
* **Desktop**: Tata letak 2 kolom (`md:grid md:grid-cols-[280px_1fr] md:gap-8`):
  - **Kolom Kiri (280px)**: Poster cover komik besar, tombol "Mulai Baca", tombol "Tambah Favorit", dan metadata singkat (status, tipe, genre).
  - **Kolom Kanan**: Judul komik besar, sinopsis lengkap, tab bahasa (Indonesia/Inggris), dan grid daftar chapter yang luas.

### 5. Halaman Reader (`app/chapter/[id]/page.tsx` & `ReaderHUD`)
* **Mode Webtoon**:
  - Di desktop, lebar gambar komik dibatasi maksimal `max-w-2xl` (~672px) atau `max-w-3xl` (~768px) dengan latar belakang hitam pekat di kedua sisinya. Ini mencegah gambar komik membesar secara ekstrem di layar 14–27 inci yang bisa membuat resolusi pecah dan leher pegal.
* **Navigasi Keyboard**:
  - Tombol keyboard `ArrowLeft` / `ArrowRight` atau `[` / `]` untuk pindah chapter / halaman.
  - Tombol `M` untuk membuka daftar chapter.
  - Tombol `H` untuk menyembunyikan/menampilkan bilah atas-bawah (HUD).

---

## Hal yang Dihindari (Anti-Goals)
- Tidak menambahkan stiker karakter atau animasi dekoratif yang mengalihkan perhatian dari komik.
- Tidak menumpuk ikon di setiap sudut teks. Cukup gunakan teks murni untuk tombol yang sudah jelas artinya.
- Tidak mengubah kecepatan pemuatan data atau proxy gambar yang sudah berjalan optimal.
