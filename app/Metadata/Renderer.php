<?php

declare(strict_types=1);

namespace App\Metadata;

/**
 * Renders a {@see Tags} value into <head> meta tags and injects them into the
 * built SPA `index.html`.
 */
final class Renderer
{
    /** Render the tags as the shared <meta> block (title/desc/OG/Twitter). */
    public function metaHtml(Tags $tags): string
    {
        $t = $this->esc($tags->title);
        $d = $this->esc($tags->description);
        $u = $this->esc($tags->url);
        $i = $this->esc($tags->image);

        $lines = [
            '<meta name="description" content="' . $d . '" />',
            '<meta name="twitter:card" content="summary" />',
            '<meta name="twitter:title" content="' . $t . '" />',
            '<meta name="twitter:description" content="' . $d . '" />',
            '<meta name="twitter:image" content="' . $i . '" />',
            '<meta property="og:type" content="website" />',
            '<meta property="og:title" content="' . $t . '" />',
            '<meta property="og:description" content="' . $d . '" />',
            '<meta property="og:url" content="' . $u . '" />',
            '<meta property="og:image" content="' . $i . '" />',
        ];
        if ($tags->robots !== '') {
            array_unshift($lines, '<meta name="robots" content="' . $this->esc($tags->robots) . '" />');
        }
        return implode("\n    ", $lines);
    }

    /** Inject resolved metadata into the given SPA HTML document. */
    public function inject(string $html, Tags $tags): string
    {
        // Update the real <title> (the SPA's own title is the generic "Ikuyo!").
        $html = preg_replace(
            '/<title[^>]*>.*?<\/title>/is',
            '<title>' . $this->esc($tags->title) . '</title>',
            $html,
            1,
        );

        // Drop conflicting generic social/description tags so we don't emit both
        // page-specific and fallback metadata (scrapers take the first occurrence).
        $html = preg_replace(
            '/<meta[^>]*(?:name="(?:description|twitter:(?:title|description|image|card))"|property="og:(?:title|description|url|image|type)")[^>]*>\s*/i',
            '',
            $html,
        );

        // Point canonical at the page URL.
        $html = preg_replace(
            '/<link rel="canonical"[^>]*>/i',
            '<link rel="canonical" href="' . $this->esc($tags->url) . '" />',
            $html,
            1,
        );

        // Inject the meta block right before canonical (or a later valid
        // insertion point, then </head>/</body>/</html>).
        $needle = '<link rel="canonical"';
        $pos = strpos($html, $needle);
        if ($pos === false) {
            foreach (['</head>', '</body>', '</html>'] as $tag) {
                $pos = strpos($html, $tag);
                if ($pos !== false) {
                    $needle = $tag;
                    break;
                }
            }
        }
        if ($pos === false) {
            // No safe insertion point: don't corrupt the document.
            return $html;
        }
        $block = $this->metaHtml($tags) . "\n    " . $needle;
        return substr_replace($html, $block, $pos, strlen($needle));
    }

    private function esc(string $value): string
    {
        return htmlspecialchars($value, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    }
}