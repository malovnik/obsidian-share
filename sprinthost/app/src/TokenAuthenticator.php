<?php

declare(strict_types=1);

namespace ObsidianShare;

use PDO;

final class TokenAuthenticator
{
    public function __construct(
        private readonly PDO $pdo,
        private readonly string $pepper,
    ) {
    }

    public function requireScope(Request $request, string $requiredScope): string
    {
        $token = $request->bearerToken();
        if ($token === null || strlen($token) < 32 || strlen($token) > 256) {
            throw new HttpException(401, 'Valid bearer token required');
        }

        $hash = hash_hmac('sha256', $token, $this->pepper);
        $statement = $this->pdo->prepare(
            'SELECT id, scopes_json FROM publish_tokens
             WHERE token_hash = :hash AND revoked_at IS NULL
             LIMIT 1'
        );
        $statement->execute(['hash' => $hash]);
        $row = $statement->fetch();

        if (!is_array($row)) {
            throw new HttpException(401, 'Valid bearer token required');
        }

        $scopes = json_decode((string) $row['scopes_json'], true);
        if (!is_array($scopes) || !in_array($requiredScope, $scopes, true)) {
            throw new HttpException(403, 'Token does not have the required scope');
        }

        $this->touchToken((string) $row['id']);
        return (string) $row['id'];
    }

    /** @param list<string> $scopes */
    public function addToken(string $id, string $label, string $rawToken, array $scopes): void
    {
        $parameters = [
            'id' => $id,
            'label' => $label,
            'hash' => hash_hmac('sha256', $rawToken, $this->pepper),
            'scopes' => json_encode(array_values(array_unique($scopes)), JSON_THROW_ON_ERROR),
            'created_at' => Clock::now(),
        ];
        $insert = $this->pdo->prepare(
            'INSERT OR IGNORE INTO publish_tokens
                (id, label, token_hash, scopes_json, created_at)
             VALUES (:id, :label, :hash, :scopes, :created_at)'
        );
        $insert->execute($parameters);
        $update = $this->pdo->prepare(
            'UPDATE publish_tokens SET
                label = :label,
                token_hash = :hash,
                scopes_json = :scopes,
                revoked_at = NULL
             WHERE id = :id'
        );
        $update->execute([
            'id' => $id,
            'label' => $label,
            'hash' => $parameters['hash'],
            'scopes' => $parameters['scopes'],
        ]);
    }

    private function touchToken(string $id): void
    {
        $statement = $this->pdo->prepare(
            "UPDATE publish_tokens
             SET last_used_at = :now
             WHERE id = :id
               AND (last_used_at IS NULL OR last_used_at < :threshold)"
        );
        $statement->execute([
            'now' => Clock::now(),
            'threshold' => gmdate('Y-m-d\TH:i:s\Z', time() - 86400),
            'id' => $id,
        ]);
    }
}
