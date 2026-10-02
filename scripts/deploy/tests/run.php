<?php

declare(strict_types=1);

$root = dirname(__DIR__, 3);
$passed = 0;
$failed = 0;
function check(bool $condition, string $message): void {
    if (!$condition) { throw new RuntimeException($message); }
}
function test(string $name, Closure $test): void {
    global $passed, $failed;
    try { $test(); echo "PASS $name\n"; $passed++; }
    catch (Throwable $error) { echo "FAIL $name: {$error->getMessage()}\n"; $failed++; }
}
function removeFixture(string $path): void {
    if (is_link($path) || is_file($path)) { unlink($path); return; }
    foreach (glob($path . '/*') ?: [] as $child) { removeFixture($child); }
    foreach (glob($path . '/.[!.]*') ?: [] as $child) { removeFixture($child); }
    rmdir($path);
}
function fixture(): string {
    $path = sys_get_temp_dir() . '/ikuyo-test-' . bin2hex(random_bytes(8));
    mkdir($path, 0700);
    return $path;
}
function execute(array $args, ?string $cwd = null, ?array $env = null): array {
    $out = tmpfile(); $err = tmpfile();
    $process = proc_open($args, [0 => ['file', '/dev/null', 'r'], 1 => $out, 2 => $err], $pipes, $cwd, $env);
    $status = proc_close($process);
    rewind($out); rewind($err);
    $result = ['status' => $status, 'stdout' => stream_get_contents($out), 'stderr' => stream_get_contents($err)];
    fclose($out); fclose($err);
    return $result;
}
function deploy(array $settings = []): array {
    global $root;
    $work = fixture();
    try {
        mkdir("$work/bin");
        foreach (['ssh', 'rsync', 'gh', 'curl', 'sleep'] as $tool) {
            copy(__DIR__ . '/transport.php', "$work/bin/$tool"); chmod("$work/bin/$tool", 0700);
        }
        mkdir("$work/dist/backend/database/migrations", 0700, true);
        file_put_contents("$work/dist/backend/database/migrations/2026_01_01_000001_create_trips.php", '<?php');
        file_put_contents("$work/.gitignore", ".env\n");
        $env = array_merge(getenv(), ['PATH' => "$work/bin:" . getenv('PATH'),
            'DEPLOY_HOST' => 'example.invalid', 'DEPLOY_PORT' => '22', 'DEPLOY_USER' => 'deploy',
            'DEPLOY_TARGET' => '/srv/ikuyo with space', 'DEPLOY_HEALTH_URL' => 'https://example.invalid/api/trips/public',
            'GITHUB_SHA' => 'abc123', 'GITHUB_REPOSITORY' => 'owner/ikuyo', 'DEPLOY_SSH_KEY' => 'TEST KEY',
            'TEST_LOG' => "$work/calls", 'TEST_COUNTER' => "$work/counter", 'GITHUB_STEP_SUMMARY' => "$work/summary",
            'ALLOW_MIGRATIONS' => 'false', 'PENDING' => 'false', 'BLOCKED' => 'false', 'FAIL_AT' => '',
            'MAINTENANCE_DRIVER' => 'file', 'QUEUE_DRIVER' => 'sync'], $settings);
        $result = execute([PHP_BINARY, "$root/scripts/deploy/deploy.php"], $work, $env);
        $result['calls'] = is_file("$work/calls") ? array_map(fn ($line) => json_decode($line, true, 512, JSON_THROW_ON_ERROR), file("$work/calls", FILE_IGNORE_NEW_LINES)) : [];
        $result['summary'] = is_file("$work/summary") ? file_get_contents("$work/summary") : '';
        return $result;
    } finally { removeFixture($work); }
}
function position(array $calls, string $text): int {
    foreach ($calls as $i => $call) { if (str_contains($call['command'], $text)) { return $i; } }
    return -1;
}
function healthy(array $result): void { check($result['status'] === 0, $result['stderr']); }

test('automatic upload without maintenance or migration', function () {
    $r = deploy(); healthy($r);
    check(position($r['calls'], '--protect-args') >= 0, 'Missing upload');
    check(position($r['calls'], '/artisan down') < 0 && position($r['calls'], '/artisan migrate') < 0, 'Unexpected downtime or migration');
});
foreach ([['PENDING' => 'true'], ['BLOCKED' => 'true']] as $state) {
    test('later merges preserve gate ' . json_encode($state), function () use ($state) {
        $r = deploy($state); healthy($r);
        check(str_contains($r['summary'], 'Manual deployment required'), 'Missing manual summary');
        check(position($r['calls'], '--protect-args') < 0 && position($r['calls'], '/artisan down') < 0, 'Changed production before authorization');
    });
}
test('manual migration order and direct PHP calls', function () {
    $r = deploy(['PENDING' => 'true', 'ALLOW_MIGRATIONS' => 'true']); healthy($r);
    $calls = $r['calls'];
    $down = position($calls, '/artisan down'); $upload = position($calls, '--protect-args');
    $migrate = position($calls, '/artisan migrate --force'); $up = position($calls, '/artisan up');
    check($down >= 0 && $down < $upload && $upload < $migrate && $migrate < $up, 'Incorrect deployment order');
    check(str_contains($calls[$down + 1]['stdin'], "header('Content-Type: application/json')"), 'Missing standalone maintenance handler');
    foreach ($calls as $call) {
        if ($call['name'] === 'ssh') {
            check(!str_contains($call['command'], 'bash') && !str_contains($call['command'], 'python'), 'Unexpected interpreter on host');
        }
    }
});
test('manual recovery with no pending migrations', function () {
    $r = deploy(['BLOCKED' => 'true', 'ALLOW_MIGRATIONS' => 'true']); healthy($r);
    check(position($r['calls'], '/artisan up') >= 0, 'Recovery did not reopen');
});
test('stale builds skip upload', function () {
    $r = deploy(['LATEST_SHA' => 'newer', 'ALLOW_MIGRATIONS' => 'true']); healthy($r);
    check(position($r['calls'], '--protect-args') < 0, 'Stale build uploaded');
});
foreach (['state', 'lock'] as $failure) {
    test("preflight $failure failure leaves production untouched", function () use ($failure) {
        $r = deploy(['FAIL_AT' => $failure]);
        check($r['status'] !== 0, 'Failure was ignored');
        check(position($r['calls'], '--protect-args') < 0 && position($r['calls'], '/artisan down') < 0, 'Changed production');
    });
}
foreach (['upload', 'migrate', 'verify', 'remaining', 'health', 'html'] as $failure) {
    test("manual $failure failure preserves recovery state", function () use ($failure) {
        $r = deploy(['FAIL_AT' => $failure, 'PENDING' => 'true', 'ALLOW_MIGRATIONS' => 'true']);
        check($r['status'] !== 0, 'Failure was ignored');
        check(position($r['calls'], 'rm -- /srv/ikuyo with space/backend/storage/framework/ikuyo-deploy-incomplete') < 0, 'Recovery marker removed');
        check(str_contains($r['stderr'], 'Maintenance remains enabled'), 'Maintenance not retained');
        $up = position($r['calls'], '/artisan up');
        if (in_array($failure, ['health', 'html'], true)) {
            check($up >= 0 && position(array_slice($r['calls'], $up + 1), '/artisan down') >= 0, 'Failed to restore maintenance');
        } else { check($up < 0, 'Reopened failed deploy'); }
    });
}
test('automatic upload failure retains marker', function () {
    $r = deploy(['FAIL_AT' => 'upload']);
    check($r['status'] !== 0 && position($r['calls'], 'touch --') >= 0 && position($r['calls'], 'rm --') < 0, 'Missing recovery marker');
});
test('runtime files preserved by rsync', function () {
    $r = deploy(); healthy($r); $upload = $r['calls'][position($r['calls'], '--protect-args')]['command'];
    foreach (['/backend/.env', '/backend/storage/', '/backend/bootstrap/cache/*.php', '/backend/database/*.sqlite*', '/.ikuyo-deploy-lock/'] as $exclude) {
        check(str_contains($upload, '--exclude=' . $exclude), 'Missing exclusion ' . $exclude);
    }
    check(!str_contains($upload, '--delete'), 'Unexpected deletion');
});
foreach ([['MAINTENANCE_DRIVER' => 'cache'], ['QUEUE_DRIVER' => 'database']] as $setting) {
    test('unsupported driver fails before down ' . json_encode($setting), function () use ($setting) {
        $r = deploy($setting + ['PENDING' => 'true', 'ALLOW_MIGRATIONS' => 'true']);
        check($r['status'] !== 0 && position($r['calls'], '/artisan down') < 0, 'Unsafe maintenance setup');
    });
}

function helper(string $command, ?string $argument = null, ?string $cwd = null): array {
    global $root;
    $args = [PHP_BINARY, "$root/scripts/deploy/runner.php", $command];
    if ($argument !== null) { $args[] = $argument; }
    return execute($args, $cwd ?? $root);
}
test('manifest contains all migrations in order and rejects empty build', function () {
    $work = fixture();
    try {
        check(helper('manifest', cwd: $work)['status'] !== 0, 'Empty build accepted');
        mkdir("$work/dist/backend/database/migrations", 0700, true);
        foreach (['new.php', 'old.php', 'README.md'] as $name) { touch("$work/dist/backend/database/migrations/$name"); }
        $r = helper('manifest', cwd: $work); healthy($r);
        check(json_decode(base64_decode(trim($r['stdout'])), true) === ['new', 'old'], 'Wrong manifest');
    } finally { removeFixture($work); }
});
test('malformed migration state fails closed', function () {
    foreach (['bad JSON', '{}', '{"pending":[],"blocked":"false"}', '{"pending":[42],"blocked":false}', '{"pending":{},"blocked":false}'] as $state) {
        foreach (['gate', 'verify'] as $command) { check(helper($command, $state)['status'] !== 0, 'Invalid state accepted'); }
    }
});
test('gate reflects pending migrations and recovery state', function () {
    foreach ([[[], false, 'false'], [['new'], false, 'true'], [[], true, 'true']] as [$pending, $blocked, $expected]) {
        $state = json_encode(compact('pending', 'blocked')); $r = helper('gate', $state); healthy($r);
        check(trim($r['stdout']) === $expected, 'Incorrect gate');
        check((helper('verify', $state)['status'] === 0) === ($pending === []), 'Incorrect verification');
    }
});
test('health requires public trips JSON', function () {
    $work = fixture();
    try {
        foreach (['{"data":[]}' => true, '{"data":{}}' => false, '{"message":"down"}' => false, '[]' => false, '<html>SPA</html>' => false] as $data => $valid) {
            file_put_contents("$work/response", $data);
            check((helper('health', "$work/response")['status'] === 0) === $valid, 'Incorrect health result');
        }
    } finally { removeFixture($work); }
});
test('maintenance blocks JSON before framework loads', function () {
    $work = fixture();
    try {
        copy(dirname(__DIR__) . '/maintenance.php', "$work/maintenance.php"); touch("$work/down");
        $r = execute([PHP_BINARY, "$work/maintenance.php"], env: array_merge(getenv(), ['HTTP_ACCEPT' => 'application/json'])); healthy($r);
        check(str_contains(json_decode($r['stdout'], true)['message'], 'being updated'), 'Maintenance bypassed');
    } finally { removeFixture($work); }
});

require __DIR__ . "/state.php";

echo "$passed passed; $failed failed\n";
exit($failed ? 1 : 0);
