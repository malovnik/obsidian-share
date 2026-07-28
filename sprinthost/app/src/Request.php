<?php

declare(strict_types=1);

namespace ObsidianShare;

final class Request
{
    /** @param array<string, string> $headers */
    public function __construct(
        public readonly string $method,
        public readonly string $path,
        public readonly array $query,
        public readonly array $headers,
        public readonly string $body,
        public readonly string $remoteAddress,
    ) {
    }

    public static function fromGlobals(int $maxBodyBytes): self
    {
        $length = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
        if ($length > $maxBodyBytes) {
            throw new HttpException(413, 'Request body is too large');
        }

        $body = file_get_contents('php://input', false, null, 0, $maxBodyBytes + 1);
        if ($body === false) {
            throw new HttpException(400, 'Unable to read request body');
        }
        if (strlen($body) > $maxBodyBytes) {
            throw new HttpException(413, 'Request body is too large');
        }

        $headers = [];
        foreach (getallheaders() ?: [] as $name => $value) {
            $headers[strtolower((string) $name)] = trim((string) $value);
        }

        $path = rawurldecode((string) parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH));

        return new self(
            strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET'),
            $path === '' ? '/' : $path,
            $_GET,
            $headers,
            $body,
            $_SERVER['REMOTE_ADDR'] ?? 'unknown',
        );
    }

    public function header(string $name): ?string
    {
        return $this->headers[strtolower($name)] ?? null;
    }

    public function bearerToken(): ?string
    {
        $authorization = $this->header('authorization');
        if ($authorization === null || !preg_match('/^Bearer\s+(.+)$/i', $authorization, $match)) {
            return null;
        }

        $token = trim($match[1]);
        return $token === '' ? null : $token;
    }

    /** @return array<string, mixed> */
    public function json(): array
    {
        if ($this->body === '') {
            throw new HttpException(400, 'JSON body is required');
        }

        try {
            $decoded = json_decode($this->body, true, 64, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            throw new HttpException(400, 'Invalid JSON body');
        }

        if (!is_array($decoded) || array_is_list($decoded)) {
            throw new HttpException(400, 'JSON object is required');
        }

        return $decoded;
    }
}
