<?php

declare(strict_types=1);

namespace ObsidianShare;

final class SecurityHeaders
{
    public static function send(): void
    {
        header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
        header('X-Content-Type-Options: nosniff');
        header('X-Frame-Options: DENY');
        header('Referrer-Policy: strict-origin-when-cross-origin');
        header('Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()');
        header("Content-Security-Policy: default-src 'self'; img-src 'self' data: https://mc.yandex.ru https://mc.yandex.com; style-src 'self' 'unsafe-inline'; font-src 'self'; script-src 'self' https://mc.yandex.ru; connect-src 'self' https://mc.yandex.ru https://mc.yandex.com; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; upgrade-insecure-requests");
    }
}
