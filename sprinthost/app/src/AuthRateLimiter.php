<?php

declare(strict_types=1);

namespace ObsidianShare;

use PDO;

final class AuthRateLimiter
{
    public function __construct(
        private readonly PDO $pdo,
        private readonly string $pepper,
    ) {
    }

    public function assertAllowed(string $identity): void
    {
        $hash = $this->identityHash($identity);
        $statement = $this->pdo->prepare(
            'SELECT COUNT(*) FROM auth_attempts
             WHERE identity_hash = :hash
               AND success = 0
               AND attempted_at >= :threshold'
        );
        $statement->execute([
            'hash' => $hash,
            'threshold' => gmdate('Y-m-d\TH:i:s\Z', time() - 900),
        ]);
        if ((int) $statement->fetchColumn() >= 5) {
            throw new HttpException(429, 'Too many failed login attempts');
        }
    }

    public function record(string $identity, bool $success): void
    {
        $statement = $this->pdo->prepare(
            'INSERT INTO auth_attempts (identity_hash, attempted_at, success)
             VALUES (:hash, :attempted_at, :success)'
        );
        $statement->execute([
            'hash' => $this->identityHash($identity),
            'attempted_at' => Clock::now(),
            'success' => $success ? 1 : 0,
        ]);

        $this->pdo->prepare('DELETE FROM auth_attempts WHERE attempted_at < :threshold')
            ->execute(['threshold' => gmdate('Y-m-d\TH:i:s\Z', time() - 86400)]);
    }

    private function identityHash(string $identity): string
    {
        return hash_hmac('sha256', strtolower($identity), $this->pepper);
    }
}
