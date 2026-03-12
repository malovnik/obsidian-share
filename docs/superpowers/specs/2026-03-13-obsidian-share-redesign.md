# Obsidian Share — Redesign & Bug Fixes Spec

> **Date:** 2026-03-13
> **Approach:** C — Backend bugfixes + Frontend rebuild from scratch
> **Design System:** Hybrid Resonant Brutal (90% light minimalism + 10% hard black accents)
> **Execution:** Swarm agents with worktree isolation + shared contracts

---

## 1. Problems to Solve

### 1.1 Frontmatter leaks into SEO description AND feed snippets
- `generateMetadata()` in `app/s/[id]/page.tsx` takes first 160 chars from raw `content`
- `/api/notes` generates snippets from raw `content` (line 53) — same leak
- YAML frontmatter (`---`, `tags:`, `aliases:`) appears in meta description and feed
- Must use cleaned content (after `stripFrontmatter()`) and strip markdown syntax in BOTH places

### 1.2 Broken URLs with special characters
- `lib/utils/slug.ts` doesn't handle: `пробел — тире`, `&`, `@`, quotes, brackets, emoji, dots, commas
- Pattern ` — ` (space-emdash-space) creates `___` or breaks slug parsing
- Need comprehensive Unicode normalization + extensive edge case coverage

### 1.3 Markdown in SEO description
- Description contains raw markdown: `# heading`, `**bold**`, `[links](url)`, `` `code` ``
- Need `stripMarkdown()` utility applied before description generation

### 1.4 AI-slop design
- Generic gradient backgrounds, blue/indigo color scheme
- No visual identity, looks like every AI-generated template
- Complete frontend rebuild needed

### 1.5 No search
- Only paginated feed exists (`/api/notes`)
- No full-text search, no tag filtering, no discovery beyond scrolling
- Private articles must be strictly excluded at SQL level

---

## 2. Database Changes

### 2.1 New columns in `notes` table
```sql
tags         text[]      -- extracted from frontmatter
readingTime  integer     -- words / 200, calculated on save
searchVector tsvector    -- generated from title + cleaned content
```

Note: `coverUrl` is NOT added to schema for v1. All cards use placeholder covers (black bg + white title). Cover image support is a future enhancement when frontmatter `cover:` field usage is established.

### 2.2 Indexes
```sql
CREATE INDEX idx_notes_search ON notes USING GIN(searchVector);
CREATE INDEX idx_notes_tags ON notes USING GIN(tags);
CREATE INDEX idx_notes_created ON notes(createdAt DESC) WHERE noIndex = false AND isDeleted = false;
```

### 2.3 Migration
- Add columns via Drizzle migration
- Backfill script: parse frontmatter from existing `content`, extract tags, calculate reading time, generate search vectors
- All new articles: automatic extraction on POST /api/share

---

## 3. Backend Fixes

### 3.1 Slug generation (`lib/utils/slug.ts`)
- Unicode NFD normalization + diacritics removal
- Replace ALL non-alphanumeric chars (including ` — `, `&`, `@`, quotes, brackets, emoji) with `_`
- Collapse multiple `_`, trim edges
- Lowercase, truncate to 100 chars
- Edge cases: empty result after sanitization → use nanoid only (full slug becomes `{nanoid}-{id}` — `extractIdFromSlug()` still works since it uses `lastIndexOf('-')`)

### 3.2 SEO description (`app/s/[id]/page.tsx`)
- Description source: `stripFrontmatter(content)` → `stripMarkdown()` → first 160 chars
- `stripMarkdown()` utility in `lib/utils/markdown.ts`: remove `#`, `**`, `*`, `[]()`, `![]()`, `` ` ``, `> `, `---`, `- `, ordered lists
- **PRIVACY GUARD:** For private articles (`noIndex=true`), `generateMetadata()` returns generic metadata ONLY — no content-derived description, no title from article. Use static fallback: `{ title: 'Private Note', description: 'This note is private.' }`

### 3.3 Frontmatter & tag extraction (`app/lib/frontmatter.ts`)
- Extend `parseFrontmatter()` to extract and normalize tags
- Tags normalization: lowercase, trim, deduplicate
- Return `{ data, content, tags: string[] }`
- **OWNERSHIP:** This file is exclusively Backend Surgeon's zone. Search Architect imports and uses it, does NOT modify it.

### 3.4 Feed snippet fix (`app/api/notes/route.ts`)
- Snippets must use `stripFrontmatter(content)` → `stripMarkdown()` → first 200 chars
- Same treatment as SEO description
- `/api/notes` must return shape conforming to `NoteCard` contract (see 6.2)
- **OWNERSHIP:** `/api/notes` modifications assigned to **Search Architect** (since they own schema changes that add `tags`, `readingTime` to the response)
- Fields deliberately removed from response: `updatedAt` (not displayed in new UI), `isPrivate` (redundant — feed only returns public articles)

### 3.5 Search endpoint
```
GET /api/search?q=text&tags=tag1,tag2&limit=20&cursor=ISO_DATE
```
- PostgreSQL `websearch_to_tsquery('russian', q) || websearch_to_tsquery('english', q)` — NOT `to_tsquery` (which throws on malformed user input like unmatched quotes)
- Ranking: `ts_rank(searchVector, query)`
- **STRICT FILTER:** `WHERE noIndex = false AND isDeleted = false` — in SQL, not post-filter
- **Tag filtering:** AND logic — articles must have ALL specified tags. URL `tags=tag1,tag2` means `tags @> ARRAY['tag1','tag2']`
- **Pagination:** Search uses offset-based pagination (`offset` + `limit`), NOT cursor-based. Relevance-ranked results don't have a stable cursor like date-ordered feeds. `FeedResponse` keeps cursor-based (ISO_DATE), `SearchResponse` uses `{ hasMore, offset, limit }`

### 3.6 Tags endpoint
```
GET /api/tags
```
- Aggregate unique tags from public articles only (`WHERE noIndex = false AND isDeleted = false`)
- Response: `{ tags: [{ name: string, count: number }] }`

### 3.7 Related articles query function (NOT an API endpoint)
- Server-side only: `getRelatedArticles(articleId, articleTags)` in `lib/queries/related.ts`
- Called from article page RSC — not exposed as a client-fetchable endpoint
- Query:
  ```sql
  SELECT id, slug, title, tags
  FROM notes
  WHERE tags && $articleTags
    AND noIndex = false
    AND isDeleted = false
    AND id != $currentId
  ORDER BY cardinality(
    ARRAY(SELECT unnest(tags) INTERSECT SELECT unnest($articleTags))
  ) DESC NULLS LAST
  LIMIT 3
  ```
- Uses PostgreSQL `&&` (overlap) for filtering, `INTERSECT` for counting shared tags
- **OWNERSHIP:** Search Architect implements the query function, Design Alchemist consumes it in the page component

### 3.8 POST /api/share modifications
- **OWNERSHIP SPLIT (known conflict zone):**
  - **Backend Surgeon** adds: `readingTime` calculation, `stripMarkdown()` for snippet prep, improved `stripFrontmatter()` with tag extraction
  - **Search Architect** adds: `tags` storage, `searchVector` generation
  - **Conflict area:** Both add fields to the INSERT/UPDATE statement. Integration Welder merges these. Backend Surgeon is merged FIRST, so Search Architect's additions layer on top.
- Backend Surgeon should extract metadata processing into a separate function `processArticleContent(content) => { cleanContent, tags, readingTime, htmlContent }` to reduce merge surface

---

## 4. Frontend — Hybrid Resonant Brutal

### 4.1 Design Tokens
- **Palette:** White (#FFFFFF) primary bg, Black (#000000) accents, Gray scale for text
- **Typography:** Inter Variable, weights 100-600
- **Glassmorphism:** `backdrop-blur-xl`, `bg-white/70`, `border border-white/20`
- **Spacing:** 4px base grid
- **Radius:** Minimal — 2px for subtle, 0px for brutal elements
- **Shadows:** Subtle, not gradient-heavy

### 4.2 Home Page
- **Hero section:** Full-width white, centered search input with black border (brutal accent), minimal subtext
- **Tag filter bar:** Horizontal scrollable chips below hero, glassmorphism pills
- **Card grid:** 3 cols (desktop) → 2 (tablet) → 1 (mobile)
- **Infinite scroll:** Keep cursor-based pagination, trigger on IntersectionObserver

### 4.3 Article Cards (4:5 aspect ratio)
- **All cards use placeholder covers for v1:** Black background, white Inter Variable title centered, thin accent line — the "10% brutal" element. Inverted design creates contrast with white site. Future: cover images from frontmatter
- **Card body:** Title (truncated 2 lines), snippet (truncated 2 lines), tag chips, date, reading time
- **Hover:** Subtle scale + shadow transition

### 4.4 Article Reader Page
- **Layout:** Center column ~680px + sticky right sidebar (desktop), full-width (mobile)
- **Progress bar:** Thin black line at page top, width = scroll percentage
- **Sidebar contents:**
  - Table of Contents (auto-generated from h1-h3)
  - Tags as clickable chips (link to filtered feed)
  - Related articles (by tag intersection, max 3, public only) — data from server component using Search Architect's query function
- **Mobile:** Sidebar hidden, TOC via floating button
- **Typography:** Optimized line-height (1.7), comfortable paragraph spacing

### 4.5 Markdown Styling
- Headings: Inter Variable, bold weights, black
- Code blocks: dark theme with copy button, Prism.js highlighting
- Blockquotes: thick black left border (brutal accent), light gray bg
- Tables: clean, minimal borders
- Images: full-width within column, subtle border-radius
- Lists: proper indentation, custom bullet styling

### 4.6 Private Article Page
- Keep PIN-code flow (PinCodeModal)
- Restyle to match Hybrid Resonant Brutal
- Remove hardcoded PIN → read from article's `password` field properly

---

## 5. Privacy — Ironclad Isolation

### 5.1 Principle
Every public query includes `WHERE noIndex = false AND isDeleted = false` at SQL level. No post-filtering. Private articles never leave the database through public endpoints.

### 5.2 Audit Points
| Endpoint | Privacy | Owner |
|----------|---------|-------|
| `GET /api/notes` | SQL WHERE filter | Search Architect |
| `GET /api/search` | SQL WHERE from day one | Search Architect |
| `GET /api/tags` | Aggregate only from public | Search Architect |
| Related articles query | Server-side, same WHERE | Search Architect |
| `generateMetadata()` | Generic meta for private articles | Backend Surgeon |
| Sitemap (future, not in scope) | Only public | — |

---

## 6. Swarm Agent Architecture

### 6.1 Roles

**Backend Surgeon**
- Zone: `slug.ts`, `frontmatter.ts`, `lib/utils/markdown.ts` (new), SEO in `page.tsx`, reading time, `processArticleContent()` in `POST /api/share`
- Soul: Perfectionist — "a broken URL = a lost reader"
- Worktree: `fix/backend-bugs`

**Search Architect**
- Zone: schema migration, `/api/search`, `/api/tags`, `/api/notes` (update to NoteCard shape), related articles query, `searchVector` + `tags` storage in `POST /api/share`
- Soul: Privacy Paranoiac — "not a single private byte leaks"
- Worktree: `feat/search-and-tags`
- **Depends on:** Backend Surgeon's `parseFrontmatter()` with tag extraction (imports it, does not modify)

**Design Alchemist**
- Zone: All UI components, `globals.css`, layout, design tokens, placeholder covers
- Soul: Brutalist Aesthete — "90% silence, 10% punch"
- Worktree: `feat/redesign-brutal`
- **Depends on:** Shared contracts for component prop types

**Integration Welder**
- Zone: Merge, conflict resolution, end-to-end verification
- Soul: Systems Thinker — "it works only when EVERYTHING works together"
- Branch: `main` (merges into)

### 6.2 Shared Contracts (defined before Phase 1)
```typescript
// types/contracts.ts

export interface NoteCard {
  id: string;
  slug: string;
  title: string;
  snippet: string;
  tags: string[];
  readingTime: number;
  createdAt: string;
  viewCount: number;
}

export interface SearchResult extends NoteCard {
  relevance: number;
}

export interface FeedResponse {
  notes: NoteCard[];
  pagination: {
    hasMore: boolean;
    nextCursor: string | null;
    limit: number;
  };
}

export interface SearchResponse {
  notes: SearchResult[];
  pagination: {
    hasMore: boolean;
    offset: number;
    limit: number;
  };
}

export interface TagInfo {
  name: string;
  count: number;
}

export interface RelatedArticle {
  id: string;
  slug: string;
  title: string;
  tags: string[];
}
```

### 6.3 Known Conflict Zones
| File | Backend Surgeon | Search Architect | Design Alchemist |
|------|----------------|-----------------|-----------------|
| `POST /api/share` | readingTime, processArticleContent() | tags, searchVector | — |
| `app/s/[id]/page.tsx` | SEO fix, generateMetadata() | — | Reader redesign |
| `app/lib/frontmatter.ts` | Tag extraction (OWNER) | Imports only | — |
| `app/api/notes/route.ts` | — | NoteCard shape, snippet fix (OWNER) | — |

**Resolution strategy:** Backend Surgeon merged first. His `processArticleContent()` function isolates content processing — Search Architect adds `tags` + `searchVector` to the result. Design Alchemist's page.tsx changes are structural (JSX/CSS), so conflicts with Backend Surgeon's metadata function are minimal.

### 6.4 Execution Phases

```
Phase 0: CONTRACTS
└── Create types/contracts.ts, commit to main, branch worktrees

Phase 1: PARALLEL (worktree isolation)
├── Backend Surgeon → slug.ts, frontmatter.ts, markdown.ts, SEO, readingTime
├── Search Architect → schema migration, /api/search, /api/tags, /api/notes update
└── Design Alchemist → components, layout, globals.css, design tokens

Phase 2: MERGE + INTEGRATION (sequential)
└── Integration Welder →
    1. Merge fix/backend-bugs → main (resolve conflicts, verify build)
    2. Merge feat/search-and-tags → main (resolve conflicts, verify build + search)
    3. Merge feat/redesign-brutal → main (resolve conflicts, wire UI to APIs)

Phase 3: VERIFICATION (parallel)
├── Backend Surgeon → verify URL patterns, SEO output, private meta guard
├── Search Architect → verify privacy (attempt to find private via search/tags/related)
└── Design Alchemist → verify responsive, visual consistency, all card states
```

### 6.5 Synchronization Points
- Pre-Phase 1: `types/contracts.ts` committed to main, all worktrees branch from it
- Post-Phase 1: each worktree must pass `npm run build`
- Merge order: Backend → Search → Design (stability first, visual last)
- Post-merge: full build + manual spot check

---

## 7. Chain of Thought — Execution Plan

### Step 1: PREPARATION (5 substeps)
1. Create `types/contracts.ts` with shared types (NoteCard, SearchResult, FeedResponse, SearchResponse, TagInfo, RelatedArticle)
2. Create 4 roles via role-factory (Backend Surgeon, Search Architect, Design Alchemist, Integration Welder) — each with Chain of Thought system prompt + Soul element
3. Load `my-design-system` skill content for Design Alchemist's system prompt
4. Commit contracts to main
5. Create 3 git worktrees from main

### Step 2: BACKEND SURGEON (worktree: fix/backend-bugs)
1. **Fix slug generation** (5 substeps)
   1. Read current `slug.ts`, identify all failing patterns
   2. Add Unicode NFD normalization, strip diacritics
   3. Expand replacement: all non-`[a-z0-9]` → `_`, including em-dash, en-dash, quotes, brackets, emoji
   4. Handle edge cases: empty result → nanoid only, very long titles → truncate intelligently
   5. Verify `extractIdFromSlug()` still works with all new patterns
2. **Create stripMarkdown utility** (4 substeps)
   1. Create `lib/utils/markdown.ts`
   2. Implement regex chain: headings, bold/italic, links, images, code, blockquotes, lists, horizontal rules
   3. Preserve plain text content, collapse whitespace
   4. Export for use in SEO + snippets
3. **Fix SEO description** (4 substeps)
   1. Modify `generateMetadata()` — use `stripFrontmatter()` → `stripMarkdown()` → truncate 160
   2. Add privacy guard: `noIndex=true` → generic meta only, no content leak
   3. Verify Open Graph tags also use clean description
   4. Verify Twitter card description
4. **Fix frontmatter extraction** (3 substeps)
   1. Extend `parseFrontmatter()` — extract `tags` from YAML data
   2. Normalize: lowercase, trim whitespace, deduplicate, filter empty
   3. Handle missing/malformed tags gracefully (return `[]`)
5. **Create processArticleContent()** (5 substeps)
   1. New function in `lib/utils/content.ts`
   2. Input: raw markdown content + title
   3. Output: `{ cleanContent, htmlContent, tags, readingTime, snippet }`
   4. Reading time: split by whitespace, divide by 200, round up
   5. Integrate into `POST /api/share` — single processing pipeline
6. **Build verification**
   1. `npm run build` — must pass
   2. Commit all changes to `fix/backend-bugs`

### Step 3: SEARCH ARCHITECT (worktree: feat/search-and-tags)
1. **Schema migration** (5 substeps)
   1. Add `tags text[]` column to schema.ts (default: `[]`)
   2. Add `readingTime integer` column (default: `0`)
   3. Add `searchVector tsvector` column
   4. Create GIN indexes on `searchVector` and `tags`
   5. Create partial index on `createdAt` for public articles
2. **Backfill script** (4 substeps)
   1. Create `scripts/backfill.ts`
   2. Fetch all articles, parse frontmatter (import from `app/lib/frontmatter.ts`)
   3. Extract tags, calculate reading time, generate search vectors
   4. Batch update in transactions
3. **Update /api/notes** (4 substeps)
   1. Add `tags`, `readingTime` to SELECT
   2. Fix snippet: use `stripFrontmatter()` → `stripMarkdown()` → truncate 200
   3. Response shape must match `NoteCard` contract exactly
   4. Remove `updatedAt` and `isPrivate` from response (intentional — not used in new UI)
4. **Search endpoint** (6 substeps)
   1. Create `app/api/search/route.ts`
   2. Parse query params: `q`, `tags` (comma-separated), `limit`, `cursor`
   3. Build FTS query: `websearch_to_tsquery('russian', q) || websearch_to_tsquery('english', q)`
   4. **STRICT WHERE:** `noIndex = false AND isDeleted = false`
   5. Tag filter: `tags @> ARRAY[...]::text[]` (AND logic — must have ALL)
   6. Response: `SearchResponse` contract with `relevance` from `ts_rank()`
5. **Tags endpoint** (3 substeps)
   1. Create `app/api/tags/route.ts`
   2. `SELECT unnest(tags) as tag, COUNT(*) FROM notes WHERE noIndex = false AND isDeleted = false GROUP BY tag ORDER BY count DESC`
   3. Response: `{ tags: TagInfo[] }`
6. **Related articles query** (4 substeps)
   1. Create `lib/queries/related.ts` — exported function, NOT an API route
   2. Query: `WHERE tags && $tags AND noIndex = false AND isDeleted = false AND id != $id ORDER BY cardinality(ARRAY(SELECT unnest(tags) INTERSECT SELECT unnest($tags))) DESC NULLS LAST LIMIT 3`
   3. Return: `RelatedArticle[]`
   4. Design Alchemist imports this in the article RSC page
7. **Privacy verification** (3 substeps)
   1. Document manual test: create private article with tags
   2. Search with matching text — must return 0
   3. Check tags endpoint — private article's tags must not appear if no public article shares them
8. **Build verification**
   1. `npm run build` — must pass
   2. Commit all changes to `feat/search-and-tags`

### Step 4: DESIGN ALCHEMIST (worktree: feat/redesign-brutal)
1. **Design tokens & globals.css** (5 substeps)
   1. Load `my-design-system` skill for reference
   2. Define CSS custom properties: `--color-bg`, `--color-accent`, `--color-text-*`, `--font-*`, `--space-*`
   3. Rewrite `globals.css`: remove all gradient/blue/indigo, apply Hybrid Resonant Brutal palette
   4. `.markdown-body` styles: headings (Inter bold black), code blocks (dark + copy btn), blockquotes (thick black left border), tables (minimal)
   5. Responsive breakpoints: `sm:640px`, `md:768px`, `lg:1024px`, `xl:1280px`
2. **Layout & navigation** (4 substeps)
   1. Rewrite `app/layout.tsx`: Inter Variable font, clean `<html>` setup
   2. Header component: site name (left), search icon trigger (right), minimal, black on white
   3. Footer: minimal, single line
   4. Meta tags: default OG image, site-wide SEO defaults
3. **Home page** (7 substeps)
   1. Hero section: full-width, centered `<input>` with 2px black border, placeholder text, subtle animation on focus
   2. Tag filter bar: horizontal scroll `<div>`, pill-shaped chips, glassmorphism bg, active state = black fill
   3. Card grid: CSS grid `repeat(auto-fill, minmax(300px, 1fr))`, gap-6
   4. `ArticleCard` component: 4:5 aspect-ratio container, placeholder cover (black bg + white title text + thin line), card body below
   5. Placeholder cover: CSS-only, no image generation. `<div>` with black bg, centered white text (title truncated to 3 lines), thin horizontal accent line at bottom
   6. Infinite scroll: IntersectionObserver on sentinel div, loads next page via fetch
   7. Loading skeleton: pulsing card outlines in brutal style (black borders, no rounded corners)
4. **Article reader page** (6 substeps)
   1. Two-column layout: `<main>` (max-w-[680px]) + `<aside>` (w-64, sticky top-20)
   2. Sidebar: TOC (parsed from h1-h3 in HTML content), tag chips (link to `/?tags=name`), related articles (title + tags)
   3. TOC: highlight current section on scroll (IntersectionObserver on headings)
   4. Progress bar: fixed top-0, height 2px, black, width calculated from `scrollY / (docHeight - viewportHeight)`
   5. Mobile: sidebar hidden, floating button (bottom-right) toggles TOC drawer
   6. Related articles: import `getRelatedArticles()` from `lib/queries/related.ts`, render as cards
5. **Private article page** (3 substeps)
   1. Restyle `PinCodeModal`: black border inputs, Inter font, brutal aesthetic, no gradients
   2. Private page wrapper: centered, clean messaging
   3. Keep session-based verification flow
6. **Search interaction** (4 substeps)
   1. Search bar in hero + header: shared component
   2. Debounced fetch to `/api/search?q=...` (300ms debounce)
   3. Results: same card grid below, replacing feed. Empty state: "No results" message
   4. Tag filter: clickable chips set URL param `?tags=`, combinable with search
7. **Build verification**
   1. `npm run build` — must pass
   2. Commit all changes to `feat/redesign-brutal`

### Step 5: INTEGRATION WELDER (7 substeps)
1. **Merge Backend Surgeon** (3 substeps)
   1. `git merge fix/backend-bugs` into main
   2. Resolve any conflicts (unlikely — mostly new files)
   3. `npm run build` — verify
2. **Merge Search Architect** (4 substeps)
   1. `git merge feat/search-and-tags` into main
   2. Resolve conflicts in `POST /api/share` (add `tags` + `searchVector` to Backend Surgeon's `processArticleContent()` pipeline)
   3. Verify search works, privacy holds
   4. `npm run build` — verify
3. **Merge Design Alchemist** (5 substeps)
   1. `git merge feat/redesign-brutal` into main
   2. Resolve conflicts in `app/s/[id]/page.tsx` (Backend Surgeon's metadata + Design Alchemist's layout)
   3. Wire: search UI → `/api/search`, tag filter → `/api/tags`, related articles → `getRelatedArticles()`
   4. Wire: `NoteCard` data → `ArticleCard` component props
   5. `npm run build` — verify
4. **End-to-end verification** (7 substeps)
   1. Create test article with frontmatter + tags via POST /api/share
   2. Verify slug is clean (no special chars, no triple underscores)
   3. Verify SEO description is clean (no YAML, no markdown)
   4. Search for article by title text — must find it
   5. Create private article — search must return 0, tags must not leak
   6. Check responsive: mobile (375px), tablet (768px), desktop (1280px)
   7. Visual audit: all cards same height, placeholders look intentional not broken
5. **Run migration on fresh DB** — verify schema + indexes
6. **Run backfill** — verify existing articles get tags + search vectors
7. **Final `npm run build`** — clean build, no warnings

### Step 6: DOCUMENTATION & CLEANUP (4 substeps)
1. Update README.md: new features (search, tags, redesign), new env vars if any
2. Remove unused old components (old NotesFeed, old card styles)
3. Clean up debug artifacts, console.logs
4. Final build verification
