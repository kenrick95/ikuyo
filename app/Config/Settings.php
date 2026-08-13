<?php

declare(strict_types=1);

namespace App\Config;

/**
 * Resolves configuration from a gitignored `config.php` file or environment
 * variables (environments take precedence).
 */
final readonly class Settings
{
    /** @var array<string,string> */
    private array $values;

    public function __construct(?string $dir = null)
    {
        $dir ??= dirname(__DIR__, 2);
        $file = [];
        $configPath = $dir . '/config.php';
        if (is_file($configPath)) {
            $file = (array) require $configPath;
        }
        $this->values = $file;
    }

    public function get(string $key, string $default = ''): string
    {
        $value = getenv($key) ?: ($this->values[$key] ?? $default);
        return is_string($value) ? $value : $default;
    }

    public function appId(): string
    {
        return $this->get('INSTANT_APP_ID');
    }

    public function adminToken(): string
    {
        return $this->get('INSTANT_ADMIN_TOKEN')
            ?: $this->get('INSTANT_APP_ADMIN_TOKEN');
    }

    /** Full admin query URL (base optional, defaulting to Instant's API). */
    public function adminQueryUri(): string
    {
        $uri = $this->get('INSTANT_API_URI', 'https://api.instantdb.com');
        return rtrim($uri, '/') . '/admin/query';
    }

    public function siteUrl(): string
    {
        return rtrim($this->get('SITE_URL'), '/') ?: '';
    }

    public function indexPath(): string
    {
        return $this->get('INDEX_HTML', dirname(__DIR__, 2) . '/index.html');
    }
}