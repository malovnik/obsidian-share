/**
 * Strips markdown formatting from text, returning plain text.
 *
 * Removes: images, links, code blocks, inline code, headings,
 * bold/italic, blockquotes, horizontal rules, list markers,
 * HTML tags, and collapses whitespace.
 */
export function stripMarkdown(text: string): string {
  let result = text;

  // Remove code blocks (``` ... ```) before inline processing
  result = result.replace(/```[\s\S]*?```/g, '');

  // Remove inline code (`...`)
  result = result.replace(/`([^`]*)`/g, '$1');

  // Remove Obsidian image/file embeds ![[filename]]
  result = result.replace(/!\[\[([^\]]+)\]\]/g, '');

  // Remove images ![alt](url) entirely (alt text like "Pasted image..." is noise in snippets)
  result = result.replace(/!\[([^\]]*)\]\([^)]*\)/g, '');

  // Remove links [text](url) → text
  result = result.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');

  // Remove heading markers
  result = result.replace(/^#{1,6}\s+/gm, '');

  // Remove bold/italic markers (order matters: bold first, then italic)
  result = result.replace(/\*\*([^*]*)\*\*/g, '$1');
  result = result.replace(/__([^_]*)__/g, '$1');
  result = result.replace(/\*([^*]*)\*/g, '$1');
  result = result.replace(/_([^_]*)_/g, '$1');

  // Remove strikethrough
  result = result.replace(/~~([^~]*)~~/g, '$1');

  // Remove blockquote markers
  result = result.replace(/^>\s?/gm, '');

  // Remove horizontal rules (---, ***, ___)
  result = result.replace(/^[-*_]{3,}\s*$/gm, '');

  // Remove unordered list markers (- * +)
  result = result.replace(/^[\s]*[-*+]\s+/gm, '');

  // Remove ordered list markers (1. 2. etc.)
  result = result.replace(/^[\s]*\d+\.\s+/gm, '');

  // Remove HTML tags
  result = result.replace(/<[^>]+>/g, '');

  // Collapse whitespace: newlines → spaces, multiple spaces → single
  result = result.replace(/\n+/g, ' ');
  result = result.replace(/\s+/g, ' ');

  return result.trim();
}
