<?php

declare(strict_types=1);

namespace ObsidianShare;

use PDO;

final class Publisher
{
    /** @param array<string, mixed> $config */
    public function __construct(
        private readonly Database $database,
        private readonly MarkdownRenderer $markdown,
        private readonly MediaStore $media,
        private readonly StaticSiteGenerator $generator,
        private readonly AuditLog $audit,
        private readonly array $config,
    ) {
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public function publish(array $payload, string $actor): array
    {
        $normalized = $this->normalizePayload($payload);
        $pdo = $this->database->pdo();
        $existing = $this->findExisting($pdo, $normalized['sourceId'], $normalized['shareId']);

        if (
            $existing !== null
            && $normalized['shareId'] !== null
            && $normalized['sourceId'] !== ''
            && (string) ($existing['source_id'] ?? '') !== ''
            && !hash_equals((string) $existing['source_id'], $normalized['sourceId'])
        ) {
            throw new HttpException(409, 'Share ID belongs to a different source note');
        }

        $id = $existing === null ? Slugger::noteId() : (string) $existing['id'];
        $slug = Slugger::slug($normalized['title']);
        $canonicalPath = Slugger::canonicalPath($normalized['title'], $id);
        $html = $this->markdown->render($normalized['content']);
        $readingTime = $this->markdown->readingTime($normalized['content']);
        $mediaHashes = $this->resolveMediaHashes($normalized['content'], $normalized['mediaHashes']);
        $coverHash = $mediaHashes[0] ?? ($existing['cover_media_hash'] ?? null);
        $expiresAt = $this->resolveExpiry($normalized, $existing);
        $contentHash = hash('sha256', json_encode([
            'title' => $normalized['title'],
            'content' => $normalized['content'],
            'sourceId' => $normalized['sourceId'],
            'accessMode' => $normalized['accessMode'],
            'expiresAt' => $expiresAt,
            'tags' => $normalized['tags'],
            'mediaHashes' => $mediaHashes,
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));

        $unchanged = $existing !== null
            && hash_equals((string) $existing['content_hash'], $contentHash)
            && (int) $existing['is_deleted'] === 0;
        if ($unchanged) {
            $this->generator->rebuild();
            return $this->response($existing, 'unchanged', false);
        }

        $now = Clock::now();
        $note = $this->database->transaction(function (PDO $transaction) use (
            $existing,
            $id,
            $slug,
            $canonicalPath,
            $normalized,
            $html,
            $readingTime,
            $mediaHashes,
            $coverHash,
            $expiresAt,
            $contentHash,
            $now,
        ): array {
            $createdAt = $existing === null ? $now : (string) $existing['created_at'];
            $publishedAt = $existing === null ? $now : (string) $existing['published_at'];
            $revision = $existing === null ? 1 : ((int) $existing['revision'] + 1);
            $passwordHash = $normalized['accessMode'] === 'private'
                ? (string) $this->config['private_password_hash']
                : null;

            $parameters = [
                'id' => $id,
                'source_id' => $normalized['sourceId'] === '' ? null : $normalized['sourceId'],
                'canonical_path' => $canonicalPath,
                'slug' => $slug,
                'title' => $normalized['title'],
                'markdown' => $normalized['content'],
                'html' => $html,
                'content_hash' => $contentHash,
                'access_mode' => $normalized['accessMode'],
                'password_hash' => $passwordHash,
                'no_index' => $normalized['accessMode'] === 'public' ? 0 : 1,
                'expires_at' => $expiresAt,
                'tags_json' => json_encode($normalized['tags'], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
                'reading_time' => $readingTime,
                'cover_media_hash' => $coverHash,
                'revision' => $revision,
                'updated_at' => $now,
            ];
            if ($existing === null) {
                $statement = $transaction->prepare(
                    'INSERT INTO notes (
                    id, source_id, canonical_path, slug, title, markdown, html,
                    content_hash, access_mode, password_hash, no_index, is_deleted,
                    expires_at, tags_json, reading_time, cover_media_hash, revision,
                    view_count, unique_view_count, created_at, updated_at, published_at
                 ) VALUES (
                    :id, :source_id, :canonical_path, :slug, :title, :markdown, :html,
                    :content_hash, :access_mode, :password_hash, :no_index, 0,
                    :expires_at, :tags_json, :reading_time, :cover_media_hash, :revision,
                    :view_count, :unique_view_count, :created_at, :updated_at, :published_at
                 )'
                );
                $statement->execute($parameters + [
                    'view_count' => 0,
                    'unique_view_count' => 0,
                    'created_at' => $createdAt,
                    'published_at' => $publishedAt,
                ]);
            } else {
                $statement = $transaction->prepare(
                    'UPDATE notes SET
                        source_id = :source_id,
                        canonical_path = :canonical_path,
                        slug = :slug,
                        title = :title,
                        markdown = :markdown,
                        html = :html,
                        content_hash = :content_hash,
                        access_mode = :access_mode,
                        password_hash = :password_hash,
                        no_index = :no_index,
                        is_deleted = 0,
                        expires_at = :expires_at,
                        tags_json = :tags_json,
                        reading_time = :reading_time,
                        cover_media_hash = :cover_media_hash,
                        revision = :revision,
                        updated_at = :updated_at
                     WHERE id = :id'
                );
                $statement->execute($parameters);
            }

            if ($existing !== null && Slugger::isSafePath((string) $existing['canonical_path'])) {
                $this->insertAlias($transaction, (string) $existing['canonical_path'], $id, $now);
            }
            $this->insertAlias($transaction, $canonicalPath, $id, $now);
            $this->insertAlias($transaction, $id, $id, $now);

            $transaction->prepare('DELETE FROM note_media WHERE note_id = :id')->execute(['id' => $id]);
            $mediaStatement = $transaction->prepare(
                'INSERT OR IGNORE INTO note_media (note_id, media_hash, role)
                 VALUES (:note_id, :media_hash, :role)'
            );
            foreach ($mediaHashes as $hash) {
                $mediaStatement->execute([
                    'note_id' => $id,
                    'media_hash' => $hash,
                    'role' => 'inline',
                ]);
            }
            if (is_string($coverHash) && $coverHash !== '') {
                $mediaStatement->execute([
                    'note_id' => $id,
                    'media_hash' => $coverHash,
                    'role' => 'cover',
                ]);
            }

            $revisionStatement = $transaction->prepare(
                'INSERT INTO note_revisions
                    (note_id, revision, content_hash, title, markdown, access_mode, tags_json, created_at)
                 VALUES
                    (:note_id, :revision, :content_hash, :title, :markdown, :access_mode, :tags_json, :created_at)'
            );
            $revisionStatement->execute([
                'note_id' => $id,
                'revision' => $revision,
                'content_hash' => $contentHash,
                'title' => $normalized['title'],
                'markdown' => $normalized['content'],
                'access_mode' => $normalized['accessMode'],
                'tags_json' => json_encode($normalized['tags'], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
                'created_at' => $now,
            ]);

            $select = $transaction->prepare('SELECT * FROM notes WHERE id = :id');
            $select->execute(['id' => $id]);
            return $select->fetch();
        });

        $this->audit->write($actor, $existing === null ? 'note.create' : 'note.update', 'note', $id, [
            'revision' => (int) $note['revision'],
            'accessMode' => (string) $note['access_mode'],
        ]);
        $this->generator->rebuild();
        return $this->response($note, $existing === null ? 'created' : 'updated', $existing !== null);
    }

    public function softDelete(string $id, string $actor): bool
    {
        if (preg_match('/^[A-Za-z0-9_-]{1,180}$/', $id) !== 1) {
            throw new HttpException(404, 'Note not found');
        }
        $statement = $this->database->pdo()->prepare(
            'UPDATE notes SET is_deleted = 1, updated_at = :now, revision = revision + 1
             WHERE id = :id AND is_deleted = 0'
        );
        $statement->execute(['id' => $id, 'now' => Clock::now()]);
        $changed = $statement->rowCount() > 0;
        if ($changed) {
            $this->audit->write($actor, 'note.delete', 'note', $id);
            $this->generator->rebuild();
        }
        return $changed;
    }

    /** @return array<string, mixed>|null */
    public function metaBySource(string $sourceId): ?array
    {
        if ($sourceId === '' || mb_strlen($sourceId) > 1024) {
            throw new HttpException(400, 'Valid sourceId is required');
        }
        $statement = $this->database->pdo()->prepare(
            'SELECT id, source_id, canonical_path, content_hash, revision, is_deleted, access_mode, updated_at
             FROM notes WHERE source_id = :source_id LIMIT 1'
        );
        $statement->execute(['source_id' => $sourceId]);
        $row = $statement->fetch();
        if (!is_array($row)) {
            return null;
        }
        return [
            'id' => (string) $row['id'],
            'sourceId' => (string) $row['source_id'],
            'url' => rtrim((string) $this->config['base_url'], '/') . '/s/' . (string) $row['canonical_path'],
            'contentHash' => (string) $row['content_hash'],
            'revision' => (int) $row['revision'],
            'isDeleted' => (bool) $row['is_deleted'],
            'accessMode' => (string) $row['access_mode'],
            'updatedAt' => (string) $row['updated_at'],
        ];
    }

    /** @param array<string, mixed> $payload */
    private function normalizePayload(array $payload): array
    {
        $title = $this->requiredString($payload, 'title', 300);
        $content = str_replace(["\r\n", "\r"], "\n", $this->requiredString($payload, 'content', 2_000_000));
        $sourceId = $this->optionalString($payload, 'sourceId', 1024) ?? '';
        $shareId = $this->optionalString($payload, 'shareId', 180);
        if ($shareId !== null && preg_match('/^[A-Za-z0-9_-]+$/', $shareId) !== 1) {
            throw new HttpException(400, 'Invalid shareId');
        }
        if ($sourceId === '' && $shareId === null) {
            throw new HttpException(400, 'sourceId is required for a new note');
        }

        $accessMode = $payload['accessMode'] ?? null;
        if (!is_string($accessMode)) {
            $accessMode = ($payload['noIndex'] ?? false) === true ? 'private' : 'public';
        }
        if (!in_array($accessMode, ['public', 'unlisted', 'private'], true)) {
            throw new HttpException(400, 'Invalid accessMode');
        }

        $tags = $payload['tags'] ?? $this->extractTags($content);
        if (!is_array($tags)) {
            throw new HttpException(400, 'tags must be an array');
        }
        $normalizedTags = [];
        foreach (array_slice($tags, 0, 50) as $tag) {
            if (!is_string($tag)) {
                continue;
            }
            $tag = trim($tag);
            if ($tag !== '') {
                $normalizedTags[] = mb_substr($tag, 0, 100);
            }
        }

        $mediaHashes = $payload['mediaHashes'] ?? [];
        if (!is_array($mediaHashes)) {
            throw new HttpException(400, 'mediaHashes must be an array');
        }
        $mediaHashes = array_values(array_unique(array_filter(array_map(
            static fn (mixed $hash): string => is_string($hash) ? strtolower($hash) : '',
            array_slice($mediaHashes, 0, 200),
        ), static fn (string $hash): bool => preg_match('/^[a-f0-9]{64}$/', $hash) === 1)));

        $expiresAt = $this->optionalString($payload, 'expiresAt', 40);
        if ($expiresAt !== null && strtotime($expiresAt) === false) {
            throw new HttpException(400, 'Invalid expiresAt');
        }
        $expiresInDays = $payload['expiresInDays'] ?? null;
        if ($expiresInDays !== null && (!is_int($expiresInDays) && !is_float($expiresInDays))) {
            throw new HttpException(400, 'Invalid expiresInDays');
        }

        return [
            'title' => trim($title),
            'content' => $content,
            'sourceId' => $sourceId,
            'shareId' => $shareId,
            'accessMode' => $accessMode,
            'tags' => array_values(array_unique($normalizedTags)),
            'mediaHashes' => $mediaHashes,
            'expiresAt' => $expiresAt === null ? null : gmdate('Y-m-d\TH:i:s\Z', strtotime($expiresAt)),
            'expiresInDays' => $expiresInDays === null ? null : max(0, min(3650, (int) $expiresInDays)),
        ];
    }

    /** @return array<string, mixed>|null */
    private function findExisting(PDO $pdo, string $sourceId, ?string $shareId): ?array
    {
        if ($shareId !== null) {
            $statement = $pdo->prepare('SELECT * FROM notes WHERE id = :id LIMIT 1');
            $statement->execute(['id' => $shareId]);
            $row = $statement->fetch();
            if (is_array($row)) {
                return $row;
            }
        }
        if ($sourceId !== '') {
            $statement = $pdo->prepare('SELECT * FROM notes WHERE source_id = :source_id LIMIT 1');
            $statement->execute(['source_id' => $sourceId]);
            $row = $statement->fetch();
            if (is_array($row)) {
                return $row;
            }
        }
        return null;
    }

    /** @param list<string> $declaredHashes @return list<string> */
    private function resolveMediaHashes(string $content, array $declaredHashes): array
    {
        $hashes = [];
        preg_match_all('#/api/images/([A-Za-z0-9_-]{1,180})#', $content, $matches);
        foreach ($matches[1] ?? [] as $id) {
            $media = $this->media->findByAlias((string) $id);
            if ($media !== null) {
                $hashes[] = (string) $media['hash'];
            }
        }
        foreach ($declaredHashes as $hash) {
            if ($this->media->findByHash($hash) !== null) {
                $hashes[] = $hash;
            }
        }
        return array_values(array_unique($hashes));
    }

    /** @param array<string, mixed> $normalized @param array<string, mixed>|null $existing */
    private function resolveExpiry(array $normalized, ?array $existing): ?string
    {
        if ($normalized['expiresAt'] !== null) {
            return $normalized['expiresAt'];
        }
        if ($existing !== null) {
            return $existing['expires_at'] === null ? null : (string) $existing['expires_at'];
        }
        if ($normalized['expiresInDays'] !== null && $normalized['expiresInDays'] > 0) {
            return gmdate('Y-m-d\TH:i:s\Z', time() + $normalized['expiresInDays'] * 86400);
        }
        return null;
    }

    private function insertAlias(PDO $pdo, string $path, string $noteId, string $now): void
    {
        if (!Slugger::isSafePath($path)) {
            return;
        }
        $parameters = ['path' => $path, 'note_id' => $noteId, 'created_at' => $now];
        $insert = $pdo->prepare(
            'INSERT OR IGNORE INTO note_aliases (path, note_id, created_at)
             VALUES (:path, :note_id, :created_at)'
        );
        $insert->execute($parameters);
        $update = $pdo->prepare(
            'UPDATE note_aliases SET note_id = :note_id WHERE path = :path'
        );
        $update->execute(['path' => $path, 'note_id' => $noteId]);
    }

    /** @return list<string> */
    private function extractTags(string $content): array
    {
        if (!preg_match('/\A---\R(.*?)\R---\R/s', $content, $frontmatter)) {
            return [];
        }
        if (preg_match('/^tags:\s*\[([^\]]*)\]\s*$/mi', $frontmatter[1], $inline)) {
            return array_values(array_filter(array_map(
                static fn (string $tag): string => trim($tag, " \t\n\r\0\x0B\"'"),
                explode(',', $inline[1]),
            )));
        }
        if (preg_match('/^tags:\s*\R((?:\s*-\s*.+\R?)*)/mi', $frontmatter[1], $list)) {
            preg_match_all('/^\s*-\s*(.+)\s*$/m', $list[1], $items);
            return array_values(array_map(
                static fn (string $tag): string => trim($tag, " \t\n\r\0\x0B\"'"),
                $items[1] ?? [],
            ));
        }
        return [];
    }

    /** @param array<string, mixed> $payload */
    private function requiredString(array $payload, string $key, int $maxLength): string
    {
        $value = $payload[$key] ?? null;
        if (!is_string($value) || trim($value) === '' || mb_strlen($value) > $maxLength) {
            throw new HttpException(400, $key . ' is required and must be shorter than ' . $maxLength . ' characters');
        }
        return $value;
    }

    /** @param array<string, mixed> $payload */
    private function optionalString(array $payload, string $key, int $maxLength): ?string
    {
        $value = $payload[$key] ?? null;
        if ($value === null || $value === '') {
            return null;
        }
        if (!is_string($value) || mb_strlen($value) > $maxLength) {
            throw new HttpException(400, $key . ' is invalid');
        }
        return $value;
    }

    /** @param array<string, mixed> $note @return array<string, mixed> */
    private function response(array $note, string $status, bool $isUpdate): array
    {
        return [
            'success' => true,
            'status' => $status,
            'id' => (string) $note['id'],
            'slug' => (string) $note['canonical_path'],
            'url' => rtrim((string) $this->config['base_url'], '/') . '/s/' . (string) $note['canonical_path'],
            'revision' => (int) $note['revision'],
            'contentHash' => (string) $note['content_hash'],
            'expiresAt' => $note['expires_at'],
            'isUpdate' => $isUpdate,
        ];
    }
}
