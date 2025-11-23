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
 * Парсит frontmatter и возвращает объект с данными и контентом
 * @param content - Markdown контент с frontmatter
 * @returns Объект с data (parsed YAML) и content (чистый контент)
 */
export function parseFrontmatter(content: string): {
  data: Record<string, unknown>;
  content: string;
} {
  const { data, content: cleanContent } = matter(content);
  return { data, content: cleanContent };
}
