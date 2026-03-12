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
 * Processes raw article content through the full pipeline:
 * 1. Parse and strip frontmatter, extract tags
 * 2. Convert clean markdown to HTML via marked
 * 3. Generate plain-text snippet (first 160 chars, no markdown)
 * 4. Calculate reading time (words / 200, min 1 minute)
 */
export async function processArticleContent(rawContent: string): Promise<ProcessedContent> {
  const { content: cleanContent, tags } = parseFrontmatter(rawContent);

  const htmlContent = await marked(cleanContent);

  const plainText = stripMarkdown(cleanContent);
  const snippet = plainText.substring(0, 160);

  const wordCount = plainText.split(/\s+/).filter(Boolean).length;
  const readingTime = Math.max(1, Math.round(wordCount / 200));

  return {
    cleanContent,
    htmlContent,
    tags,
    readingTime,
    snippet,
  };
}
