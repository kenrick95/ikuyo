<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

class SetUserPassword extends Command
{
    /**
     * @var string
     */
    protected $signature = 'auth:password
        {account : User email or handle}
        {password? : New password (prompts if omitted)}';

    protected $description = 'Set a password for an existing user so they can log in locally';

    public function handle(): int
    {
        $user = User::where('email', $this->argument('account'))
            ->orWhere('handle', $this->argument('account'))
            ->first();

        if (! $user) {
            $this->error("No user found for: {$this->argument('account')}");

            return self::FAILURE;
        }

        $password = $this->argument('password');
        if ($password === null) {
            $password = $this->secret('Password');
            if ($password === null || $password === '') {
                $this->error('Password is required.');

                return self::FAILURE;
            }
        }
        if (strlen($password) < 8) {
            $this->error('Password must be at least 8 characters.');

            return self::FAILURE;
        }

        $user->forceFill(['password_hash' => password_hash($password, PASSWORD_DEFAULT)])->save();

        $email = $user->email ?? 'no email';
        $this->info("Password set for {$user->handle} <{$email}> (id: {$user->id})");
        $this->info('You can now log in at /login with this email and the password.');

        return self::SUCCESS;
    }
}
