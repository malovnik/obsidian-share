import { App, Notice, Plugin, PluginSettingTab, Setting, TFile, TAbstractFile } from 'obsidian';

interface SharePluginSettings {
  apiUrl: string;
  publishToken: string;
  autoClipboard: boolean;
  defaultExpiry: number;
  syncOnSave: boolean;
  mediaCache: Record<string, MediaCacheEntry>;
}

interface MediaCacheEntry {
  url: string;
  createdAt: number;
}

interface ProcessedContent {
  content: string;
  mediaHashes: string[];
}

type AccessMode = 'public' | 'private';
type SyncResult = 'created' | 'updated' | 'unchanged' | 'skipped' | 'error';

const DEFAULT_SETTINGS: SharePluginSettings = {
  apiUrl: 'https://read.malovnik.ru',
  publishToken: '',
  autoClipboard: true,
  defaultExpiry: 0,
  syncOnSave: true,
  mediaCache: {},
};

interface ShareResponse {
  success: boolean;
  status: 'created' | 'updated' | 'unchanged';
  url: string;
  isUpdate: boolean;
  id: string;
  slug: string;
  revision: number;
  contentHash: string;
  expiresAt?: string | null;
}

interface ImageUploadResponse {
  success: boolean;
  id: string;
  hash: string;
  url: string;
  deduplicated: boolean;
  width?: number;
  height?: number;
}

interface ShareRequestBody {
  title: string;
  content: string;
  sourceId: string;
  shareId?: string;
  accessMode: AccessMode;
  mediaHashes: string[];
  expiresInDays?: number | null;
}

export default class SharePlugin extends Plugin {
  settings!: SharePluginSettings;
  private syncTimers = new Map<string, number>();
  private syncing = new Set<string>();

  async onload(): Promise<void> {
    await this.loadSettings();

    this.addCommand({
      id: 'share-note',
      name: 'Опубликовать заметку',
      callback: () => void this.shareCurrentNote(),
    });
    this.addCommand({
      id: 'share-note-private',
      name: 'Поделиться приватно',
      callback: () => void this.sharePrivateNote(),
    });
    this.addCommand({
      id: 'update-current-note',
      name: 'Принудительно обновить текущую статью',
      callback: () => void this.updateCurrentNote(),
    });
    this.addCommand({
      id: 'sync-shared-notes',
      name: 'Синхронизировать статус статей',
      callback: () => void this.syncSharedNotes(),
    });
    this.addCommand({
      id: 'auto-update-all',
      name: 'Обновить изменённые опубликованные статьи',
      callback: () => void this.autoUpdateAllNotes(),
    });

    this.addRibbonIcon('share', 'Опубликовать заметку', () => void this.shareCurrentNote());
    this.addRibbonIcon('lock', 'Поделиться приватно', () => void this.sharePrivateNote());
    this.addSettingTab(new ShareSettingTab(this.app, this));

    this.registerEvent(this.app.vault.on('modify', (file) => {
      void this.handleVaultModification(file);
    }));
    this.registerEvent(this.app.vault.on('rename', (file) => {
      if (file instanceof TFile && file.extension === 'md') {
        this.scheduleAutoSync(file);
      }
    }));
  }

  async shareCurrentNote(): Promise<void> {
    const file = this.app.workspace.getActiveFile();
    if (!file) {
      new Notice('Откройте заметку для публикации');
      return;
    }
    await this.shareNoteWithOptions(file, 'public', true, false);
  }

  async sharePrivateNote(): Promise<void> {
    const file = this.app.workspace.getActiveFile();
    if (!file) {
      new Notice('Откройте заметку для публикации');
      return;
    }
    await this.shareNoteWithOptions(file, 'private', true, false);
  }

  private async shareNoteWithOptions(
    file: TFile,
    accessMode: AccessMode,
    manual: boolean,
    force: boolean,
  ): Promise<SyncResult> {
    if (this.syncing.has(file.path)) {
      return 'skipped';
    }

    try {
      this.assertConfigured();
      this.syncing.add(file.path);
      if (manual) {
        new Notice(accessMode === 'private' ? 'Создание закрытой ссылки…' : 'Публикация заметки…');
      }

      const cache = this.app.metadataCache.getFileCache(file);
      const frontmatter = cache?.frontmatter ?? {};
      const existingShareId = typeof frontmatter.share_id === 'string' ? frontmatter.share_id : undefined;
      const previousHash = typeof frontmatter.share_hash === 'string' ? frontmatter.share_hash : undefined;
      const source = this.stripShareMetadata(await this.app.vault.read(file));
      const processed = await this.processImages(source, file);
      const localHash = await this.hashString(JSON.stringify({
        title: file.basename,
        sourceId: file.path,
        content: processed.content,
        accessMode,
        expiresInDays: this.settings.defaultExpiry,
        mediaHashes: processed.mediaHashes,
      }));

      if (!force && existingShareId && previousHash === localHash) {
        if (manual) {
          new Notice('Заметка не менялась — сервер не тронут');
        }
        return 'unchanged';
      }

      const response = await this.shareNote({
        title: file.basename,
        content: processed.content,
        sourceId: file.path,
        shareId: existingShareId,
        accessMode,
        mediaHashes: processed.mediaHashes,
        expiresInDays: this.settings.defaultExpiry > 0 ? this.settings.defaultExpiry : null,
      });

      await this.updateNoteFrontmatter(file, response, accessMode, localHash);
      if (manual) {
        const action = response.status === 'created'
          ? 'опубликована'
          : response.status === 'updated'
            ? 'обновлена'
            : 'уже актуальна';
        if (this.settings.autoClipboard) {
          await navigator.clipboard.writeText(response.url);
          new Notice(`Заметка ${action}. Ссылка скопирована: ${response.url}`, 5000);
        } else {
          new Notice(`Заметка ${action}: ${response.url}`, 5000);
        }
      }
      return response.status;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
      if (manual) {
        new Notice(`Не удалось опубликовать: ${message}`, 7000);
      } else {
        console.warn(`SharePlugin: sync failed for ${file.path}: ${message}`);
      }
      return 'error';
    } finally {
      this.syncing.delete(file.path);
    }
  }

  private async processImages(content: string, sourceFile: TFile): Promise<ProcessedContent> {
    const imageRegex = /!\[\[([^\]]+\.(?:png|jpe?g|gif|webp)(?:\|[^\]]*)?)\]\]/gi;
    const matches = [...content.matchAll(imageRegex)];
    const mediaHashes: string[] = [];
    let cacheChanged = false;

    for (const match of matches) {
      const fullMatch = match[0];
      const linkPath = match[1].split('|', 1)[0].trim();
      const imageFile = this.resolveImageFile(linkPath, sourceFile);
      if (!imageFile) {
        throw new Error(`Не найдено изображение: ${linkPath}`);
      }

      const imageData = await this.app.vault.readBinary(imageFile);
      const hash = await this.hashArrayBuffer(imageData);
      mediaHashes.push(hash);
      let url = this.settings.mediaCache[hash]?.url;
      if (!url) {
        const uploaded = await this.uploadImage(imageFile, imageData, hash);
        url = uploaded.url;
        this.settings.mediaCache[hash] = { url, createdAt: Date.now() };
        cacheChanged = true;
      }

      const alt = imageFile.basename.replace(/\]/g, '\\]');
      content = content.split(fullMatch).join(`![${alt}](${url})`);
    }

    if (cacheChanged) {
      this.pruneMediaCache();
      await this.saveSettings();
    }

    return {
      content,
      mediaHashes: [...new Set(mediaHashes)],
    };
  }

  private resolveImageFile(filename: string, sourceFile: TFile): TFile | null {
    const linked = this.app.metadataCache.getFirstLinkpathDest(filename, sourceFile.path);
    if (linked instanceof TFile) {
      return linked;
    }

    const sourceDir = sourceFile.parent?.path || '';
    const candidates = [
      sourceDir ? `${sourceDir}/${filename}` : filename,
      filename,
      `Cache/${filename}`,
      `Attachments/${filename}`,
    ];
    for (const path of candidates) {
      const file = this.app.vault.getAbstractFileByPath(path);
      if (file instanceof TFile) {
        return file;
      }
    }

    const found = this.app.vault.getFiles().find((file: TAbstractFile) => file.name === filename);
    return found instanceof TFile ? found : null;
  }

  private async uploadImage(file: TFile, data: ArrayBuffer, hash: string): Promise<ImageUploadResponse> {
    const response = await fetch(`${this.apiUrl()}/api/v1/media/${hash}`, {
      method: 'PUT',
      headers: {
        ...this.authHeaders(),
        'Content-Type': this.imageMime(file.extension),
        'X-Filename': encodeURIComponent(file.name),
      },
      body: data,
    });
    if (!response.ok) {
      throw new Error(await this.responseError(response, 'Не удалось загрузить изображение'));
    }
    return await response.json() as ImageUploadResponse;
  }

  private async shareNote(requestBody: ShareRequestBody): Promise<ShareResponse> {
    const response = await fetch(`${this.apiUrl()}/api/v1/notes`, {
      method: 'POST',
      headers: {
        ...this.authHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    if (!response.ok) {
      throw new Error(await this.responseError(response, 'Сервер отклонил публикацию'));
    }
    return await response.json() as ShareResponse;
  }

  private async updateNoteFrontmatter(
    file: TFile,
    response: ShareResponse,
    accessMode: AccessMode,
    localHash: string,
  ): Promise<void> {
    try {
      await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
        frontmatter.share_url = response.url;
        frontmatter.share_mode = accessMode;
        frontmatter.share_id = response.id;
        frontmatter.share_hash = localHash;
        frontmatter.share_revision = response.revision;
      });
    } catch {
      new Notice('Ссылка создана, но не удалось обновить метаданные заметки');
    }
  }

  private async updateCurrentNote(): Promise<void> {
    const file = this.app.workspace.getActiveFile();
    if (!file) {
      new Notice('Откройте заметку для обновления');
      return;
    }
    const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
    if (typeof frontmatter?.share_url !== 'string') {
      new Notice('Эта заметка ещё не опубликована');
      return;
    }
    await this.shareNoteWithOptions(file, this.accessMode(frontmatter.share_mode), true, true);
  }

  private async autoUpdateAllNotes(): Promise<void> {
    try {
      this.assertConfigured();
    } catch (error) {
      new Notice(error instanceof Error ? error.message : 'Плагин не настроен');
      return;
    }

    let updated = 0;
    let unchanged = 0;
    let errors = 0;
    for (const file of this.app.vault.getMarkdownFiles()) {
      const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
      if (typeof frontmatter?.share_url !== 'string') {
        continue;
      }
      const result = await this.shareNoteWithOptions(file, this.accessMode(frontmatter.share_mode), false, false);
      if (result === 'created' || result === 'updated') updated++;
      if (result === 'unchanged' || result === 'skipped') unchanged++;
      if (result === 'error') errors++;
    }
    new Notice(`Изменено: ${updated}; без изменений: ${unchanged}; ошибок: ${errors}`, 5000);
  }

  private async syncSharedNotes(): Promise<void> {
    try {
      this.assertConfigured();
    } catch (error) {
      new Notice(error instanceof Error ? error.message : 'Плагин не настроен');
      return;
    }

    new Notice('Проверка статусов статей…');
    let cleaned = 0;
    let checked = 0;
    let errors = 0;
    for (const file of this.app.vault.getMarkdownFiles()) {
      const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
      if (typeof frontmatter?.share_url !== 'string') {
        continue;
      }
      checked++;
      try {
        const url = `${this.apiUrl()}/api/v1/meta?sourceId=${encodeURIComponent(file.path)}`;
        const response = await fetch(url, { headers: this.authHeaders() });
        if (response.status === 404 || response.status === 410) {
          await this.clearShareMetadata(file);
          cleaned++;
          continue;
        }
        if (!response.ok) {
          errors++;
          continue;
        }
        const meta = await response.json() as { isDeleted?: boolean; url?: string; revision?: number };
        if (meta.isDeleted) {
          await this.clearShareMetadata(file);
          cleaned++;
        }
      } catch {
        errors++;
      }
    }
    new Notice(`Проверено: ${checked}; очищено: ${cleaned}; сетевых ошибок: ${errors}`, 5000);
  }

  private async clearShareMetadata(file: TFile): Promise<void> {
    await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
      delete frontmatter.share_url;
      delete frontmatter.share_mode;
      delete frontmatter.share_id;
      delete frontmatter.share_hash;
      delete frontmatter.share_revision;
    });
  }

  private async handleVaultModification(file: TAbstractFile): Promise<void> {
    if (!this.settings.syncOnSave || !this.settings.publishToken) {
      return;
    }
    if (file instanceof TFile && file.extension === 'md') {
      this.scheduleAutoSync(file);
      return;
    }
    if (!(file instanceof TFile) || !/^(png|jpe?g|gif|webp)$/i.test(file.extension)) {
      return;
    }

    for (const note of this.app.vault.getMarkdownFiles()) {
      const frontmatter = this.app.metadataCache.getFileCache(note)?.frontmatter;
      if (typeof frontmatter?.share_url !== 'string') {
        continue;
      }
      const embeds = this.app.metadataCache.getFileCache(note)?.embeds ?? [];
      const referencesImage = embeds.some((embed) =>
        this.app.metadataCache.getFirstLinkpathDest(embed.link, note.path)?.path === file.path
      );
      if (referencesImage) {
        this.scheduleAutoSync(note);
      }
    }
  }

  private scheduleAutoSync(file: TFile): void {
    if (!this.settings.syncOnSave) {
      return;
    }
    const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
    if (typeof frontmatter?.share_url !== 'string') {
      return;
    }

    const existing = this.syncTimers.get(file.path);
    if (existing !== undefined) {
      window.clearTimeout(existing);
    }
    const timer = window.setTimeout(() => {
      this.syncTimers.delete(file.path);
      void this.shareNoteWithOptions(file, this.accessMode(frontmatter.share_mode), false, false);
    }, 1800);
    this.syncTimers.set(file.path, timer);
  }

  private stripShareMetadata(content: string): string {
    if (!content.startsWith('---\n') && !content.startsWith('---\r\n')) {
      return content;
    }
    const normalized = content.replace(/\r\n/g, '\n');
    const end = normalized.indexOf('\n---\n', 4);
    if (end === -1) {
      return content;
    }
    const frontmatter = normalized.slice(4, end)
      .split('\n')
      .filter((line) => !/^share_(?:url|mode|id|hash|revision):/.test(line));
    return `---\n${frontmatter.join('\n')}\n---\n${normalized.slice(end + 5)}`;
  }

  private accessMode(value: unknown): AccessMode {
    return typeof value === 'string' && value.includes('private') ? 'private' : 'public';
  }

  private authHeaders(): Record<string, string> {
    return { Authorization: `Bearer ${this.settings.publishToken.trim()}` };
  }

  private apiUrl(): string {
    return this.settings.apiUrl.trim().replace(/\/+$/, '');
  }

  private assertConfigured(): void {
    const url = this.apiUrl();
    if (!/^https:\/\//i.test(url) && !/^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/i.test(url)) {
      throw new Error('Укажите корректный HTTPS URL сервера в настройках');
    }
    if (this.settings.publishToken.trim().length < 32) {
      throw new Error('Добавьте токен публикации в настройках плагина');
    }
  }

  private async hashArrayBuffer(buffer: ArrayBuffer): Promise<string> {
    const digest = await crypto.subtle.digest('SHA-256', buffer);
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  private async hashString(value: string): Promise<string> {
    return this.hashArrayBuffer(new TextEncoder().encode(value).buffer);
  }

  private imageMime(extension: string): string {
    const normalized = extension.toLowerCase();
    if (normalized === 'jpg' || normalized === 'jpeg') return 'image/jpeg';
    if (normalized === 'png') return 'image/png';
    if (normalized === 'gif') return 'image/gif';
    if (normalized === 'webp') return 'image/webp';
    throw new Error(`Неподдерживаемый формат изображения: ${extension}`);
  }

  private async responseError(response: Response, fallback: string): Promise<string> {
    try {
      const data = await response.json() as { error?: unknown };
      if (typeof data.error === 'string' && data.error.length <= 240) {
        return `${fallback}: ${data.error}`;
      }
    } catch {
      // The fallback deliberately avoids echoing an arbitrary server body.
    }
    return `${fallback}: HTTP ${response.status}`;
  }

  private pruneMediaCache(): void {
    const entries = Object.entries(this.settings.mediaCache);
    if (entries.length <= 1000) {
      return;
    }
    entries.sort(([, left], [, right]) => right.createdAt - left.createdAt);
    this.settings.mediaCache = Object.fromEntries(entries.slice(0, 800));
  }

  async clearMediaCache(): Promise<void> {
    this.settings.mediaCache = {};
    await this.saveSettings();
    new Notice('Кэш изображений очищен; сервер всё равно не создаст дубли');
  }

  async loadSettings(): Promise<void> {
    const loaded = await this.loadData() as Partial<SharePluginSettings> | null;
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...(loaded ?? {}),
      mediaCache: loaded?.mediaCache && typeof loaded.mediaCache === 'object'
        ? loaded.mediaCache
        : {},
    };
    this.settings.apiUrl = this.apiUrl();
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  onunload(): void {
    for (const timer of this.syncTimers.values()) {
      window.clearTimeout(timer);
    }
    this.syncTimers.clear();
  }
}

class ShareSettingTab extends PluginSettingTab {
  plugin: SharePlugin;

  constructor(app: App, plugin: SharePlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl('h2', { text: 'Настройки публикации заметок' });

    new Setting(containerEl)
      .setName('URL API сервера')
      .setDesc('Рабочий адрес блога и API')
      .addText((text) => text
        .setPlaceholder('https://read.malovnik.ru')
        .setValue(this.plugin.settings.apiUrl)
        .onChange(async (value) => {
          this.plugin.settings.apiUrl = value.trim().replace(/\/+$/, '');
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Токен публикации')
      .setDesc('Секретный токен с правами публикации. Он хранится только в локальных данных Obsidian.')
      .addText((text) => {
        text.inputEl.type = 'password';
        text
          .setPlaceholder('Вставьте токен')
          .setValue(this.plugin.settings.publishToken)
          .onChange(async (value) => {
            this.plugin.settings.publishToken = value.trim();
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName('Синхронизировать изменённую заметку после сохранения')
      .setDesc('Только изменённая опубликованная заметка; полного часового обхода vault больше нет')
      .addToggle((toggle) => toggle
        .setValue(this.plugin.settings.syncOnSave)
        .onChange(async (value) => {
          this.plugin.settings.syncOnSave = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Автоматически копировать ссылку')
      .setDesc('Копировать ссылку после ручной публикации')
      .addToggle((toggle) => toggle
        .setValue(this.plugin.settings.autoClipboard)
        .onChange(async (value) => {
          this.plugin.settings.autoClipboard = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Срок жизни ссылки (дни)')
      .setDesc('0 — без автоматического истечения')
      .addText((text) => text
        .setPlaceholder('0')
        .setValue(String(this.plugin.settings.defaultExpiry))
        .onChange(async (value) => {
          const parsed = Number.parseInt(value, 10);
          if (Number.isFinite(parsed) && parsed >= 0) {
            this.plugin.settings.defaultExpiry = Math.min(parsed, 3650);
            await this.plugin.saveSettings();
          }
        }));

    new Setting(containerEl)
      .setName('Кэш загруженных изображений')
      .setDesc(`Локально известно изображений: ${Object.keys(this.plugin.settings.mediaCache).length}`)
      .addButton((button) => button
        .setButtonText('Очистить кэш')
        .onClick(async () => {
          await this.plugin.clearMediaCache();
          this.display();
        }));
  }
}
