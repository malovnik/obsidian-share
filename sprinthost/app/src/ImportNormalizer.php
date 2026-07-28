<?php

declare(strict_types=1);

namespace ObsidianShare;

use PDO;

final class ImportNormalizer
{
    /** @param array<string, mixed> $config */
    public function __construct(
        private readonly Database $database,
        private readonly MarkdownRenderer $markdown,
        private readonly MediaStore $media,
        private readonly array $config,
    ) {
    }

    /** @return array{notes:int,mediaLinks:int,aliases:int} */
    public function run(): array
    {
        $notes = $this->database->pdo()->query('SELECT * FROM notes ORDER BY created_at')->fetchAll();
        $mediaLinks = 0;
        $aliases = 0;

        $this->database->transaction(function (PDO $pdo) use ($notes, &$mediaLinks, &$aliases): void {
            $update = $pdo->prepare(
                'UPDATE notes SET
                    html = :html,
                    reading_time = :reading_time,
                    password_hash = :password_hash,
                    no_index = :no_index,
                    content_hash = :content_hash
                 WHERE id = :id'
            );
            $insertAlias = $pdo->prepare(
                'INSERT OR IGNORE INTO note_aliases (path, note_id, created_at)
                 VALUES (:path, :note_id, :created_at)'
            );
            $insertMedia = $pdo->prepare(
                'INSERT OR IGNORE INTO note_media (note_id, media_hash, role)
                 VALUES (:note_id, :media_hash, :role)'
            );
            $insertRevision = $pdo->prepare(
                'INSERT OR IGNORE INTO note_revisions
                    (note_id, revision, content_hash, title, markdown, access_mode, tags_json, created_at)
                 VALUES
                    (:note_id, :revision, :content_hash, :title, :markdown, :access_mode, :tags_json, :created_at)'
            );

            foreach ($notes as $note) {
                $id = (string) $note['id'];
                $markdown = (string) $note['markdown'];
                $accessMode = (string) $note['access_mode'];
                $contentHash = 'import:' . hash('sha256', json_encode([
                    'id' => $id,
                    'title' => (string) $note['title'],
                    'markdown' => $markdown,
                    'accessMode' => $accessMode,
                    'updatedAt' => (string) $note['updated_at'],
                ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));
                $update->execute([
                    'html' => $this->markdown->render($markdown),
                    'reading_time' => $this->markdown->readingTime($markdown),
                    'password_hash' => $accessMode === 'private'
                        ? (string) $this->config['private_password_hash']
                        : null,
                    'no_index' => $accessMode === 'public' ? 0 : 1,
                    'content_hash' => $contentHash,
                    'id' => $id,
                ]);

                foreach (array_unique([
                    (string) $note['canonical_path'],
                    $id,
                    (string) $note['slug'],
                ]) as $path) {
                    if (!Slugger::isSafePath($path)) {
                        continue;
                    }
                    $insertAlias->execute([
                        'path' => $path,
                        'note_id' => $id,
                        'created_at' => (string) $note['created_at'],
                    ]);
                    $aliases += $insertAlias->rowCount();
                }

                preg_match_all('#/api/images/([A-Za-z0-9_-]{1,180})#', $markdown, $matches);
                foreach (array_unique($matches[1] ?? []) as $legacyId) {
                    $record = $this->media->findByAlias((string) $legacyId);
                    if ($record === null) {
                        continue;
                    }
                    $insertMedia->execute([
                        'note_id' => $id,
                        'media_hash' => (string) $record['hash'],
                        'role' => 'inline',
                    ]);
                    $mediaLinks += $insertMedia->rowCount();
                }

                $coverHash = $note['cover_media_hash'] ?? null;
                if (is_string($coverHash) && $this->media->findByHash($coverHash) !== null) {
                    $insertMedia->execute([
                        'note_id' => $id,
                        'media_hash' => $coverHash,
                        'role' => 'cover',
                    ]);
                    $mediaLinks += $insertMedia->rowCount();
                }

                $insertRevision->execute([
                    'note_id' => $id,
                    'revision' => max(1, (int) $note['revision']),
                    'content_hash' => $contentHash,
                    'title' => (string) $note['title'],
                    'markdown' => $markdown,
                    'access_mode' => $accessMode,
                    'tags_json' => (string) $note['tags_json'],
                    'created_at' => (string) $note['updated_at'],
                ]);
            }
        });

        return ['notes' => count($notes), 'mediaLinks' => $mediaLinks, 'aliases' => $aliases];
    }
}
