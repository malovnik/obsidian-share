<?php

declare(strict_types=1);

$publicRoot = getenv('OBS_SHARE_PUBLIC');
if (!is_string($publicRoot) || !is_dir($publicRoot)) {
    http_response_code(500);
    echo 'OBS_SHARE_PUBLIC is not configured';
    return true;
}

$path = rawurldecode((string) parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH));
$staticMap = [
    '/' => '/generated/index.html',
    '/sitemap.xml' => '/generated/sitemap.xml',
    '/feed.xml' => '/generated/feed.xml',
    '/search-index.json' => '/generated/search-index.json',
];
if (isset($staticMap[$path]) && is_file($publicRoot . $staticMap[$path])) {
    $target = $publicRoot . $staticMap[$path];
    header('Content-Type: ' . (str_ends_with($target, '.json')
        ? 'application/json; charset=utf-8'
        : (str_ends_with($target, '.xml') ? 'application/xml; charset=utf-8' : 'text/html; charset=utf-8')));
    readfile($target);
    return true;
}

if (preg_match('#^/s/([A-Za-z0-9_-]{1,180})$#', $path, $match)) {
    $article = $publicRoot . '/generated/articles/' . $match[1] . '.html';
    if (is_file($article)) {
        header('Content-Type: text/html; charset=utf-8');
        readfile($article);
        return true;
    }
}

$candidate = realpath($publicRoot . $path);
if (
    $candidate !== false
    && str_starts_with($candidate, realpath($publicRoot) . DIRECTORY_SEPARATOR)
    && is_file($candidate)
) {
    return false;
}

require $publicRoot . '/index.php';
return true;
