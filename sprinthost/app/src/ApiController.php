<?php

declare(strict_types=1);

namespace ObsidianShare;

use PDO;
use Throwable;

final class ApiController
{
    /** @param array<string, mixed> $config */
    public function __construct(
        private readonly PDO $pdo,
        private readonly array $config,
        private readonly TokenAuthenticator $tokens,
        private readonly MediaStore $media,
        private readonly Publisher $publisher,
        private readonly PublicController $public,
    ) {
    }

    public function publish(Request $request): never
    {
        $actor = $this->tokens->requireScope($request, 'publish');
        $result = $this->publisher->publish($request->json(), 'token:' . $actor);
        Response::json($result, $result['status'] === 'created' ? 201 : 200, [
            'Cache-Control' => 'no-store',
        ]);
    }

    public function uploadRaw(Request $request, string $hash): never
    {
        $this->tokens->requireScope($request, 'media');
        $filename = $request->header('x-filename') ?? 'image';
        $result = $this->media->store($request->body, $hash, rawurldecode($filename));
        Response::json([
            'success' => true,
            'id' => $result['hash'],
            'hash' => $result['hash'],
            'url' => '/api/images/' . $result['hash'],
            'deduplicated' => $result['deduplicated'],
            'width' => $result['width'],
            'height' => $result['height'],
        ], $result['deduplicated'] ? 200 : 201, ['Cache-Control' => 'no-store']);
    }

    public function uploadJson(Request $request): never
    {
        $this->tokens->requireScope($request, 'media');
        $payload = $request->json();
        $encoded = $payload['data'] ?? null;
        if (!is_string($encoded)) {
            throw new HttpException(400, 'Base64 image data is required');
        }
        if (str_contains($encoded, ',')) {
            $encoded = substr($encoded, strpos($encoded, ',') + 1);
        }
        $bytes = base64_decode($encoded, true);
        if ($bytes === false) {
            throw new HttpException(400, 'Invalid base64 image data');
        }
        $hash = is_string($payload['hash'] ?? null) ? strtolower($payload['hash']) : hash('sha256', $bytes);
        $filename = is_string($payload['filename'] ?? null) ? $payload['filename'] : 'image';
        $result = $this->media->store($bytes, $hash, $filename);
        Response::json([
            'success' => true,
            'id' => $result['hash'],
            'hash' => $result['hash'],
            'url' => '/api/images/' . $result['hash'],
            'deduplicated' => $result['deduplicated'],
        ], $result['deduplicated'] ? 200 : 201, ['Cache-Control' => 'no-store']);
    }

    public function meta(Request $request): never
    {
        $this->tokens->requireScope($request, 'meta');
        $sourceId = is_string($request->query['sourceId'] ?? null) ? $request->query['sourceId'] : '';
        $meta = $this->publisher->metaBySource($sourceId);
        if ($meta === null) {
            Response::json(['error' => 'Note not found'], 404, ['Cache-Control' => 'no-store']);
        }
        Response::json($meta, 200, ['Cache-Control' => 'no-store']);
    }

    public function delete(Request $request, string $id): never
    {
        $actor = $this->tokens->requireScope($request, 'delete');
        if (!$this->publisher->softDelete($id, 'token:' . $actor)) {
            Response::json(['error' => 'Note not found'], 404, ['Cache-Control' => 'no-store']);
        }
        Response::json(['success' => true, 'id' => $id], 200, ['Cache-Control' => 'no-store']);
    }

    public function publicNotes(): never
    {
        $statement = $this->pdo->prepare(
            "SELECT id, canonical_path, title, tags_json, reading_time, created_at, updated_at
             FROM notes
             WHERE is_deleted = 0 AND access_mode = 'public'
               AND (expires_at IS NULL OR expires_at > :now)
             ORDER BY updated_at DESC LIMIT 200"
        );
        $statement->execute(['now' => Clock::now()]);
        $notes = array_map(static fn (array $note): array => [
            'id' => (string) $note['id'],
            'slug' => (string) $note['canonical_path'],
            'title' => (string) $note['title'],
            'tags' => json_decode((string) $note['tags_json'], true) ?: [],
            'readingTime' => (int) $note['reading_time'],
            'createdAt' => (string) $note['created_at'],
            'updatedAt' => (string) $note['updated_at'],
        ], $statement->fetchAll());
        Response::json(['notes' => $notes], 200, ['Cache-Control' => 'public, max-age=60']);
    }

    public function recordView(Request $request, string $id): never
    {
        $origin = $request->header('origin');
        $allowedOrigins = is_array($this->config['allowed_origins'] ?? null)
            ? $this->config['allowed_origins']
            : [];
        if ($origin !== null && !in_array($origin, $allowedOrigins, true)) {
            throw new HttpException(403, 'Origin is not allowed');
        }

        $statement = $this->pdo->prepare(
            "SELECT id FROM notes
             WHERE id = :id AND is_deleted = 0 AND access_mode = 'public'
               AND (expires_at IS NULL OR expires_at > :now)
             LIMIT 1"
        );
        $now = Clock::now();
        $statement->execute(['id' => $id, 'now' => $now]);
        if ($statement->fetchColumn() === false) {
            throw new HttpException(404, 'Note not found');
        }

        $viewerHash = hash_hmac(
            'sha256',
            $request->remoteAddress . '|' . mb_substr($request->header('user-agent') ?? '', 0, 256),
            (string) $this->config['publish_token_pepper'],
        );
        $viewDay = substr($now, 0, 10);
        $unique = 0;
        try {
            $this->pdo->exec('BEGIN IMMEDIATE');
            $insert = $this->pdo->prepare(
                'INSERT OR IGNORE INTO note_views
                    (note_id, viewer_hash, view_day, viewed_at)
                 VALUES (:note_id, :viewer_hash, :view_day, :viewed_at)'
            );
            $insert->execute([
                'note_id' => $id,
                'viewer_hash' => $viewerHash,
                'view_day' => $viewDay,
                'viewed_at' => $now,
            ]);
            $unique = $insert->rowCount() === 1 ? 1 : 0;
            $update = $this->pdo->prepare(
                'UPDATE notes SET
                    view_count = view_count + 1,
                    unique_view_count = unique_view_count + :unique
                 WHERE id = :id'
            );
            $update->execute(['unique' => $unique, 'id' => $id]);
            $counts = $this->pdo->prepare(
                'SELECT view_count, unique_view_count FROM notes WHERE id = :id'
            );
            $counts->execute(['id' => $id]);
            $row = $counts->fetch();
            $this->pdo->exec('COMMIT');
        } catch (Throwable $error) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->exec('ROLLBACK');
            }
            throw $error;
        }

        Response::json([
            'viewCount' => (int) ($row['view_count'] ?? 0),
            'uniqueViewCount' => (int) ($row['unique_view_count'] ?? 0),
            'uniqueToday' => $unique === 1,
        ], 200, ['Cache-Control' => 'no-store']);
    }
}
