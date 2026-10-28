# Multi-Source Latest Stream Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menggabungkan stream update komik terbaru dari Komikindo, Softkomik, dan Komiku secara paralel dan kronologis, dengan deduplikasi cerdas (anti tumpang tindih) serta label badge sumber asal update (Komikindo, Softkomik, Komiku).

**Architecture:** 
1. Perluas tipe `ComicCardItem` dengan atribut opsional `source?: 'komikindo' | 'softkomik' | 'komiku' | 'mangadex'`.
2. Pasang `source` di scraper masing-masing (`komikindo.ts`, `softkomik.ts`, `komiku.ts`).
3. Buat modul utilitas merge & deduplikasi di `lib/aggregator.ts` (menggunakan fuzzy alias title matching dan chapter comparison) sehingga jika judul sama muncul dari 2 sumber berbeda, judul disatukan menjadi 1 kartu dan mempertahankan chapter paling mutakhir serta waktu rilis terbaru.
4. Perbarui `fetchLatestComicsByType` di `lib/mangadex.ts` untuk mengambil dari ketiga sumber secara paralel (`Promise.allSettled`) lalu memanggil fungsi deduplikasi & sorting kronologis.
5. Perbarui `HorizontalComicCard.tsx` untuk menampilkan badge sumber yang elegan dan informatif di sebelah tipe komik (Manga/Manhwa).

**Tech Stack:** Next.js (App Router), TypeScript, Vitest, Tailwind CSS, Lucide Icons.

**Spec:** Multi-Source Unified Latest Updates Stream with Anti-Overlap Deduplication.

## Global Constraints
- Tetap kompatibel dengan client-side fetching via API routes (`/api/komikindo`, `/api/softkomik`, `/api/komiku`).
- Semua unit test harus PASS 100% tanpa regresi.
- Deduplikasi tidak boleh menghilangkan komik yang benar-benar berbeda.
- UI kartu komik di mobile dan desktop tetap rapi dan tidak merusak layout saat badge sumber ditampilkan.

## Review Focus
- Komik dengan judul sedikit berbeda (misal: ada kata "Sub Indo" atau slug tanda hubung) harus berhasil dideduplikasi.
- Jika satu sumber lambat atau gagal (timeout/down), sumber lainnya tetap berhasil ditampilkan (resilient).
- Pagination halaman 2 dst tetap berjalan mulus dengan offset halaman yang tepat.
- Kartu komik hasil merge harus tetap bisa dibuka dan diarahkan ke halaman detail yang valid.
- Komik tanpa atribut tanggal tetap diletakkan di akhir tanpa melempar exception NaN/undefined.

---

### Task 1: Extend `ComicCardItem` Type & Source Attribution

**Files:**
- Modify: `lib/types.ts`
- Modify: `lib/komikindo.ts`
- Modify: `lib/softkomik.ts`
- Modify: `lib/komiku.ts`
- Test: `test/source-attribution.test.ts`

**Interfaces:**
- Consumes: `ComicCardItem` in `lib/types.ts`
- Produces: `ComicCardItem.source?: 'komikindo' | 'softkomik' | 'komiku' | 'mangadex'`

- [ ] **Step 1: Write the failing test for source attribution**
Create `test/source-attribution.test.ts` verifying that cards returned from `parseKomikindoLatestUpdates`, `mapSoftkomikItemToCard`, and `parseKomikuLatestUpdates` include their respective `source`.

- [ ] **Step 2: Run test to verify it fails**
Run: `npm test test/source-attribution.test.ts`
Expected: FAIL due to missing `source` field.

- [ ] **Step 3: Implement `source` in `types.ts`, `komikindo.ts`, `softkomik.ts`, and `komiku.ts`**
Add `source?: 'komikindo' | 'softkomik' | 'komiku' | 'mangadex'` to `ComicCardItem` in `lib/types.ts`.
Assign `source: 'komikindo'` in `lib/komikindo.ts`.
Assign `source: 'softkomik'` in `lib/softkomik.ts`.
Assign `source: 'komiku'` in `lib/komiku.ts`.

- [ ] **Step 4: Run test to verify it passes**
Run: `npm test test/source-attribution.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add lib/types.ts lib/komikindo.ts lib/softkomik.ts lib/komiku.ts test/source-attribution.test.ts
git commit -m "feat: add comic source attribution to card items"
```

---

### Task 2: Deduplication and Chronological Merging Utility

**Files:**
- Modify: `lib/aggregator.ts`
- Test: `test/merge-latest.test.ts`

**Interfaces:**
- Produces: `mergeLatestComics(sources: ComicCardItem[][]): ComicCardItem[]`

- [ ] **Step 1: Write the failing test for `mergeLatestComics`**
Create `test/merge-latest.test.ts` testing:
1. Deduplication of identical titles from different sources (e.g., Softkomik vs Komiku vs Komikindo).
2. Selection of highest chapter and newest time when merging.
3. Retention of source attribution.
4. Descending chronological sorting.

- [ ] **Step 2: Run test to verify it fails**
Run: `npm test test/merge-latest.test.ts`
Expected: FAIL (`mergeLatestComics is not a function`).

- [ ] **Step 3: Implement `mergeLatestComics` in `lib/aggregator.ts`**
Use `cleanComicAlias` and `scoreTitleMatch` to group items that represent the same comic.
Pick the item with higher chapter or newer time, and combine altTitles. Sort chronologically using `parseDateScore`.

- [ ] **Step 4: Run test to verify it passes**
Run: `npm test test/merge-latest.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add lib/aggregator.ts test/merge-latest.test.ts
git commit -m "feat: implement mergeLatestComics deduplication utility"
```

---

### Task 3: Parallel Multi-Source Fetch in `fetchLatestComicsByType`

**Files:**
- Modify: `lib/mangadex.ts`
- Test: `test/latest-stream.test.ts`

**Interfaces:**
- Consumes: `mergeLatestComics` from `lib/aggregator.ts`
- Modifies: `fetchLatestComicsByType(type, limit, offset)`

- [ ] **Step 1: Write test for `fetchLatestComicsByType` multi-source behavior**
Create `test/latest-stream.test.ts` asserting that `fetchLatestComicsByType` fetches concurrently from all available providers and merges them without duplication.

- [ ] **Step 2: Run test to verify it fails**
Run: `npm test test/latest-stream.test.ts`
Expected: FAIL.

- [ ] **Step 3: Update `fetchLatestComicsByType` in `lib/mangadex.ts`**
Replace sequential fallback with concurrent `Promise.allSettled` fetching from Komikindo, Softkomik, and Komiku, passing the results into `mergeLatestComics`. Slice by `PAGE_LIMIT`. Fall back to MangaDex only if all 3 return empty.

- [ ] **Step 4: Run test to verify it passes**
Run: `npm test test/latest-stream.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add lib/mangadex.ts test/latest-stream.test.ts
git commit -m "feat: fetch latest updates in parallel across all sources"
```

---

### Task 4: Source Badge UI in `HorizontalComicCard.tsx`

**Files:**
- Modify: `components/HorizontalComicCard.tsx`
- Test: `test/horizontal-card.test.tsx`

**Interfaces:**
- Consumes: `comic.source` in `HorizontalComicCard`

- [ ] **Step 1: Write test for source badge rendering**
Verify badge renders correctly with appropriate styling for `komikindo`, `softkomik`, and `komiku`.

- [ ] **Step 2: Run test to verify it fails**
Run: `npm test test/horizontal-card.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement source badge in `components/HorizontalComicCard.tsx`**
Add clean badge next to type/chapter (e.g., green/emerald for Komikindo, indigo for Softkomik, orange/amber for Komiku).

- [ ] **Step 4: Run test to verify it passes**
Run: `npm test test/horizontal-card.test.tsx`
Expected: PASS.

- [ ] **Step 5: Run full test suite & build check**
Run: `npm test` and `npm run build`.

- [ ] **Step 6: Commit**
```bash
git add components/HorizontalComicCard.tsx test/horizontal-card.test.tsx
git commit -m "feat: display provider source badge on horizontal comic cards"
```
