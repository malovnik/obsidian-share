<?php

declare(strict_types=1);

$productionBootstrap = dirname(__DIR__, 2) . '/private/obsidian-share/current/bootstrap.php';
$localBootstrap = dirname(__DIR__) . '/app/bootstrap.php';
$bootstrap = getenv('OBS_SHARE_BOOTSTRAP')
    ?: (is_file($productionBootstrap) ? $productionBootstrap : $localBootstrap);

require $bootstrap;

obsidian_share_app()->run();
