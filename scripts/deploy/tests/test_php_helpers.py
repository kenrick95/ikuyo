"""Exercise the PHP deployment helpers without Laravel or a production database."""
import base64
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[3]
PHP = shutil.which('php')


@unittest.skipUnless(PHP, 'PHP CLI is required for deployment helper tests')
class PhpHelperTests(unittest.TestCase):
    def invoke(self, command, argument=None, cwd=ROOT):
        args = [PHP, str(ROOT / 'scripts/deploy/runner.php'), command]
        if argument is not None:
            args.append(argument)
        return subprocess.run(args, cwd=cwd, capture_output=True, text=True)

    def test_manifest_contains_every_incoming_migration_in_order(self):
        with tempfile.TemporaryDirectory() as directory:
            migrations = Path(directory) / 'dist/backend/database/migrations'
            migrations.mkdir(parents=True)
            for name in ('2026_02_01_000001_new.php', '2026_01_01_000001_old.php', 'README.md'):
                (migrations / name).write_text('')
            result = self.invoke('manifest', cwd=directory)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(json.loads(base64.b64decode(result.stdout)),
                             ['2026_01_01_000001_old', '2026_02_01_000001_new'])

    def test_empty_manifest_fails(self):
        with tempfile.TemporaryDirectory() as directory:
            self.assertNotEqual(self.invoke('manifest', cwd=directory).returncode, 0)

    def test_gate_and_verify_fail_closed_on_malformed_state(self):
        for state in ('not JSON', '{}', '{"pending":[],"blocked":"false"}',
                      '{"pending":[42],"blocked":false}', '{"pending":{},"blocked":false}'):
            for command in ('gate', 'verify'):
                with self.subTest(state=state, command=command):
                    result = self.invoke(command, state)
                    self.assertNotEqual(result.returncode, 0)

    def test_applied_state_allows_auto_but_pending_or_blocked_requires_manual(self):
        for pending, blocked, expected in (([], False, 'false'), (['new'], False, 'true'), ([], True, 'true')):
            state = json.dumps({'pending': pending, 'blocked': blocked})
            result = self.invoke('gate', state)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(result.stdout.strip(), expected)
            self.assertEqual(self.invoke('verify', state).returncode == 0, not pending)

    def test_health_requires_public_trips_response_shape(self):
        with tempfile.TemporaryDirectory() as directory:
            response = Path(directory) / 'response.json'
            for data, expected in (({'data': []}, True), ({'data': {}}, False),
                                   ({'message': 'down'}, False), ([], False), (None, False)):
                response.write_text(json.dumps(data))
                result = self.invoke('health', str(response))
                self.assertEqual(result.returncode == 0, expected, result.stderr)
            response.write_text('<html>SPA fallback</html>')
            self.assertNotEqual(self.invoke('health', str(response)).returncode, 0)

    def test_remote_state_reads_repository_not_deployed_migration_files(self):
        # Minimal Laravel bootstrap fixture: repository contains only the old migration.
        with tempfile.TemporaryDirectory() as directory:
            backend = Path(directory)
            (backend / 'vendor').mkdir()
            (backend / 'bootstrap').mkdir()
            (backend / 'storage/framework').mkdir(parents=True)
            (backend / 'vendor/autoload.php').write_text('<?php\n')
            (backend / 'bootstrap/app.php').write_text('''<?php
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
''')
            manifest = base64.b64encode(json.dumps(['old', 'new']).encode()).decode()
            args = [PHP, str(ROOT / 'scripts/deploy/state.php'), directory, manifest]
            result = subprocess.run(args, capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(json.loads(result.stdout)['pending'], ['new'])
            self.assertFalse(json.loads(result.stdout)['blocked'])
            (backend / 'storage/framework/ikuyo-deploy-incomplete').touch()
            result = subprocess.run(args, capture_output=True, text=True)
            self.assertTrue(json.loads(result.stdout)['blocked'])

    def test_maintenance_blocks_json_without_loading_framework(self):
        with tempfile.TemporaryDirectory() as directory:
            handler = Path(directory) / 'maintenance.php'
            shutil.copy(ROOT / 'scripts/deploy/maintenance.php', handler)
            (Path(directory) / 'down').touch()
            env = dict(os.environ, HTTP_ACCEPT='application/json')
            result = subprocess.run([PHP, str(handler)], env=env, capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn('being updated', json.loads(result.stdout)['message'])
