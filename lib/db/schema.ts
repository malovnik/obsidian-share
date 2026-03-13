import { pgTable, text, timestamp, integer, boolean, customType } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

const tsvector = customType<{ data: string }>({
  dataType() {
    return 'tsvector';
  },
});

/**
 * Таблица с опубликованными заметками
 */
export const notes = pgTable('notes', {
  // Короткий ID для URL (например: abc123)
  id: text('id').primaryKey(),

  // Slug для SEO-friendly URL (транслитерация заголовка)
  slug: text('slug').notNull(),

  // Source ID из Obsidian (путь к файлу или UUID для отслеживания обновлений)
  sourceId: text('source_id'),

  // Название заметки
  title: text('title').notNull(),

  // Markdown контент заметки
  content: text('content').notNull(),

  // HTML контент (предрендеренный)
  htmlContent: text('html_content'),

  // Тема оформления (для Obsidian тем)
  theme: text('theme').default('default'),

  // CSS кастомизация
  customCss: text('custom_css'),

  // Пароль для приватного доступа (хэш)
  password: text('password'),

  // Срок жизни ссылки (дата удаления)
  expiresAt: timestamp('expires_at'),

  // Количество просмотров (все)
  viewCount: integer('view_count').default(0),

  // Количество уникальных просмотров (по IP)
  uniqueViewCount: integer('unique_view_count').default(0),

  // Метаданные
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),

  // Удалена ли заметка
  isDeleted: boolean('is_deleted').default(false),

  // Запретить индексацию поисковиками (приватная ссылка)
  noIndex: boolean('no_index').default(false),

  // ID автора (опционально)
  authorId: text('author_id'),

  // Теги из frontmatter
  tags: text('tags').array().default(sql`'{}'::text[]`),

  // Время чтения в минутах
  readingTime: integer('reading_time').default(0),

  // Полнотекстовый поиск (заполняется триггером)
  searchVector: tsvector('search_vector'),
});

export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;

export const noteViews = pgTable('note_views', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  noteId: text('note_id').notNull().references(() => notes.id, { onDelete: 'cascade' }),
  viewerIp: text('viewer_ip').notNull(),
  viewedAt: timestamp('viewed_at').defaultNow().notNull(),
});
