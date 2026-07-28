<?php

declare(strict_types=1);

namespace ObsidianShare;

use PDO;
use Throwable;

final class App
{
    private readonly Database $database;
    private readonly PDO $pdo;
    private readonly TokenAuthenticator $tokens;
    private readonly MediaStore $media;
    private readonly Publisher $publisher;
    private readonly ImportNormalizer $importNormalizer;
    private readonly StaticSiteGenerator $generator;
    private readonly PublicController $public;
    private readonly AdminController $admin;
    private readonly ApiController $api;

    /** @param array<string, mixed> $config */
    public function __construct(private readonly array $config)
    {
        $this->validateConfig();
        $this->database = new Database(
            (string) $config['database_path'],
            dirname(__DIR__) . '/database/schema.sql',
        );
        $this->pdo = $this->database->pdo();
        $markdown = new MarkdownRenderer();
        $template = new Template(rtrim((string) $config['base_url'], '/'));
        $session = new SessionManager($config);
        $rateLimiter = new AuthRateLimiter($this->pdo, (string) $config['publish_token_pepper']);
        $audit = new AuditLog($this->pdo);
        $this->tokens = new TokenAuthenticator($this->pdo, (string) $config['publish_token_pepper']);
        $this->media = new MediaStore($this->pdo, $config);
        $this->generator = new StaticSiteGenerator(
            $this->pdo,
            $config,
            $template,
            $this->media,
            $markdown,
        );
        $this->publisher = new Publisher(
            $this->database,
            $markdown,
            $this->media,
            $this->generator,
            $audit,
            $config,
        );
        $this->importNormalizer = new ImportNormalizer(
            $this->database,
            $markdown,
            $this->media,
            $config,
        );
        $this->public = new PublicController(
            $this->pdo,
            $config,
            $template,
            $session,
            $rateLimiter,
            $this->media,
        );
        $this->admin = new AdminController(
            $this->pdo,
            $config,
            $template,
            $session,
            $rateLimiter,
            $this->generator,
            $this->media,
            $audit,
        );
        $this->api = new ApiController(
            $this->pdo,
            $config,
            $this->tokens,
            $this->media,
            $this->publisher,
            $this->public,
        );
    }

    public function run(): never
    {
        $requestId = bin2hex(random_bytes(8));
        header('X-Request-ID: ' . $requestId);
        SecurityHeaders::send();

        try {
            $maxBody = max(2_100_000, (int) ceil((int) $this->config['max_upload_bytes'] * 1.45));
            $request = Request::fromGlobals($maxBody);
            $this->route($request);
        } catch (HttpException $error) {
            $this->error($error->status, $error->getMessage(), $requestId);
        } catch (Throwable $error) {
            error_log(sprintf(
                '[obsidian-share] request=%s exception=%s message=%s',
                $requestId,
                $error::class,
                $error->getMessage(),
            ));
            $this->error(500, 'Internal server error', $requestId);
        }
    }

    public function database(): Database
    {
        return $this->database;
    }

    public function tokens(): TokenAuthenticator
    {
        return $this->tokens;
    }

    public function publisher(): Publisher
    {
        return $this->publisher;
    }

    public function media(): MediaStore
    {
        return $this->media;
    }

    public function generator(): StaticSiteGenerator
    {
        return $this->generator;
    }

    public function importNormalizer(): ImportNormalizer
    {
        return $this->importNormalizer;
    }

    private function route(Request $request): never
    {
        $method = $request->method;
        $path = rtrim($request->path, '/') ?: '/';

        if ($method === 'GET' && $path === '/healthz') {
            $this->pdo->query('SELECT 1')->fetchColumn();
            Response::json(['status' => 'ok'], 200, ['Cache-Control' => 'no-store']);
        }
        if ($method === 'POST' && in_array($path, ['/api/v1/notes', '/api/share'], true)) {
            $this->api->publish($request);
        }
        if ($method === 'PUT' && preg_match('#^/api/v1/media/([a-f0-9]{64})$#', $path, $match)) {
            $this->api->uploadRaw($request, $match[1]);
        }
        if ($method === 'POST' && $path === '/api/images') {
            $this->api->uploadJson($request);
        }
        if ($method === 'GET' && $path === '/api/v1/meta') {
            $this->api->meta($request);
        }
        if ($method === 'DELETE' && preg_match('#^/api/(?:v1/notes|share)/([A-Za-z0-9_-]{1,180})$#', $path, $match)) {
            $this->api->delete($request, $match[1]);
        }
        if ($method === 'GET' && preg_match('#^/api/images/([A-Za-z0-9_-]{1,180})$#', $path, $match)) {
            $this->public->media($match[1]);
        }
        if ($method === 'GET' && $path === '/api/notes') {
            $this->api->publicNotes();
        }
        if ($method === 'POST' && preg_match('#^/api/v1/views/([A-Za-z0-9_-]{1,180})$#', $path, $match)) {
            $this->api->recordView($request, $match[1]);
        }
        if ($method === 'GET' && $path === '/api/link-preview') {
            Response::json(['error' => 'Link preview was retired to remove SSRF exposure'], 410);
        }

        if ($method === 'GET' && $path === '/admin') {
            $this->admin->page($request);
        }
        if ($method === 'POST' && $path === '/admin/login') {
            $this->admin->login($request);
        }
        if ($method === 'POST' && $path === '/admin/logout') {
            $this->admin->logout();
        }
        if ($method === 'POST' && preg_match('#^/admin/notes/([A-Za-z0-9_-]{1,180})/action$#', $path, $match)) {
            $this->admin->noteAction($match[1]);
        }

        if (in_array($method, ['GET', 'POST'], true) && preg_match('#^/s/([A-Za-z0-9_-]{1,180})$#', $path, $match)) {
            $this->public->article($match[1], $request);
        }

        if ($method === 'GET' && $path === '/') {
            $index = rtrim((string) $this->config['public_dir'], '/') . '/generated/index.html';
            if (is_file($index)) {
                Response::html((string) file_get_contents($index), 200, ['Cache-Control' => 'public, max-age=60']);
            }
        }

        throw new HttpException(404, 'Not found');
    }

    private function error(int $status, string $message, string $requestId): never
    {
        $path = (string) parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
        if (str_starts_with($path, '/api/') || $path === '/healthz') {
            Response::json([
                'error' => $message,
                'requestId' => $requestId,
            ], $status, ['Cache-Control' => 'no-store']);
        }

        $title = $status === 404 ? 'Страница не найдена' : 'Ошибка';
        $safeMessage = Template::escape($message);
        $body = '<main class="auth-shell"><section class="auth-card"><p class="eyebrow">'
            . $status . '</p><h1>' . $title . '</h1><p>' . $safeMessage
            . '</p><a class="button-link" href="/">На главную</a></section></main>';
        $template = new Template(rtrim((string) $this->config['base_url'], '/'));
        Response::html(
            $template->layout($title, $body, $message, 'noindex,nofollow', null),
            $status,
            ['Cache-Control' => 'no-store'],
        );
    }

    private function validateConfig(): void
    {
        foreach ([
            'base_url',
            'data_dir',
            'public_dir',
            'database_path',
            'publish_token_pepper',
            'admin_username',
            'admin_password_hash',
            'private_password_hash',
            'max_upload_bytes',
            'max_image_pixels',
        ] as $key) {
            if (!array_key_exists($key, $this->config) || $this->config[$key] === '') {
                throw new \RuntimeException('Missing application configuration: ' . $key);
            }
        }
        if (strlen((string) $this->config['publish_token_pepper']) < 32) {
            throw new \RuntimeException('publish_token_pepper is too short');
        }
        if (!str_starts_with((string) $this->config['base_url'], 'https://')) {
            throw new \RuntimeException('base_url must use HTTPS');
        }
    }
}
