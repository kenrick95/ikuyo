<?php

declare(strict_types=1);

namespace App\Metadata;

/**
 * Immutable set of resolved metadata values for a page's <head>.
 */
final readonly class Tags
{
    public function __construct(
        public string $title,
        public string $description,
        public string $url,
        public string $image,
        public string $robots = '',
    ) {
    }
}