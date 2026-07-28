<?php

declare(strict_types=1);

namespace ObsidianShare;

use RuntimeException;

final class SessionManager
{
    private bool $started = false;

    /** @param array<string, mixed> $config */
    public function __construct(private readonly array $config)
    {
    }

    public function start(): void
    {
        if ($this->started) {
            return;
        }

        $sessionDirectory = rtrim((string) $this->config['data_dir'], '/') . '/sessions';
        if (!is_dir($sessionDirectory) && !mkdir($sessionDirectory, 0700, true) && !is_dir($sessionDirectory)) {
            throw new RuntimeException('Unable to create session directory');
        }

        session_name((string) ($this->config['session_name'] ?? 'obsidian_share_session'));
        session_save_path($sessionDirectory);
        $secureCookie = ($this->config['secure_cookies'] ?? true) === true
            && getenv('OBS_SHARE_INSECURE_LOCAL') !== '1';
        session_set_cookie_params([
            'lifetime' => 0,
            'path' => '/',
            'secure' => $secureCookie,
            'httponly' => true,
            'samesite' => 'Strict',
        ]);
        ini_set('session.use_strict_mode', '1');
        ini_set('session.use_only_cookies', '1');
        ini_set('session.cookie_httponly', '1');
        ini_set('session.cookie_secure', $secureCookie ? '1' : '0');
        ini_set('session.gc_maxlifetime', '43200');
        session_start();
        $this->started = true;
    }

    public function csrfToken(): string
    {
        $this->start();
        if (!isset($_SESSION['csrf']) || !is_string($_SESSION['csrf'])) {
            $_SESSION['csrf'] = bin2hex(random_bytes(24));
        }
        return $_SESSION['csrf'];
    }

    public function requireCsrf(?string $token): void
    {
        $this->start();
        $expected = $_SESSION['csrf'] ?? null;
        if (!is_string($token) || !is_string($expected) || !hash_equals($expected, $token)) {
            throw new HttpException(403, 'Invalid form token');
        }
    }

    public function loginAdmin(): void
    {
        $this->start();
        session_regenerate_id(true);
        $_SESSION['admin'] = true;
        $_SESSION['admin_login_at'] = time();
    }

    public function logoutAdmin(): void
    {
        $this->start();
        unset($_SESSION['admin'], $_SESSION['admin_login_at']);
        session_regenerate_id(true);
    }

    public function isAdmin(): bool
    {
        $this->start();
        $loginAt = $_SESSION['admin_login_at'] ?? 0;
        if (!is_int($loginAt) || $loginAt < time() - 43_200) {
            unset($_SESSION['admin'], $_SESSION['admin_login_at']);
            return false;
        }
        return ($_SESSION['admin'] ?? false) === true;
    }

    public function requireAdmin(): void
    {
        if (!$this->isAdmin()) {
            throw new HttpException(401, 'Admin authentication required');
        }
    }

    public function unlockNote(string $noteId): void
    {
        $this->start();
        $_SESSION['private_notes'] ??= [];
        $_SESSION['private_notes'][$noteId] = time();
    }

    public function canReadNote(string $noteId): bool
    {
        $this->start();
        if ($this->isAdmin()) {
            return true;
        }
        $unlockedAt = $_SESSION['private_notes'][$noteId] ?? 0;
        if (!is_int($unlockedAt) || $unlockedAt < time() - 43_200) {
            unset($_SESSION['private_notes'][$noteId]);
            return false;
        }
        return true;
    }
}
