# Favorit Update Red Dot Indicator Design

## 1. Ringkasan
Menambahkan indikator titik merah (*red dot notification badge*) untuk komik yang difavoritkan saat ada update chapter terbaru yang belum dibaca pengguna. Indikator muncul di dua tempat:
1. **Navigasi Menu Favorit:** Titik dot merah pada ikon/menu Favorit di `BottomNav` (mobile) dan `DesktopNavbar` (desktop) jika terdapat minimal satu komik favorit yang belum dibaca update terbarunya.
2. **Card Komik (`ComicCard`):** Titik dot merah di sudut atas cover komik pada daftar Favorit (dan card terkait) jika komik tersebut memiliki chapter update yang belum dibaca.

## 2. Cara Kerja Deteksi Update
- Fungsi pembantu di `lib/storage.ts`: `hasComicUpdate(comic: ComicCardItem): boolean` dan `hasAnyFavoriteUpdate(): boolean`.
- Sebuah komik favorit memiliki update jika:
  - Komik ada di daftar favorit.
  - Komik memiliki informasi `latestChapter` / `latestChapterId`.
  - Chapter terbaru tersebut belum tercatat sebagai sudah dibaca (`!isChapterRead(latestChapterId)` atau chapter terakhir dibaca `getComicLastRead(comic.id)` bukan chapter terbaru tersebut).
- Titik dot merah otomatis hilang ketika pengguna membuka dan membaca chapter terbaru tersebut (atau membuka detail komik).

## 3. UI / Visual
- Titik dot merah dengan efek pulsing / ring ping subtle (`w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-zinc-950`).
- Terlihat kontras dan estetik di tema gelap KuroKomi tanpa mengganggu tata letak card.
