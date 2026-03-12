# Obsidian Share Redesign — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 5 critical bugs (frontmatter leak, broken URLs, markdown in SEO, AI-slop design, no search) and rebuild the frontend with Hybrid Resonant Brutal design system, adding full-text search with tags and privacy-first omnisearch.

**Architecture:** Swarm of 4 agents working in git worktree isolation with shared TypeScript contracts. Backend Surgeon fixes data pipeline, Search Architect adds PostgreSQL FTS + tags, Design Alchemist rebuilds all UI, Integration Welder merges and verifies.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 3.4, TypeScript 5, PostgreSQL + Drizzle ORM, gray-matter, marked, transliteration, Prism.js

**Spec:** `docs/superpowers/specs/2026-03-13-obsidian-share-redesign.md`

---

## Chunk 1: Phase 0 — Preparation

### Task 0.1: Create Shared Contracts

**Files:**
- Create: `types/contracts.ts`

- [ ] **Step 1: Create the contracts file**

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

- [ ] **Step 2: Verify TypeScript compilation**

Run: `cd /Users/malovnik/Documents/Dev/obsidian-share && npx tsc --noEmit types/contracts.ts`
Expected: No errors

- [ ] **Step 3: Commit contracts to main**

```bash
cd /Users/malovnik/Documents/Dev/obsidian-share
git add types/contracts.ts
git commit -m "feat: add shared type contracts for swarm agents"
```

### Task 0.2: Create Git Worktrees

**Files:**
- No files modified

- [ ] **Step 1: Create three worktrees**

```bash
cd /Users/malovnik/Documents/Dev/obsidian-share
git worktree add ../obsidian-share-backend fix/backend-bugs 2>/dev/null || git worktree add -b fix/backend-bugs ../obsidian-share-backend
git worktree add ../obsidian-share-search feat/search-and-tags 2>/dev/null || git worktree add -b feat/search-and-tags ../obsidian-share-search
git worktree add ../obsidian-share-design feat/redesign-brutal 2>/dev/null || git worktree add -b feat/redesign-brutal ../obsidian-share-design
```

- [ ] **Step 2: Verify worktrees exist**

```bash
git worktree list
```
Expected: 4 entries (main + 3 branches)

- [ ] **Step 3: Install deps in each worktree**

```bash
cd ../obsidian-share-backend && npm install
cd ../obsidian-share-search && npm install
cd ../obsidian-share-design && npm install
```

---

## Chunk 2: Phase 1A — Backend Surgeon

> **Worktree:** `/Users/malovnik/Documents/Dev/obsidian-share-backend`
> **Branch:** `fix/backend-bugs`
> **Role:** Backend Surgeon — Perfectionist ("a broken URL = a lost reader")

### Task 1A.1: Fix Slug Generation

**Files:**
- Modify: `lib/utils/slug.ts`

- [ ] **Step 1: Rewrite generateSlug() with comprehensive sanitization**

Replace the entire `generateSlug` function in `lib/utils/slug.ts`:

```typescript
export function generateSlug(title: string): string {
  // Step 1: Unicode NFD normalization + strip diacritics
  let processed = title.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Step 2: Transliterate Cyrillic → Latin
  processed = transliterate(processed);

  // Step 3: Replace ALL non-alphanumeric with underscore
  // Handles: em-dash, en-dash, quotes, brackets, emoji, dots, commas, etc.
  processed = processed.replace(/[^a-zA-Z0-9]/g, '_');

  // Step 4: Collapse multiple underscores
  processed = processed.replace(/_+/g, '_');

  // Step 5: Trim leading/trailing underscores
  processed = processed.replace(/^_+|_+$/g, '');

  // Step 6: Lowercase
  processed = processed.toLowerCase();

  // Step 7: Truncate to 100 chars (avoid cutting mid-word)
  if (processed.length > 100) {
    processed = processed.substring(0, 100);
    const lastUnderscore = processed.lastIndexOf('_');
    if (lastUnderscore > 80) {
      processed = processed.substring(0, lastUnderscore);
    }
  }

  return processed;
}
```

- [ ] **Step 2: Handle empty slug edge case in createFullSlug()**

Replace `createFullSlug` in `lib/utils/slug.ts`:

```typescript
export function createFullSlug(title: string, id: string): string {
  const slug = generateSlug(title);
  // If slug is empty (all special chars / emoji-only title), use just the ID
  if (!slug) {
    return id;
  }
  return `${slug}-${id}`;
}
```

- [ ] **Step 3: Verify build**

Run: `cd /Users/malovnik/Documents/Dev/obsidian-share-backend && npm run build`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add lib/utils/slug.ts
git commit -m "fix: comprehensive slug sanitization with Unicode NFD normalization"
```

### Task 1A.2: Create stripMarkdown Utility

**Files:**
- Create: `lib/utils/markdown.ts`

- [ ] **Step 1: Create the utility**

```typescript
// lib/utils/markdown.ts

/**
 * Strips markdown syntax from text, returning plain text.
 * Used for SEO descriptions and feed snippets.
 */
export function stripMarkdown(text: string): string {
  return text
    // Remove images: ![alt](url)
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    // Remove links: [text](url) → text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    // Remove reference links: [text][ref]
    .replace(/\[([^\]]*)\]\[[^\]]*\]/g, '$1')
    // Remove inline code: `code` → code
    .replace(/`([^`]*)`/g, '$1')
    // Remove code blocks: ```...```
    .replace(/```[\s\S]*?```/g, '')
    // Remove heading markers: ### heading → heading
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bold/italic: **text** or __text__ → text
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
    .replace(/_{1,3}([^_]+)_{1,3}/g, '$1')
    // Remove strikethrough: ~~text~~ → text
    .replace(/~~([^~]+)~~/g, '$1')
    // Remove blockquote markers: > text → text
    .replace(/^>\s+/gm, '')
    // Remove horizontal rules: --- or *** or ___
    .replace(/^[-*_]{3,}\s*$/gm, '')
    // Remove unordered list markers: - item or * item
    .replace(/^[\s]*[-*+]\s+/gm, '')
    // Remove ordered list markers: 1. item
    .replace(/^[\s]*\d+\.\s+/gm, '')
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Collapse multiple whitespace/newlines
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/malovnik/Documents/Dev/obsidian-share-backend && npm run build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add lib/utils/markdown.ts
git commit -m "feat: add stripMarkdown utility for clean SEO descriptions"
```

### Task 1A.3: Fix SEO Description + Privacy Guard

**Files:**
- Modify: `app/s/[id]/page.tsx`

- [ ] **Step 1: Add imports and fix generateMetadata()**

In `app/s/[id]/page.tsx`, replace the `generateMetadata` function (lines 196-307):

```typescript
import { stripFrontmatter } from '@/app/lib/frontmatter';
import { stripMarkdown } from '@/lib/utils/markdown';

// ... (keep existing getNote, getNoteMeta, NotePage functions) ...

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id: idOrSlug } = await params;

  // First check privacy — don't load full content for private articles
  const meta = await getNoteMeta(idOrSlug);
  if (!meta) {
    return {
      title: 'Заметка не найдена | Obsidian Share',
      description: 'Запрошенная заметка не найдена или была удалена',
    };
  }

  // PRIVACY GUARD: Private articles get generic metadata only
  if (meta.noIndex) {
    return {
      title: 'Private Note',
      description: 'This note is private.',
      robots: {
        index: false,
        follow: false,
        nocache: true,
        noarchive: true,
        nosnippet: true,
        noimageindex: true,
        googleBot: {
          index: false,
          follow: false,
          'max-image-preview': 'none' as const,
          'max-snippet': 0,
        },
      },
    };
  }

  // Public article — load content for rich metadata
  const note = await getNote(idOrSlug);
  if (!note) {
    return {
      title: 'Заметка не найдена | Obsidian Share',
      description: 'Запрошенная заметка не найдена или была удалена',
    };
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://read.malovnik.ru';
  const url = `${baseUrl}/s/${idOrSlug}`;
  // Clean description: strip frontmatter → strip markdown → truncate
  const cleanContent = stripFrontmatter(note.content);
  const description = stripMarkdown(cleanContent).substring(0, 160);
  const authorName = 'Малов Никита';
  const siteName = 'Блог Малова Никиты';

  return {
    title: `${note.title} | ${authorName}`,
    description,
    authors: [{ name: authorName }],
    creator: authorName,
    publisher: authorName,
    keywords: [note.title, 'заметки', 'obsidian', 'малов никита', 'личный блог', 'статьи'],
    openGraph: {
      type: 'article',
      url,
      title: note.title,
      description,
      siteName,
      locale: 'ru_RU',
      publishedTime: note.createdAt,
      authors: [authorName],
      images: [{ url: `${baseUrl}/og-image.png`, width: 1200, height: 630, alt: note.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: note.title,
      description,
      creator: '@malovkaif',
      images: [`${baseUrl}/og-image.png`],
    },
    robots: {
      index: true,
      follow: true,
    },
    alternates: {
      canonical: url,
    },
  };
}
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/malovnik/Documents/Dev/obsidian-share-backend && npm run build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add app/s/[id]/page.tsx
git commit -m "fix: clean SEO description from frontmatter/markdown, add privacy guard"
```

### Task 1A.4: Extend Frontmatter with Tag Extraction

**Files:**
- Modify: `app/lib/frontmatter.ts`

- [ ] **Step 1: Add tag extraction to parseFrontmatter()**

Replace entire `app/lib/frontmatter.ts`:

```typescript
import matter from 'gray-matter';

/**
 * Strips YAML frontmatter from markdown content
 */
export function stripFrontmatter(content: string): string {
  const { content: cleanContent } = matter(content);
  return cleanContent;
}

/**
 * Parses frontmatter and extracts structured data including tags
 */
export function parseFrontmatter(content: string): {
  data: Record<string, unknown>;
  content: string;
  tags: string[];
} {
  const { data, content: cleanContent } = matter(content);

  // Extract and normalize tags
  let tags: string[] = [];
  const rawTags = data.tags;

  if (Array.isArray(rawTags)) {
    tags = rawTags
      .map((t: unknown) => String(t).trim().toLowerCase())
      .filter((t: string) => t.length > 0);
  } else if (typeof rawTags === 'string') {
    tags = rawTags
      .split(',')
      .map((t: string) => t.trim().toLowerCase())
      .filter((t: string) => t.length > 0);
  }

  // Deduplicate
  tags = [...new Set(tags)];

  return { data, content: cleanContent, tags };
}
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/malovnik/Documents/Dev/obsidian-share-backend && npm run build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add app/lib/frontmatter.ts
git commit -m "feat: add tag extraction and normalization to frontmatter parser"
```

### Task 1A.5: Create processArticleContent Pipeline

**Files:**
- Create: `lib/utils/content.ts`
- Modify: `app/api/share/route.ts`

- [ ] **Step 1: Create content processing pipeline**

```typescript
// lib/utils/content.ts
import { marked } from 'marked';
import { parseFrontmatter } from '@/app/lib/frontmatter';
import { stripMarkdown } from '@/lib/utils/markdown';

export interface ProcessedContent {
  cleanContent: string;
  htmlContent: string;
  tags: string[];
  readingTime: number;
  snippet: string;
}

/**
 * Single processing pipeline for article content.
 * Extracts tags, generates HTML, calculates reading time, creates snippet.
 */
export async function processArticleContent(rawContent: string): Promise<ProcessedContent> {
  // Parse frontmatter and extract tags
  const { content: cleanContent, tags } = parseFrontmatter(rawContent);

  // Render markdown to HTML
  const htmlContent = await marked(cleanContent);

  // Calculate reading time (words / 200, minimum 1 minute)
  const wordCount = cleanContent.split(/\s+/).filter(Boolean).length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  // Generate clean snippet for feeds/SEO
  const snippet = stripMarkdown(cleanContent).substring(0, 200);

  return { cleanContent, htmlContent, tags, readingTime, snippet };
}
```

- [ ] **Step 2: Integrate into POST /api/share**

Replace the content processing section in `app/api/share/route.ts` (lines 30-33):

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { notes } from '@/lib/db/schema';
import { generateSlug, createFullSlug } from '@/lib/utils/slug';
import { processArticleContent } from '@/lib/utils/content';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      content,
      theme = 'default',
      customCss,
      password,
      expiresInDays,
      sourceId,
      noIndex = false
    } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      );
    }

    // Process content through unified pipeline
    const { htmlContent, tags, readingTime } = await processArticleContent(content);

    let expiresAt = null;
    if (expiresInDays && expiresInDays > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    }

    // Check if note with this sourceId already exists (for updates)
    let existingNote = null;
    if (sourceId) {
      const results = await db
        .select()
        .from(notes)
        .where(eq(notes.sourceId, sourceId))
        .limit(1);
      existingNote = results[0];
    }

    let note;
    let isUpdate = false;

    if (existingNote) {
      isUpdate = true;
      const slug = generateSlug(title);
      const updated = await db
        .update(notes)
        .set({
          title,
          content,
          htmlContent,
          slug,
          theme,
          customCss,
          password,
          expiresAt,
          noIndex,
          updatedAt: new Date(),
          // tags and readingTime added by Search Architect after merge
        })
        .where(eq(notes.id, existingNote.id))
        .returning();
      note = updated[0];
    } else {
      const id = nanoid(8);
      const slug = generateSlug(title);
      const inserted = await db
        .insert(notes)
        .values({
          id,
          slug,
          sourceId,
          title,
          content,
          htmlContent,
          theme,
          customCss,
          password,
          expiresAt,
          noIndex,
          // tags and readingTime added by Search Architect after merge
        })
        .returning();
      note = inserted[0];
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${request.nextUrl.protocol}//${request.nextUrl.host}`;
    const fullSlug = createFullSlug(note.title, note.id);
    const shareUrl = `${baseUrl}/s/${fullSlug}`;

    return NextResponse.json({
      success: true,
      id: note.id,
      slug: fullSlug,
      url: shareUrl,
      expiresAt: note.expiresAt,
      isUpdate,
    });
  } catch (error) {
    console.error('Share error:', error);
    return NextResponse.json(
      { error: 'Failed to create share link' },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
```

Note: The comments `// tags and readingTime added by Search Architect after merge` are placeholders for the Integration Welder. Backend Surgeon produces `tags` and `readingTime` via `processArticleContent()` but doesn't write them to DB yet (schema columns don't exist on this branch). Search Architect adds the columns and the DB writes.

- [ ] **Step 3: Verify build**

Run: `cd /Users/malovnik/Documents/Dev/obsidian-share-backend && npm run build`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add lib/utils/content.ts app/api/share/route.ts
git commit -m "feat: unified content processing pipeline with readingTime and tags"
```

---

## Chunk 3: Phase 1B — Search Architect

> **Worktree:** `/Users/malovnik/Documents/Dev/obsidian-share-search`
> **Branch:** `feat/search-and-tags`
> **Role:** Search Architect — Privacy Paranoiac ("not a single private byte leaks")

### Task 1B.1: Schema Migration — Add Columns and Indexes

**Files:**
- Modify: `lib/db/schema.ts`

- [ ] **Step 1: Add new columns to schema**

Add to `lib/db/schema.ts`, inside the `pgTable` definition, after `authorId`:

```typescript
import { pgTable, text, timestamp, integer, boolean, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const notes = pgTable('notes', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull(),
  sourceId: text('source_id'),
  title: text('title').notNull(),
  content: text('content').notNull(),
  htmlContent: text('html_content'),
  theme: text('theme').default('default'),
  customCss: text('custom_css'),
  password: text('password'),
  expiresAt: timestamp('expires_at'),
  viewCount: integer('view_count').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  isDeleted: boolean('is_deleted').default(false),
  noIndex: boolean('no_index').default(false),
  authorId: text('author_id'),
  // New columns
  tags: text('tags').array().default(sql`'{}'::text[]`),
  readingTime: integer('reading_time').default(0),
});

export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;
```

Note: `searchVector` (tsvector) is not natively supported in Drizzle's pgTable helper. It will be added via raw SQL migration.

- [ ] **Step 2: Push schema changes**

Run: `cd /Users/malovnik/Documents/Dev/obsidian-share-search && npx drizzle-kit push`
Expected: Schema updated with new columns (requires DATABASE_URL)

Note: If no DATABASE_URL locally, just verify the schema compiles: `npm run build`

- [ ] **Step 3: Create raw SQL migration for tsvector and indexes**

Create `drizzle/0001_add_search_vector.sql`:

```sql
-- Add tsvector column (not supported by Drizzle schema DSL)
ALTER TABLE notes ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create GIN indexes
CREATE INDEX IF NOT EXISTS idx_notes_search ON notes USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_notes_tags ON notes USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_notes_public_created ON notes(created_at DESC)
  WHERE no_index = false AND is_deleted = false;

-- Create trigger to auto-update search_vector on INSERT/UPDATE
CREATE OR REPLACE FUNCTION notes_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('russian', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('russian', COALESCE(
      regexp_replace(NEW.content, E'^---[\\s\\S]*?---\\s*', '', 'g'), ''
    )), 'B') ||
    setweight(to_tsvector('english', COALESCE(
      regexp_replace(NEW.content, E'^---[\\s\\S]*?---\\s*', '', 'g'), ''
    )), 'B');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS notes_search_vector_trigger ON notes;
CREATE TRIGGER notes_search_vector_trigger
  BEFORE INSERT OR UPDATE OF title, content ON notes
  FOR EACH ROW EXECUTE FUNCTION notes_search_vector_update();

-- Backfill existing rows
UPDATE notes SET search_vector =
  setweight(to_tsvector('russian', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('russian', COALESCE(
    regexp_replace(content, E'^---[\\s\\S]*?---\\s*', '', 'g'), ''
  )), 'B') ||
  setweight(to_tsvector('english', COALESCE(
    regexp_replace(content, E'^---[\\s\\S]*?---\\s*', '', 'g'), ''
  )), 'B');
```

- [ ] **Step 4: Commit schema changes**

```bash
git add lib/db/schema.ts drizzle/
git commit -m "feat: add tags, readingTime columns and full-text search infrastructure"
```

### Task 1B.2: Create Backfill Script

**Files:**
- Create: `scripts/backfill.ts`

- [ ] **Step 1: Create backfill script**

```typescript
// scripts/backfill.ts
import 'dotenv/config';
import { db } from '../lib/db';
import { notes } from '../lib/db/schema';
import { parseFrontmatter } from '../app/lib/frontmatter';
import { eq } from 'drizzle-orm';

async function backfill() {
  console.log('Starting backfill...');

  const allNotes = await db.select().from(notes);
  console.log(`Found ${allNotes.length} notes to process`);

  let updated = 0;
  for (const note of allNotes) {
    const { tags } = parseFrontmatter(note.content);
    const wordCount = note.content.split(/\s+/).filter(Boolean).length;
    const readingTime = Math.max(1, Math.ceil(wordCount / 200));

    await db
      .update(notes)
      .set({ tags, readingTime })
      .where(eq(notes.id, note.id));

    updated++;
    if (updated % 10 === 0) {
      console.log(`Processed ${updated}/${allNotes.length}`);
    }
  }

  console.log(`Backfill complete: ${updated} notes updated`);
  process.exit(0);
}

backfill().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
```

- [ ] **Step 2: Add backfill script to package.json**

Add to `scripts` in `package.json`:
```json
"db:backfill": "npx tsx scripts/backfill.ts"
```

- [ ] **Step 3: Commit**

```bash
git add scripts/backfill.ts package.json
git commit -m "feat: add backfill script for tags and readingTime"
```

### Task 1B.3: Update /api/notes to NoteCard Shape

**Files:**
- Modify: `app/api/notes/route.ts`

- [ ] **Step 1: Rewrite /api/notes with NoteCard contract**

Replace entire `app/api/notes/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { notes } from '@/lib/db/schema';
import { desc, and, eq, lt } from 'drizzle-orm';
import { stripFrontmatter } from '@/app/lib/frontmatter';
import { stripMarkdown } from '@/lib/utils/markdown';
import { createFullSlug } from '@/lib/utils/slug';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10');
    const cursor = searchParams.get('cursor');

    const validLimit = Math.min(Math.max(limit, 1), 50);

    const conditions = [
      eq(notes.isDeleted, false),
      eq(notes.noIndex, false), // STRICT: only public articles
    ];

    if (cursor) {
      conditions.push(lt(notes.createdAt, new Date(cursor)));
    }

    const fetchedNotes = await db
      .select({
        id: notes.id,
        slug: notes.slug,
        title: notes.title,
        content: notes.content,
        tags: notes.tags,
        readingTime: notes.readingTime,
        createdAt: notes.createdAt,
        viewCount: notes.viewCount,
      })
      .from(notes)
      .where(and(...conditions))
      .orderBy(desc(notes.createdAt))
      .limit(validLimit + 1);

    const hasMore = fetchedNotes.length > validLimit;
    const notesToReturn = hasMore ? fetchedNotes.slice(0, validLimit) : fetchedNotes;

    // NoteCard contract shape
    const notesResponse = notesToReturn.map((note) => {
      const cleanContent = stripFrontmatter(note.content);
      const snippet = stripMarkdown(cleanContent).substring(0, 200);
      const fullSlug = createFullSlug(note.title, note.id);

      return {
        id: note.id,
        slug: fullSlug,
        title: note.title,
        snippet: snippet + (cleanContent.length > 200 ? '...' : ''),
        tags: note.tags || [],
        readingTime: note.readingTime || 1,
        createdAt: note.createdAt.toISOString(),
        viewCount: note.viewCount || 0,
      };
    });

    const nextCursor = hasMore
      ? notesToReturn[notesToReturn.length - 1].createdAt.toISOString()
      : null;

    return NextResponse.json({
      notes: notesResponse,
      pagination: {
        hasMore,
        nextCursor,
        limit: validLimit,
      },
    });
  } catch (error) {
    console.error('Notes API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notes' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/malovnik/Documents/Dev/obsidian-share-search && npm run build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add app/api/notes/route.ts
git commit -m "feat: update /api/notes to NoteCard contract with clean snippets"
```

### Task 1B.4: Create Search Endpoint

**Files:**
- Create: `app/api/search/route.ts`

- [ ] **Step 1: Create search API**

```typescript
// app/api/search/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { notes } from '@/lib/db/schema';
import { and, eq, sql } from 'drizzle-orm';
import { stripFrontmatter } from '@/app/lib/frontmatter';
import { stripMarkdown } from '@/lib/utils/markdown';
import { createFullSlug } from '@/lib/utils/slug';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const q = searchParams.get('q') || '';
    const tagsParam = searchParams.get('tags') || '';
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20'), 1), 50);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);

    if (!q && !tagsParam) {
      return NextResponse.json({ notes: [], pagination: { hasMore: false, offset: 0, limit } });
    }

    // Build conditions array
    const conditions = [
      eq(notes.isDeleted, false),
      eq(notes.noIndex, false), // STRICT: never return private articles
    ];

    // Full-text search condition
    let rankExpression = sql`0`;
    if (q) {
      const tsQuery = sql`(websearch_to_tsquery('russian', ${q}) || websearch_to_tsquery('english', ${q}))`;
      conditions.push(sql`search_vector @@ ${tsQuery}`);
      rankExpression = sql`ts_rank(search_vector, ${tsQuery})`;
    }

    // Tag filter (AND logic — must have ALL specified tags)
    if (tagsParam) {
      const tags = tagsParam.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
      if (tags.length > 0) {
        conditions.push(sql`tags @> ${tags}::text[]`);
      }
    }

    // Execute query
    const results = await db
      .select({
        id: notes.id,
        slug: notes.slug,
        title: notes.title,
        content: notes.content,
        tags: notes.tags,
        readingTime: notes.readingTime,
        createdAt: notes.createdAt,
        viewCount: notes.viewCount,
        relevance: rankExpression,
      })
      .from(notes)
      .where(and(...conditions))
      .orderBy(q ? sql`${rankExpression} DESC` : sql`${notes.createdAt} DESC`)
      .limit(limit + 1)
      .offset(offset);

    const hasMore = results.length > limit;
    const resultsToReturn = hasMore ? results.slice(0, limit) : results;

    const searchResults = resultsToReturn.map((note) => {
      const cleanContent = stripFrontmatter(note.content);
      const snippet = stripMarkdown(cleanContent).substring(0, 200);
      const fullSlug = createFullSlug(note.title, note.id);

      return {
        id: note.id,
        slug: fullSlug,
        title: note.title,
        snippet: snippet + (cleanContent.length > 200 ? '...' : ''),
        tags: note.tags || [],
        readingTime: note.readingTime || 1,
        createdAt: note.createdAt.toISOString(),
        viewCount: note.viewCount || 0,
        relevance: Number(note.relevance) || 0,
      };
    });

    return NextResponse.json({
      notes: searchResults,
      pagination: {
        hasMore,
        offset: offset + limit,
        limit,
      },
    });
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/malovnik/Documents/Dev/obsidian-share-search && npm run build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add app/api/search/route.ts
git commit -m "feat: add full-text search endpoint with privacy-first WHERE clause"
```

### Task 1B.5: Create Tags Endpoint

**Files:**
- Create: `app/api/tags/route.ts`

- [ ] **Step 1: Create tags API**

```typescript
// app/api/tags/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    // Aggregate tags ONLY from public, non-deleted articles
    const result = await db.execute(sql`
      SELECT unnest(tags) as name, COUNT(*)::int as count
      FROM notes
      WHERE no_index = false AND is_deleted = false
      GROUP BY name
      ORDER BY count DESC, name ASC
    `);

    return NextResponse.json({
      tags: result.rows || [],
    });
  } catch (error) {
    console.error('Tags API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tags' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/tags/route.ts
git commit -m "feat: add tags aggregation endpoint (public articles only)"
```

### Task 1B.6: Create Related Articles Query

**Files:**
- Create: `lib/queries/related.ts`

- [ ] **Step 1: Create related articles query function**

```typescript
// lib/queries/related.ts
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import type { RelatedArticle } from '@/types/contracts';

/**
 * Finds related articles by tag intersection.
 * ONLY returns public, non-deleted articles.
 * Called server-side from RSC — never exposed as API.
 */
export async function getRelatedArticles(
  articleId: string,
  articleTags: string[],
  limit: number = 3
): Promise<RelatedArticle[]> {
  if (!articleTags || articleTags.length === 0) {
    return [];
  }

  const result = await db.execute(sql`
    SELECT id, slug, title, tags
    FROM notes
    WHERE tags && ${articleTags}::text[]
      AND no_index = false
      AND is_deleted = false
      AND id != ${articleId}
    ORDER BY cardinality(
      ARRAY(SELECT unnest(tags) INTERSECT SELECT unnest(${articleTags}::text[]))
    ) DESC NULLS LAST
    LIMIT ${limit}
  `);

  return (result.rows || []).map((row: any) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    tags: row.tags || [],
  }));
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/queries/related.ts
git commit -m "feat: add related articles query with privacy-first filtering"
```

### Task 1B.7: Update POST /api/share with Tags + SearchVector

**Files:**
- Modify: `app/api/share/route.ts`

Note: This will conflict with Backend Surgeon's changes. Integration Welder resolves. On this branch, we modify the ORIGINAL file (not Backend Surgeon's version).

- [ ] **Step 1: Add tags and readingTime to INSERT/UPDATE**

In `app/api/share/route.ts`, after `const htmlContent = await marked(cleanContent);` (line 33), add:

```typescript
// Extract tags from frontmatter
const { parseFrontmatter } = await import('@/app/lib/frontmatter');
const { tags } = parseFrontmatter(content);

// Calculate reading time
const wordCount = cleanContent.split(/\s+/).filter(Boolean).length;
const readingTime = Math.max(1, Math.ceil(wordCount / 200));
```

Then add `tags` and `readingTime` to both the `.set()` (update) and `.values()` (insert) calls.

- [ ] **Step 2: Verify build**

Run: `cd /Users/malovnik/Documents/Dev/obsidian-share-search && npm run build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add app/api/share/route.ts
git commit -m "feat: store tags and readingTime on article create/update"
```

### Task 1B.8: Final Build Verification

- [ ] **Step 1: Full build**

Run: `cd /Users/malovnik/Documents/Dev/obsidian-share-search && npm run build`
Expected: Build succeeds with no errors

---

## Chunk 4: Phase 1C — Design Alchemist

> **Worktree:** `/Users/malovnik/Documents/Dev/obsidian-share-design`
> **Branch:** `feat/redesign-brutal`
> **Role:** Design Alchemist — Brutalist Aesthete ("90% silence, 10% punch")
> **Design System:** Hybrid Resonant Brutal
> **IMPORTANT:** Use `my-design-system` skill and `frontend-design` skill as references.

### Task 1C.1: Rewrite globals.css with Design Tokens

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Complete rewrite of globals.css**

Replace entire `app/globals.css` with Hybrid Resonant Brutal design system. Key principles:
- White (#FFFFFF) primary bg
- Black (#000000) accents (10% of visual weight)
- Inter Variable font
- No gradients, no blue/indigo, no emoji
- Glassmorphism for interactive elements
- Thick black left borders for brutal accents

The Design Alchemist agent will implement this using the `my-design-system` skill for exact values and the `frontend-design` skill for component quality.

- [ ] **Step 2: Verify build**

Run: `cd /Users/malovnik/Documents/Dev/obsidian-share-design && npm run build`

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "feat: rewrite CSS with Hybrid Resonant Brutal design tokens"
```

### Task 1C.2: Rewrite Root Layout

**Files:**
- Modify: `app/layout.tsx`
- Create: `app/components/Header.tsx`
- Create: `app/components/Footer.tsx`

- [ ] **Step 1: Create Header component**

Minimal header: site name (left), search icon (right). Black on white. No emoji.

- [ ] **Step 2: Create Footer component**

Single-line footer, minimal.

- [ ] **Step 3: Rewrite layout.tsx**

Inter Variable font loaded via next/font/google. Clean HTML setup. Wrap children in Header + Footer.

- [ ] **Step 4: Verify build + Commit**

```bash
git add app/layout.tsx app/components/Header.tsx app/components/Footer.tsx
git commit -m "feat: new root layout with Inter Variable and brutal header/footer"
```

### Task 1C.3: Home Page — Hero + Card Grid

**Files:**
- Rewrite: `app/page.tsx`
- Rewrite: `app/components/NotesFeed.tsx`
- Create: `app/components/ArticleCard.tsx`
- Create: `app/components/SearchBar.tsx`
- Create: `app/components/TagFilter.tsx`
- Create: `app/components/CardSkeleton.tsx`

- [ ] **Step 1: Create SearchBar component**

Shared search input: 2px black border, Inter font, subtle focus animation. Used in hero + header.

- [ ] **Step 2: Create TagFilter component**

Horizontal scrollable chips. Glassmorphism pills. Active state = black fill, white text.

- [ ] **Step 3: Create ArticleCard component**

4:5 aspect ratio placeholder cover (black bg, white title, thin accent line). Card body with title (2-line clamp), snippet (2-line clamp), tag chips, date, reading time. Hover: subtle scale + shadow.

- [ ] **Step 4: Create CardSkeleton component**

Loading placeholder: pulsing card outlines, black borders, no rounded corners.

- [ ] **Step 5: Rewrite NotesFeed with new components**

Card grid: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`. IntersectionObserver infinite scroll. Debounced search integration. Tag filter integration with URL params.

- [ ] **Step 6: Rewrite page.tsx**

Hero section with centered SearchBar. TagFilter below. NotesFeed below.

- [ ] **Step 7: Verify build + Commit**

```bash
git add app/page.tsx app/components/
git commit -m "feat: new home page with hero search, tag filter, and card grid"
```

### Task 1C.4: Article Reader Page

**Files:**
- Rewrite: `app/s/[id]/page.tsx` (JSX only, keep metadata function)
- Create: `app/components/TableOfContents.tsx`
- Create: `app/components/ProgressBar.tsx`
- Create: `app/components/RelatedArticles.tsx`
- Create: `app/components/ArticleSidebar.tsx`

- [ ] **Step 1: Create ProgressBar component**

Client component: fixed top-0, 2px height, black, width = scroll percentage.

- [ ] **Step 2: Create TableOfContents component**

Client component: parse h1-h3 from HTML, render as nested list, highlight current section via IntersectionObserver.

- [ ] **Step 3: Create ArticleSidebar component**

Desktop: sticky right sidebar (w-64, top-20). Contains TOC, tags, related articles. Mobile: hidden, accessible via floating button.

- [ ] **Step 4: Create RelatedArticles component**

Server component wrapper. Renders 3 related article cards (compact: title + tags only).

- [ ] **Step 5: Rewrite article page JSX**

Two-column layout: main (max-w-[680px]) + sidebar. Clean Inter typography. No emoji. No gradient. Back link with arrow, no blue.

- [ ] **Step 6: Verify build + Commit**

```bash
git add app/s/[id]/page.tsx app/components/
git commit -m "feat: new article reader with sidebar, TOC, and progress bar"
```

### Task 1C.5: Private Article Page Restyle

**Files:**
- Modify: `app/components/PrivateNotePage.tsx`
- Modify: `app/components/PinCodeModal.tsx`

- [ ] **Step 1: Restyle PinCodeModal**

Black border inputs, Inter font, brutal aesthetic. No gradients, no emoji.

- [ ] **Step 2: Restyle PrivateNotePage wrapper**

Centered, clean messaging. Matches Hybrid Resonant Brutal.

- [ ] **Step 3: Commit**

```bash
git add app/components/PrivateNotePage.tsx app/components/PinCodeModal.tsx
git commit -m "feat: restyle private pages to Hybrid Resonant Brutal"
```

### Task 1C.6: Final Build Verification

- [ ] **Step 1: Full build**

Run: `cd /Users/malovnik/Documents/Dev/obsidian-share-design && npm run build`
Expected: Build succeeds

---

## Chunk 5: Phase 2 — Integration + Verification

> **Branch:** `main`
> **Role:** Integration Welder — Systems Thinker ("it works only when EVERYTHING works together")

### Task 2.1: Merge Backend Surgeon

- [ ] **Step 1: Merge fix/backend-bugs into main**

```bash
cd /Users/malovnik/Documents/Dev/obsidian-share
git merge fix/backend-bugs
```

- [ ] **Step 2: Resolve any conflicts**

Expected: minimal conflicts (mostly new files)

- [ ] **Step 3: Verify build**

```bash
npm run build
```

- [ ] **Step 4: Commit merge if needed**

### Task 2.2: Merge Search Architect

- [ ] **Step 1: Merge feat/search-and-tags into main**

```bash
git merge feat/search-and-tags
```

- [ ] **Step 2: Resolve conflicts in POST /api/share**

Key conflict: Backend Surgeon's `processArticleContent()` vs Search Architect's inline tag extraction. Resolution: use `processArticleContent()` output and add `tags`, `readingTime`, `searchVector` to the INSERT/UPDATE.

The merged `app/api/share/route.ts` should use `processArticleContent()` from Backend Surgeon AND write `tags` + `readingTime` to the database (from Search Architect's schema).

- [ ] **Step 3: Verify build + search**

```bash
npm run build
```

### Task 2.3: Merge Design Alchemist

- [ ] **Step 1: Merge feat/redesign-brutal into main**

```bash
git merge feat/redesign-brutal
```

- [ ] **Step 2: Resolve conflicts**

Key conflict: `app/s/[id]/page.tsx` — Backend Surgeon's `generateMetadata()` + Design Alchemist's page JSX. Keep both: metadata from Backend, JSX from Design.

- [ ] **Step 3: Wire UI to APIs**

Connect:
- SearchBar → `/api/search?q=...`
- TagFilter → `/api/tags` for chip list, `/?tags=name` for filtering
- ArticleCard → `NoteCard` type from contracts
- RelatedArticles → `getRelatedArticles()` from `lib/queries/related.ts`
- NotesFeed → Updated `/api/notes` response shape

- [ ] **Step 4: Verify full build**

```bash
npm run build
```

### Task 2.4: End-to-End Verification

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Verify home page loads**

Navigate to `http://localhost:3000`. Expected: Hero search, tag filter, card grid.

- [ ] **Step 3: Verify SEO description is clean**

Check page source of any article. Description should have no `---`, `tags:`, `#`, `**`.

- [ ] **Step 4: Verify search works**

Search for a known article title. Must return results.

- [ ] **Step 5: Verify private articles are excluded**

Create a private article. Search for it. Must NOT appear in search, feed, or tags.

- [ ] **Step 6: Verify responsive**

Check 375px (mobile), 768px (tablet), 1280px (desktop).

### Task 2.5: Cleanup

- [ ] **Step 1: Remove worktrees**

```bash
git worktree remove ../obsidian-share-backend
git worktree remove ../obsidian-share-search
git worktree remove ../obsidian-share-design
```

- [ ] **Step 2: Delete branches**

```bash
git branch -d fix/backend-bugs feat/search-and-tags feat/redesign-brutal
```

- [ ] **Step 3: Final build**

```bash
npm run build
```

- [ ] **Step 4: Commit any final fixes**
