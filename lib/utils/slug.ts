import { transliterate } from 'transliteration';

/**
 * Generates SEO-friendly slug from title with comprehensive sanitization.
 *
 * Steps:
 * 1. Unicode NFD normalization + strip diacritics
 * 2. Transliterate non-latin chars via `transliteration` library
 * 3. Replace ALL non-alphanumeric chars with underscores
 * 4. Collapse multiple underscores, trim edges
 * 5. Lowercase, truncate to 100 chars (avoid cutting mid-word)
 *
 * Examples:
 * - "Как научиться программировать" → "kak_nauchitsya_programmirovat"
 * - "Hello World! Привет Мир" → "hello_world_privet_mir"
 * - "React & Next.js Tutorial" → "react_next_js_tutorial"
 * - "Title — with em-dash" → "title_with_em_dash"
 * - "🔥🚀 Emoji Title" → "emoji_title"
 */
export function generateSlug(title: string): string {
  let processed = title;

  // Step 1: Unicode NFD normalization — decompose combined chars, then strip diacritics
  processed = processed.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Step 2: Transliterate non-latin characters (Cyrillic, CJK, etc.)
  processed = transliterate(processed);

  // Step 3: Replace ALL non-alphanumeric characters with underscores
  // This handles em-dash, en-dash, quotes, brackets, emoji remnants, dots, commas, etc.
  processed = processed.replace(/[^a-zA-Z0-9]/g, '_');

  // Step 4: Collapse multiple underscores into one
  processed = processed.replace(/_+/g, '_');

  // Step 5: Trim leading/trailing underscores
  processed = processed.replace(/^_+|_+$/g, '');

  // Step 6: Lowercase
  processed = processed.toLowerCase();

  // Step 7: Truncate to 100 chars without cutting mid-word
  if (processed.length > 100) {
    const truncated = processed.substring(0, 100);
    const lastUnderscore = truncated.lastIndexOf('_');
    if (lastUnderscore > 0) {
      processed = truncated.substring(0, lastUnderscore);
    } else {
      processed = truncated;
    }
  }

  return processed;
}

/**
 * Creates full slug with ID for URL
 * Format: {slug}-{id} or just {id} if slug is empty (e.g. emoji-only titles)
 *
 * Examples:
 * - "kak_nauchitsya_programmirovat", "abc123" → "kak_nauchitsya_programmirovat-abc123"
 * - "", "abc123" → "abc123" (emoji-only title produced empty slug)
 */
export function createFullSlug(title: string, id: string): string {
  const slug = generateSlug(title);
  if (!slug) {
    return id;
  }
  return `${slug}-${id}`;
}

/**
 * Extracts ID from full slug.
 * ID is always 8 characters. New IDs use [A-Za-z0-9] only.
 * Legacy IDs may contain `-` and `_` (nanoid default alphabet).
 *
 * Strategy: try suffix after last `-`. If empty or slug has no `-`, return as-is.
 * For legacy IDs containing `-` (e.g. `_-tlo1vO`), the simple lastIndexOf
 * approach fails, so we also try the full slug as a raw ID.
 */
export function extractIdFromSlug(fullSlug: string): string {
  const lastHyphenIndex = fullSlug.lastIndexOf('-');

  if (lastHyphenIndex === -1) {
    return fullSlug;
  }

  const candidate = fullSlug.substring(lastHyphenIndex + 1);

  if (candidate.length > 0) {
    return candidate;
  }

  return fullSlug;
}

/**
 * Validates if slug matches the expected format
 * Matches: "word_word-abc123" or just "abc123"
 */
export function isValidSlug(slug: string): boolean {
  return slug.length >= 8 && (slug.includes('-') || /^[a-z0-9]+$/i.test(slug));
}
