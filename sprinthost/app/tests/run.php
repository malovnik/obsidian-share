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

$runner->test('Identical media creates one payload', static function () use ($app, $pdo): void {
    $png = base64_decode(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
        true,
    );
    assert_true(is_string($png));
    $hash = hash('sha256', $png);
    $first = $app->media()->store($png, $hash, 'pixel.png');
    $second = $app->media()->store($png, $hash, 'copy.png');
    assert_same(false, $first['deduplicated']);
    assert_same(true, $second['deduplicated']);
    assert_same(1, (int) $pdo->query('SELECT COUNT(*) FROM media')->fetchColumn());
});

$runner->test('Create renders a safe static article', static function () use ($app, $pdo): void {
    $result = $app->publisher()->publish([
        'title' => 'Первая запись',
        'sourceId' => 'vault/first.md',
        'content' => "# Заголовок\n\nТекст.\n\n<script>alert(1)</script>",
        'accessMode' => 'public',
        'tags' => ['тест'],
    ], 'test');
    assert_same('created', $result['status']);
    assert_same(1, (int) $pdo->query('SELECT COUNT(*) FROM notes')->fetchColumn());
    $path = $GLOBALS['root'] . '/public/generated/articles/' . $result['slug'] . '.html';
    assert_true(is_file($path), 'static article missing');
    $html = (string) file_get_contents($path);
    assert_true(!str_contains($html, '<script>alert'), 'stored XSS survived');
});

$runner->test('Unchanged publish creates no note revision', static function () use ($app, $pdo): void {
    $before = (int) $pdo->query('SELECT COUNT(*) FROM note_revisions')->fetchColumn();
    $result = $app->publisher()->publish([
        'title' => 'Первая запись',
        'sourceId' => 'vault/first.md',
        'content' => "# Заголовок\n\nТекст.\n\n<script>alert(1)</script>",
        'accessMode' => 'public',
        'tags' => ['тест'],
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
