import { transliterate, slugify } from 'transliteration';

/**
 * Generates SEO-friendly slug from title
 *
 * Examples:
 * - "Как научиться программировать" → "kak_nauchitsya_programmirovat"
 * - "Hello World! Привет Мир" → "hello_world_privet_mir"
 * - "React & Next.js Tutorial" → "react_nextjs_tutorial"
 * - "Заголовок - подзаголовок" → "zagolovok_podzagolovok"
 */
export function generateSlug(title: string): string {
  // Шаг 1: Транслитерация кириллицы в латиницу
  let processed = transliterate(title);

  // Шаг 2: Заменяем пробелы на подчеркивания
  processed = processed.replace(/\s+/g, '_');

  // Шаг 3: Удаляем все спецсимволы, оставляя только буквы, цифры и подчеркивания
  processed = processed.replace(/[^a-zA-Z0-9_]/g, '');

  // Шаг 4: Убираем множественные подчеркивания подряд
  processed = processed.replace(/_+/g, '_');

  // Шаг 5: Убираем подчеркивания в начале и конце
  processed = processed.replace(/^_+|_+$/g, '');

  // Шаг 6: Приводим к нижнему регистру
  processed = processed.toLowerCase();

  // Truncate to max 100 characters
  return processed.substring(0, 100);
}

/**
 * Creates full slug with ID for URL
 * Format: {slug}-{id}
 *
 * Example: "kak_nauchitsya_programmirovat-abc123"
 * Note: Slug uses underscores, ID is separated by hyphen
 */
export function createFullSlug(title: string, id: string): string {
  const slug = generateSlug(title);
  // Используем дефис как разделитель между slug и ID
  return `${slug}-${id}`;
}

/**
 * Extracts ID from full slug
 *
 * Examples:
 * - "kak_nauchitsya_programmirovat-abc123" → "abc123"
 * - "hello_world-xyz789" → "xyz789"
 *
 * Note: ID is the last part after the final hyphen
 */
export function extractIdFromSlug(fullSlug: string): string {
  // Ищем последний дефис (разделитель между slug и ID)
  const lastHyphenIndex = fullSlug.lastIndexOf('-');

  if (lastHyphenIndex === -1) {
    // Если нет дефиса, возвращаем всю строку (backward compatibility)
    return fullSlug;
  }

  // Возвращаем всё после последнего дефиса
  return fullSlug.substring(lastHyphenIndex + 1);
}

/**
 * Validates if slug matches the expected format
 * Matches: "word_word-abc123" or just "abc123"
 * Note: Slug uses underscores, ID separated by hyphen
 */
export function isValidSlug(slug: string): boolean {
  // Must contain at least one hyphen (separator) and be at least 8 chars
  // Valid formats: "slug_text-id123" or "abc123" (backward compatibility)
  return slug.length >= 8 && (slug.includes('-') || /^[a-z0-9]+$/i.test(slug));
}
