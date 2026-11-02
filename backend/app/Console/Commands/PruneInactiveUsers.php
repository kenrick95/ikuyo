<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\AccountDeletionService;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Builder;

class PruneInactiveUsers extends Command
{
    protected $signature = 'users:prune-inactive
        {--days= : Minimum age and inactivity in days (defaults to INACTIVE_USER_DAYS)}
        {--limit=100 : Maximum accounts considered per run}
        {--execute : Apply recoverable soft deletions; otherwise only preview}';

    protected $description = 'Preview or soft-delete old unused guests and unverified password accounts without trip memberships or comments';

    public function handle(AccountDeletionService $deletion): int
    {
        $days = filter_var($this->option('days') ?? config('accounts.inactive_days'), FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        $limit = filter_var($this->option('limit'), FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 1000]]);
        if ($days === false || $limit === false) {
            $this->error('Days must be a positive integer; limit must be between 1 and 1000.');

            return self::FAILURE;
        }
        // Last login alone is not sufficient: a long-lived session can still be
        // in active use. Other session drivers cannot be inspected by this job.
        if (config('session.driver') !== 'database' || config('session.connection') !== null) {
            $this->error('Cleanup requires database sessions on the default connection to verify recent activity.');

            return self::FAILURE;
        }

        $cutoff = now()->subDays($days)->getTimestampMs();
        $candidates = $this->eligible($cutoff)->orderBy('id')->limit($limit)->get(['users.id']);
        $deleted = 0;
        foreach ($candidates as $user) {
            if (! $this->option('execute')) {
                $this->line("Would delete {$user->id}");
            } elseif ($deletion->delete($user, fn (User $locked): bool => $this->eligible($cutoff)->whereKey($locked->id)->exists())) {
                $deleted++;
            }
        }
        $this->info($this->option('execute')
            ? "Soft-deleted {$deleted} inactive accounts."
            : "Dry run: {$candidates->count()} eligible accounts; no accounts deleted.");

        return self::SUCCESS;
    }

    /** @return Builder<User> */
    private function eligible(int $cutoff): Builder
    {
        return User::query()
            ->where('role', '!=', 'admin')
            ->where('activated', true)
            ->where('email_verified', false)
            ->whereNull('auth_namespace_id')
            ->whereNull('google_subject')
            ->where(fn (Builder $q) => $q->whereNull('email')->orWhereNotNull('password_hash'))
            ->where('created_at_ms', '<', $cutoff)
            ->where('updated_at_ms', '<', $cutoff)
            ->where(fn (Builder $q) => $q->whereNull('last_login_at')->orWhere('last_login_at', '<', $cutoff))
            // Query raw membership/comment rows to also protect deleted trips,
            // invited/shared memberships, and soft-deleted authored content.
            ->whereNotExists(fn ($q) => $q->selectRaw('1')->from('trip_user')->whereColumn('trip_user.user_id', 'users.id'))
            ->whereNotExists(fn ($q) => $q->selectRaw('1')->from('comments')->whereColumn('comments.user_id', 'users.id'))
            ->whereNotExists(fn ($q) => $q->selectRaw('1')->from(config('session.table', 'sessions'))
                ->whereColumn(config('session.table', 'sessions') . '.user_id', 'users.id')
                ->where('last_activity', '>=', intdiv($cutoff, 1000)));
    }
}
