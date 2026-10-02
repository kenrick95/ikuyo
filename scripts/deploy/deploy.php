<?php

declare(strict_types=1);

require __DIR__ . '/runner.php';

/** Execute an argument array without a local shell, optionally streaming PHP to SSH. */
function command(array $arguments, string $input = '', bool $capture = false): string
{
    $stdin = tmpfile();
    $stdout = $capture ? tmpfile() : STDOUT;
    fwrite($stdin, $input);
    rewind($stdin);
    $process = proc_open($arguments, [0 => $stdin, 1 => $stdout, 2 => STDERR], $pipes);
    if (!is_resource($process)) {
        throw new RuntimeException('Cannot start ' . $arguments[0]);
    }
    $status = proc_close($process);
    fclose($stdin);
    $result = '';
    if ($capture) {
        rewind($stdout);
        $result = stream_get_contents($stdout);
        fclose($stdout);
    }
    if ($status !== 0) {
        throw new RuntimeException($arguments[0] . ' failed with exit status ' . $status);
    }
    return trim($result);
}

function requiredVariable(string $name): string
{
    $value = getenv($name);
    if ($value === false || $value === '') {
        throw new RuntimeException('Missing ' . $name);
    }
    return $value;
}

$key = null;
$healthResponse = null;
$locked = false;
$maintenance = false;
$success = false;
$remote = null;
$artisan = null;
$installMaintenance = null;
$lock = null;

// Shutdown also covers a catchable runner cancellation and unexpected PHP errors.
register_shutdown_function(function () use (&$key, &$healthResponse, &$locked, &$maintenance,
    &$success, &$remote, &$artisan, &$installMaintenance, &$lock): void {
    if (!$success && $maintenance) {
        fwrite(STDERR, "Deployment failed. Maintenance remains enabled; rerun manually after inspecting the failure.\n");
        try {
            $artisan('down', '--retry=60');
            $installMaintenance();
        } catch (Throwable $error) {
            fwrite(STDERR, "Could not restore maintenance; inspect production over SSH.\n");
        }
    }
    $unlockFailed = false;
    if ($locked) {
        try {
            $remote(['rmdir', '--', $lock]);
        } catch (Throwable $error) {
            fwrite(STDERR, "Could not release deployment lock; manual cleanup required.\n");
            $unlockFailed = true;
        }
    }
    foreach ([$key, $healthResponse] as $temporary) {
        if ($temporary !== null && is_file($temporary)) {
            unlink($temporary);
        }
    }
    if ($unlockFailed) {
        exit(1);
    }
});

try {
    $host = requiredVariable('DEPLOY_HOST');
    $port = requiredVariable('DEPLOY_PORT');
    $user = requiredVariable('DEPLOY_USER');
    $target = requiredVariable('DEPLOY_TARGET');
    $url = requiredVariable('DEPLOY_HEALTH_URL');
    $sha = requiredVariable('GITHUB_SHA');
    $repository = requiredVariable('GITHUB_REPOSITORY');
    $authorization = getenv('ALLOW_MIGRATIONS') ?: 'false';
    $drain = getenv('DEPLOY_DRAIN_SECONDS') ?: '30';
    if (!in_array($authorization, ['true', 'false'], true)
        || !str_starts_with($target, '/') || trim($target, '/') === ''
        || !preg_match('~^https://[^/]+/.*api/trips/public$~', $url)
        || !preg_match("/^[0-9]+$/D", $drain)) {
        throw new RuntimeException('Invalid deployment configuration.');
    }
    if (!function_exists('pcntl_async_signals')) {
        throw new RuntimeException('Runner PHP requires pcntl for cancellation cleanup.');
    }
    pcntl_async_signals(true);
    pcntl_signal(SIGINT, fn () => exit(130));
    pcntl_signal(SIGTERM, fn () => exit(143));

    $key = tempnam(sys_get_temp_dir(), 'ikuyo-key-');
    chmod($key, 0600);
    file_put_contents($key, requiredVariable('DEPLOY_SSH_KEY') . "\n");
    putenv('DEPLOY_SSH_KEY');
    $healthResponse = tempnam(sys_get_temp_dir(), 'ikuyo-health-');
    $ssh = ['ssh', '-i', $key, '-p', $port, '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=20',
        '-o', 'ServerAliveInterval=15', '-o', 'ServerAliveCountMax=3',
        '-o', 'UserKnownHostsFile=/dev/null', '-o', 'StrictHostKeyChecking=no'];
    $remote = function (array $arguments, string $input = '', bool $capture = false) use ($ssh, $user, $host): string {
        return command([...$ssh, "$user@$host", implode(' ', array_map('escapeshellarg', $arguments))], $input, $capture);
    };
    $backend = rtrim($target, '/') . '/backend';
    $lock = rtrim($target, '/') . '/.ikuyo-deploy-lock';
    $artisan = fn (string ...$arguments) => $remote(['php', "$backend/artisan", ...$arguments]);
    $installMaintenance = fn () => $remote(['php', '-r',
        'if (file_put_contents($argv[1], stream_get_contents(STDIN)) === false) { exit(1); }',
        "$backend/storage/framework/maintenance.php"], file_get_contents(__DIR__ . '/maintenance.php'));

    $remote(['mkdir', '--', $lock]);
    $locked = true;
    $latest = command(['gh', 'api', "repos/$repository/git/ref/heads/main", '--jq', '.object.sha'], capture: true);
    if ($latest !== $sha) {
        echo "Skipping stale build: deploy the latest main workflow instead.\n";
        $success = true;
        exit(0);
    }
    $files = glob('dist/backend/database/migrations/*.php');
    if (!$files) {
        throw new RuntimeException('No incoming migrations found; refusing deployment.');
    }
    $names = array_map(fn (string $file) => pathinfo($file, PATHINFO_FILENAME), $files);
    sort($names, SORT_STRING);
    $manifest = base64_encode(json_encode($names, JSON_THROW_ON_ERROR));
    $readState = fn () => productionState($remote(['php', '/dev/stdin', $backend, $manifest],
        file_get_contents(__DIR__ . '/state.php'), true));
    $state = $readState();
    $needsManual = $state['pending'] !== [] || $state['blocked'];
    if ($needsManual && $authorization !== 'true') {
        echo "Production unchanged: pending migrations or an incomplete deployment require a manual run.\n";
        if ($summary = getenv('GITHUB_STEP_SUMMARY')) {
            $text = "### Manual deployment required\n\nProduction has not been changed. Run **Testing → Run workflow** on **main**, with **Authorize migrations / recovery** checked.\n\nThis authorization covers the complete incoming build, including migrations from earlier merges.\n";
            foreach ($state['pending'] as $name) {
                $text .= '- Pending migration: `' . $name . "`\n";
            }
            if (file_put_contents($summary, $text, FILE_APPEND) === false) {
                throw new RuntimeException('Cannot write deployment summary.');
            }
        }
        $success = true;
        exit(0);
    }
    if ($needsManual) {
        if (($state['maintenance_driver'] ?? null) !== 'file' || ($state['queue_driver'] ?? null) !== 'sync') {
            throw new RuntimeException('Require file maintenance and sync queues; drain workers separately otherwise.');
        }
        $maintenance = true;
        $artisan('down', '--render=errors::503', '--retry=60');
        $installMaintenance();
        command(['sleep', $drain]);
    }
    $marker = "$backend/storage/framework/ikuyo-deploy-incomplete";
    $remote(['touch', '--', $marker]);
    command(['rsync', '-avz', '--protect-args', '--delay-updates', '--exclude-from=.gitignore',
        '--exclude=/.git/', '--exclude=/.github/', '--exclude=/backend/.env', '--exclude=/backend/storage/',
        '--exclude=/backend/bootstrap/cache/*.php', '--exclude=/backend/database/*.sqlite*',
        '--exclude=/.ikuyo-deploy-lock/', '-e', implode(' ', array_map('escapeshellarg', $ssh)),
        './dist/', "$user@$host:$target/"]);
    $artisan('optimize:clear');
    $artisan('package:discover', '--ansi');
    if ($maintenance) {
        $artisan('migrate', '--force');
    }
    $artisan('optimize');
    if ($readState()['pending'] !== []) {
        throw new RuntimeException('Pending migrations remain; refusing to reopen production.');
    }
    if ($maintenance) {
        $artisan('up');
    }
    command(['curl', '--fail', '--silent', '--show-error', '--max-time', '30', '-H', 'Accept: application/json',
        '--output', $healthResponse, $url]);
    $response = json_decode(file_get_contents($healthResponse), false, 512, JSON_THROW_ON_ERROR);
    if (!is_object($response) || !isset($response->data) || !is_array($response->data)) {
        throw new RuntimeException('Expected the public trips API response.');
    }
    $remote(['rm', '--', $marker]);
    $success = true;
    echo "Deployed $sha successfully.\n";
} catch (Throwable $error) {
    fwrite(STDERR, $error->getMessage() . "\n");
    exit(1);
}
