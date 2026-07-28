<?php

declare(strict_types=1);

use ObsidianShare\App;
use ObsidianShare\HttpException;
use ObsidianShare\MarkdownRenderer;
use ObsidianShare\Request;
use ObsidianShare\Slugger;

require dirname(__DIR__) . '/vendor/autoload.php';

final class TestRunner
{
    private int $passed = 0;
    private int $failed = 0;

    public function test(string $name, callable $test): void
    {
        try {
            $test();
            $this->passed++;
            fwrite(STDOUT, "PASS {$name}\n");
        } catch (Throwable $error) {
            $this->failed++;
            fwrite(STDERR, "FAIL {$name}: {$error->getMessage()}\n");
        }
    }

    public function finish(): never
    {
        fwrite(STDOUT, "\n{$this->passed} passed, {$this->failed} failed\n");
        exit($this->failed === 0 ? 0 : 1);
    }
}

function assert_true(bool $condition, string $message = 'Assertion failed'): void
{
    if (!$condition) {
        throw new RuntimeException($message);
    }
}

function assert_same(mixed $expected, mixed $actual, string $message = ''): void
{
    if ($expected !== $actual) {
        throw new RuntimeException($message !== '' ? $message : sprintf(
            'Expected %s, got %s',
            var_export($expected, true),
            var_export($actual, true),
        ));
    }
}

function test_image_bytes(string $format, int $seed): string
{
    $image = imagecreatetruecolor(2048, 1024);
    if (!$image instanceof GdImage) {
        throw new RuntimeException('Unable to create test image');
    }
    imagealphablending($image, false);
    imagesavealpha($image, true);
    $background = imagecolorallocatealpha(
        $image,
        35 + ($seed * 31) % 180,
        55 + ($seed * 47) % 160,
        75 + ($seed * 59) % 140,
        $format === 'png' ? 28 : 0,
    );
    imagefill($image, 0, 0, $background);
    $accent = imagecolorallocatealpha($image, 245, 245, 245, 0);
    imagefilledellipse($image, 1024, 512, 900, 620, $accent);
    imagestring($image, 5, 900, 500, strtoupper($format) . '-' . $seed, $background);

    ob_start();
    $written = match ($format) {
        'jpeg' => imagejpeg($image, null, 96),
        'png' => imagepng($image, null, 0),
        'gif' => imagegif($image),
        'webp' => imagewebp($image, null, 96),
        default => false,
    };
    $bytes = ob_get_clean();
    imagedestroy($image);
    if (!$written || !is_string($bytes) || $bytes === '') {
        throw new RuntimeException("Unable to encode {$format} test image");
    }
    return $bytes;
}

function remove_tree(string $path): void
{
    if (!is_dir($path)) {
        return;
    }
    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($path, FilesystemIterator::SKIP_DOTS),
        RecursiveIteratorIterator::CHILD_FIRST,
    );
    foreach ($iterator as $item) {
        $item->isDir() ? rmdir($item->getPathname()) : unlink($item->getPathname());
    }
    rmdir($path);
}

$root = sys_get_temp_dir() . '/obsidian-share-test-' . bin2hex(random_bytes(5));
mkdir($root . '/data', 0700, true);
mkdir($root . '/public', 0755, true);
$pepper = str_repeat('a', 64);
$config = [
    'base_url' => 'https://read.example.test',
    'data_dir' => $root . '/data',
    'public_dir' => $root . '/public',
    'database_path' => $root . '/data/app.sqlite',
    'publish_token_pepper' => $pepper,
    'admin_username' => 'admin',
    'admin_password_hash' => password_hash('test-admin-password', PASSWORD_ARGON2ID),
    'private_password_hash' => password_hash('test-private-password', PASSWORD_ARGON2ID),
    'session_name' => 'obsidian_share_test',
    'max_upload_bytes' => 10 * 1024 * 1024,
    'max_image_pixels' => 40_000_000,
    'allowed_origins' => ['https://read.example.test'],
];
$app = new App($config);
$pdo = $app->database()->pdo();
$rawToken = str_repeat('test-token-', 5);
$app->tokens()->addToken('test-token', 'Tests', $rawToken, ['publish', 'media', 'delete', 'meta']);
$runner = new TestRunner();

$runner->test('Legacy light visual system remains the release default', static function (): void {
    $sourceRoot = dirname(__DIR__, 2);
    $css = (string) file_get_contents($sourceRoot . '/public/assets/app.css');
    $fonts = (string) file_get_contents($sourceRoot . '/public/assets/fonts/fonts.css');
    $template = (string) file_get_contents($sourceRoot . '/app/src/Template.php');
    $schema = (string) file_get_contents($sourceRoot . '/app/database/schema.sql');
    assert_true(
        preg_match('/font-family:\\s*[\'"]Inter[\'"]/', $fonts) === 1,
        'Inter is no longer the local UI font',
    );
    assert_true(
        preg_match('/body\\s*\\{[^}]*background:\\s*(?:#fff|white|var\\(--white\\))/s', $css) === 1,
        'Light page background changed',
    );
    assert_true(str_contains($css, 'width: min(100%, 1152px)'), 'Legacy content width changed');
    assert_true(str_contains($css, 'grid-template-columns: repeat(3, minmax(0, 1fr))'), 'Legacy desktop grid changed');
    assert_true(str_contains($template, '<h1>Заметки</h1>'), 'Legacy homepage title changed');
    assert_true(str_contains($schema, 'viewer_hash, view_day'), 'Portable daily view index is missing');
    assert_true(!str_contains($schema, 'substr(viewed_at'), 'Non-portable SQLite expression index returned');
    assert_true(!str_contains($schema, 'ON CONFLICT'), 'Modern SQLite upsert syntax returned');
    assert_true(
        !preg_match('/Benzin|Playfair|Cormorant|brandbook/i', $css . $fonts . $template),
        'Brand-book visual assets leaked into the blog release',
    );
});

$runner->test('Admin cover controls preserve the compact icon design', static function (): void {
    $sourceRoot = dirname(__DIR__, 2);
    $controller = (string) file_get_contents($sourceRoot . '/app/src/AdminController.php');
    $css = (string) file_get_contents($sourceRoot . '/public/assets/app.css');
    $script = (string) file_get_contents($sourceRoot . '/public/assets/admin.js');
    assert_true(str_contains($controller, 'data-cover-trigger'), 'Cover picker is not an icon action');
    assert_true(str_contains($controller, 'class="admin-cover-input"'), 'Native cover input is not isolated');
    assert_true(str_contains($controller, 'aria-label="{$coverActionLabel}'), 'Cover action lacks an accessible label');
    assert_true(!str_contains($controller, '>Заменить обложку</button>'), 'Text cover button returned');
    assert_true(!str_contains($controller, '>Убрать</button>'), 'Text cover remove button returned');
    assert_true(
        preg_match('/\\.admin-cover-input\\s*\\{[^}]*display:\\s*none/s', $css) === 1,
        'Native Choose File control is visible',
    );
    assert_true(str_contains($script, 'requestSubmit()'), 'Cover selection does not submit automatically');
});

$runner->test('Markdown strips raw HTML and unsafe links', static function (): void {
    $renderer = new MarkdownRenderer();
    $html = $renderer->render("# Safe\n\n<script>alert(1)</script>\n\n[x](javascript:alert(1))");
    assert_true(!str_contains($html, '<script'), 'script element survived');
    assert_true(!str_contains($html, 'javascript:'), 'unsafe URL survived');
    assert_true(str_contains($html, '<h1'), 'heading was not rendered');
});

$runner->test('Slug paths are deterministic and route-safe', static function (): void {
    $path = Slugger::canonicalPath('Привет, мир!', 'abc-123');
    assert_true(Slugger::isSafePath($path));
    assert_true(str_ends_with($path, '-abc-123'));
});

$runner->test('Publish token rejects missing authorization', static function () use ($app): void {
    $request = new Request('POST', '/api/v1/notes', [], [], '{}', '127.0.0.1');
    try {
        $app->tokens()->requireScope($request, 'publish');
        throw new RuntimeException('Missing token was accepted');
    } catch (HttpException $error) {
        assert_same(401, $error->status);
    }
});

$runner->test('Scoped publish token authenticates', static function () use ($app, $rawToken): void {
    $request = new Request(
        'POST',
        '/api/v1/notes',
        [],
        ['authorization' => 'Bearer ' . $rawToken],
        '{}',
        '127.0.0.1',
    );
    assert_same('test-token', $app->tokens()->requireScope($request, 'publish'));
    try {
        $app->tokens()->requireScope($request, 'admin');
        throw new RuntimeException('Unknown scope was accepted');
    } catch (HttpException $error) {
        assert_same(403, $error->status);
    }
});

$runner->test('JPEG PNG GIF and WebP are normalized to bounded quality WebP', static function () use ($app, $pdo): void {
    foreach (['jpeg', 'png', 'gif', 'webp'] as $seed => $format) {
        $bytes = test_image_bytes($format, $seed + 1);
        $sourceHash = hash('sha256', $bytes);
        $first = $app->media()->store($bytes, $sourceHash, "sample.{$format}");
        $second = $app->media()->store($bytes, $sourceHash, "copy.{$format}");
        assert_same(false, $first['deduplicated'], "{$format} first upload was misreported");
        assert_same(true, $second['deduplicated'], "{$format} duplicate was not detected");
        assert_same($first['hash'], $second['hash'], "{$format} canonical hash changed");
        assert_same('image/webp', $first['mimeType'], "{$format} was not converted to WebP");
        assert_same('webp', $first['extension'], "{$format} extension was not normalized");
        assert_same(1920, $first['width'], "{$format} width was not bounded");
        assert_same(960, $first['height'], "{$format} aspect ratio changed");
        $path = $app->media()->privatePath($first['hash'], $first['extension']);
        $stored = (string) file_get_contents($path);
        assert_same('RIFF', substr($stored, 0, 4), "{$format} output lacks RIFF signature");
        assert_same('WEBP', substr($stored, 8, 4), "{$format} output lacks WebP signature");
        assert_same($first['hash'], hash('sha256', $stored), "{$format} payload is not content-addressed");
        assert_true($first['hash'] !== $sourceHash, "{$format} was stored without re-encoding");
        if ($format === 'png') {
            $GLOBALS['test_media_source_hash'] = $sourceHash;
            $GLOBALS['test_media_canonical_hash'] = $first['hash'];
        }
    }
    assert_same(4, (int) $pdo->query('SELECT COUNT(*) FROM media')->fetchColumn());
});

$runner->test('Legacy non-WebP payloads are migrated without breaking aliases', static function () use ($app, $pdo): void {
    $legacy = test_image_bytes('png', 9);
    $legacyHash = hash('sha256', $legacy);
    $dimensions = getimagesizefromstring($legacy);
    assert_true(is_array($dimensions));
    $legacyPath = $app->media()->privatePath($legacyHash, 'png');
    if (!is_dir(dirname($legacyPath))) {
        mkdir(dirname($legacyPath), 0700, true);
    }
    file_put_contents($legacyPath, $legacy);
    $statement = $pdo->prepare(
        "INSERT INTO media
            (hash, extension, mime_type, filename, size, width, height, created_at)
         VALUES (:hash, 'png', 'image/png', 'legacy.png', :size, :width, :height, :created_at)"
    );
    $statement->execute([
        'hash' => $legacyHash,
        'size' => strlen($legacy),
        'width' => $dimensions[0],
        'height' => $dimensions[1],
        'created_at' => gmdate('Y-m-d\TH:i:s\Z'),
    ]);
    $app->media()->addAlias($legacyHash, $legacyHash);

    $result = $app->media()->normalizeLegacy();
    $record = $app->media()->findByAlias($legacyHash);
    assert_same(1, $result['converted']);
    assert_true($result['bytesAfter'] < $result['bytesBefore'], 'Legacy PNG was not reduced');
    assert_true(is_array($record), 'Legacy alias was lost');
    assert_same('image/webp', $record['mime_type']);
    assert_same('webp', $record['extension']);
    assert_true(!is_file($legacyPath), 'Legacy payload was not removed');
    assert_same(0, (int) $pdo->query("SELECT COUNT(*) FROM media WHERE mime_type != 'image/webp' OR extension != 'webp'")->fetchColumn());
    assert_same(5, (int) $pdo->query('SELECT COUNT(*) FROM media')->fetchColumn());
});

$runner->test('Create renders a safe static article', static function () use ($app, $pdo): void {
    $sourceHash = (string) $GLOBALS['test_media_source_hash'];
    $result = $app->publisher()->publish([
        'title' => 'Первая запись',
        'sourceId' => 'vault/first.md',
        'content' => "# Заголовок\n\nТекст.\n\n![Обложка](/api/images/{$sourceHash})\n\n<script>alert(1)</script>",
        'accessMode' => 'public',
        'tags' => ['тест'],
        'mediaHashes' => [$sourceHash],
    ], 'test');
    assert_same('created', $result['status']);
    assert_same(1, (int) $pdo->query('SELECT COUNT(*) FROM notes')->fetchColumn());
    $coverHash = $pdo->query('SELECT cover_media_hash FROM notes LIMIT 1')->fetchColumn();
    assert_same($GLOBALS['test_media_canonical_hash'], $coverHash, 'Source hash alias was not resolved');
    $path = $GLOBALS['root'] . '/public/generated/articles/' . $result['slug'] . '.html';
    assert_true(is_file($path), 'static article missing');
    $html = (string) file_get_contents($path);
    assert_true(!str_contains($html, '<script>alert'), 'stored XSS survived');
});

$runner->test('Unchanged publish creates no note revision', static function () use ($app, $pdo): void {
    $before = (int) $pdo->query('SELECT COUNT(*) FROM note_revisions')->fetchColumn();
    $sourceHash = (string) $GLOBALS['test_media_source_hash'];
    $result = $app->publisher()->publish([
        'title' => 'Первая запись',
        'sourceId' => 'vault/first.md',
        'content' => "# Заголовок\n\nТекст.\n\n![Обложка](/api/images/{$sourceHash})\n\n<script>alert(1)</script>",
        'accessMode' => 'public',
        'tags' => ['тест'],
        'mediaHashes' => [$sourceHash],
    ], 'test');
    $after = (int) $pdo->query('SELECT COUNT(*) FROM note_revisions')->fetchColumn();
    assert_same('unchanged', $result['status']);
    assert_same($before, $after);
});

$runner->test('Rename preserves the old public URL alias', static function () use ($app): void {
    $first = $app->publisher()->metaBySource('vault/first.md');
    assert_true(is_array($first));
    $oldSlug = basename((string) $first['url']);
    $updated = $app->publisher()->publish([
        'title' => 'Переименованная запись',
        'sourceId' => 'vault/first.md',
        'content' => "# Заголовок\n\nТекст изменён.",
        'accessMode' => 'public',
        'tags' => ['тест'],
    ], 'test');
    assert_same('updated', $updated['status']);
    assert_true(is_file($GLOBALS['root'] . '/public/generated/articles/' . $oldSlug . '.html'));
    assert_true(is_file($GLOBALS['root'] . '/public/generated/articles/' . $updated['slug'] . '.html'));
});

$runner->test('Private note is not emitted into static output', static function () use ($app): void {
    $result = $app->publisher()->publish([
        'title' => 'Закрытая запись',
        'sourceId' => 'vault/private.md',
        'content' => 'Секретный текст, которого нет в статике.',
        'accessMode' => 'private',
    ], 'test');
    assert_same('created', $result['status']);
    assert_true(!is_file($GLOBALS['root'] . '/public/generated/articles/' . $result['slug'] . '.html'));
    $index = (string) file_get_contents($GLOBALS['root'] . '/public/generated/index.html');
    assert_true(!str_contains($index, 'Секретный текст'));
    assert_true(!str_contains($index, 'Закрытая запись'));
});

$runner->test('Soft delete removes generated aliases', static function () use ($app): void {
    $meta = $app->publisher()->metaBySource('vault/first.md');
    assert_true(is_array($meta));
    $slug = basename((string) $meta['url']);
    assert_true($app->publisher()->softDelete((string) $meta['id'], 'test'));
    assert_true(!is_file($GLOBALS['root'] . '/public/generated/articles/' . $slug . '.html'));
    $deleted = $app->publisher()->metaBySource('vault/first.md');
    assert_same(true, $deleted['isDeleted']);
});

register_shutdown_function(static fn () => remove_tree($root));
$runner->finish();
