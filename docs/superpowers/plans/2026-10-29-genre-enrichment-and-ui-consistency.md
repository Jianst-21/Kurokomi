# Genre Enrichment and UI Consistency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure consistent genre presentation across comic details by enhancing MangaDex enrichment (utilizing alternative titles) and providing a graceful UI fallback badge when no genres are available.

**Architecture:** Update `lib/aggregator.ts` to enrich comic genres using both primary title and alternative titles against MangaDex. Update `app/manga/[id]/page.tsx` so the Genre section is always rendered with proper layout, showing a neutral badge if no safe genres are found.

**Tech Stack:** Next.js (App Router), React, TypeScript, Tailwind CSS, Jest.

**Spec:** N/A (direct user request to fix missing/inconsistent genres).

## Global Constraints
- Preserve existing safety filters in `lib/security.ts`.
- Avoid breaking changes to `ComicDetail` type definitions.
- Keep UI responsive and compatible with both mobile and desktop viewports.

## Review Focus
- Comics with empty genres must query MangaDex with primary title and alt titles.
- MangaDex rate limits / errors must fail gracefully without blocking comic detail display.
- Filtered 18+ genres must not bypass safety filters during enrichment.
- Empty genres must render a clean fallback badge in the UI instead of hiding the row.

---

### Task 1: Enhance `enrichDetailGenres` in `lib/aggregator.ts`

**Files:**
- Modify: `lib/aggregator.ts`
- Test: `test/aggregator.test.ts`

**Interfaces:**
- Consumes: `ComicDetail`, `mangadex.searchComics`, `filterSafeGenres`, `isSafeContent`
- Produces: `enrichDetailGenres(detail: ComicDetail | null): Promise<ComicDetail | null>`

- [ ] **Step 1: Write test for altTitle fallback enrichment in `test/aggregator.test.ts`**
  Verify that when `detail.genres` is empty, `enrichDetailGenres` attempts to search MangaDex with `detail.title` and fallback candidates from `detail.altTitles`.

- [ ] **Step 2: Run test to verify failure**
  Run: `npm test test/aggregator.test.ts`

- [ ] **Step 3: Update `enrichDetailGenres` in `lib/aggregator.ts`**
  Iterate through `detail.title` and top `detail.altTitles` candidates to query `mangadex.searchComics` until genres are found and filtered.

- [ ] **Step 4: Run test to verify it passes**
  Run: `npm test test/aggregator.test.ts`

- [ ] **Step 5: Commit**
  ```bash
  git add lib/aggregator.ts test/aggregator.test.ts
  git commit -m "feat: enrich detail genres using title and alternative titles"
  ```

---

### Task 2: Update Detail Page UI for Consistent Genre Display

**Files:**
- Modify: `app/manga/[id]/page.tsx`

**Interfaces:**
- Consumes: `comic.genres`, `filterSafeGenres`
- Produces: Persistent genre badge row in comic detail presentation

- [ ] **Step 1: Update `app/manga/[id]/page.tsx`**
  Instead of conditionally hiding `{comic.genres && filterSafeGenres(comic.genres).length > 0 && ...}`, always display the `Genre:` row. If `safeGenres.length > 0`, render the genre links; otherwise render a neutral pill badge `"Belum Dikategorikan"`.

- [ ] **Step 2: Verify build and types**
  Run: `npm run lint` or `npx tsc --noEmit`

- [ ] **Step 3: Commit**
  ```bash
  git add app/manga/[id]/page.tsx
  git commit -m "feat: display consistent genre row with fallback badge in comic detail"
  ```
