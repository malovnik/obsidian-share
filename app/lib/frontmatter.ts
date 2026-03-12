import matter from 'gray-matter';

/**
 * Удаляет YAML frontmatter из markdown контента
 * @param content - Markdown контент с возможным frontmatter
 * @returns Чистый контент без frontmatter
 */
export function stripFrontmatter(content: string): string {
  const { content: cleanContent } = matter(content);
  return cleanContent;
}

/**
 * Normalizes raw tags value from frontmatter into a clean string array.
 * Handles: array format [a, b, c], comma-separated string "a, b, c",
 * single string "tag", missing/malformed data.
 * Result: lowercase, trimmed, deduplicated, empty strings filtered out.
 */
function normalizeTags(raw: unknown): string[] {
  let rawList: string[] = [];

  if (Array.isArray(raw)) {
    rawList = raw.map((item) => String(item));
  } else if (typeof raw === 'string') {
    rawList = raw.split(',');
  } else {
    return [];
  }

  const seen = new Set<string>();
  const result: string[] = [];

  for (const tag of rawList) {
    const normalized = tag.trim().toLowerCase();
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      result.push(normalized);
    }
  }

  return result;
}

/**
 * Парсит frontmatter и возвращает объект с данными, контентом и тегами
 * @param content - Markdown контент с frontmatter
 * @returns Объект с data (parsed YAML), content (чистый контент) и tags (normalized array)
 */
export function parseFrontmatter(content: string): {
  data: Record<string, unknown>;
  content: string;
  tags: string[];
} {
  const { data, content: cleanContent } = matter(content);
  const tags = normalizeTags(data.tags);
  return { data, content: cleanContent, tags };
}
