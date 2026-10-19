<?php

declare(strict_types=1);

// Run: php scripts/check-trip-jsonld.php
foreach (['Config/Settings', 'Metadata/DateRange', 'Metadata/Tags', 'Metadata/TagFactory', 'Metadata/Renderer', 'Trip/TripMeta'] as $class) {
    require_once __DIR__ . '/../app/' . $class . '.php';
}

$payload = [['@context' => 'https://schema.org', '@type' => 'Trip', 'name' => '</script><script>alert("x")</script> & Tokyo']];
$trip = new App\Trip\TripMeta('trip', 'Trip', 0, 1, 'UTC', null, 0, $payload);
$factory = App\Metadata\TagFactory::with(new App\Config\Settings(__DIR__));
$tags = $factory->forTrip($trip);
$renderer = new App\Metadata\Renderer();
$html = $renderer->inject('<html><head><title>Ikuyo</title></head><body></body></html>', $tags);
if (substr_count($html, '<script') !== 1 || substr_count($html, '</script>') !== 1) {
    throw new RuntimeException('JSON-LD must not allow script injection.');
}
if (!preg_match('~<script id="ikuyo-trip-jsonld" type="application/ld\+json">(.*?)</script>~s', $html, $matches)
    || json_decode($matches[1], true, flags: JSON_THROW_ON_ERROR) !== $payload) {
    throw new RuntimeException('Embedded JSON-LD must preserve the trip data.');
}
$generic = $renderer->metaHtml($factory->make('Title', 'Description', '/'));
if (str_contains($generic, 'application/ld+json')) {
    throw new RuntimeException('Generic pages must not contain trip JSON-LD.');
}
echo "Trip JSON-LD rendering checks passed.\n";
