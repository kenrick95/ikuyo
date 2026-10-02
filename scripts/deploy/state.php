<?php

// Executed over SSH from the deployed backend, using the deployed app's DB config.
try {
    if (!chdir($argv[1])) {
        throw new RuntimeException('Deployed backend is missing.');
    }
    $incoming = json_decode(base64_decode($argv[2], true), true, 512, JSON_THROW_ON_ERROR);
    if (!is_array($incoming) || !$incoming) {
        throw new RuntimeException('Incoming migration manifest is empty or invalid.');
    }
    require getcwd() . '/vendor/autoload.php';
    $app = require getcwd() . '/bootstrap/app.php';
    $app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
    $repository = $app->make('migration.repository');
    $ran = $repository->repositoryExists() ? $repository->getRan() : [];
    $pending = array_values(array_diff($incoming, $ran));
    $blocked = $app->maintenanceMode()->active()
        || file_exists(getcwd() . '/storage/framework/ikuyo-deploy-incomplete');
    echo json_encode([
        'pending' => $pending,
        'blocked' => $blocked,
        'maintenance_driver' => $app['config']->get('app.maintenance.driver'),
        'queue_driver' => $app['config']->get('queue.default'),
    ], JSON_THROW_ON_ERROR) . PHP_EOL;
} catch (Throwable $error) {
    // Do not expose DB credentials in framework exception messages.
    fwrite(STDERR, "Cannot read production migration state; deployment stopped.\n");
    exit(1);
}
