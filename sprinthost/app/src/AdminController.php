<?php

declare(strict_types=1);

namespace ObsidianShare;

use PDO;

final class AdminController
{
    /** @param array<string, mixed> $config */
    public function __construct(
        private readonly PDO $pdo,
        private readonly array $config,
        private readonly Template $template,
        private readonly SessionManager $session,
        private readonly AuthRateLimiter $rateLimiter,
        private readonly StaticSiteGenerator $generator,
        private readonly MediaStore $media,
        private readonly AuditLog $audit,
    ) {
    }

    public function page(Request $request): never
    {
        if (!$this->session->isAdmin()) {
            Response::html($this->loginPage(), 200, ['Cache-Control' => 'private, no-store']);
        }

        $query = is_string($request->query['q'] ?? null) ? trim($request->query['q']) : '';
        $status = is_string($request->query['status'] ?? null) ? $request->query['status'] : 'active';
        if (!in_array($status, ['active', 'trash', 'all'], true)) {
            $status = 'active';
        }
        $access = is_string($request->query['access'] ?? null) ? $request->query['access'] : 'all';
        if (!in_array($access, ['all', 'public', 'unlisted', 'private'], true)) {
            $access = 'all';
        }

        Response::html(
            $this->adminPage($this->notes($query, $status, $access), $query, $status, $access),
            200,
            ['Cache-Control' => 'private, no-store'],
        );
    }

    public function login(Request $request): never
    {
        $this->session->requireCsrf(is_string($_POST['csrf'] ?? null) ? $_POST['csrf'] : null);
        $username = is_string($_POST['username'] ?? null) ? trim($_POST['username']) : '';
        $password = is_string($_POST['password'] ?? null) ? $_POST['password'] : '';
        $identity = $request->remoteAddress . '|admin|' . $username;
        $this->rateLimiter->assertAllowed($identity);

        $validUser = hash_equals((string) $this->config['admin_username'], $username);
        $validPassword = $password !== '' && password_verify($password, (string) $this->config['admin_password_hash']);
        $valid = $validUser && $validPassword;
        $this->rateLimiter->record($identity, $valid);
        if (!$valid) {
            Response::html($this->loginPage('Неверный логин или пароль.'), 401, ['Cache-Control' => 'private, no-store']);
        }

        $this->session->loginAdmin();
        $this->audit->write('admin:' . $username, 'admin.login', 'session');
        Response::redirect('/admin');
    }

    public function logout(): never
    {
        $this->session->requireCsrf(is_string($_POST['csrf'] ?? null) ? $_POST['csrf'] : null);
        $this->session->logoutAdmin();
        Response::redirect('/admin');
    }

    public function noteAction(string $id): never
    {
        $this->session->requireAdmin();
        $this->session->requireCsrf(is_string($_POST['csrf'] ?? null) ? $_POST['csrf'] : null);
        if (preg_match('/^[A-Za-z0-9_-]{1,180}$/', $id) !== 1) {
            throw new HttpException(404, 'Note not found');
        }
        $action = is_string($_POST['action'] ?? null) ? $_POST['action'] : '';

        match ($action) {
            'trash' => $this->setDeleted($id, true),
            'restore' => $this->setDeleted($id, false),
            'access' => $this->setAccess($id, is_string($_POST['access_mode'] ?? null) ? $_POST['access_mode'] : ''),
            'cover-remove' => $this->removeCover($id),
            'cover-upload' => $this->uploadCover($id),
            'purge' => $this->purge($id, is_string($_POST['confirmation'] ?? null) ? $_POST['confirmation'] : ''),
            'rebuild' => null,
            default => throw new HttpException(400, 'Unknown admin action'),
        };

        $this->generator->rebuild();
        Response::redirect('/admin?status=all&saved=1');
    }

    /** @return list<array<string, mixed>> */
    private function notes(string $query, string $status, string $access): array
    {
        $conditions = [];
        $parameters = [];
        if ($status === 'active') {
            $conditions[] = 'is_deleted = 0';
        } elseif ($status === 'trash') {
            $conditions[] = 'is_deleted = 1';
        }
        if ($access !== 'all') {
            $conditions[] = 'access_mode = :access';
            $parameters['access'] = $access;
        }
        if ($query !== '') {
            $conditions[] = '(title LIKE :query ESCAPE \'\\\' OR source_id LIKE :query ESCAPE \'\\\')';
            $parameters['query'] = '%' . str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $query) . '%';
        }

        $where = $conditions === [] ? '1 = 1' : implode(' AND ', $conditions);
        $statement = $this->pdo->prepare(
            "SELECT * FROM notes WHERE {$where} ORDER BY updated_at DESC LIMIT 300"
        );
        $statement->execute($parameters);
        return $statement->fetchAll();
    }

    /** @param list<array<string, mixed>> $notes */
    private function adminPage(array $notes, string $query, string $status, string $access): string
    {
        $csrf = Template::escape($this->session->csrfToken());
        $activeCount = (int) $this->pdo
            ->query('SELECT COUNT(*) FROM notes WHERE is_deleted = 0')
            ->fetchColumn();
        $rows = '';
        foreach ($notes as $note) {
            $id = Template::escape((string) $note['id']);
            $title = Template::escape((string) $note['title']);
            $source = Template::escape((string) ($note['source_id'] ?? ''));
            $path = Template::escape((string) $note['canonical_path']);
            $mode = (string) $note['access_mode'];
            $deleted = (int) $note['is_deleted'] === 1;
            $revision = (int) $note['revision'];
            $updated = Template::escape(substr((string) $note['updated_at'], 0, 16));
            $coverHash = is_string($note['cover_media_hash'] ?? null)
                ? (string) $note['cover_media_hash']
                : '';
            $cover = $coverHash === ''
                ? '<span class="admin-thumb-fallback">' . Template::escape(mb_strtoupper(mb_substr((string) $note['title'], 0, 1))) . '</span>'
                : '<img src="/api/images/' . Template::escape($coverHash) . '" alt="" loading="lazy">';
            $lock = $mode === 'private'
                ? '<svg class="admin-lock" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-label="Закрытая"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>'
                : '';
            $uniqueViews = max(0, (int) ($note['unique_view_count'] ?? 0));
            $views = max(0, (int) ($note['view_count'] ?? 0));
            $trashAction = $deleted
                ? '<button name="action" value="restore">Вернуть</button>'
                : '<button class="danger-ghost" name="action" value="trash">В корзину</button>';
            $purge = $deleted
                ? '<details><summary>Удалить навсегда</summary><input name="confirmation" placeholder="DELETE"><button class="danger" name="action" value="purge">Удалить</button></details>'
                : '';
            $options = '';
            foreach (['public' => 'Публичная', 'unlisted' => 'По ссылке', 'private' => 'Закрытая'] as $value => $label) {
                $selected = $mode === $value ? ' selected' : '';
                $options .= '<option value="' . $value . '"' . $selected . '>' . $label . '</option>';
            }
            $rows .= <<<HTML
<article class="admin-note">
  <div class="admin-note-main">
    <span class="admin-thumb">{$cover}</span>
    <span class="admin-note-copy">
      <span class="card-meta"><span>{$mode}</span><span>rev {$revision}</span></span>
      <h2><a href="/s/{$path}" target="_blank" rel="noopener">{$lock}{$title}</a></h2>
      <span class="admin-note-data"><span title="Уникальные / Все просмотры">{$uniqueViews}/{$views}</span><time>{$updated}</time></span>
      <span class="source-id">{$source}</span>
    </span>
  </div>
  <div class="admin-actions">
    <form method="post" action="/admin/notes/{$id}/action">
      <input type="hidden" name="csrf" value="{$csrf}">
      <select name="access_mode">{$options}</select>
      <button name="action" value="access">Сохранить доступ</button>
    </form>
    <form method="post" action="/admin/notes/{$id}/action" enctype="multipart/form-data">
      <input type="hidden" name="csrf" value="{$csrf}">
      <input type="file" name="cover" accept="image/jpeg,image/png,image/gif,image/webp">
      <button name="action" value="cover-upload">Заменить обложку</button>
      <button class="danger-ghost" name="action" value="cover-remove">Убрать</button>
    </form>
    <form method="post" action="/admin/notes/{$id}/action">
      <input type="hidden" name="csrf" value="{$csrf}">
      {$trashAction}
      {$purge}
    </form>
  </div>
</article>
HTML;
        }
        if ($rows === '') {
            $rows = '<p class="empty-state">По этому фильтру записей нет.</p>';
        }

        $queryEscaped = Template::escape($query);
        $saved = isset($_GET['saved']) ? '<p class="success-banner">Изменения сохранены, статические страницы пересобраны.</p>' : '';
        $body = <<<HTML
<main class="admin-shell">
  <section class="admin-header">
    <div><h1>Статьи</h1><p>{$activeCount} активных</p></div>
    <form method="post" action="/admin/logout">
      <input type="hidden" name="csrf" value="{$csrf}">
      <button class="danger-ghost">Выйти</button>
    </form>
  </section>
  {$saved}
  <form class="admin-filters" method="get">
    <input type="search" name="q" value="{$queryEscaped}" placeholder="Поиск по названию...">
    <select name="status">
      {$this->option('active', 'Активные', $status)}
      {$this->option('trash', 'Корзина', $status)}
      {$this->option('all', 'Все', $status)}
    </select>
    <select name="access">
      {$this->option('all', 'Любой доступ', $access)}
      {$this->option('public', 'Публичные', $access)}
      {$this->option('unlisted', 'По ссылке', $access)}
      {$this->option('private', 'Закрытые', $access)}
    </select>
    <button>Применить</button>
  </form>
  <p class="result-count">Найдено: {$this->count($notes)}</p>
  <section class="admin-list">{$rows}</section>
</main>
HTML;

        return $this->template->layout(
            'Админка',
            $body,
            'Управление Obsidian Share',
            'noindex,nofollow,noarchive',
            null,
        );
    }

    private function loginPage(?string $error = null): string
    {
        $csrf = Template::escape($this->session->csrfToken());
        $errorMarkup = $error === null ? '' : '<p class="form-error">' . Template::escape($error) . '</p>';
        $body = <<<HTML
<main class="auth-shell">
  <section class="auth-card">
    <p class="eyebrow">АДМИНКА</p>
    <h1>Вход</h1>
    <p>Управление публикациями, доступом, обложками и корзиной.</p>
    {$errorMarkup}
    <form method="post" action="/admin/login">
      <input type="hidden" name="csrf" value="{$csrf}">
      <label>Логин<input name="username" required autocomplete="username"></label>
      <label>Пароль<input type="password" name="password" required autocomplete="current-password"></label>
      <button>Войти</button>
    </form>
  </section>
</main>
HTML;
        return $this->template->layout('Вход в админку', $body, 'Вход в админку', 'noindex,nofollow', null);
    }

    private function setDeleted(string $id, bool $deleted): void
    {
        $statement = $this->pdo->prepare(
            'UPDATE notes SET is_deleted = :deleted, updated_at = :now, revision = revision + 1 WHERE id = :id'
        );
        $statement->execute(['deleted' => $deleted ? 1 : 0, 'now' => Clock::now(), 'id' => $id]);
        if ($statement->rowCount() === 0) {
            throw new HttpException(404, 'Note not found');
        }
        $this->audit->write('admin', $deleted ? 'note.trash' : 'note.restore', 'note', $id);
    }

    private function setAccess(string $id, string $mode): void
    {
        if (!in_array($mode, ['public', 'unlisted', 'private'], true)) {
            throw new HttpException(400, 'Invalid access mode');
        }
        $statement = $this->pdo->prepare(
            'UPDATE notes SET
                access_mode = :mode,
                no_index = :no_index,
                password_hash = :password_hash,
                content_hash = :content_hash,
                updated_at = :now,
                revision = revision + 1
             WHERE id = :id'
        );
        $statement->execute([
            'mode' => $mode,
            'no_index' => $mode === 'public' ? 0 : 1,
            'password_hash' => $mode === 'private' ? (string) $this->config['private_password_hash'] : null,
            'content_hash' => 'admin:' . bin2hex(random_bytes(24)),
            'now' => Clock::now(),
            'id' => $id,
        ]);
        if ($statement->rowCount() === 0) {
            throw new HttpException(404, 'Note not found');
        }
        $this->audit->write('admin', 'note.access', 'note', $id, ['accessMode' => $mode]);
    }

    private function removeCover(string $id): void
    {
        $statement = $this->pdo->prepare('UPDATE notes SET cover_media_hash = NULL, updated_at = :now WHERE id = :id');
        $statement->execute(['now' => Clock::now(), 'id' => $id]);
        $this->pdo->prepare("DELETE FROM note_media WHERE note_id = :id AND role = 'cover'")->execute(['id' => $id]);
        $this->audit->write('admin', 'note.cover.remove', 'note', $id);
    }

    private function uploadCover(string $id): void
    {
        $upload = $_FILES['cover'] ?? null;
        if (!is_array($upload) || (int) ($upload['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            throw new HttpException(400, 'Choose a valid cover image');
        }
        $temporary = (string) ($upload['tmp_name'] ?? '');
        if (!is_uploaded_file($temporary)) {
            throw new HttpException(400, 'Invalid cover upload');
        }
        $bytes = file_get_contents($temporary);
        if ($bytes === false) {
            throw new HttpException(400, 'Unable to read cover image');
        }
        $hash = hash('sha256', $bytes);
        $record = $this->media->store($bytes, $hash, (string) ($upload['name'] ?? 'cover'));
        $this->pdo->prepare("DELETE FROM note_media WHERE note_id = :id AND role = 'cover'")
            ->execute(['id' => $id]);
        $statement = $this->pdo->prepare('UPDATE notes SET cover_media_hash = :hash, updated_at = :now WHERE id = :id');
        $statement->execute(['hash' => $hash, 'now' => Clock::now(), 'id' => $id]);
        if ($statement->rowCount() === 0) {
            throw new HttpException(404, 'Note not found');
        }
        $this->pdo->prepare(
            "INSERT OR IGNORE INTO note_media (note_id, media_hash, role) VALUES (:id, :hash, 'cover')"
        )->execute(['id' => $id, 'hash' => $hash]);
        $this->audit->write('admin', 'note.cover.upload', 'note', $id, [
            'deduplicated' => $record['deduplicated'],
        ]);
    }

    private function purge(string $id, string $confirmation): void
    {
        if (!hash_equals('DELETE', $confirmation)) {
            throw new HttpException(400, 'Permanent deletion requires DELETE confirmation');
        }
        $statement = $this->pdo->prepare('DELETE FROM notes WHERE id = :id AND is_deleted = 1');
        $statement->execute(['id' => $id]);
        if ($statement->rowCount() === 0) {
            throw new HttpException(409, 'Only notes already in trash may be permanently deleted');
        }
        $this->audit->write('admin', 'note.purge', 'note', $id);
    }

    private function option(string $value, string $label, string $selected): string
    {
        return '<option value="' . $value . '"' . ($value === $selected ? ' selected' : '') . '>'
            . Template::escape($label) . '</option>';
    }

    /** @param list<array<string, mixed>> $notes */
    private function count(array $notes): int
    {
        return count($notes);
    }
}
