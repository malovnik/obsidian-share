<?php

declare(strict_types=1);

namespace ObsidianShare;

use PDO;
use RuntimeException;

final class StaticSiteGenerator
{
    /** @param array<string, mixed> $config */
    public function __construct(
        private readonly PDO $pdo,
        private readonly array $config,
        private readonly Template $template,
        private readonly MediaStore $media,
        private readonly MarkdownRenderer $markdown,
    ) {
    }

    public function rebuild(): void
    {
        $lockPath = rtrim((string) $this->config['data_dir'], '/') . '/rebuild.lock';
        $lockDirectory = dirname($lockPath);
        if (!is_dir($lockDirectory) && !mkdir($lockDirectory, 0700, true) && !is_dir($lockDirectory)) {
            throw new RuntimeException('Unable to create rebuild lock directory');
        }
        $lock = fopen($lockPath, 'c');
        if ($lock === false || !flock($lock, LOCK_EX)) {
            throw new RuntimeException('Unable to acquire rebuild lock');
        }

        try {
            $this->rebuildLocked();
        } finally {
            flock($lock, LOCK_UN);
            fclose($lock);
        }
    }

    private function rebuildLocked(): void
    {
        $publicDirectory = rtrim((string) $this->config['public_dir'], '/');
        if (!is_dir($publicDirectory) && !mkdir($publicDirectory, 0755, true) && !is_dir($publicDirectory)) {
            throw new RuntimeException('Unable to create public directory');
        }

        $temporary = $publicDirectory . '/.generated-' . bin2hex(random_bytes(6));
        if (!mkdir($temporary . '/articles', 0755, true)) {
            throw new RuntimeException('Unable to create generated staging directory');
        }

        try {
            $notes = $this->activeReadableNotes();
            $requiredMedia = [];
            foreach ($notes as &$note) {
                foreach ($this->noteMedia((string) $note['id']) as $hash) {
                    $requiredMedia[$hash] = true;
                }
                $note['cover_url'] = $this->coverUrl($note);
                $html = $this->publicMediaHtml((string) $note['html']);
                $article = $this->template->article($note, $html, $this->relatedNotes($note, $notes));
                foreach ($this->aliases((string) $note['id'], (string) $note['canonical_path']) as $path) {
                    $this->write($temporary . '/articles/' . $path . '.html', $article);
                }
            }
            unset($note);
            $publicNotes = array_values(array_filter(
                $notes,
                static fn (array $note): bool => (string) $note['access_mode'] === 'public',
            ));

            $this->write($temporary . '/index.html', $this->template->home($publicNotes));
            $this->write($temporary . '/404.html', $this->template->notFound());
            $this->write(
                $temporary . '/search-index.json',
                json_encode($this->searchIndex($publicNotes), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR),
            );
            $this->write($temporary . '/sitemap.xml', $this->sitemap($publicNotes));
            $this->write($temporary . '/feed.xml', $this->feed($publicNotes));

            $current = $publicDirectory . '/generated';
            $previous = $publicDirectory . '/.generated-previous';
            $this->removeTree($previous);
            if (is_dir($current) && !rename($current, $previous)) {
                throw new RuntimeException('Unable to move previous generated site');
            }
            if (!rename($temporary, $current)) {
                if (is_dir($previous)) {
                    @rename($previous, $current);
                }
                throw new RuntimeException('Unable to activate generated site');
            }
            $this->removeTree($previous);
            $this->media->syncPublicMedia(array_keys($requiredMedia));
        } finally {
            $this->removeTree($temporary);
        }
    }

    /** @return list<array<string, mixed>> */
    private function activeReadableNotes(): array
    {
        $statement = $this->pdo->prepare(
            "SELECT * FROM notes
             WHERE is_deleted = 0
               AND access_mode IN ('public', 'unlisted')
               AND (expires_at IS NULL OR expires_at > :now)
             ORDER BY updated_at DESC"
        );
        $statement->execute(['now' => Clock::now()]);
        return $statement->fetchAll();
    }

    /** @return list<string> */
    private function aliases(string $noteId, string $canonicalPath): array
    {
        $statement = $this->pdo->prepare('SELECT path FROM note_aliases WHERE note_id = :id');
        $statement->execute(['id' => $noteId]);
        $paths = [$canonicalPath];
        foreach ($statement->fetchAll() as $row) {
            $path = (string) $row['path'];
            if (Slugger::isSafePath($path)) {
                $paths[] = $path;
            }
        }
        return array_values(array_unique($paths));
    }

    /** @return list<string> */
    private function noteMedia(string $noteId): array
    {
        $statement = $this->pdo->prepare('SELECT media_hash FROM note_media WHERE note_id = :id');
        $statement->execute(['id' => $noteId]);
        return array_values(array_map(
            static fn (array $row): string => (string) $row['media_hash'],
            $statement->fetchAll(),
        ));
    }

    private function publicMediaHtml(string $html): string
    {
        return preg_replace_callback(
            '#(["\'])(?:https?://[^/"\']+)?/api/images/([A-Za-z0-9_-]{1,180})(["\'])#i',
            function (array $match): string {
                $media = $this->media->findByAlias($match[2]);
                if ($media === null) {
                    return $match[0];
                }
                $url = $this->media->publicUrl((string) $media['hash'], (string) $media['extension']);
                return $match[1] . $url . $match[3];
            },
            $html,
        ) ?? $html;
    }

    /** @param array<string, mixed> $note */
    private function coverUrl(array $note): ?string
    {
        $hash = $note['cover_media_hash'] ?? null;
        if (!is_string($hash) || $hash === '') {
            return null;
        }
        $media = $this->media->findByHash($hash);
        if ($media === null) {
            return null;
        }
        return $this->media->publicUrl($hash, (string) $media['extension']);
    }

    /**
     * @param array<string, mixed> $note
     * @param list<array<string, mixed>> $notes
     * @return list<array<string, mixed>>
     */
    private function relatedNotes(array $note, array $notes): array
    {
        $tags = json_decode((string) $note['tags_json'], true);
        $tags = is_array($tags) ? array_values(array_filter($tags, 'is_string')) : [];
        if ($tags === []) {
            return [];
        }
        $tagSet = array_fill_keys($tags, true);
        $ranked = [];
        foreach ($notes as $candidate) {
            if ((string) $candidate['id'] === (string) $note['id']
                || (string) $candidate['access_mode'] !== 'public') {
                continue;
            }
            $candidateTags = json_decode((string) $candidate['tags_json'], true);
            $candidateTags = is_array($candidateTags)
                ? array_values(array_filter($candidateTags, 'is_string'))
                : [];
            $score = 0;
            foreach ($candidateTags as $candidateTag) {
                if (isset($tagSet[$candidateTag])) {
                    $score++;
                }
            }
            if ($score > 0) {
                $ranked[] = ['score' => $score, 'note' => $candidate];
            }
        }
        usort($ranked, static function (array $left, array $right): int {
            $score = $right['score'] <=> $left['score'];
            if ($score !== 0) {
                return $score;
            }
            return strcmp((string) $right['note']['updated_at'], (string) $left['note']['updated_at']);
        });
        return array_values(array_map(
            static fn (array $row): array => $row['note'],
            array_slice($ranked, 0, 3),
        ));
    }

    /** @param list<array<string, mixed>> $notes */
    private function searchIndex(array $notes): array
    {
        return array_map(function (array $note): array {
            $tags = json_decode((string) $note['tags_json'], true);
            return [
                'title' => (string) $note['title'],
                'url' => '/s/' . (string) $note['canonical_path'],
                'excerpt' => $this->markdown->excerpt((string) $note['markdown']),
                'tags' => is_array($tags) ? array_values($tags) : [],
                'updatedAt' => (string) $note['updated_at'],
            ];
        }, $notes);
    }

    /** @param list<array<string, mixed>> $notes */
    private function sitemap(array $notes): string
    {
        $urls = '';
        foreach ($notes as $note) {
            $location = htmlspecialchars(
                rtrim((string) $this->config['base_url'], '/') . '/s/' . rawurlencode((string) $note['canonical_path']),
                ENT_XML1 | ENT_QUOTES,
                'UTF-8',
            );
            $modified = htmlspecialchars(substr((string) $note['updated_at'], 0, 10), ENT_XML1);
            $urls .= "\n  <url><loc>{$location}</loc><lastmod>{$modified}</lastmod></url>";
        }
        $home = htmlspecialchars(rtrim((string) $this->config['base_url'], '/') . '/', ENT_XML1);
        return "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n"
            . "<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n"
            . "  <url><loc>{$home}</loc></url>{$urls}\n</urlset>\n";
    }

    /** @param list<array<string, mixed>> $notes */
    private function feed(array $notes): string
    {
        $items = '';
        foreach (array_slice($notes, 0, 20) as $note) {
            $url = rtrim((string) $this->config['base_url'], '/') . '/s/' . rawurlencode((string) $note['canonical_path']);
            $title = htmlspecialchars((string) $note['title'], ENT_XML1 | ENT_QUOTES, 'UTF-8');
            $link = htmlspecialchars($url, ENT_XML1 | ENT_QUOTES, 'UTF-8');
            $description = htmlspecialchars($this->markdown->excerpt((string) $note['markdown']), ENT_XML1 | ENT_QUOTES, 'UTF-8');
            $published = gmdate(DATE_RSS, strtotime((string) $note['published_at']) ?: time());
            $items .= "\n    <item><title>{$title}</title><link>{$link}</link><guid>{$link}</guid><pubDate>{$published}</pubDate><description>{$description}</description></item>";
        }
        $base = htmlspecialchars(rtrim((string) $this->config['base_url'], '/') . '/', ENT_XML1);
        return "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n"
            . "<rss version=\"2.0\"><channel><title>Заметки Никиты Малова</title>"
            . "<link>{$base}</link><description>Заметки без лака. Как есть.</description>{$items}\n"
            . "  </channel></rss>\n";
    }

    private function write(string $path, string $contents): void
    {
        if (file_put_contents($path, $contents, LOCK_EX) === false) {
            throw new RuntimeException('Unable to write generated file');
        }
        chmod($path, 0644);
    }

    private function removeTree(string $path): void
    {
        if (!is_dir($path)) {
            return;
        }
        $iterator = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($path, \FilesystemIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::CHILD_FIRST,
        );
        foreach ($iterator as $item) {
            $item->isDir() ? @rmdir($item->getPathname()) : @unlink($item->getPathname());
        }
        @rmdir($path);
    }
}
