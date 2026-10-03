<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\AuthController;
use App\Http\Middleware\SerializeAuthMutations;
use App\Mail\PasswordResetMail;
use App\Mail\VerifyEmailMail;
use App\Models\User;
use Illuminate\Database\DeadlockException;
use Illuminate\Foundation\Testing\DatabaseMigrations;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use PHPUnit\Framework\Attributes\DataProvider;
use RuntimeException;
use Tests\TestCase;

class AuthMailTransactionTest extends TestCase
{
    // Use real commits: the test transaction from RefreshDatabase would prevent
    // exercising the middleware's outermost rollback/retry and commit callbacks.
    use DatabaseMigrations;

    public static function mailActions(): array
    {
        return [
            'password reset' => ['forgot', PasswordResetMail::class, 'resetUrl', 'reset_token'],
            'email verification' => ['sendEmailVerification', VerifyEmailMail::class, 'verifyUrl', 'email_verify_token_hash'],
        ];
    }

    #[DataProvider('mailActions')]
    public function test_retry_sends_only_the_committed_token(string $action, string $mailClass, string $urlField, string $tokenField): void
    {
        Mail::fake();
        $user = $this->user();
        $request = $this->request($user);
        $attempts = 0;
        $discardedHash = null;

        app(SerializeAuthMutations::class)->handle($request, function (Request $locked) use ($action, $user, $tokenField, &$attempts, &$discardedHash) {
            $attempts++;
            $response = app(AuthController::class)->{$action}($locked);
            Mail::assertNothingSent();
            if ($attempts === 1) {
                $discardedHash = $user->fresh()->getAttribute($tokenField);
                throw new DeadlockException('Deadlock found when trying to get lock');
            }

            return $response;
        });

        $this->assertSame(2, $attempts);
        $committedHash = $user->fresh()->getAttribute($tokenField);
        $this->assertNotSame($discardedHash, $committedHash);
        Mail::assertSentCount(1);
        Mail::assertSent($mailClass, function ($mail) use ($urlField, $committedHash): bool {
            parse_str(parse_url($mail->{$urlField}, PHP_URL_QUERY), $query);
            $token = $query['reset_token'] ?? $query['verify_token'];

            return hash('sha256', $token) === $committedHash;
        });
    }

    #[DataProvider('mailActions')]
    public function test_rollback_sends_no_mail(string $action, string $mailClass, string $urlField, string $tokenField): void
    {
        Mail::fake();
        $user = $this->user();
        try {
            app(SerializeAuthMutations::class)->handle($this->request($user), function (Request $locked) use ($action) {
                app(AuthController::class)->{$action}($locked);
                throw new RuntimeException('Abort transaction');
            });
            $this->fail('Expected rollback.');
        } catch (RuntimeException $exception) {
            $this->assertSame('Abort transaction', $exception->getMessage());
        }

        Mail::assertNothingSent();
        $this->assertNull($user->fresh()->getAttribute($tokenField));
    }

    private function user(): User
    {
        return User::create([
            'id' => (string) Str::uuid(), 'handle' => 'mail_test',
            'email' => 'mail@example.com', 'activated' => true,
        ]);
    }

    private function request(User $user): Request
    {
        $request = Request::create('/api/auth/test', 'POST', ['email' => $user->email]);
        $request->setUserResolver(fn () => $user);

        return $request;
    }
}
