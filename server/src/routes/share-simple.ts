import { Router, Request, Response } from 'express';
import { nanoid } from 'nanoid';
import { marked } from 'marked';

const router = Router();

// In-memory хранилище для быстрого старта
const notes = new Map<string, any>();

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
    const id = nanoid(8);

    // Рендерим Markdown в HTML
    const htmlContent = await marked(content);

    // Вычисляем дату истечения
    let expiresAt = null;
    if (expiresInDays && expiresInDays > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    }

    // Создаём заметку
    const note = {
      id,
      title,
      content,
      htmlContent,
      theme,
      customCss,
      password,
      expiresAt,
      viewCount: 0,
      createdAt: new Date(),
      isDeleted: false,
    };

    // Сохраняем в память
    notes.set(id, note);

    // Возвращаем ссылку
    const publicUrl = process.env.PUBLIC_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
    const shareUrl = `${publicUrl}/s/${id}`;

    console.log(`✅ Note created: ${id} - "${title}"`);

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
    const note = notes.get(id);

    if (!note || note.isDeleted) {
      return res.status(404).json({ error: 'Note not found' });
    }

    // Проверяем срок действия
    if (note.expiresAt && new Date() > new Date(note.expiresAt)) {
      note.isDeleted = true;
      return res.status(410).json({ error: 'Note has expired' });
    }

    // Проверяем пароль если установлен
    if (note.password && note.password !== password) {
      return res.status(401).json({ error: 'Password required', needsPassword: true });
    }

    // Увеличиваем счётчик просмотров
    note.viewCount = (note.viewCount || 0) + 1;

    console.log(`👁️  Note viewed: ${id} (${note.viewCount} views)`);

    // Возвращаем заметку
    res.json({
      id: note.id,
      title: note.title,
      content: note.content,
      htmlContent: note.htmlContent,
      theme: note.theme,
      customCss: note.customCss,
      viewCount: note.viewCount,
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

    const note = notes.get(id);

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    // Помечаем как удалённую
    note.isDeleted = true;

    console.log(`🗑️  Note deleted: ${id}`);

    res.json({ success: true, message: 'Note deleted' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

export default router;
