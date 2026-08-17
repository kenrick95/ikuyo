<?php

declare(strict_types=1);

namespace App\Http;

/**
 * Minimal JSON HTTP client for the InstantDB admin API.
 * Uses cURL when available, otherwise falls back to a stream context.
 */
final class InstantApi
{
    public function __construct(
        private readonly string $queryUrl,
        private readonly string $appId,
        private readonly string $token,
    ) {
    }

    /**
     * POST an InstaQL query and return the decoded response array,
     * or null on transport/parse failure.
     */
    public function query(array $instaql): ?array
    {
        $payload = json_encode(['query' => $instaql]);
        if ($payload === false) {
            return null;
        }
        $headers = [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $this->token,
            'App-Id: ' . $this->appId,
        ];

        $response = $this->post($payload, $headers);
        if ($response === null) {
            return null;
        }
        $data = json_decode($response, true);
        return is_array($data) ? $data : null;
    }

    private function post(string $payload, array $headers): ?string
    {
        if (function_exists('curl_init')) {
            return $this->postViaCurl($payload, $headers);
        }
        return $this->postViaStream($payload, $headers);
    }

    private function postViaCurl(string $payload, array $headers): ?string
    {
        $ch = curl_init($this->queryUrl);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $payload,
            CURLOPT_TIMEOUT => 10,
            CURLOPT_HTTPHEADER => $headers,
        ]);
        $response = curl_exec($ch);
        $error = curl_error($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        curl_close($ch);

        if ($response === false) {
            error_log("[ikuyo-meta] InstantDB request failed: {$error}");
            return null;
        }
        if ($status < 200 || $status >= 300) {
            error_log("[ikuyo-meta] InstantDB admin query returned HTTP {$status}");
        }
        return $response;
    }

    private function postViaStream(string $payload, array $headers): ?string
    {
        $context = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => implode("\r\n", $headers),
                'content' => $payload,
                'ignore_errors' => true,
                'timeout' => 10,
            ],
        ]);
        $response = @file_get_contents($this->queryUrl, false, $context);
        if ($response === false) {
            $err = error_get_last();
            $reason = is_array($err) ? ($err['message'] ?? 'unknown error') : 'unknown error';
            error_log("[ikuyo-meta] InstantDB request failed via stream context: {$reason}");
            return null;
        }
        $status = $this->streamStatus($http_response_header ?? []);
        if ($status !== 0 && ($status < 200 || $status >= 300)) {
            error_log("[ikuyo-meta] InstantDB admin query returned HTTP {$status}");
        }
        return $response;
    }

    /** Extract the final HTTP status code from a response header list, or 0. */
    private function streamStatus(array $headers): int
    {
        foreach ($headers as $line) {
            if (preg_match('#^HTTP/\S+\s+(\d{3})#i', (string) $line, $m)) {
                return (int) $m[1];
            }
        }
        return 0;
    }
}