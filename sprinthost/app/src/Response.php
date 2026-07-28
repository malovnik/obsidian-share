<?php

declare(strict_types=1);

namespace ObsidianShare;

final class Response
{
    /** @param array<string, string> $headers */
    public static function json(array $data, int $status = 200, array $headers = []): never
    {
        self::headers($status, ['Content-Type' => 'application/json; charset=utf-8'] + $headers);
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
        exit;
    }

    /** @param array<string, string> $headers */
    public static function html(string $html, int $status = 200, array $headers = []): never
    {
        self::headers($status, ['Content-Type' => 'text/html; charset=utf-8'] + $headers);
        echo $html;
        exit;
    }

    /** @param array<string, string> $headers */
    public static function text(string $text, int $status = 200, array $headers = []): never
    {
        self::headers($status, ['Content-Type' => 'text/plain; charset=utf-8'] + $headers);
        echo $text;
        exit;
    }

    public static function redirect(string $location, int $status = 303): never
    {
        self::headers($status, ['Location' => $location]);
        exit;
    }

    /** @param array<string, string> $headers */
    private static function headers(int $status, array $headers): void
    {
        http_response_code($status);
        foreach ($headers as $name => $value) {
            header($name . ': ' . $value, true);
        }
    }
}
