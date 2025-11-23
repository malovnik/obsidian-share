import { pgTable, text, timestamp, integer, boolean } from 'drizzle-orm/pg-core';

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

  // Количество просмотров
  viewCount: integer('view_count').default(0),

  // Метаданные
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),

  // Удалена ли заметка
  isDeleted: boolean('is_deleted').default(false),

  // ID автора (опционально)
  authorId: text('author_id'),
});

export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;
