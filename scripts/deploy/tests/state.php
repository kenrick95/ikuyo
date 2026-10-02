<?php

// Test the host-side script against a minimal Laravel bootstrap, with no real DB.
test('remote state compares incoming migrations with repository and recovery marker', function () {
    $work = fixture();
    try {
        mkdir("$work/vendor"); mkdir("$work/bootstrap"); mkdir("$work/storage/framework", 0700, true);
        file_put_contents("$work/vendor/autoload.php", '<?php');
        file_put_contents("$work/bootstrap/app.php", <<<'BOOTSTRAP'
<?php
return new class extends ArrayObject {
    public function __construct() {
        parent::__construct(['config' => new class {
            public function get($key) { return $key === 'queue.default' ? 'sync' : 'file'; }
        }]);
    }
    public function make($name) {
        if ($name === 'migration.repository') {
            return new class {
                public function repositoryExists() { return true; }
                public function getRan() { return ['old']; }
            };
        }
        return new class { public function bootstrap() {} };
    }
    public function maintenanceMode() {
        return new class { public function active() { return false; } };
    }
};
BOOTSTRAP);
        $args = [PHP_BINARY, dirname(__DIR__) . '/state.php', $work, base64_encode(json_encode(['old', 'new']))];
        $r = execute($args); healthy($r); $state = json_decode($r['stdout'], true);
        check($state['pending'] === ['new'] && $state['blocked'] === false, 'Wrong production state');
        touch("$work/storage/framework/ikuyo-deploy-incomplete");
        $r = execute($args); healthy($r);
        check(json_decode($r['stdout'], true)['blocked'] === true, 'Recovery marker ignored');
        file_put_contents("$work/bootstrap/app.php", '<?php throw new RuntimeException("SECRET DB PASSWORD");');
        $r = execute($args);
        check($r['status'] !== 0 && !str_contains($r['stderr'], 'SECRET DB PASSWORD'), 'State check leaked database details');
    } finally { removeFixture($work); }
});
