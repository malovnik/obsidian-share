<?php

declare(strict_types=1);

namespace ObsidianShare;

use PDO;

final class AuditLog
{
    public function __construct(private readonly PDO $pdo)
    {
    }

    /** @param array<string, scalar|null> $metadata */
    public function write(
        string $actor,
        string $action,
        string $subjectType,
        ?string $subjectId = null,
        array $metadata = [],
    ): void {
        $statement = $this->pdo->prepare(
            'INSERT INTO audit_log
                (actor, action, subject_type, subject_id, metadata_json, created_at)
             VALUES (:actor, :action, :subject_type, :subject_id, :metadata, :created_at)'
        );
        $statement->execute([
            'actor' => mb_substr($actor, 0, 120),
            'action' => mb_substr($action, 0, 120),
            'subject_type' => mb_substr($subjectType, 0, 80),
            'subject_id' => $subjectId === null ? null : mb_substr($subjectId, 0, 160),
            'metadata' => json_encode($metadata, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
            'created_at' => Clock::now(),
        ]);
    }
}
