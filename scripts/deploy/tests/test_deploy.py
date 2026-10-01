"""Run the real shell controller with fake remote/transport tools; never contact a host."""
import json
import os
from pathlib import Path
import subprocess
import shutil
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[3]
STUB = r'''#!/usr/bin/env python3
import json, os, pathlib, sys
name = pathlib.Path(sys.argv[0]).name
log = pathlib.Path(os.environ['TEST_LOG'])
command = sys.argv[-1] if name == 'ssh' else ' '.join(sys.argv[1:])
stdin = sys.stdin.read() if name == 'ssh' else ''
with log.open('a') as f:
    f.write(json.dumps({'tool': name, 'command': command, 'stdin': stdin}) + '\n')
fail = os.environ.get('FAIL_AT', '')
if name == 'gh':
    print(os.environ.get('LATEST_SHA', 'abc123'))
elif name == 'ssh' and 'php /dev/stdin' in command:
    counter = pathlib.Path(os.environ['TEST_COUNTER'])
    n = int(counter.read_text()) if counter.exists() else 0
    counter.write_text(str(n + 1))
    if fail == 'state' or (fail == 'verify' and n > 0):
        sys.exit(1)
    pending = ['2026_01_01_000001_create_trips'] if os.environ.get('PENDING') == 'true' and n == 0 else []
    if fail == 'remaining' and n > 0:
        pending = ['2026_01_01_000001_create_trips']
    print(json.dumps({'pending': pending, 'blocked': os.environ.get('BLOCKED') == 'true', 'maintenance_driver': os.environ.get('MAINTENANCE_DRIVER', 'file'), 'queue_driver': os.environ.get('QUEUE_DRIVER', 'sync')}))
elif name == 'ssh' and fail == 'lock' and command.startswith('mkdir '):
    sys.exit(1)
elif name == 'ssh' and fail == 'migrate' and 'php artisan migrate --force' in stdin:
    sys.exit(1)
elif name == 'rsync' and fail == 'upload':
    sys.exit(1)
elif name == 'curl':
    if fail == 'health':
        sys.exit(1)
    output = sys.argv[sys.argv.index('--output') + 1]
    pathlib.Path(output).write_text('<html>SPA</html>' if fail == 'html' else '{"data":[]}')
'''


@unittest.skipUnless(shutil.which('php'), 'PHP CLI is required for deployment controller tests')
class DeploymentTests(unittest.TestCase):
    def run_deploy(self, **settings):
        with tempfile.TemporaryDirectory() as directory:
            work = Path(directory)
            tools = work / 'bin'
            tools.mkdir()
            for name in ('ssh', 'rsync', 'gh', 'curl', 'sleep'):
                tool = tools / name
                tool.write_text(STUB)
                tool.chmod(0o755)
            migrations = work / 'dist/backend/database/migrations'
            migrations.mkdir(parents=True)
            (migrations / '2026_01_01_000001_create_trips.php').write_text('<?php')
            (work / '.gitignore').write_text('.env\n')
            (work / 'scripts').symlink_to(ROOT / 'scripts', target_is_directory=True)
            log = work / 'calls.jsonl'
            summary = work / 'summary.md'
            env = dict(os.environ, PATH=f'{tools}:{os.environ["PATH"]}',
                       DEPLOY_HOST='example.invalid', DEPLOY_PORT='22', DEPLOY_USER='deploy',
                       DEPLOY_TARGET='/srv/ikuyo with space',
                       DEPLOY_HEALTH_URL='https://example.invalid/api/trips/public',
                       GITHUB_SHA='abc123', GITHUB_REPOSITORY='owner/ikuyo',
                       DEPLOY_SSH_KEY='TEST KEY', TEST_LOG=str(log),
                       TEST_COUNTER=str(work / 'counter'), GITHUB_STEP_SUMMARY=str(summary),
                       ALLOW_MIGRATIONS='false', PENDING='false', BLOCKED='false', FAIL_AT='')
            env.update(settings)
            result = subprocess.run(['bash', str(ROOT / 'scripts/deploy/deploy.sh')],
                                    cwd=work, env=env, capture_output=True, text=True)
            calls = [json.loads(line) for line in log.read_text().splitlines()] if log.exists() else []
            return result, calls, summary.read_text() if summary.exists() else ''

    def test_no_pending_auto_upload_without_down_or_migrate(self):
        result, calls, _ = self.run_deploy()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue(any(c['tool'] == 'rsync' for c in calls))
        self.assertFalse(any('artisan down' in c['stdin'] or 'artisan migrate --force' in c['stdin'] for c in calls))

    def test_pending_from_any_merge_preserves_manual_gate(self):
        result, calls, summary = self.run_deploy(PENDING='true')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn('create_trips', summary)
        self.assertFalse(any(c['tool'] == 'rsync' or 'artisan down' in c['stdin'] for c in calls))

    def test_manual_migrates_between_down_and_up(self):
        result, calls, _ = self.run_deploy(PENDING='true', ALLOW_MIGRATIONS='true')
        self.assertEqual(result.returncode, 0, result.stderr)
        down = next(i for i, c in enumerate(calls) if 'artisan down' in c['stdin'])
        upload = next(i for i, c in enumerate(calls) if c['tool'] == 'rsync')
        migrate = next(i for i, c in enumerate(calls) if 'artisan migrate --force' in c['stdin'])
        up = next(i for i, c in enumerate(calls) if 'artisan up' in c['stdin'])
        self.assertLess(down, upload)
        self.assertLess(upload, migrate)
        self.assertLess(migrate, up)
        self.assertIn('header(\'Content-Type: application/json\')', calls[down + 1]['stdin'])

    def test_incomplete_deploy_cannot_be_bypassed_by_later_auto_merge(self):
        result, calls, summary = self.run_deploy(BLOCKED='true')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn('Manual deployment required', summary)
        self.assertFalse(any(c['tool'] == 'rsync' for c in calls))

    def test_manual_recovery_without_pending_migrations(self):
        result, calls, _ = self.run_deploy(BLOCKED='true', ALLOW_MIGRATIONS='true')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue(any('artisan up' in c['stdin'] for c in calls))

    def test_stale_build_never_changes_production(self):
        result, calls, _ = self.run_deploy(LATEST_SHA='newer', ALLOW_MIGRATIONS='true')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertFalse(any(c['tool'] == 'rsync' or 'artisan down' in c['stdin'] for c in calls))

    def test_preflight_failure_never_changes_production(self):
        for failure in ('state', 'lock'):
            with self.subTest(failure=failure):
                result, calls, _ = self.run_deploy(FAIL_AT=failure)
                self.assertNotEqual(result.returncode, 0)
                self.assertFalse(any(c['tool'] == 'rsync' or 'artisan down' in c['stdin'] for c in calls))

    def test_manual_failures_keep_maintenance_and_incomplete_marker(self):
        for failure in ('upload', 'migrate', 'verify', 'remaining', 'health', 'html'):
            with self.subTest(failure=failure):
                result, calls, _ = self.run_deploy(FAIL_AT=failure, PENDING='true', ALLOW_MIGRATIONS='true')
                self.assertNotEqual(result.returncode, 0)
                self.assertFalse(any(c['command'].startswith('rm ') and 'ikuyo-deploy-incomplete' in c['command'] for c in calls))
                self.assertIn('Maintenance remains enabled', result.stderr)
                if failure not in ('health', 'html'):
                    self.assertFalse(any('artisan up' in c['stdin'] for c in calls))
                else:
                    up = next(i for i, c in enumerate(calls) if 'artisan up' in c['stdin'])
                    self.assertTrue(any('artisan down' in c['stdin'] for c in calls[up + 1:]))

    def test_auto_upload_failure_retains_recovery_marker(self):
        result, calls, _ = self.run_deploy(FAIL_AT='upload')
        self.assertNotEqual(result.returncode, 0)
        self.assertTrue(any(c['command'].startswith('touch ') and 'ikuyo-deploy-incomplete' in c['command'] for c in calls))
        self.assertFalse(any(c['command'].startswith('rm ') and 'ikuyo-deploy-incomplete' in c['command'] for c in calls))

    def test_runtime_files_and_lock_excluded(self):
        _, calls, _ = self.run_deploy()
        rsync = next(c['command'] for c in calls if c['tool'] == 'rsync')
        for exclusion in ('/backend/.env', '/backend/storage/', '/backend/bootstrap/cache/*.php', '/backend/database/*.sqlite*', '/.ikuyo-deploy-lock/'):
            self.assertIn('--exclude=' + exclusion, rsync)
        self.assertNotIn('--delete', rsync)

    def test_unsupported_maintenance_or_worker_driver_stops_before_down(self):
        for setting in ({'MAINTENANCE_DRIVER': 'cache'}, {'QUEUE_DRIVER': 'database'}):
            with self.subTest(setting=setting):
                result, calls, _ = self.run_deploy(PENDING='true', ALLOW_MIGRATIONS='true', **setting)
                self.assertNotEqual(result.returncode, 0)
                self.assertFalse(any(c['tool'] == 'rsync' or 'artisan down' in c['stdin'] for c in calls))

    def test_host_commands_never_require_python(self):
        _, calls, _ = self.run_deploy(PENDING='true', ALLOW_MIGRATIONS='true')
        for call in calls:
            if call['tool'] == 'ssh':
                self.assertNotIn('python', call['command'])
                self.assertNotIn('python', call['stdin'])
