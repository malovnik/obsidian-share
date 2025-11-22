import { Router, Request, Response } from 'express';
import { nanoid } from 'nanoid';
import { marked } from 'marked';
import { db } from '../db';
import { notes } from '../db/schema';
import { eq } from 'drizzle-orm';

const router = Router();

/**
 * POST /api/share
 * Создать новую публичную ссылку на заметку
 */
router.post('/share', async (req: Request, res: Response) => {
  try {
    const { title, content, theme = 'default', customCss, password, expiresInDays } = req.body;

    // Валидация
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    // Генерируем короткий ID
    const id = nanoid(8); // Получится что-то вроде "abc123xy"

    // Рендерим Markdown в HTML
    const htmlContent = await marked(content);

    // Вычисляем дату истечения
    let expiresAt = null;
    if (expiresInDays && expiresInDays > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    }

    // Сохраняем в базу
    const [note] = await db
      .insert(notes)
      .values({
        id,
        title,
        content,
        htmlContent,
        theme,
        customCss,
        password, // TODO: хэшировать пароль если нужно
        expiresAt,
      })
      .returning();

    // Возвращаем ссылку
    const shareUrl = `${process.env.PUBLIC_URL || 'http://localhost:3000'}/s/${id}`;

    res.json({
      success: true,
      id: note.id,
      url: shareUrl,
      expiresAt: note.expiresAt,
    });
  } catch (error) {
    console.error('Share error:', error);
    res.status(500).json({ error: 'Failed to create share link' });
  }
});

/**
 * GET /api/share/:id
 * Получить заметку по ID
 */
router.get('/share/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { password } = req.query;

    // Ищем заметку
    const [note] = await db
      .select()
      .from(notes)
      .where(eq(notes.id, id))
      .limit(1);

    if (!note || note.isDeleted) {
      return res.status(404).json({ error: 'Note not found' });
    }

    // Проверяем срок действия
    if (note.expiresAt && new Date() > note.expiresAt) {
      // Помечаем как удалённую
      await db
        .update(notes)
        .set({ isDeleted: true })
        .where(eq(notes.id, id));

      return res.status(410).json({ error: 'Note has expired' });
    }

    // Проверяем пароль если установлен
    if (note.password && note.password !== password) {
      return res.status(401).json({ error: 'Password required', needsPassword: true });
    }

    // Увеличиваем счётчик просмотров
    await db
      .update(notes)
      .set({ viewCount: (note.viewCount || 0) + 1 })
      .where(eq(notes.id, id));

    // Возвращаем заметку
    res.json({
      id: note.id,
      title: note.title,
      content: note.content,
      htmlContent: note.htmlContent,
      theme: note.theme,
      customCss: note.customCss,
      viewCount: (note.viewCount || 0) + 1,
      createdAt: note.createdAt,
    });
  } catch (error) {
    console.error('Get note error:', error);
    res.status(500).json({ error: 'Failed to get note' });
  }
});

/**
 * DELETE /api/share/:id
 * Удалить заметку
 */
router.delete('/share/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { authorKey } = req.body;

    // TODO: Добавить проверку authorKey

    // Помечаем как удалённую
    const [deletedNote] = await db
      .update(notes)
      .set({ isDeleted: true })
      .where(eq(notes.id, id))
      .returning();

    if (!deletedNote) {
      return res.status(404).json({ error: 'Note not found' });
    }

    res.json({ success: true, message: 'Note deleted' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

export default router;
