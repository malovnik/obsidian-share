<?php

declare(strict_types=1);

use ObsidianShare\App;

require __DIR__ . '/vendor/autoload.php';

/**
 * @return array<string, mixed>
 */
function obsidian_share_config(?string $path = null): array
{
    $path ??= getenv('OBS_SHARE_CONFIG') ?: dirname(__DIR__) . '/config.php';
    if (!is_file($path)) {
        throw new RuntimeException('Obsidian Share config file is missing');
    }
    $config = require $path;
    if (!is_array($config)) {
        throw new RuntimeException('Obsidian Share config must return an array');
    }
    return $config;
}

function obsidian_share_app(?string $configPath = null): App
{
    return new App(obsidian_share_config($configPath));
}
