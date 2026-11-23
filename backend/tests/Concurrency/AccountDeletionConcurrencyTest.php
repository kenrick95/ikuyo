<?php

namespace Tests\Concurrency;

use App\Http\Controllers\Api\AdminController;
use App\Http\Middleware\SerializeTripLifecycle;
use App\Models\Activity;
use App\Models\Trip;
use App\Models\User;
use App\Services\AccountDeletionService;
use App\Services\ExpenseLedgerService;
use App\Services\TripPeopleService;
use Closure;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Http\Request;
use Illuminate\Routing\Route;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use PHPUnit\Framework\Attributes\DataProvider;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Tests\TestCase;
use Throwable;

class AccountDeletionConcurrencyTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        if (DB::getDriverName() !== 'mariadb' || ! function_exists('pcntl_fork')) {
            $this->markTestSkipped('Requires MariaDB, pcntl, and a disposable database (migrate:fresh).');
        }
        $this->artisan('migrate:fresh', ['--force' => true])->assertExitCode(0);
    }

    public function test_deletion_cleans_up_a_write_committed_while_it_waited(): void
    {
        $owner = $this->user();
        $writer = $this->user();
        $trip = $this->trip($owner);
        $activityId = (string) Str::uuid();
        $result = $this->race(
            fn () => app(AccountDeletionService::class)->delete($owner),
            fn (Closure $wait) => $this->write($writer, $trip, function () use ($trip, $activityId, $wait) {
                $wait();
                Activity::create(['id' => $activityId, 'trip_id' => $trip->id, 'title' => 'Concurrent', 'location' => 'Tokyo']);
            }),
        );
        $this->assertSame('ok', $result);
        $this->assertSoftDeleted('activities', ['id' => $activityId]);
        $this->assertDatabaseHas('sync_events', ['entity_id' => $activityId, 'operation' => 'delete', 'trip_id' => $trip->id]);
    }

    public function test_a_write_waiting_for_deletion_rejects_the_deleted_trip(): void
    {
        $owner = $this->user();
        $writer = $this->user();
        $trip = $this->trip($owner);
        $result = $this->race(
            fn () => $this->write($writer, $trip, fn () => Activity::create(['id' => Str::uuid(), 'trip_id' => $trip->id, 'title' => 'Too late', 'location' => 'Tokyo'])),
            function (Closure $wait) use ($owner) {
                $this->afterLock('trips', $wait);
                app(AccountDeletionService::class)->delete($owner);
            },
        );
        $this->assertSame('http:404', $result);
        $this->assertDatabaseCount('activities', 0);
    }

    public function test_deletion_rechecks_ownership_after_waiting_with_an_existing_snapshot(): void
    {
        $owner = $this->user();
        $nextOwner = $this->user();
        $trip = $this->trip($owner);
        $result = $this->race(
            fn () => DB::transaction(function () use ($owner) {
                // Establish a REPEATABLE READ snapshot before the locking reads.
                Trip::count();
                app(AccountDeletionService::class)->delete($owner);
            }),
            fn (Closure $wait) => $this->write($nextOwner, $trip, function () use ($trip, $owner, $nextOwner, $wait) {
                $wait();
                DB::table('trip_user')->where('trip_id', $trip->id)->where('user_id', $owner->id)->update(['user_id' => $nextOwner->id]);
            }),
        );
        $this->assertSame('ok', $result);
        $this->assertSoftDeleted('users', ['id' => $owner->id]);
        $this->assertNotSoftDeleted('trips', ['id' => $trip->id]);
    }

    public function test_simultaneous_administrator_deletions_leave_one_active_admin(): void
    {
        $first = $this->user('admin');
        $second = $this->user('admin');
        $result = $this->race(
            fn () => app(AccountDeletionService::class)->delete($second),
            function (Closure $wait) use ($first) {
                $this->afterLock('users', $wait);
                app(AccountDeletionService::class)->delete($first);
            },
        );
        $this->assertSame('http:409', $result);
        $this->assertSame(1, User::where('role', 'admin')->count());
        $this->assertNotSoftDeleted('users', ['id' => $second->id]);
    }

    public function test_restoration_waits_for_account_deletion_to_commit(): void
    {
        $user = $this->user();
        $trip = $this->trip($user);
        $result = $this->race(
            fn () => app(AdminController::class)->restoreUser($user->id),
            fn (Closure $wait) => DB::transaction(function () use ($user, $wait) {
                app(AccountDeletionService::class)->delete($user);
                $wait();
            }),
        );
        $this->assertSame('ok', $result);
        $this->assertNotSoftDeleted('users', ['id' => $user->id]);
        $this->assertSoftDeleted('trips', ['id' => $trip->id]);
    }

    public function test_role_demotion_waiting_for_deletion_preserves_the_last_admin(): void
    {
        $first = $this->user('admin');
        $second = $this->user('admin');
        $result = $this->race(
            function () use ($second) {
                $this->assertSame(1, Artisan::call('user:set-role', ['email' => $second->email, 'role' => 'user']));
                $this->assertStringContainsString('The last administrator cannot be demoted.', Artisan::output());
            },
            function (Closure $wait) use ($first) {
                $this->afterLock('users', $wait);
                app(AccountDeletionService::class)->delete($first);
            },
        );
        $this->assertSame('ok', $result);
        $this->assertSoftDeleted('users', ['id' => $first->id]);
        $this->assertTrue($second->fresh()->isAdmin());
    }

    public function test_account_deletion_waiting_for_demotion_preserves_the_last_admin(): void
    {
        $first = $this->user('admin');
        $second = $this->user('admin');
        $result = $this->race(
            fn () => app(AccountDeletionService::class)->delete($first),
            function (Closure $wait) use ($second) {
                $this->afterLock('users', $wait);
                $this->assertSame(0, Artisan::call('user:set-role', ['email' => $second->email, 'role' => 'user']));
            },
        );
        $this->assertSame('http:409', $result);
        $this->assertNotSoftDeleted('users', ['id' => $first->id]);
        $this->assertTrue($first->fresh()->isAdmin());
        $this->assertFalse($second->fresh()->isAdmin());
    }

    public static function adminTripMutations(): array
    {
        return [
            'delete trip' => ['DELETE', false, false],
            'restore trip' => ['POST', false, true],
            'delete content' => ['DELETE', true, false],
            'restore content' => ['POST', true, true],
        ];
    }

    #[DataProvider('adminTripMutations')]
    public function test_admin_mutations_acquire_the_trip_lifecycle_lock(string $method, bool $content, bool $restore): void
    {
        $admin = $this->user('admin');
        $trip = $this->trip($this->user());
        $activity = Activity::create(['id' => Str::uuid(), 'trip_id' => $trip->id, 'title' => 'Activity', 'location' => 'Tokyo']);
        $target = $content ? $activity : $trip;
        if ($restore) {
            $target->delete();
        }
        $uri = '/api/admin/trips/' . $trip->id
            . ($content ? '/content/activities/' . $activity->id : '')
            . ($restore ? '/restore' : '');
        $result = $this->race(
            function () use ($admin, $method, $uri) {
                $locked = false;
                $this->afterLock('trips', function () use (&$locked) {
                    $locked = true;
                });
                $this->actingAs($admin)->json($method, $uri)->assertOk();
                $this->assertTrue($locked, 'Admin mutations must acquire the shared trip lock.');
            },
            fn (Closure $wait) => DB::transaction(function () use ($trip, $wait) {
                Trip::withTrashed()->whereKey($trip->id)->lockForUpdate()->firstOrFail();
                $wait();
            }),
        );
        $this->assertSame('ok', $result);
        if ($restore) {
            $this->assertNotSoftDeleted($target->getTable(), ['id' => (string) $target->id]);
        } else {
            $this->assertSoftDeleted($target->getTable(), ['id' => (string) $target->id]);
        }
    }

    public function test_trip_read_blocks_financial_writes_until_all_snapshot_queries_finish(): void
    {
        $owner = $this->user();
        $trip = $this->trip($owner);
        $result = $this->race(
            fn () => $this->write($owner, $trip, fn () => $this->financialRows($owner, $trip)),
            function (Closure $wait) use ($trip, $owner) {
                $waited = false;
                DB::listen(function (QueryExecuted $query) use ($wait, &$waited) {
                    if (! $waited && str_contains($query->sql, 'from `trip_people`')) {
                        $waited = true;
                        $wait();
                    }
                });
                $this->actingAs($owner)->getJson('/api/trips/' . $trip->id)->assertOk()
                    ->assertJsonPath('expense', [])->assertJsonPath('people', [])
                    ->assertJsonPath('expenseLedger.currencies', [])->assertJsonPath('expenseLedger.payments', []);
                $this->assertTrue($waited);
            },
        );
        $this->assertSame('ok', $result);
        $this->assertFinancialSnapshot($owner, $trip);
    }

    public function test_trip_read_waiting_for_a_writer_sees_its_whole_committed_ledger(): void
    {
        $owner = $this->user();
        $trip = $this->trip($owner);
        $result = $this->race(
            fn () => $this->assertFinancialSnapshot($owner, $trip),
            fn (Closure $wait) => $this->write($owner, $trip, function () use ($owner, $trip, $wait) {
                $this->financialRows($owner, $trip);
                $wait();
            }),
        );
        $this->assertSame('ok', $result);
    }

    public static function financialWriteRoutes(): array
    {
        return [
            'create expense' => ['POST', 'expenses', 201],
            'add person' => ['POST', 'people', 201],
            'update person' => ['PATCH', 'people/{person}', 200],
            'record payment' => ['POST', 'expense-payments', 201],
            'void payment' => ['DELETE', 'expense-payments/{payment}', 200],
        ];
    }

    #[DataProvider('financialWriteRoutes')]
    public function test_financial_api_writes_wait_for_the_trip_read_lock(string $method, string $path, int $status): void
    {
        $owner = $this->user();
        $trip = $this->trip($owner);
        $this->financialRows($owner, $trip);
        $payment = DB::table('expense_payments')->where('trip_id', $trip->id)->first();
        $url = "/api/trips/$trip->id/" . strtr($path, ['{person}' => $payment->sender_id, '{payment}' => $payment->id]);
        $data = match ($path) {
            'expenses' => ['title' => 'Taxi', 'currency' => 'SGD', 'amount' => '15', 'timestampIncurred' => 1],
            'people' => ['id' => (string) Str::uuid(), 'name' => 'New Guest'],
            'people/{person}' => ['name' => 'Renamed Guest'],
            'expense-payments' => [
                'id' => (string) Str::uuid(), 'senderId' => $payment->sender_id, 'recipientId' => $payment->recipient_id,
                'currency' => 'SGD', 'amountMinor' => '1000', 'date' => '2026-11-16',
            ],
            default => [],
        };
        $result = $this->race(
            fn () => $this->actingAs($owner)->json($method, $url, $data)->assertStatus($status),
            fn (Closure $wait) => DB::transaction(function () use ($trip, $wait): void {
                Trip::whereKey($trip->id)->sharedLock()->firstOrFail();
                $wait();
            }),
        );
        $this->assertSame('ok', $result);
    }

    public function test_concurrent_expense_update_aliases_reject_the_stale_revision(): void
    {
        $owner = $this->user();
        $editor = $this->user();
        $trip = $this->trip($owner);
        $trip->users()->attach($editor->id, ['id' => (string) Str::uuid(), 'role' => 1, 'created_at_ms' => 1, 'updated_at_ms' => 1]);
        $this->financialRows($owner, $trip);
        $expenseId = $trip->expenses()->sole()->id;
        $result = $this->race(
            fn () => $this->actingAs($editor)->putJson("/api/expenses/$expenseId", ['title' => 'Stale edit', 'expectedRevision' => 1])->assertConflict(),
            fn (Closure $wait) => DB::transaction(function () use ($owner, $trip, $expenseId, $wait): void {
                $this->actingAs($owner)->putJson("/api/trips/$trip->id/expenses/$expenseId", ['title' => 'Committed edit', 'expectedRevision' => 1])
                    ->assertOk()->assertJsonPath('ledger_revision', 2);
                $wait();
            }),
        );
        $this->assertSame('ok', $result);
        $this->assertDatabaseHas('expenses', ['id' => $expenseId, 'title' => 'Committed edit', 'ledger_revision' => 2]);
    }

    private function financialRows(User $owner, Trip $trip): void
    {
        $service = app(ExpenseLedgerService::class);
        $payer = app(TripPeopleService::class)->person($trip, $owner, $owner->handle);
        $guest = app(TripPeopleService::class)->person($trip, null, 'Guest');
        $request = new Request([
            'id' => (string) Str::uuid(), 'title' => 'Dinner', 'currency' => 'SGD', 'amount' => '90', 'timestampIncurred' => 1,
            'ledger' => ['paidBy' => $payer, 'method' => 'equal', 'shares' => [['participantId' => $guest]]],
        ]);
        $request->setUserResolver(fn () => $owner);
        $service->write($request, $trip);
        DB::table('expense_payments')->insert([
            'id' => (string) Str::uuid(), 'trip_id' => $trip->id, 'sender_id' => $guest, 'recipient_id' => $payer,
            'currency' => 'SGD', 'amount_minor' => 3000, 'paid_currency' => 'SGD', 'paid_amount_minor' => 3000,
            'paid_on' => '2026-11-16', 'created_at_ms' => 1,
        ]);
    }

    private function assertFinancialSnapshot(User $owner, Trip $trip): void
    {
        $response = $this->actingAs($owner)->getJson('/api/trips/' . $trip->id)->assertOk()
            ->assertJsonCount(1, 'expense')->assertJsonCount(2, 'people')
            ->assertJsonCount(1, 'expenseLedger.payments');
        $ledger = $response->json('expenseLedger');
        $ids = array_column($response->json('people'), 'id');
        $this->assertEqualsCanonicalizing($ids, array_column($ledger['currencies'][0]['balances'], 'participantId'));
        $nets = array_column($ledger['currencies'][0]['balances'], 'amountMinor');
        $this->assertEqualsCanonicalizing(['6000', '-6000'], $nets);
    }

    private function user(string $role = 'user'): User
    {
        return User::create(['id' => (string) Str::uuid(), 'handle' => Str::random(12), 'email' => Str::random(12) . '@example.com', 'activated' => true, 'role' => $role]);
    }

    private function trip(User $owner): Trip
    {
        $trip = Trip::create([
            'id' => (string) Str::uuid(), 'title' => 'Trip', 'region' => 'JP',
            'currency' => 'JPY', 'timezone' => 'Asia/Tokyo',
            'timestamp_start_ms' => 100, 'timestamp_end_ms' => 200, 'sharing_level' => 0,
        ]);
        $trip->users()->attach($owner->id, ['id' => (string) Str::uuid(), 'role' => 0, 'created_at_ms' => 1, 'updated_at_ms' => 1]);

        return $trip;
    }

    private function write(User $actor, Trip $trip, Closure $action): void
    {
        $request = Request::create('/api/trips/' . $trip->id . '/activities', 'POST');
        $route = new Route('POST', 'api/trips/{trip}/activities', fn () => null);
        $route->bind($request);
        $route->setParameter('trip', $trip);
        $request->setRouteResolver(fn () => $route);
        $request->setUserResolver(fn () => $actor);
        app(SerializeTripLifecycle::class)->handle($request, function () use ($action) {
            $action();

            return response()->json(['ok' => true]);
        });
    }

    private function afterLock(string $table, Closure $action): void
    {
        $done = false;
        DB::listen(function (QueryExecuted $query) use ($table, $action, &$done) {
            if (! $done && str_contains($query->sql, 'from `' . $table . '`') && str_contains($query->sql, 'for update')) {
                $done = true;
                $action();
            }
        });
    }

    /** Run a competing operation on a separate process/connection, and prove it actually waits on an InnoDB lock. */
    private function race(Closure $worker, Closure $holder): string
    {
        // Never share a PDO socket across fork: both processes reconnect independently.
        DB::purge();
        [$parent, $child] = stream_socket_pair(STREAM_PF_UNIX, STREAM_SOCK_STREAM, STREAM_IPPROTO_IP);
        $pid = pcntl_fork();
        $this->assertNotSame(-1, $pid);
        if ($pid === 0) {
            fclose($parent);
            try {
                DB::statement('SET SESSION innodb_lock_wait_timeout = 10');
                fwrite($child, DB::selectOne('SELECT CONNECTION_ID() AS id')->id . "\n");
                if (trim((string) fgets($child)) !== 'go') {
                    exit(1);
                }
                $worker();
                $result = 'ok';
            } catch (Throwable $exception) {
                $result = $exception instanceof HttpExceptionInterface
                    ? 'http:' . $exception->getStatusCode()
                    : get_class($exception) . ': ' . $exception->getMessage();
            }
            fwrite($child, json_encode($result, JSON_THROW_ON_ERROR) . "\n");
            fclose($child);
            DB::disconnect();
            exit(0);
        }
        fclose($child);
        stream_set_timeout($parent, 15);
        try {
            $connectionId = (int) fgets($parent);
            $this->assertGreaterThan(0, $connectionId);
            $waited = false;
            $holder(function () use ($parent, $connectionId, &$waited) {
                fwrite($parent, "go\n");
                $deadline = microtime(true) + 5;
                do {
                    $waiting = DB::selectOne('SELECT COUNT(*) AS n FROM information_schema.INNODB_LOCK_WAITS w JOIN information_schema.INNODB_TRX t ON t.trx_id = w.requesting_trx_id WHERE t.trx_mysql_thread_id = ?', [$connectionId]);
                    if ((int) $waiting->n > 0) {
                        $waited = true;

                        return;
                    }
                    // InnoDB's diagnostic snapshot needs >100 ms between reads.
                    usleep(200000);
                } while (microtime(true) < $deadline);
                stream_set_blocking($parent, false);
                $result = fgets($parent);
                $this->fail('Competing connection never waited on an InnoDB row lock. Worker: ' . ($result ?: 'still running'));
            });
            $this->assertTrue($waited);
            $result = fgets($parent);
            $this->assertNotFalse($result, 'Worker did not return a result.');

            return json_decode($result, true, flags: JSON_THROW_ON_ERROR);
        } finally {
            fclose($parent);
            // Bound cleanup even when an assertion fails while the worker is blocked.
            posix_kill($pid, SIGTERM);
            pcntl_waitpid($pid, $status);
        }
    }
}
