import { App, Notice, Plugin, PluginSettingTab, Setting, TFile, TAbstractFile } from 'obsidian';

interface SharePluginSettings {
  apiUrl: string;
  autoClipboard: boolean;
  defaultExpiry: number;
}

const DEFAULT_SETTINGS: SharePluginSettings = {
  apiUrl: 'https://your-server.example.com',
  autoClipboard: true,
  defaultExpiry: 0,
};

interface ShareResponse {
  success: boolean;
  url: string;
  isUpdate: boolean;
  id?: string;
  slug?: string;
  expiresAt?: string | null;
}

interface ImageUploadResponse {
  success: boolean;
  id: string;
  url: string;
  width: number;
  height: number;
  size: number;
  originalSize: number;
}

interface ShareRequestBody {
  title: string;
  content: string;
  sourceId: string;
  shareId?: string;
  customCss?: string;
  noIndex?: boolean;
  expiresInDays?: number | null;
}

export default class SharePlugin extends Plugin {
  settings: SharePluginSettings;
  private autoSyncInterval: number | null = null;

  async onload(): Promise<void> {
    await this.loadSettings();

    this.addCommand({
      id: 'share-note',
      name: 'Опубликовать заметку',
      callback: () => this.shareCurrentNote(),
    });

    this.addCommand({
      id: 'share-note-private',
      name: 'Поделиться приватно',
      callback: () => this.sharePrivateNote(),
    });

    this.addCommand({
      id: 'update-current-note',
      name: 'Обновить текущую статью на сервере',
      callback: () => this.updateCurrentNote(),
    });

    this.addCommand({
      id: 'sync-shared-notes',
      name: 'Синхронизировать статус статей',
      callback: () => this.syncSharedNotes(),
    });

    this.addCommand({
      id: 'auto-update-all',
      name: 'Обновить все опубликованные статьи',
      callback: () => this.autoUpdateAllNotes(),
    });

    this.addRibbonIcon('share', 'Опубликовать заметку', () => {
      this.shareCurrentNote();
    });

    this.addRibbonIcon('lock', 'Поделиться приватно', () => {
      this.sharePrivateNote();
    });

    this.addSettingTab(new ShareSettingTab(this.app, this));

    this.startAutoSync();
    console.log('Share Plugin loaded');
  }

  async shareCurrentNote(): Promise<void> {
    await this.shareNoteWithOptions(false);
  }

  async sharePrivateNote(): Promise<void> {
    await this.shareNoteWithOptions(true);
  }

  private async shareNoteWithOptions(isPrivate: boolean): Promise<void> {
    const activeFile = this.app.workspace.getActiveFile();

    if (!activeFile) {
      new Notice('Откройте заметку для публикации');
      return;
    }

    try {
      const mode = isPrivate ? 'Создание приватной ссылки' : 'Публикация заметки';
      new Notice(`${mode}...`);

      let content = await this.app.vault.read(activeFile);
      const title = activeFile.basename;
      const sourceId = activeFile.path;
      const customCss = this.extractThemeCss();

      const cache = this.app.metadataCache.getFileCache(activeFile);
      const existingShareId = cache?.frontmatter?.share_id;

      content = await this.processImages(content, activeFile);

      const response = await this.shareNote(
        title,
        content,
        sourceId,
        customCss,
        isPrivate,
        existingShareId
      );

      if (response.success) {
        await this.updateNoteFrontmatter(activeFile, response.url, isPrivate, response.id);

        const action = response.isUpdate ? 'обновлена' : 'опубликована';
        const prefix = isPrivate ? '🔒 Приватная ссылка' : '✅ Заметка';

        if (this.settings.autoClipboard) {
          await navigator.clipboard.writeText(response.url);
          new Notice(`${prefix} ${action}. Ссылка скопирована: ${response.url}`, 5000);
        } else {
          new Notice(`${prefix} ${action}: ${response.url}`, 5000);
        }
      } else {
        throw new Error('Server returned success: false');
      }
    } catch (error) {
      console.error('SharePlugin: Share failed', error);

      const errorMsg = error instanceof Error
        ? error.message
        : 'Неизвестная ошибка';

      new Notice(`Не удалось опубликовать: ${errorMsg}`, 7000);
    }
  }

  /**
   * Находит все ![[image]] в контенте, загружает на сервер, заменяет на ![](url)
   */
  private async processImages(content: string, sourceFile: TFile): Promise<string> {
    const imageRegex = /!\[\[([^\]]+\.(png|jpg|jpeg|gif|bmp|svg|webp))\]\]/gi;
    const matches = [...content.matchAll(imageRegex)];

    if (matches.length === 0) return content;

    new Notice(`Загрузка ${matches.length} изображений...`);
    let uploaded = 0;

    for (const match of matches) {
      const fullMatch = match[0];
      const filename = match[1];

      try {
        const imageFile = this.resolveImageFile(filename, sourceFile);
        if (!imageFile) {
          console.warn(`SharePlugin: Image not found: ${filename}`);
          continue;
        }

        const imageData = await this.app.vault.readBinary(imageFile);
        const base64 = this.arrayBufferToBase64(imageData);

        const response = await this.uploadImage(filename, base64);

        if (response.success) {
          content = content.replace(fullMatch, `![${filename}](${response.url})`);
          uploaded++;
        }
      } catch (error) {
        console.error(`SharePlugin: Failed to upload image ${filename}`, error);
      }
    }

    if (uploaded > 0) {
      new Notice(`Загружено ${uploaded}/${matches.length} изображений`);
    }

    return content;
  }

  /**
   * Находит файл изображения в vault по имени.
   * Obsidian ищет в нескольких местах: рядом с файлом, в корне, в Cache/
   */
  private resolveImageFile(filename: string, sourceFile: TFile): TFile | null {
    const sourceDir = sourceFile.parent?.path || '';

    const candidates = [
      `${sourceDir}/${filename}`,
      filename,
      `Cache/${filename}`,
      `Attachments/${filename}`,
    ];

    for (const path of candidates) {
      const file = this.app.vault.getAbstractFileByPath(path);
      if (file instanceof TFile) return file;
    }

    const allFiles = this.app.vault.getFiles();
    const found = allFiles.find((f: TAbstractFile) => f.name === filename);
    if (found instanceof TFile) return found;

    return null;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private async uploadImage(filename: string, base64Data: string): Promise<ImageUploadResponse> {
    const url = `${this.settings.apiUrl}/api/images`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, data: base64Data }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Image upload failed: HTTP ${response.status}: ${errorText}`);
    }

    return await response.json();
  }

  private extractThemeCss(): string {
    try {
      const bodyStyle = getComputedStyle(document.body);

      const vars = {
        bgPrimary: bodyStyle.getPropertyValue('--background-primary').trim(),
        bgSecondary: bodyStyle.getPropertyValue('--background-secondary').trim(),
        textNormal: bodyStyle.getPropertyValue('--text-normal').trim(),
        textMuted: bodyStyle.getPropertyValue('--text-muted').trim(),
        textAccent: bodyStyle.getPropertyValue('--text-accent').trim(),
        linkColor: bodyStyle.getPropertyValue('--link-color').trim(),
        linkHover: bodyStyle.getPropertyValue('--link-color-hover').trim(),
        codeBackground: bodyStyle.getPropertyValue('--code-background').trim(),
        codeNormal: bodyStyle.getPropertyValue('--code-normal').trim(),
        h1Color: bodyStyle.getPropertyValue('--h1-color').trim(),
        h2Color: bodyStyle.getPropertyValue('--h2-color').trim(),
        h3Color: bodyStyle.getPropertyValue('--h3-color').trim(),
        h4Color: bodyStyle.getPropertyValue('--h4-color').trim(),
        h5Color: bodyStyle.getPropertyValue('--h5-color').trim(),
        h6Color: bodyStyle.getPropertyValue('--h6-color').trim(),
        blockquoteBorder: bodyStyle.getPropertyValue('--blockquote-border').trim(),
        listMarker: bodyStyle.getPropertyValue('--list-marker-color').trim(),
      };

      if (!vars.textNormal && !vars.h1Color && !vars.linkColor) {
        console.warn('SharePlugin: No theme CSS variables found');
        return '';
      }

      const cssRules: string[] = [];

      if (vars.textNormal) {
        cssRules.push(`.markdown-body { color: ${vars.textNormal} !important; }`);
      }

      if (vars.h1Color) cssRules.push(`.markdown-body h1 { color: ${vars.h1Color} !important; }`);
      if (vars.h2Color) cssRules.push(`.markdown-body h2 { color: ${vars.h2Color} !important; }`);
      if (vars.h3Color) cssRules.push(`.markdown-body h3 { color: ${vars.h3Color} !important; }`);
      if (vars.h4Color) cssRules.push(`.markdown-body h4 { color: ${vars.h4Color} !important; }`);
      if (vars.h5Color) cssRules.push(`.markdown-body h5 { color: ${vars.h5Color} !important; }`);
      if (vars.h6Color) cssRules.push(`.markdown-body h6 { color: ${vars.h6Color} !important; }`);

      if (vars.linkColor) {
        cssRules.push(`.markdown-body a { color: ${vars.linkColor} !important; }`);
      }
      if (vars.linkHover) {
        cssRules.push(`.markdown-body a:hover { color: ${vars.linkHover} !important; }`);
      }

      if (vars.codeBackground) {
        cssRules.push(`.markdown-body code { background-color: ${vars.codeBackground} !important; }`);
        cssRules.push(`.markdown-body pre { background-color: ${vars.codeBackground} !important; }`);
      }
      if (vars.codeNormal) {
        cssRules.push(`.markdown-body code { color: ${vars.codeNormal} !important; }`);
      }

      if (vars.blockquoteBorder) {
        cssRules.push(`.markdown-body blockquote { border-left-color: ${vars.blockquoteBorder} !important; }`);
      }
      if (vars.textMuted) {
        cssRules.push(`.markdown-body blockquote { color: ${vars.textMuted} !important; }`);
      }

      if (vars.listMarker) {
        cssRules.push(`.markdown-body ul li::marker { color: ${vars.listMarker} !important; }`);
        cssRules.push(`.markdown-body ol li::marker { color: ${vars.listMarker} !important; }`);
      }

      if (vars.textAccent) {
        cssRules.push(`.markdown-body strong { color: ${vars.textAccent} !important; }`);
        cssRules.push(`.markdown-body em { color: ${vars.textAccent} !important; }`);
      }

      return cssRules.join('\n');
    } catch (error) {
      console.error('SharePlugin: Failed to extract theme CSS', error);
      return '';
    }
  }

  private async shareNote(
    title: string,
    content: string,
    sourceId: string,
    customCss?: string,
    noIndex: boolean = false,
    shareId?: string
  ): Promise<ShareResponse> {
    const url = `${this.settings.apiUrl}/api/share`;

    const requestBody: ShareRequestBody = {
      title,
      content,
      sourceId,
      expiresInDays: this.settings.defaultExpiry > 0
        ? this.settings.defaultExpiry
        : null,
      noIndex,
    };

    if (shareId) {
      requestBody.shareId = shareId;
    }

    if (customCss && customCss.trim()) {
      requestBody.customCss = customCss;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP ${response.status}: ${errorText || response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error('SharePlugin: API request failed', error);
      throw error;
    }
  }

  private async updateNoteFrontmatter(
    file: TFile,
    shareUrl: string,
    isPrivate: boolean,
    shareId?: string
  ): Promise<void> {
    try {
      await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
        frontmatter.share_url = shareUrl;
        frontmatter.share_mode = isPrivate ? 'private 🔒' : 'public 🔓';
        if (shareId) {
          frontmatter.share_id = shareId;
        }
      });
    } catch (error) {
      console.error('SharePlugin: Failed to update frontmatter', error);
      new Notice('Ссылка создана, но не удалось обновить метаданные заметки');
    }
  }

  private startAutoSync(): void {
    this.autoSyncInterval = window.setInterval(
      () => this.autoUpdateAllNotes(),
      60 * 60 * 1000
    );
    this.registerInterval(this.autoSyncInterval);
  }

  private async updateCurrentNote(): Promise<void> {
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) {
      new Notice('Откройте заметку для обновления');
      return;
    }

    const cache = this.app.metadataCache.getFileCache(activeFile);
    const shareUrl = cache?.frontmatter?.share_url;
    const shareMode = cache?.frontmatter?.share_mode;
    const existingShareId = cache?.frontmatter?.share_id;

    if (!shareUrl) {
      new Notice('Эта заметка не опубликована. Используйте "Опубликовать заметку".');
      return;
    }

    const isPrivate = typeof shareMode === 'string' && shareMode.includes('private');

    try {
      new Notice('Обновление статьи...');
      let content = await this.app.vault.read(activeFile);
      const title = activeFile.basename;
      const sourceId = activeFile.path;

      content = await this.processImages(content, activeFile);

      const response = await this.shareNote(title, content, sourceId, undefined, isPrivate, existingShareId);

      if (response.success) {
        await this.updateNoteFrontmatter(activeFile, response.url, isPrivate, response.id);
        new Notice(`Статья обновлена: ${response.url}`, 3000);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Неизвестная ошибка';
      new Notice(`Ошибка обновления: ${msg}`, 5000);
    }
  }

  private async autoUpdateAllNotes(): Promise<void> {
    const files = this.app.vault.getMarkdownFiles();
    let updated = 0;
    let errors = 0;

    for (const file of files) {
      const cache = this.app.metadataCache.getFileCache(file);
      const shareUrl = cache?.frontmatter?.share_url;
      if (!shareUrl) continue;

      const shareMode = cache?.frontmatter?.share_mode;
      const existingShareId = cache?.frontmatter?.share_id;
      const isPrivate = typeof shareMode === 'string' && shareMode.includes('private');

      try {
        let content = await this.app.vault.read(file);
        const title = file.basename;
        const sourceId = file.path;

        content = await this.processImages(content, file);

        const response = await this.shareNote(title, content, sourceId, undefined, isPrivate, existingShareId);

        if (response.success) {
          await this.updateNoteFrontmatter(file, response.url, isPrivate, response.id);
          updated++;
        }
      } catch {
        errors++;
      }
    }

    if (updated > 0 || errors > 0) {
      new Notice(`Обновлено: ${updated}, ошибок: ${errors}`, 3000);
    }
  }

  private async syncSharedNotes(): Promise<void> {
    new Notice('Проверка статусов статей...');

    const files = this.app.vault.getMarkdownFiles();
    let cleaned = 0;
    let checked = 0;

    for (const file of files) {
      const cache = this.app.metadataCache.getFileCache(file);
      const shareUrl = cache?.frontmatter?.share_url;
      if (!shareUrl) continue;

      checked++;

      const pathSegment = shareUrl.split('/s/').pop();
      if (!pathSegment) continue;

      try {
        const res = await fetch(
          `${this.settings.apiUrl}/api/share/${pathSegment}/meta`
        );

        if (res.status === 404 || res.status === 410) {
          await this.app.fileManager.processFrontMatter(file, (fm) => {
            delete fm.share_url;
            delete fm.share_mode;
          });
          cleaned++;
        }
      } catch {
        /* skip network errors */
      }
    }

    if (cleaned > 0) {
      new Notice(`Очищено ${cleaned} из ${checked} заметок`, 5000);
    } else {
      new Notice(`Проверено ${checked} заметок, все актуальны`, 3000);
    }
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  onunload(): void {
    if (this.autoSyncInterval !== null) {
      window.clearInterval(this.autoSyncInterval);
    }
    console.log('Share Plugin unloaded');
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
      .setDesc('Адрес вашего сервера (например: https://your-server.example.com)')
      .addText(text =>
        text
          .setPlaceholder('https://your-server.example.com')
          .setValue(this.plugin.settings.apiUrl)
          .onChange(async value => {
            this.plugin.settings.apiUrl = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Автоматически копировать ссылку')
      .setDesc('Копировать ссылку в буфер обмена после публикации')
      .addToggle(toggle =>
        toggle.setValue(this.plugin.settings.autoClipboard).onChange(async value => {
          this.plugin.settings.autoClipboard = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName('Срок жизни ссылки (дни)')
      .setDesc('Через сколько дней удалить заметку (0 = никогда)')
      .addText(text =>
        text
          .setPlaceholder('0')
          .setValue(String(this.plugin.settings.defaultExpiry))
          .onChange(async value => {
            const num = parseInt(value);
            if (!isNaN(num) && num >= 0) {
              this.plugin.settings.defaultExpiry = num;
              await this.plugin.saveSettings();
            }
          })
      );
  }
}
