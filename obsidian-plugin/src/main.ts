import { App, Notice, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';

interface ShareSettings {
	apiUrl: string;
	autoClipboard: boolean;
	defaultExpiry: number; // дни
}

const DEFAULT_SETTINGS: ShareSettings = {
	apiUrl: 'https://notes.malovnik.com', // Твой домен
	autoClipboard: true,
	defaultExpiry: 0, // 0 = без срока
};

export default class SharePlugin extends Plugin {
	settings: ShareSettings;

	async onload() {
		await this.loadSettings();

		// Команда для публикации заметки
		this.addCommand({
			id: 'share-note',
			name: 'Поделиться заметкой',
			callback: () => this.shareCurrentNote(),
		});

		// Иконка в риббоне
		this.addRibbonIcon('share', 'Поделиться заметкой', () => {
			this.shareCurrentNote();
		});

		// Настройки
		this.addSettingTab(new ShareSettingTab(this.app, this));

		console.log('Share Plugin loaded');
	}

	async shareCurrentNote() {
		const activeFile = this.app.workspace.getActiveFile();

		if (!activeFile) {
			new Notice('Откройте заметку для публикации');
			return;
		}

		try {
			new Notice('Публикация заметки...');

			// Читаем содержимое
			const content = await this.app.vault.read(activeFile);

			// Получаем заголовок (первая строка или название файла)
			const title = activeFile.basename;

			// Отправляем на сервер
			const response = await this.shareNote(title, content);

			if (response.success) {
				// Копируем ссылку в буфер обмена
				if (this.settings.autoClipboard) {
					await navigator.clipboard.writeText(response.url);
					new Notice(`✅ Ссылка скопирована: ${response.url}`);
				} else {
					new Notice(`✅ Опубликовано: ${response.url}`);
				}
			} else {
				new Notice('❌ Ошибка публикации');
			}
		} catch (error) {
			console.error('Share error:', error);
			new Notice('❌ Не удалось опубликовать заметку');
		}
	}

	async shareNote(title: string, content: string): Promise<any> {
		const url = `${this.settings.apiUrl}/api/share`;

		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				title,
				content,
				expiresInDays: this.settings.defaultExpiry > 0 ? this.settings.defaultExpiry : null,
			}),
		});

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		return await response.json();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	onunload() {
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
			.setDesc('Адрес вашего сервера (например: https://notes.malovnik.com)')
			.addText((text) =>
				text
					.setPlaceholder('https://notes.malovnik.com')
					.setValue(this.plugin.settings.apiUrl)
					.onChange(async (value) => {
						this.plugin.settings.apiUrl = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName('Автоматически копировать ссылку')
			.setDesc('Копировать ссылку в буфер обмена после публикации')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.autoClipboard)
					.onChange(async (value) => {
						this.plugin.settings.autoClipboard = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName('Срок жизни ссылки (дни)')
			.setDesc('Через сколько дней удалить заметку (0 = никогда)')
			.addText((text) =>
				text
					.setPlaceholder('0')
					.setValue(String(this.plugin.settings.defaultExpiry))
					.onChange(async (value) => {
						const num = parseInt(value);
						if (!isNaN(num) && num >= 0) {
							this.plugin.settings.defaultExpiry = num;
							await this.plugin.saveSettings();
						}
					})
			);
	}
}
