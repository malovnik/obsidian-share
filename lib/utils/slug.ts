import { transliterate, slugify } from 'transliteration';

/**
 * Generates SEO-friendly slug from title
 *
 * Examples:
 * - "Как научиться программировать" → "kak-nauchitsya-programmirovat"
 * - "Hello World! Привет Мир" → "hello-world-privet-mir"
 * - "React & Next.js Tutorial" → "react-nextjs-tutorial"
 */
export function generateSlug(title: string): string {
  return slugify(title, {
    lowercase: true,
    separator: '-',
    allowedChars: 'a-zA-Z0-9-',
    truncate: 100, // Max 100 characters
    trim: true,
  });
}

/**
 * Creates full slug with ID for URL
 * Format: {slug}-{id}
 *
 * Example: "kak-nauchitsya-programmirovat-abc123"
 */
export function createFullSlug(title: string, id: string): string {
  const slug = generateSlug(title);
  return `${slug}-${id}`;
}

/**
 * Extracts ID from full slug
 *
 * Example: "kak-nauchitsya-programmirovat-abc123" → "abc123"
 */
export function extractIdFromSlug(fullSlug: string): string {
  const parts = fullSlug.split('-');
  return parts[parts.length - 1];
}

/**
 * Validates if slug matches the expected format
 */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9-]+-[a-z0-9]+$/.test(slug);
}
