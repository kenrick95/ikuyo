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
        $html = $this->loadIndexHtml();
        if ($html === null) {
            $this->fail(503, 'Missing index.html');
            return;
        }

        $path = Path::requestPath();

        // Public trip routes get live trip metadata.
        $tripId = Path::tripIdFromPath($path);
        if ($tripId !== null) {
            $trip = $this->publicTrip->find($tripId);
            if ($trip !== null) {
                // No caching (and no `public`) so a trip that becomes private is
                // never served stale via a shared cache/CDN.
                $this->serve($html, $this->tags->forTrip($trip), 'no-store');
                return;
            }
        }

        // Known non-trip pages get their own title/metadata.
        $page = $this->staticPages->all()[$path] ?? null;
        if ($page !== null) {
            $page['path'] = $path; // canonical points at the page itself
            $this->serve($html, $this->tags->forStaticPage($page), 'no-store, must-revalidate');
            return;
        }

        // Unknown routes, or private/missing trips: serve the SPA as-is.
        // `no-store, must-revalidate` matches the previous .htaccess policy for
        // index.html, so a deploy can't serve stale HTML/asset URLs.
        $this->serve($html, null, 'no-store, must-revalidate');
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