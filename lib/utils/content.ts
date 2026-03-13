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

const translitMap: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh',
  з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o',
  п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts',
  ч: 'ch', ш: 'sh', щ: 'shch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .split('')
    .map((char) => translitMap[char] ?? char)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function convertObsidianLinks(markdown: string): string {
  return markdown
    .replace(/\[\[#([^\]]+)\]\]/g, (_match, heading: string) => {
      const slug = slugify(heading);
      return `[${heading}](#${slug})`;
    })
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, (_match, _target: string, display: string) => display)
    .replace(/\[\[([^\]]+)\]\]/g, (_match, title: string) => title);
}

/**
 * Processes raw article content through the full pipeline:
 * 1. Parse and strip frontmatter, extract tags
 * 2. Convert Obsidian wiki-links to standard markdown
 * 3. Convert clean markdown to HTML via marked (with heading IDs)
 * 4. Generate plain-text snippet (first 160 chars, no markdown)
 * 5. Calculate reading time (words / 200, min 1 minute)
 */
export async function processArticleContent(rawContent: string): Promise<ProcessedContent> {
  const { content: cleanContent, tags } = parseFrontmatter(rawContent);

  const usedSlugs = new Set<string>();

  marked.use({
    renderer: {
      heading(text: string, level: number): string {
        const plainText = text.replace(/<[^>]+>/g, '');
        let slug = slugify(plainText);
        if (!slug) slug = `heading-${usedSlugs.size}`;
        while (usedSlugs.has(slug)) {
          slug = `${slug}-${usedSlugs.size}`;
        }
        usedSlugs.add(slug);
        return `<h${level} id="${slug}">${text}</h${level}>\n`;
      },
    },
  });

  const processedMarkdown = convertObsidianLinks(cleanContent);
  const htmlContent = await marked(processedMarkdown);

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
