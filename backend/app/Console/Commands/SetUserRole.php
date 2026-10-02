<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

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

        $user = User::where('email', $this->argument('email'))->first();
        if (! $user) {
            $this->error('User not found.');

            return self::FAILURE;
        }

        $user->update(['role' => $role]);
        $this->info("{$user->email} is now {$role}.");

        return self::SUCCESS;
    }
}
