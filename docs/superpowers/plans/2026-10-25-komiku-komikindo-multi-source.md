# Multi-Source Comic Integration (Komiku & Komikindo) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate Komikindo as a secondary Indonesian provider alongside Komiku, enable smart title matching, aggregate chapters with newest-first ordering, display release dates in `DD/MM/YYYY` format, and unify search and reading across providers.

**Architecture:** A polymorphic provider model supports prefixed IDs (`komiku--<slug>`, `komikindo--<slug>`, and MangaDex UUIDs). An aggregator module (`lib/aggregator.ts`) handles multi-source parallel querying, title deduplication (Komiku > Komikindo > MangaDex), and chapter merging with date-based sorting. The chapter list UI displays formatted `DD/MM/YYYY` dates and scanlation/provider source tags.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Vitest with React Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-25-komiku-komikindo-multi-source-design.md`

## Global Constraints

- Date format for chapter rows must strictly be `DD/MM/YYYY` (e.g., `25/10/2026`).
- Deduplication priority for comic cards: Komiku first, then Komikindo, then MangaDex.
- Chapter merging priority: whichever server released/updated a chapter most recently appears at the top. For duplicate chapter numbers, choose the one with the newer release date / primary provider.
- All existing tests in `test/` must continue to pass (`npm test`).
- No external scraping libraries (cheerio, puppeteer) that add heavy native dependencies; use native fetch with regex/DOM parsing in Next.js server runtime.

## Review Focus

1. **Chapter Date Fallback:** Chapters missing a parseable publish date should gracefully fallback to displaying empty or placeholder rather than `NaN/NaN/NaN` or crashing.
2. **Spin-Off Search Contamination:** Searching for a parent title (e.g., "One Piece") must match the main series rather than spin-offs ("One Piece: Ace Story").
3. **Missing or Broken Images:** When a chapter from one provider fails to load images, the reader must show an error state with a retry option without breaking the viewer.
4. **Polymorphic Storage Navigation:** Bookmarking/favoriting or reading a comic with a `komikindo--` or `komiku--` prefix must preserve the exact ID and load correctly from `/favorites` and `/history`.
5. **Rate Limiting & Timeouts:** Third-party provider requests must timeout gracefully within 8 seconds so the app never hangs indefinitely.

---

### Task 1: Date Formatting Utility & ChapterList Release Date Display

**Files:**
- Modify: `lib/mangadex.ts` (or add to `lib/date.ts`)
- Modify: `components/ChapterList.tsx`
- Test: `test/ChapterList.test.tsx`
- Test: `test/date.test.ts`

**Interfaces:**
- Consumes: `ChapterItem.publishAt: string`
- Produces: `formatChapterDate(dateStr?: string): string` returning `DD/MM/YYYY` or empty string if invalid.

- [ ] **Step 1: Write the failing tests for `formatChapterDate` and `ChapterList` date display**

Create `test/date.test.ts` testing ISO strings (`2026-10-25T12:00:00Z`), date strings (`2026-10-25`), Indonesian date strings (`25 Oktober 2026`, `5 hari lalu`), and invalid strings. Update `test/ChapterList.test.tsx` to assert that `mockChapters[0].publishAt` rendered as `01/01/2023`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/date.test.ts`
Expected: FAIL (module or function not found)

- [ ] **Step 3: Implement `formatChapterDate` and update `components/ChapterList.tsx`**

Implement `formatChapterDate` in `lib/date.ts` handling ISO dates, Indonesian text dates, relative days, and fallback to `DD/MM/YYYY`. In `components/ChapterList.tsx`, render the formatted date next to or below the scanlation group name with a subtle calendar icon or text badge.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/date.test.ts test/ChapterList.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/date.ts components/ChapterList.tsx test/date.test.ts test/ChapterList.test.tsx
git commit -m "feat: add formatChapterDate and display chapter release dates in DD/MM/YYYY"
```

---

### Task 2: Komikindo Provider Implementation

**Files:**
- Create: `lib/komikindo.ts`
- Create: `app/api/komikindo/route.ts`
- Test: `test/komikindo.test.ts`

**Interfaces:**
- Produces:
  - `searchKomikindo(query: string): Promise<ComicCardItem[]>`
  - `fetchKomikindoDetail(slug: string): Promise<ComicDetail | null>`
  - `fetchKomikindoChapters(slug: string): Promise<ChapterItem[]>`
  - `fetchKomikindoChapterImages(chapterSlug: string): Promise<ChapterPageItem[]>`
- API route: `/api/komikindo?action=search|detail|chapters|pages&...`

- [ ] **Step 1: Write the unit tests for `lib/komikindo.ts` parsing logic**

Create `test/komikindo.test.ts` with mock HTML fixtures for search results, comic details, chapter lists, and chapter reader pages. Test extraction of title, slug, cover, type (manhwa/manga/manhua), chapter numbers, publish dates, and reader image URLs.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/komikindo.test.ts`
Expected: FAIL (module `lib/komikindo` does not exist)

- [ ] **Step 3: Implement `lib/komikindo.ts` and `app/api/komikindo/route.ts`**

Implement HTML scraping functions in `lib/komikindo.ts` targeting `https://komikindo.ch`:
- Extract search items from `.animepost` / `.film-list`.
- Extract details from `.infox`, `.sinopsis`.
- Extract chapters from `.lchx a` with relative/absolute date parsing.
- Extract reader images from `#readerarea img` or `.chimages img`.
Implement the Next.js API handler in `app/api/komikindo/route.ts` with caching headers.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/komikindo.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/komikindo.ts app/api/komikindo/route.ts test/komikindo.test.ts
git commit -m "feat: implement Komikindo provider and API proxy"
```

---

### Task 3: Smart Title Matching & Date Extraction in Komiku Provider

**Files:**
- Modify: `lib/komiku.ts`
- Modify: `app/api/komiku/route.ts`
- Test: `test/komiku.test.ts`

**Interfaces:**
- Produces:
  - `findKomikuSlug(title: string, altTitles?: string[]): Promise<string | null>` with smart fuzzy/token scoring
  - `fetchKomikuDetail(slug: string): Promise<ComicDetail | null>`
  - `fetchKomikuChapters(slug: string): Promise<ChapterItem[]>` with extracted `publishAt`
  - `searchKomiku(query: string): Promise<ComicCardItem[]>`

- [ ] **Step 1: Write the failing tests for Komiku smart matching and chapter date extraction**

Create `test/komiku.test.ts` testing:
- Prioritizing exact title match ("One Piece") over spin-off ("One Piece: Ace Story").
- Matching titles even when buried in lower `altTitles` indices.
- Extracting publish dates from chapter rows into `ChapterItem.publishAt`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/komiku.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement smart title scoring and date parsing in `lib/komiku.ts`**

In `lib/komiku.ts`:
- Expand search queries to include cleaned title variations (without `: `, `(Official Colored)`, etc.) and English altTitles.
- Score search candidates: exact match (+100), word-overlap score, penalize titles with extra subtitle words when searching for core title.
- Parse table rows or metadata in `/manga/<slug>/` to extract chapter release dates.
- Add `searchKomiku(query: string)` returning `ComicCardItem[]` with `komiku--<slug>` ID.
- Update `app/api/komiku/route.ts` to support `action=detail`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/komiku.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/komiku.ts app/api/komiku/route.ts test/komiku.test.ts
git commit -m "feat: add smart title matching, searchKomiku, and date parsing to Komiku provider"
```

---

### Task 4: Multi-Source Aggregator & Polymorphic Comic/Reader Handling

**Files:**
- Create: `lib/aggregator.ts`
- Modify: `lib/mangadex.ts` (reader dispatcher)
- Modify: `app/manga/[id]/page.tsx`
- Modify: `app/chapter/[id]/page.tsx`
- Test: `test/aggregator.test.ts`

**Interfaces:**
- Produces:
  - `searchComicsUnified(query: string, options?: FilterOptions): Promise<ComicCardItem[]>`
  - `fetchUnifiedComicDetail(id: string): Promise<ComicDetail | null>`
  - `mergeAndSortChapters(chaptersA: ChapterItem[], chaptersB: ChapterItem[], chaptersC?: ChapterItem[]): ChapterItem[]`
  - Reader image resolver handling `komiku--`, `komikindo--`, and MangaDex IDs.

- [ ] **Step 1: Write unit tests for `mergeAndSortChapters` and deduplication priority**

Create `test/aggregator.test.ts` testing:
- Chapter merging: when chapter 180 exists in both Komiku and Komikindo, take the one with the latest date or preferred source.
- Sorting: newest chapter at the top.
- Title deduplication: Komiku card preferred over Komikindo card when titles match.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/aggregator.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `lib/aggregator.ts` and update detail & reader pages**

- Implement `mergeAndSortChapters` in `lib/aggregator.ts` comparing chapter numbers numerically and dates chronologically.
- Implement polymorphic `fetchUnifiedComicDetail` routing `komiku--` to Komiku, `komikindo--` to Komikindo, and UUID to MangaDex, while cross-referencing titles to fetch Indonesian chapters from all available providers.
- Update `app/manga/[id]/page.tsx` to use the unified detail & chapter merger.
- Update `lib/mangadex.ts` (`fetchChapterPages`) and `app/chapter/[id]/page.tsx` to support `komikindo--` slugs seamlessly.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/aggregator.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/aggregator.ts lib/mangadex.ts app/manga/[id]/page.tsx app/chapter/[id]/page.tsx test/aggregator.test.ts
git commit -m "feat: implement unified multi-source aggregator and polymorphic reader"
```

---

### Task 5: Search Page & Homepage Integration

**Files:**
- Modify: `app/search/page.tsx`
- Modify: `app/page.tsx`
- Test: `test/search-page.test.tsx` (or update existing UI tests)

**Interfaces:**
- Consumes: `searchComicsUnified` from `lib/aggregator.ts`

- [ ] **Step 1: Write integration tests for unified search query**

Create or update test asserting that searching queries both Indonesian providers and MangaDex, deduplicating matching titles.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/search-page.test.tsx`
Expected: FAIL

- [ ] **Step 3: Connect unified search to `app/search/page.tsx` and enhance titles in `app/page.tsx`**

- In `app/search/page.tsx`, replace `searchComics` with `searchComicsUnified` so users can search popular Indonesian titles directly.
- In `app/page.tsx`, ensure popular and latest titles resolve to friendly Indonesian display names.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/search/page.tsx app/page.tsx
git commit -m "feat: integrate unified search into search and home pages"
```

---

### Task 6: Full Verification & Build Validation

**Files:**
- Test suite: `npm test`
- Build check: `npm run build`

- [ ] **Step 1: Run all unit and integration tests**

Run: `npm test`
Expected: All tests pass with zero regressions.

- [ ] **Step 2: Run Next.js production build**

Run: `npm run build`
Expected: Build succeeds with zero TypeScript or compilation errors.

- [ ] **Step 3: Live verification on sample titles**

Verify via a script or browser:
- "Solo Leveling" resolves to Indonesian chapters.
- "One Piece" resolves to full series (1,200+ chapters), not spin-off.
- "Eleceed" resolves chapters via Komikindo.
- Dates display as `DD/MM/YYYY`.

- [ ] **Step 4: Final commit**

```bash
git commit --allow-empty -m "chore: verify multi-source comic integration and chapter release dates"
```
