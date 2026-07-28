<?php

declare(strict_types=1);

namespace ObsidianShare;

final class Clock
{
    public static function now(): string
    {
        return gmdate('Y-m-d\TH:i:s\Z');
    }
}
