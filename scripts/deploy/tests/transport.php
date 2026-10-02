#!/usr/bin/env php
<?php
// Fake transports used only by the PHP regression runner. Never contact a host.
$name = basename($argv[0]);
$args = $name === 'ssh' ? str_getcsv(end($argv), ' ', "'", '\\') : array_slice($argv, 1);
$command = implode(' ', $args);
$stdin = $name === 'ssh' ? stream_get_contents(STDIN) : '';
file_put_contents(getenv('TEST_LOG'), json_encode(compact('name', 'command', 'stdin', 'args')) . "\n", FILE_APPEND);
$failure = getenv('FAIL_AT');
if ($name === 'gh') {
    echo (getenv('LATEST_SHA') ?: 'abc123') . "\n";
} elseif ($name === 'ssh' && str_contains($command, 'php /dev/stdin')) {
    $counter = getenv('TEST_COUNTER');
    $n = is_file($counter) ? (int) file_get_contents($counter) : 0;
    file_put_contents($counter, (string) ($n + 1));
    if ($failure === 'state' || ($failure === 'verify' && $n > 0)) { exit(1); }
    $pending = getenv('PENDING') === 'true' && $n === 0 ? ['2026_01_01_000001_create_trips'] : [];
    if ($failure === 'remaining' && $n > 0) { $pending = ['new']; }
    echo json_encode(['pending' => $pending, 'blocked' => getenv('BLOCKED') === 'true',
        'maintenance_driver' => getenv('MAINTENANCE_DRIVER') ?: 'file',
        'queue_driver' => getenv('QUEUE_DRIVER') ?: 'sync']) . "\n";
} elseif ($name === 'ssh' && $failure === 'lock' && str_starts_with($command, 'mkdir ')) {
    exit(1);
} elseif ($name === 'ssh' && $failure === 'migrate' && str_contains($command, '/artisan migrate --force')) {
    exit(1);
} elseif ($name === 'rsync' && $failure === 'upload') {
    exit(1);
} elseif ($name === 'curl') {
    if ($failure === 'health') { exit(1); }
    file_put_contents($argv[array_search('--output', $argv, true) + 1],
        $failure === 'html' ? '<html>SPA fallback</html>' : '{"data":[]}');
}
