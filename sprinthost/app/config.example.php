<?php

declare(strict_types=1);

return [
    'base_url' => 'https://read.malovnik.ru',
    'data_dir' => '/home/ACCOUNT/domains/malovnik.ru/private/obsidian-share/data',
    'public_dir' => '/home/ACCOUNT/domains/malovnik.ru/public_html/read',
    'database_path' => '/home/ACCOUNT/domains/malovnik.ru/private/obsidian-share/data/obsidian-share.sqlite',
    'publish_token_pepper' => 'replace-with-64-random-hex-characters',
    'admin_username' => 'admin',
    'admin_password_hash' => 'replace-with-password_hash-output',
    'private_password_hash' => 'replace-with-password_hash-output',
    'session_name' => 'obsidian_share_session',
    'max_upload_bytes' => 10 * 1024 * 1024,
    'max_image_pixels' => 40_000_000,
    'allowed_origins' => ['https://read.malovnik.ru'],
];
