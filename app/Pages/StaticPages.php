<?php

declare(strict_types=1);

namespace App\Pages;

/**
 * Known non-trip SPA routes and their metadata. `noindex` pages (login,
 * private user and tool pages) get a robots meta in the served <head>.
 */
final readonly class StaticPages
{
    /** @return array<string, array{title: string, description: string, noindex: bool}> */
    public function all(): array
    {
        return [
            '/' => ['title' => 'Ikuyo!', 'description' => 'Plan your next trip!', 'noindex' => false],
            '/landing' => ['title' => 'Ikuyo!', 'description' => 'Plan your next trip!', 'noindex' => false],
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
