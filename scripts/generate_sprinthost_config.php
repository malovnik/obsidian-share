#!/usr/bin/env php
<?php

declare(strict_types=1);

$projectRoot = dirname(__DIR__);
$outputRoot = $argv[1] ?? ($projectRoot . '/.local/sprinthost');
$productionConfigPath = $outputRoot . '/config.php';
$localConfigPath = $outputRoot . '/config.local.php';

if (is_file($productionConfigPath) || is_file($localConfigPath)) {
    fwrite(STDERR, "Config already exists; refusing to rotate secrets implicitly.\n");
    exit(2);
}

$adminUsername = getenv('ADMIN_USERNAME');
$adminPassword = getenv('ADMIN_PASSWORD');
if (!is_string($adminUsername) || $adminUsername === '' || !is_string($adminPassword) || $adminPassword === '') {
    fwrite(STDERR, "ADMIN_USERNAME and ADMIN_PASSWORD must be supplied through the process environment.\n");
    exit(2);
}

$privatePassword = getenv('PRIVATE_NOTE_PASSWORD');
if (!is_string($privatePassword) || $privatePassword === '') {
    $security = '/usr/bin/security';
    if (is_executable($security)) {
        $command = sprintf(
            '%s find-generic-password -a %s -s %s -w 2>/dev/null',
            escapeshellarg($security),
            escapeshellarg('read.malovnik.ru'),
            escapeshellarg('codex.obsidian-share.private-password'),
        );
        $privatePassword = trim((string) shell_exec($command));
    }
}
if (!is_string($privatePassword) || $privatePassword === '') {
    fwrite(STDERR, "PRIVATE_NOTE_PASSWORD or its macOS Keychain entry is required.\n");
    exit(2);
}

if (!is_dir($outputRoot) && !mkdir($outputRoot, 0700, true) && !is_dir($outputRoot)) {
    fwrite(STDERR, "Unable to create config output directory.\n");
    exit(2);
}

$shared = [
    'base_url' => 'https://read.malovnik.ru',
    'publish_token_pepper' => bin2hex(random_bytes(32)),
    'admin_username' => $adminUsername,
    'admin_password_hash' => password_hash($adminPassword, PASSWORD_ARGON2ID),
    'private_password_hash' => password_hash($privatePassword, PASSWORD_ARGON2ID),
    'session_name' => 'obsidian_share_session',
    'max_upload_bytes' => 10 * 1024 * 1024,
    'max_image_pixels' => 40_000_000,
    'allowed_origins' => ['https://read.malovnik.ru'],
];

$productionRoot = '/home/a0346120/domains/malovnik.ru';
$production = [
    'data_dir' => $productionRoot . '/private/obsidian-share/data',
    'public_dir' => $productionRoot . '/public_html/read',
    'database_path' => $productionRoot . '/private/obsidian-share/data/obsidian-share.sqlite',
    'secure_cookies' => true,
] + $shared;

$localRoot = $outputRoot . '/migration';
$local = [
    'data_dir' => $localRoot . '/data',
    'public_dir' => $localRoot . '/public',
    'database_path' => $localRoot . '/data/obsidian-share.sqlite',
    'secure_cookies' => false,
] + $shared;

$render = static fn (array $config): string => "<?php\n\ndeclare(strict_types=1);\n\nreturn "
    . var_export($config, true) . ";\n";

if (
    file_put_contents($productionConfigPath, $render($production), LOCK_EX) === false
    || file_put_contents($localConfigPath, $render($local), LOCK_EX) === false
) {
    fwrite(STDERR, "Unable to write config files.\n");
    exit(2);
}
chmod($productionConfigPath, 0600);
chmod($localConfigPath, 0600);

unset($adminPassword, $privatePassword, $command);
fwrite(STDOUT, "SprintHost production and local migration configs generated without plaintext credentials.\n");
