<?php

declare(strict_types=1);

namespace App\Http;

/**
 * Minimal JSON HTTP client for the Laravel metadata endpoint.
 * Used by the SEO front controller once the backend is deployed; keeps the
 * InstantDB admin path as a fallback during the transition.
 */
final class LaravelApi
{
    public function __construct(private readonly string $baseUrl)
    {
    }

    /** GET /api/metadata/trips/{id} and return decoded array or null. */
    public function tripMeta(string $tripId): ?array
    {
        $url = rtrim($this->baseUrl, '/') . '/api/metadata/trips/' . rawurlencode($tripId);
        $response = $this->get($url);
        if ($response === null) {
            return null;
        }
        $data = json_decode($response, true);
        return is_array($data) ? $data : null;
    }

    private function get(string $url): ?string
    {
        if (function_exists('curl_init')) {
            return $this->getViaCurl($url);
        }
        return $this->getViaStream($url);
    }

    private function getViaCurl(string $url): ?string
    {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 10,
            CURLOPT_HTTPHEADER => ['Accept: application/json'],
        ]);
        $response = curl_exec($ch);
        $error = curl_error($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        curl_close($ch);

        if ($response === false) {
            error_log("[ikuyo-meta] Laravel metadata request failed: {$error}");
            return null;
        }
        if ($status < 200 || $status >= 300) {
            error_log("[ikuyo-meta] Laravel metadata returned HTTP {$status} (likely private/missing)");
            return null;
        }
        return $response;
    }

    private function getViaStream(string $url): ?string
    {
        $context = stream_context_create([
            'http' => [
                'method' => 'GET',
                'header' => 'Accept: application/json',
                'ignore_errors' => true,
                'timeout' => 10,
            ],
        ]);
        $response = @file_get_contents($url, false, $context);
        if ($response === false) {
            error_log('[ikuyo-meta] Laravel metadata request failed via stream context');
            return null;
        }
        $status = 0;
        foreach ($http_response_header ?? [] as $line) {
            if (preg_match('#^HTTP/\S+\s+(\d{3})#i', (string) $line, $m)) {
                $status = (int) $m[1];
                break;
            }
        }
        if ($status !== 0 && ($status < 200 || $status >= 300)) {
            error_log("[ikuyo-meta] Laravel metadata returned HTTP {$status}");
            return null;
        }
        return $response;
    }
}
