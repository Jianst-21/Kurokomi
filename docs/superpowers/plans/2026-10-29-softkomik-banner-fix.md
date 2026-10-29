# Softkomik Hotlink Protection & Trap Banner Bypass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure all Softkomik comic chapter pages load real manga/manhwa images properly without being replaced by the stretched promotional banner (`baca di web softkomik.org`), by extracting and attaching dynamic access tokens and blocking trap banners at the proxy layer.

**Architecture:** 
1. In `lib/softkomik.ts`, enhance token extraction to robustly detect Softkomik's CDN access token (`?id=...` or from page scripts/preload tags) and append it to image URLs with a verified fallback token.
2. In `app/api/image-proxy/route.ts`, intercept trap/banner responses (detecting promo banner byte size / header characteristics) and attempt fallback CDN sources or fresh token query before serving to client.
3. Add unit and integration tests to verify token injection and banner filtering.

**Tech Stack:** Next.js (TypeScript), Vitest

## Global Constraints
- Do not break existing Komiku, Komikindo, MangaDex, or MangaPill scraper and proxy flows.
- Keep Cloudflare Worker proxy (`NEXT_PUBLIC_CF_WORKER_PROXY` / `CF_WORKER_PROXY`) compatibility.

---

### Task 1: Robust Token Extraction & Injection in `lib/softkomik.ts`

**Files:**
- Modify: `lib/softkomik.ts`
- Test: `test/softkomik-token.test.ts`

- [ ] **Step 1: Write the unit test for Softkomik image URL token generation**
- [ ] **Step 2: Run test to verify failure**
- [ ] **Step 3: Implement enhanced token extraction & fallback token in `lib/softkomik.ts`**
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Commit**

### Task 2: Trap Banner Interception in `app/api/image-proxy/route.ts`

**Files:**
- Modify: `app/api/image-proxy/route.ts`
- Test: `test/image-proxy-softkomik.test.ts`

- [ ] **Step 1: Write unit tests for proxy banner interception and fallback**
- [ ] **Step 2: Run test to verify failure**
- [ ] **Step 3: Implement banner detection and auto-recovery in image proxy route**
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Commit**

### Task 3: Full End-to-End Verification

- [ ] **Step 1: Run complete vitest test suite**
- [ ] **Step 2: Verify Softkomik chapter 5 image fetching directly**
