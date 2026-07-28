<?php

declare(strict_types=1);

namespace ObsidianShare;

final class Slugger
{
    public static function slug(string $title): string
    {
        $value = trim($title);
        if (function_exists('transliterator_transliterate')) {
            $transliterated = transliterator_transliterate(
                'Any-Latin; Latin-ASCII; Lower()',
                $value,
            );
            if (is_string($transliterated)) {
                $value = $transliterated;
            }
            $value = preg_replace('/[^a-z0-9]+/', '_', $value) ?? '';
        } else {
            $fallback = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value);
            if (is_string($fallback)) {
                $value = $fallback;
            }
            $value = strtolower($value);
            $value = preg_replace('/[^a-z0-9]+/', '_', $value) ?? '';
        }

        $value = trim(preg_replace('/_+/', '_', $value) ?? '', '_');
        $value = preg_replace('/[^a-z0-9_]/', '', strtolower($value)) ?? '';
        if (strlen($value) > 100) {
            $value = rtrim(substr($value, 0, 100), '_');
            $lastSeparator = strrpos($value, '_');
            if ($lastSeparator !== false && $lastSeparator >= 60) {
                $value = substr($value, 0, $lastSeparator);
            }
        }

        return $value !== '' ? $value : 'note';
    }

    public static function noteId(): string
    {
        return rtrim(strtr(base64_encode(random_bytes(9)), '+/', '-_'), '=');
    }

    public static function canonicalPath(string $title, string $id): string
    {
        return self::slug($title) . '-' . $id;
    }

    public static function isSafePath(string $path): bool
    {
        return preg_match('/^[A-Za-z0-9_-]{1,180}$/', $path) === 1;
    }
}
