<?php

declare(strict_types=1);

// Runner-side helpers. The shared host only receives state.php and maintenance.php.
function productionState(string $json): array
{
    $decoded = json_decode($json, false, 512, JSON_THROW_ON_ERROR);
    if (!is_object($decoded)) {
        throw new RuntimeException('Invalid production deployment state.');
    }
    $state = get_object_vars($decoded);
    if (!is_array($state)
        || !isset($state['pending'], $state['blocked'])
        || !is_array($state['pending'])
        || !array_is_list($state['pending'])
        || !is_bool($state['blocked'])) {
        throw new RuntimeException('Invalid production deployment state.');
    }
    foreach ($state['pending'] as $name) {
        if (!is_string($name)) {
            throw new RuntimeException('Invalid migration name in deployment state.');
        }
    }
    return $state;
}

if (realpath($_SERVER['SCRIPT_FILENAME']) !== __FILE__) {
    return;
}

try {
    switch ($argv[1] ?? '') {
        case 'manifest':
            $files = glob('dist/backend/database/migrations/*.php');
            if (!$files) {
                throw new RuntimeException('No incoming migrations found; refusing deployment.');
            }
            $names = array_map(fn (string $file): string => pathinfo($file, PATHINFO_FILENAME), $files);
            sort($names, SORT_STRING);
            echo base64_encode(json_encode($names, JSON_THROW_ON_ERROR)) . PHP_EOL;
            break;

        case 'gate':
            $state = productionState($argv[2]);
            echo ($state['pending'] || $state['blocked'] ? 'true' : 'false') . PHP_EOL;
            break;

        case 'summary':
            foreach (productionState($argv[2])['pending'] as $name) {
                echo '- Pending migration: `' . $name . '`' . PHP_EOL;
            }
            break;

        case 'check-maintenance':
            $state = productionState($argv[2]);
            if (($state['maintenance_driver'] ?? null) !== 'file'
                || ($state['queue_driver'] ?? null) !== 'sync') {
                throw new RuntimeException('Require file maintenance and sync queues; drain workers separately otherwise.');
            }
            break;

        case 'verify':
            if (productionState($argv[2])['pending']) {
                throw new RuntimeException('Pending migrations remain; refusing to reopen production.');
            }
            break;

        case 'health':
            $response = json_decode(file_get_contents($argv[2]), false, 512, JSON_THROW_ON_ERROR);
            if (!is_object($response) || !isset($response->data) || !is_array($response->data)) {
                throw new RuntimeException('Expected the public trips API response.');
            }
            break;

        default:
            throw new RuntimeException('Unknown deployment helper command.');
    }
} catch (Throwable $error) {
    fwrite(STDERR, $error->getMessage() . PHP_EOL);
    exit(1);
}
