<?php

declare(strict_types=1);

namespace ObsidianShare;

use PDO;

final class PublicController
{
    /** @param array<string, mixed> $config */
    public function __construct(
        private readonly PDO $pdo,
        private readonly array $config,
        private readonly Template $template,
        private readonly SessionManager $session,
        private readonly AuthRateLimiter $rateLimiter,
        private readonly MediaStore $media,
    ) {
    }

    public function article(string $path, Request $request): never
    {
        $note = $this->findNote($path);
        if ($note === null) {
            Response::html($this->template->notFound(), 404, ['Cache-Control' => 'no-store']);
        }

        if ((string) $note['access_mode'] === 'private' && !$this->session->canReadNote((string) $note['id'])) {
            if ($request->method === 'POST') {
                $this->unlock($note, $request);
            }
            Response::html(
                $this->template->privateGate($note, $this->session->csrfToken()),
                200,
                ['Cache-Control' => 'private, no-store'],
            );
        }

        $headers = (string) $note['access_mode'] === 'private'
            ? ['Cache-Control' => 'private, no-store']
            : ['Cache-Control' => 'public, max-age=300, stale-while-revalidate=3600'];
        Response::html($this->template->article($note, (string) $note['html']), 200, $headers);
    }

    public function media(string $id): never
    {
        $record = $this->media->findByAlias($id);
        if ($record === null) {
            Response::text('Not found', 404, ['Cache-Control' => 'no-store']);
        }

        $hash = (string) $record['hash'];
        $authorized = $this->media->isPubliclyReadable($hash);
        if (!$authorized) {
            foreach ($this->media->readableNoteIds($hash) as $noteId) {
                if ($this->session->canReadNote($noteId)) {
                    $authorized = true;
                    break;
                }
            }
        }
        if (!$authorized) {
            Response::text('Not found', 404, ['Cache-Control' => 'no-store']);
        }

        $path = $this->media->privatePath($hash, (string) $record['extension']);
        if (!is_file($path)) {
            Response::text('Not found', 404, ['Cache-Control' => 'no-store']);
        }

        header('Content-Type: ' . (string) $record['mime_type']);
        header('Content-Length: ' . (string) filesize($path));
        header('Cache-Control: public, max-age=31536000, immutable');
        header('ETag: "' . $hash . '"');
        if (trim($_SERVER['HTTP_IF_NONE_MATCH'] ?? '', '"') === $hash) {
            http_response_code(304);
            exit;
        }
        readfile($path);
        exit;
    }

    /** @param array<string, mixed> $note */
    private function unlock(array $note, Request $request): never
    {
        $this->session->requireCsrf(is_string($_POST['csrf'] ?? null) ? $_POST['csrf'] : null);
        $identity = $request->remoteAddress . '|private|' . (string) $note['id'];
        $this->rateLimiter->assertAllowed($identity);
        $password = is_string($_POST['password'] ?? null) ? $_POST['password'] : '';
        $hash = (string) ($note['password_hash'] ?: $this->config['private_password_hash']);
        $valid = $password !== '' && password_verify($password, $hash);
        $this->rateLimiter->record($identity, $valid);

        if (!$valid) {
            Response::html(
                $this->template->privateGate($note, $this->session->csrfToken(), 'Неверный код доступа.'),
                401,
                ['Cache-Control' => 'private, no-store'],
            );
        }

        $this->session->unlockNote((string) $note['id']);
        Response::redirect('/s/' . rawurlencode((string) $note['canonical_path']));
    }

    /** @return array<string, mixed>|null */
    private function findNote(string $path): ?array
    {
        if (!Slugger::isSafePath($path)) {
            return null;
        }
        $statement = $this->pdo->prepare(
            'SELECT n.* FROM note_aliases a
             JOIN notes n ON n.id = a.note_id
             WHERE a.path = :path
               AND n.is_deleted = 0
               AND (n.expires_at IS NULL OR n.expires_at > :now)
             LIMIT 1'
        );
        $statement->execute(['path' => $path, 'now' => Clock::now()]);
        $row = $statement->fetch();
        return is_array($row) ? $row : null;
    }
}
