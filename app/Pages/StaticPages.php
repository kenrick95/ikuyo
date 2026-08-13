<?php

declare(strict_types=1);

namespace App\Pages;

/**
 * Known non-trip SPA routes and their metadata.
 *
 * The catalog is stored in `shared/pages.json` — the single source of truth
 * shared with the frontend (`src/Nav/pageMeta.ts`). `title` is the
 * distinguishing page title (empty for the brand/home pages); consumers apply
 * their own branding (`| Ikuyo!` in the browser, `og:title` fallback in PHP).
 *
 * Loads the JSON at runtime; falls back to a built-in copy if the file is
 * missing (e.g. not deployed yet), so metadata still renders either way.
 */
final readonly class StaticPages
{
    /** @var array<string, array{title: string, description: string, noindex: bool}>|null */
    private ?array $json;

    public function __construct()
    {
        $path = dirname(__DIR__, 3) . '/shared/pages.json';
        $raw = is_file($path) ? @file_get_contents($path) : false;
        $decoded = $raw === false ? null : json_decode($raw, true);
        $this->json = is_array($decoded) ? $decoded : null;
    }

    /** @return array<string, array{title: string, description: string, noindex: bool}> */
    public function all(): array
    {
        $pages = $this->json ?? $this->fallback();
        $result = [];
        foreach ($pages as $path => $meta) {
            $result[(string) $path] = [
                'title' => (string) ($meta['title'] ?? ''),
                'description' => (string) ($meta['description'] ?? ''),
                'noindex' => (bool) ($meta['noindex'] ?? false),
            ];
        }
        return $result;
    }

    /** @return array<string, array{title: string, description: string, noindex: bool}> */
    private function fallback(): array
    {
        return [
            '/' => ['title' => '', 'description' => 'Plan your next trip!', 'noindex' => false],
            '/landing' => ['title' => '', 'description' => 'Plan your next trip!', 'noindex' => false],
            '/login' => ['title' => 'Login', 'description' => 'Log in to Ikuyo to plan and share your trips.', 'noindex' => true],
            '/trip' => ['title' => 'Trips', 'description' => 'Your trips on Ikuyo.', 'noindex' => true],
            '/trip/public' => ['title' => 'Public Trips', 'description' => 'Discover public trips shared on Ikuyo.', 'noindex' => false],
            '/trip/new' => ['title' => 'Plan a Trip', 'description' => 'Plan a new trip on Ikuyo.', 'noindex' => true],
            '/account/edit' => ['title' => 'Account', 'description' => 'Manage your Ikuyo account.', 'noindex' => true],
            '/account/upgrade' => ['title' => 'Upgrade Account', 'description' => 'Upgrade your Ikuyo account.', 'noindex' => true],
            '/privacy' => ['title' => 'Privacy Policy', 'description' => 'Read the Ikuyo Privacy Policy.', 'noindex' => false],
            '/terms' => ['title' => 'Terms of Service', 'description' => 'Read the Ikuyo Terms of Service.', 'noindex' => false],
        ];
    }
}