<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class SetUserRole extends Command
{
    protected $signature = 'user:set-role {email} {role : user or admin}';

    protected $description = 'Grant or revoke site-wide administrator access';

    public function handle(): int
    {
        $role = $this->argument('role');
        if (! in_array($role, ['user', 'admin'], true)) {
            $this->error('Role must be user or admin.');

            return self::FAILURE;
        }

        $email = (string) $this->argument('email');
        $error = DB::transaction(function () use ($email, $role): ?string {
            // Match account deletion's lock order and recheck after any wait.
            $admins = User::where('role', 'admin')->orderBy('id')->lockForUpdate()->get(['id']);
            $user = User::where('email', $email)->lockForUpdate()->first();
            if (! $user) {
                return 'User not found.';
            }
            if ($role === 'user' && $user->isAdmin() && $admins->count() <= 1) {
                return 'The last administrator cannot be demoted. Assign another administrator first.';
            }
            $user->update(['role' => $role]);

            return null;
        }, 3);
        if ($error !== null) {
            $this->error($error);

            return self::FAILURE;
        }

        $this->info("{$email} is now {$role}.");

        return self::SUCCESS;
    }
}
