#!/usr/bin/env php
<?php

declare(strict_types=1);

$projectRoot = dirname(__DIR__);
$configPath = $argv[1] ?? ($projectRoot . '/.local/sprinthost/config.local.php');
if (!is_file($configPath)) {
    fwrite(STDERR, "Local SprintHost config is missing.\n");
    exit(2);
}

putenv('OBS_SHARE_CONFIG=' . $configPath);
require $projectRoot . '/sprinthost/app/bootstrap.php';

$command = [
    '/usr/bin/security',
    'find-generic-password',
    '-a',
    'obsidian-share-plugin',
    '-s',
    'codex.obsidian-share.publish-token',
    '-w',
];
$descriptor = [
    0 => ['pipe', 'r'],
    1 => ['pipe', 'w'],
    2 => ['pipe', 'w'],
];
$process = proc_open($command, $descriptor, $pipes);
if (!is_resource($process)) {
    fwrite(STDERR, "Unable to read the publish token from macOS Keychain.\n");
    exit(2);
}
fclose($pipes[0]);
$publishToken = trim((string) stream_get_contents($pipes[1]));
$error = trim((string) stream_get_contents($pipes[2]));
fclose($pipes[1]);
fclose($pipes[2]);
$status = proc_close($process);
if ($status !== 0 || strlen($publishToken) < 32) {
    fwrite(STDERR, "Publish token Keychain lookup failed" . ($error === '' ? ".\n" : ": {$error}\n"));
    exit(2);
}

$app = obsidian_share_app($configPath);
$app->tokens()->addToken(
    'obsidian-main',
    'Primary Obsidian vault',
    $publishToken,
    ['publish', 'media', 'delete', 'meta'],
);
unset($publishToken);

$normalized = $app->importNormalizer()->run();
$app->generator()->rebuild();
$pdo = $app->database()->pdo();
$result = [
    'normalized' => $normalized,
    'notes' => (int) $pdo->query('SELECT count(*) FROM notes')->fetchColumn(),
    'activePublic' => (int) $pdo->query(
        "SELECT count(*) FROM notes WHERE is_deleted = 0 AND access_mode = 'public'"
    )->fetchColumn(),
    'activePrivate' => (int) $pdo->query(
        "SELECT count(*) FROM notes WHERE is_deleted = 0 AND access_mode = 'private'"
    )->fetchColumn(),
    'deleted' => (int) $pdo->query('SELECT count(*) FROM notes WHERE is_deleted = 1')->fetchColumn(),
    'media' => (int) $pdo->query('SELECT count(*) FROM media')->fetchColumn(),
    'mediaAliases' => (int) $pdo->query('SELECT count(*) FROM media_aliases')->fetchColumn(),
    'integrity' => (string) $pdo->query('PRAGMA integrity_check')->fetchColumn(),
];

$config = require $configPath;
$databasePath = (string) $config['database_path'];
chmod($databasePath, 0600);
$manifestPath = dirname(dirname($databasePath)) . '/migration-manifest.json';
if (is_file($manifestPath)) {
    $manifest = json_decode((string) file_get_contents($manifestPath), true, 32, JSON_THROW_ON_ERROR);
    $manifest['databaseSha256AfterNormalization'] = hash_file('sha256', $databasePath);
    $manifest['normalized'] = $normalized;
    file_put_contents(
        $manifestPath,
        json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR) . "\n",
        LOCK_EX,
    );
    chmod($manifestPath, 0600);
}

fwrite(STDOUT, json_encode($result, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR) . "\n");
