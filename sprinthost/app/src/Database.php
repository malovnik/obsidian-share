<?php

declare(strict_types=1);

namespace ObsidianShare;

use PDO;
use PDOException;
use RuntimeException;
use Throwable;

final class Database
{
    private PDO $pdo;

    public function __construct(string $databasePath, string $schemaPath)
    {
        $directory = dirname($databasePath);
        if (!is_dir($directory) && !mkdir($directory, 0700, true) && !is_dir($directory)) {
            throw new RuntimeException('Unable to create database directory');
        }

        $this->pdo = new PDO('sqlite:' . $databasePath, null, null, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
        $this->pdo->exec('PRAGMA foreign_keys = ON');
        $this->pdo->exec('PRAGMA journal_mode = WAL');
        $this->pdo->exec('PRAGMA synchronous = NORMAL');
        $this->pdo->exec('PRAGMA busy_timeout = 5000');

        $schema = file_get_contents($schemaPath);
        if ($schema === false) {
            throw new RuntimeException('Unable to read database schema');
        }
        $this->pdo->exec($schema);
    }

    public function pdo(): PDO
    {
        return $this->pdo;
    }

    /**
     * @template T
     * @param callable(PDO): T $callback
     * @return T
     */
    public function transaction(callable $callback): mixed
    {
        $attempt = 0;

        while (true) {
            $begun = false;
            try {
                $this->pdo->exec('BEGIN IMMEDIATE');
                $begun = true;
                $result = $callback($this->pdo);
                $this->pdo->exec('COMMIT');
                return $result;
            } catch (Throwable $error) {
                if ($begun) {
                    try {
                        $this->pdo->exec('ROLLBACK');
                    } catch (Throwable) {
                        // Preserve the original failure.
                    }
                }

                $locked = $error instanceof PDOException
                    && str_contains(strtolower($error->getMessage()), 'locked');
                if (!$locked || ++$attempt >= 3) {
                    throw $error;
                }
                usleep(50_000 * $attempt);
            }
        }
    }
}
