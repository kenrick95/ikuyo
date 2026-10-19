<?php

declare(strict_types=1);

// Run: php scripts/check-trip-jsonld.php
foreach (['Config/Settings', 'Metadata/DateRange', 'Metadata/Tags', 'Metadata/PageStructuredData', 'Metadata/TagFactory', 'Metadata/Renderer', 'Trip/TripMeta'] as $class) {
    require_once __DIR__ . '/../app/' . $class . '.php';
}

putenv('SITE_URL=https://ikuyo.example');
$payload = [['@context' => 'https://schema.org', '@type' => 'Trip', 'name' => '</script><script>alert("x")</script> & Tokyo']];
$trip = new App\Trip\TripMeta('trip', 'Trip', 0, 1, 'UTC', null, 0, $payload);
$factory = App\Metadata\TagFactory::with(new App\Config\Settings(__DIR__));
$tags = $factory->forTrip($trip);
$renderer = new App\Metadata\Renderer();
$html = $renderer->inject('<html><head><title>Ikuyo</title></head><body></body></html>', $tags);
if (substr_count($html, '<script') !== 1 || substr_count($html, '</script>') !== 1) {
    throw new RuntimeException('JSON-LD must not allow script injection.');
}
if (!preg_match('~<script id="ikuyo-page-jsonld" type="application/ld\+json">(.*?)</script>~s', $html, $matches)
    || array_slice(json_decode($matches[1], true, flags: JSON_THROW_ON_ERROR), -1) !== $payload) {
    throw new RuntimeException('Embedded JSON-LD must preserve the trip data.');
}
$tripGraph = json_decode($matches[1], true, flags: JSON_THROW_ON_ERROR);
if ($tripGraph[2]['mainEntity']['@id'] !== 'urn:ikuyo:trip:trip'
    || $tripGraph[2]['url'] !== 'https://ikuyo.example/trip/trip') {
    throw new RuntimeException('Trip pages must identify their canonical page and main trip.');
}
foreach (['/' => 'WebPage', '/landing' => 'WebPage', '/trip/public' => 'CollectionPage', '/privacy' => 'WebPage', '/terms' => 'WebPage'] as $path => $type) {
    $tags = $factory->forStaticPage(['path' => $path, 'title' => 'Public page', 'description' => 'Public description']);
    $graph = $tags->structuredData;
    if (array_column($graph, '@type') !== ['WebSite', 'WebApplication', $type]
        || $graph[2]['url'] !== 'https://ikuyo.example' . $path
        || $graph[2]['isPartOf']['@id'] !== $graph[0]['@id']) {
        throw new RuntimeException('Public page types and entity references must match the shared catalog.');
    }
}
foreach (['/login', '/trip', '/account/edit', '/admin', '/unknown'] as $path) {
    if ($factory->forStaticPage(['path' => $path])->structuredData !== []) {
        throw new RuntimeException('Private and unknown pages must not get public-page JSON-LD.');
    }
}
if ($factory->forStaticPage(['path' => '/', 'noindex' => true])->structuredData !== []) {
    throw new RuntimeException('Noindex pages must not get public-page JSON-LD.');
}
$generic = $renderer->metaHtml($factory->make('Title', 'Description', '/'));
if (str_contains($generic, 'application/ld+json')) {
    throw new RuntimeException('Generic pages must not contain trip JSON-LD.');
}
echo "Page and trip JSON-LD rendering checks passed.\n";
