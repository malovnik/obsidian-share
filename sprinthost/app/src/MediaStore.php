<?php

declare(strict_types=1);

namespace ObsidianShare;

use PDO;
use RuntimeException;

final class MediaStore
{
    private const MIME_EXTENSIONS = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/gif' => 'gif',
        'image/webp' => 'webp',
    ];

    /** @param array<string, mixed> $config */
    public function __construct(
        private readonly PDO $pdo,
        private readonly array $config,
    ) {
    }

    /**
     * @return array{hash:string,mimeType:string,extension:string,size:int,width:int,height:int,deduplicated:bool}
     */
    public function store(string $bytes, string $expectedHash, string $filename): array
    {
        $expectedHash = strtolower($expectedHash);
        if (preg_match('/^[a-f0-9]{64}$/', $expectedHash) !== 1) {
            throw new HttpException(400, 'A lowercase SHA-256 media hash is required');
        }
        if ($bytes === '') {
            throw new HttpException(400, 'Image body is empty');
        }
        if (strlen($bytes) > (int) $this->config['max_upload_bytes']) {
            throw new HttpException(413, 'Image is too large');
        }

        $actualHash = hash('sha256', $bytes);
        if (!hash_equals($expectedHash, $actualHash)) {
            throw new HttpException(422, 'Image hash does not match request');
        }

        $existing = $this->findByHash($actualHash);
        if ($existing !== null) {
            $path = $this->privatePath($actualHash, (string) $existing['extension']);
            if (!is_file($path)) {
                $this->atomicWrite($path, $bytes);
            }
            return [
                'hash' => $actualHash,
                'mimeType' => (string) $existing['mime_type'],
                'extension' => (string) $existing['extension'],
                'size' => (int) $existing['size'],
                'width' => (int) $existing['width'],
                'height' => (int) $existing['height'],
                'deduplicated' => true,
            ];
        }

        $mime = (new \finfo(FILEINFO_MIME_TYPE))->buffer($bytes);
        if (!is_string($mime) || !isset(self::MIME_EXTENSIONS[$mime])) {
            throw new HttpException(415, 'Only JPEG, PNG, GIF, and WebP images are accepted');
        }

        $dimensions = @getimagesizefromstring($bytes);
        if (!is_array($dimensions) || !isset($dimensions[0], $dimensions[1])) {
            throw new HttpException(422, 'Image payload is invalid');
        }
        $width = (int) $dimensions[0];
        $height = (int) $dimensions[1];
        if ($width < 1 || $height < 1 || $width * $height > (int) $this->config['max_image_pixels']) {
            throw new HttpException(422, 'Image dimensions exceed the safety limit');
        }

        $extension = self::MIME_EXTENSIONS[$mime];
        $safeFilename = $this->safeFilename($filename, $extension);
        $this->atomicWrite($this->privatePath($actualHash, $extension), $bytes);

        $statement = $this->pdo->prepare(
            'INSERT OR IGNORE INTO media
                (hash, extension, mime_type, filename, size, width, height, created_at)
             VALUES (:hash, :extension, :mime, :filename, :size, :width, :height, :created_at)'
        );
        $statement->execute([
            'hash' => $actualHash,
            'extension' => $extension,
            'mime' => $mime,
            'filename' => $safeFilename,
            'size' => strlen($bytes),
            'width' => $width,
            'height' => $height,
            'created_at' => Clock::now(),
        ]);
        $this->addAlias($actualHash, $actualHash);

        return [
            'hash' => $actualHash,
            'mimeType' => $mime,
            'extension' => $extension,
            'size' => strlen($bytes),
            'width' => $width,
            'height' => $height,
            'deduplicated' => false,
        ];
    }

    public function addAlias(string $legacyId, string $hash): void
    {
        if (
            preg_match('/^[A-Za-z0-9_-]{1,180}$/', $legacyId) !== 1
            || preg_match('/^[a-f0-9]{64}$/', $hash) !== 1
        ) {
            throw new RuntimeException('Invalid media alias');
        }
        $parameters = ['legacy_id' => $legacyId, 'hash' => $hash];
        $insert = $this->pdo->prepare(
            'INSERT OR IGNORE INTO media_aliases (legacy_id, media_hash)
             VALUES (:legacy_id, :hash)'
        );
        $insert->execute($parameters);
        $update = $this->pdo->prepare(
            'UPDATE media_aliases SET media_hash = :hash WHERE legacy_id = :legacy_id'
        );
        $update->execute($parameters);
    }

    /** @return array<string, mixed>|null */
    public function findByAlias(string $id): ?array
    {
        if (preg_match('/^[A-Za-z0-9_-]{1,180}$/', $id) !== 1) {
            return null;
        }
        $statement = $this->pdo->prepare(
            'SELECT m.* FROM media_aliases a
             JOIN media m ON m.hash = a.media_hash
             WHERE a.legacy_id = :id
             LIMIT 1'
        );
        $statement->execute(['id' => $id]);
        $row = $statement->fetch();
        return is_array($row) ? $row : null;
    }

    /** @return array<string, mixed>|null */
    public function findByHash(string $hash): ?array
    {
        $statement = $this->pdo->prepare('SELECT * FROM media WHERE hash = :hash LIMIT 1');
        $statement->execute(['hash' => $hash]);
        $row = $statement->fetch();
        return is_array($row) ? $row : null;
    }

    public function privatePath(string $hash, string $extension): string
    {
        return rtrim((string) $this->config['data_dir'], '/')
            . '/media/' . substr($hash, 0, 2) . '/' . $hash . '.' . $extension;
    }

    public function publicUrl(string $hash, string $extension): string
    {
        return '/media/' . substr($hash, 0, 2) . '/' . $hash . '.' . $extension;
    }

    /** @param list<string> $requiredHashes */
    public function syncPublicMedia(array $requiredHashes): void
    {
        $required = array_fill_keys($requiredHashes, true);
        foreach (array_keys($required) as $hash) {
            $media = $this->findByHash($hash);
            if ($media === null) {
                continue;
            }
            $source = $this->privatePath($hash, (string) $media['extension']);
            if (!is_file($source)) {
                throw new RuntimeException('Canonical media file is missing');
            }
            $destination = rtrim((string) $this->config['public_dir'], '/')
                . $this->publicUrl($hash, (string) $media['extension']);
            if (!is_file($destination)) {
                $this->atomicCopy($source, $destination);
            }
        }

        $root = rtrim((string) $this->config['public_dir'], '/') . '/media';
        if (!is_dir($root)) {
            return;
        }
        $iterator = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($root, \FilesystemIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::CHILD_FIRST,
        );
        foreach ($iterator as $file) {
            if ($file->isDir()) {
                @rmdir($file->getPathname());
                continue;
            }
            $hash = pathinfo($file->getFilename(), PATHINFO_FILENAME);
            if (!isset($required[$hash])) {
                @unlink($file->getPathname());
            }
        }
    }

    /** @return list<string> */
    public function readableNoteIds(string $hash): array
    {
        $statement = $this->pdo->prepare(
            "SELECT n.id FROM note_media nm
             JOIN notes n ON n.id = nm.note_id
             WHERE nm.media_hash = :hash
               AND n.is_deleted = 0
               AND (n.expires_at IS NULL OR n.expires_at > :now)"
        );
        $statement->execute(['hash' => $hash, 'now' => Clock::now()]);
        return array_values(array_map(
            static fn (array $row): string => (string) $row['id'],
            $statement->fetchAll(),
        ));
    }

    public function isPubliclyReadable(string $hash): bool
    {
        $statement = $this->pdo->prepare(
            "SELECT 1 FROM note_media nm
             JOIN notes n ON n.id = nm.note_id
             WHERE nm.media_hash = :hash
               AND n.is_deleted = 0
               AND n.access_mode IN ('public', 'unlisted')
               AND (n.expires_at IS NULL OR n.expires_at > :now)
             LIMIT 1"
        );
        $statement->execute(['hash' => $hash, 'now' => Clock::now()]);
        return $statement->fetchColumn() !== false;
    }

    private function safeFilename(string $filename, string $extension): string
    {
        $filename = preg_replace('/[\x00-\x1F\x7F]+/u', '', basename($filename)) ?? '';
        $filename = trim($filename);
        if ($filename === '') {
            return 'image.' . $extension;
        }
        return mb_substr($filename, 0, 180);
    }

    private function atomicWrite(string $path, string $bytes): void
    {
        $directory = dirname($path);
        if (!is_dir($directory) && !mkdir($directory, 0700, true) && !is_dir($directory)) {
            throw new RuntimeException('Unable to create media directory');
        }
        $temporary = tempnam($directory, '.upload-');
        if ($temporary === false) {
            throw new RuntimeException('Unable to allocate media file');
        }
        try {
            if (file_put_contents($temporary, $bytes, LOCK_EX) !== strlen($bytes)) {
                throw new RuntimeException('Unable to write complete media file');
            }
            chmod($temporary, 0600);
            if (!rename($temporary, $path)) {
                throw new RuntimeException('Unable to publish media file');
            }
        } finally {
            if (is_file($temporary)) {
                @unlink($temporary);
            }
        }
    }

    private function atomicCopy(string $source, string $destination): void
    {
        $directory = dirname($destination);
        if (!is_dir($directory) && !mkdir($directory, 0755, true) && !is_dir($directory)) {
            throw new RuntimeException('Unable to create public media directory');
        }
        $temporary = tempnam($directory, '.media-');
        if ($temporary === false) {
            throw new RuntimeException('Unable to allocate public media file');
        }
        try {
            if (!copy($source, $temporary)) {
                throw new RuntimeException('Unable to copy public media file');
            }
            chmod($temporary, 0644);
            if (!rename($temporary, $destination)) {
                throw new RuntimeException('Unable to publish public media file');
            }
        } finally {
            if (is_file($temporary)) {
                @unlink($temporary);
            }
        }
    }
}
