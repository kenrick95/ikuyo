<?php

declare(strict_types=1);

namespace App\Routing;

use App\Config\Settings;
use App\Metadata\Renderer;
use App\Metadata\TagFactory;
use App\Metadata\Tags;
use App\Pages\StaticPages;
use App\Trip\PublicTrip;

/**
 * Front controller: bridges an HTTP request to the built SPA `index.html`,
 * injecting page-specific metadata where appropriate.
 */
final readonly class FrontController
{
    public function __construct(
        private Settings $settings,
        private PublicTrip $publicTrip,
        private TagFactory $tags,
        private Renderer $renderer,
        private StaticPages $staticPages,
    ) {
    }

    public static function boot(): self
    {
        $settings = new Settings();
        return new self(
            settings: $settings,
            publicTrip: new PublicTrip($settings),
            tags: TagFactory::with($settings),
            renderer: new Renderer(),
            staticPages: new StaticPages(),
        );
    }

    public function handle(): void
    {
        $this->debug('handle:start', ['method' => $_SERVER['REQUEST_METHOD'] ?? 'GET']);

        $html = $this->loadIndexHtml();
        if ($html === null) {
            $this->debug('handle:missing-index-html');
            $this->fail(503, 'Missing index.html');
            return;
        }

        $path = Path::requestPath();
        $this->debug('handle:path', ['path' => $path]);

        // Public trip routes get live trip metadata.
        $tripId = Path::tripIdFromPath($path);
        $this->debug('handle:trip-id', ['tripId' => $tripId ?? 'null']);
        if ($tripId !== null) {
            $trip = $this->publicTrip->find($tripId);
            $this->debug('handle:trip-resolved', ['tripId' => $tripId, 'found' => $trip !== null]);
            if ($trip !== null) {
                // No caching (and no `public`) so a trip that becomes private is
                // never served stale via a shared cache/CDN.
                $this->serve($html, $this->tags->forTrip($trip), 'no-store');
                return;
            }
        }

        // Known non-trip pages get their own title/metadata.
        $page = $this->staticPages->all()[$path] ?? null;
        $this->debug('handle:static-page', ['path' => $path, 'found' => $page !== null]);
        if ($page !== null) {
            $page['path'] = $path; // canonical points at the page itself
            $this->serve($html, $this->tags->forStaticPage($page), 'no-store, must-revalidate');
            return;
        }

        // Unknown routes, or private/missing trips: serve the SPA as-is.
        // `no-store, must-revalidate` matches the previous .htaccess policy for
        // index.html, so a deploy can't serve stale HTML/asset URLs.
        $this->debug('handle:fallback', ['path' => $path]);
        $this->serve($html, null, 'no-store, must-revalidate');
    }

    /** Emit a structured, single-line log entry when in development mode. */
    private function debug(string $event, array $context = []): void
    {
        if (!$this->settings->debug()) {
            return;
        }
        // Static assets hit the fallback branch every time; don't log them.
        if (Path::isStaticAsset(Path::requestPath())) {
            return;
        }
        $data = ['ts' => date('c'), 'event' => $event] + $context;
        $line = '[ikuyo] ' . json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        @error_log($line);
    }

    private function serve(string $html, ?Tags $tags, string $cacheControl): void
    {
        header('Cache-Control: ' . $cacheControl);
        header('Content-Type: text/html; charset=UTF-8');
        echo $tags === null ? $html : $this->renderer->inject($html, $tags);
    }

    private function fail(int $status, string $message): void
    {
        http_response_code($status);
        header('Content-Type: text/plain; charset=UTF-8');
        echo $message;
    }

    private function loadIndexHtml(): ?string
    {
        $html = @file_get_contents($this->settings->indexPath());
        return $html === false ? null : $html;
    }
}