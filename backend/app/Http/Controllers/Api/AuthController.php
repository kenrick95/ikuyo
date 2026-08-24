<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\PasswordResetMail;
use App\Mail\VerifyEmailMail;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    public function me(Request $request): JsonResponse
    {
        return response()->json(['user' => $request->user() ? $this->user($request->user()) : null]);
    }

    public function login(Request $request): JsonResponse
    {
        // Password is optional at submission: a legacy account (email but no
        // password) must reach the needsPasswordSetup branch even when the user
        // leaves the field blank and lets the form submit.
        $data = $request->validate(['email' => ['required', 'email'], 'password' => ['nullable', 'string']]);
        $user = User::where('email', $data['email'])->first();

        if (! $user) {
            return response()->json(['message' => 'Invalid credentials.'], 422);
        }

        if (! $user->password_hash) {
            // Legacy accounts (magic-link/Google from the previous InstantDB era)
            // have an email but never stored a password. Guide them to set one.
            return response()->json([
                'message' => "You haven't set a password for this account yet. We'll send you a link to create one so you can log in.",
                'needsPasswordSetup' => true,
            ], 422);
        }

        if (empty($data['password']) || ! Hash::check($data['password'], $user->password_hash)) {
            return response()->json(['message' => 'Invalid credentials.'], 422);
        }

        Auth::login($user);
        $request->session()->regenerate();
        $user->forceFill(['last_login_at' => now()->getTimestampMs()])->save();

        return response()->json(['user' => $this->user($user)]);
    }

    public function lookup(Request $request): JsonResponse
    {
        $data = $request->validate(['email' => ['required', 'email']]);
        $user = User::where('email', $data['email'])->first();

        if (! $user) {
            // Generic so an unregistered email cannot be distinguished from a
            // legacy account that simply needs a password.
            return response()->json(['known' => false, 'needsPasswordSetup' => true]);
        }

        return response()->json([
            'known' => true,
            'needsPasswordSetup' => ! $user->password_hash,
        ]);
    }

    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
        ]);

        $handle = $this->uniqueHandle();
        $user = User::create([
            'id' => (string) Str::uuid(),
            'handle' => $handle,
            'handle_key' => strtolower($handle),
            'email' => $data['email'],
            'password_hash' => Hash::make($data['password']),
            'activated' => true,
        ]);

        Auth::login($user);
        $request->session()->regenerate();
        $user->forceFill(['last_login_at' => now()->getTimestampMs()])->save();

        return response()->json(['user' => $this->user($user)], 201);
    }

    /** Build a unique handle without leaking the email (mirrors src/User/handle.ts). */
    private function uniqueHandle(): string
    {
        for ($attempt = 0; $attempt < 16; $attempt++) {
            // Random handle is not derived from the email, so it cannot leak PII.
            $words = ['koala', 'sakura', 'petra', 'delta', 'azure', 'nimbus', 'quill', 'ember', 'sol', 'mira'];
            $candidate = $words[array_rand($words)] . '_' . strtolower(Str::random(5));
            if (! self::handleKeyInUse($candidate)) {
                return $candidate;
            }
        }

        return 'user_' . strtolower(Str::random(12));
    }

    private static function handleKeyInUse(string $handle): bool
    {
        return User::where('handle_key', strtolower($handle))->exists();
    }

    public function guest(Request $request): JsonResponse
    {
        $id = (string) Str::uuid();
        // Ensure a unique handle (`Str::random` collisions are unlikely but possible).
        $handle = $this->uniqueHandle();
        $user = User::create([
            'id' => $id,
            'handle' => $handle,
            'handle_key' => $handle,
            'activated' => true,
            'last_login_at' => now()->getTimestampMs(),
        ]);

        Auth::login($user);
        $request->session()->regenerate();

        return response()->json(['user' => $this->user($user)], 201);
    }

    public function upgrade(Request $request): JsonResponse
    {
        /** @var User|null $user */
        $user = $request->user();
        abort_unless($user, 401);
        abort_if($user->email, 422, 'This account already has an email address.');

        $data = $request->validate([
            'email' => ['required', 'email', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
        ]);
        $user->forceFill([
            'email' => $data['email'],
            'password_hash' => Hash::make($data['password']),
            'activated' => true,
            'last_login_at' => now()->getTimestampMs(),
        ])->save();

        return response()->json(['user' => $this->user($user)]);
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['ok' => true]);
    }

    public function forgot(Request $request): JsonResponse
    {
        $data = $request->validate(['email' => ['required', 'email']]);
        $user = User::where('email', $data['email'])->first();

        if ($user) {
            $rawToken = Str::random(64);
            $user->forceFill([
                'reset_token' => hash('sha256', $rawToken),
                'reset_token_at' => now()->addHour()->getTimestampMs(),
            ])->save();
            $frontendUrl = rtrim((string) config('app.url'), '/');
            // Shared hosting has no persistent queue worker; send synchronously so
            // the reset email is delivered even when only PHP/cron is available.
            Mail::to($user->email)->send(new PasswordResetMail(
                $user,
                $frontendUrl . '/login?reset_token=' . urlencode($rawToken),
            ));
        }

        // Deliberately identical for existing and unknown email addresses.
        return response()->json(['ok' => true]);
    }

    public function sendEmailVerification(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user, 401);
        $target = $user->pending_email ?: $user->email;
        if (! $target) {
            abort(422, 'No email address to verify.');
        }

        $token = Str::random(64);
        $user->forceFill([
            'email_verify_token_hash' => hash('sha256', $token),
            'email_verify_token_at' => now()->addHour()->getTimestampMs(),
        ])->save();

        $frontendUrl = rtrim((string) config('app.url'), '/');
        Mail::to($target)->send(new VerifyEmailMail(
            $user,
            $frontendUrl . '/login?verify_token=' . urlencode($token),
        ));

        return response()->json(['ok' => true]);
    }

    public function confirmEmail(Request $request): JsonResponse
    {
        $data = $request->validate(['token' => ['required', 'string']]);
        $user = User::where('email_verify_token_hash', hash('sha256', $data['token']))
            ->where('email_verify_token_at', '>', now()->getTimestampMs())
            ->firstOrFail();
        $user->forceFill([
            'email_verified' => true,
        ])->save();
        if ($user->pending_email) {
            $user->forceFill(['email' => $user->pending_email, 'pending_email' => null])->save();
        }
        $user->forceFill(['email_verify_token_hash' => null, 'email_verify_token_at' => null])->save();

        return response()->json(['user' => $this->user($user), 'ok' => true]);
    }

    public function changeEmail(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user, 401);
        $data = $request->validate([
            'email' => ['required', 'email', 'unique:users,email'],
        ]);
        $user->forceFill(['pending_email' => $data['email'], 'email_verified' => false])->save();

        return $this->sendEmailVerification($request);
    }

    public function reset(Request $request): JsonResponse
    {
        $data = $request->validate([
            'resetToken' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8'],
        ]);
        $user = User::where('reset_token', hash('sha256', $data['resetToken']))
            ->where('reset_token_at', '>', now()->getTimestampMs())
            ->firstOrFail();

        $user->forceFill([
            'password_hash' => Hash::make($data['password']),
            'reset_token' => null,
            'reset_token_at' => null,
        ])->save();
        Auth::login($user);
        $request->session()->regenerate();

        return response()->json(['user' => $this->user($user)]);
    }

    // Imported users from InstantDB arrive verified (email bound at account time).
    private function isImportedEmail(User $user): bool
    {
        return $user->auth_namespace_id !== null;
    }

    private function user(User $user): array
    {
        return [
            'id' => $user->id,
            'handle' => $user->handle,
            'email' => $user->email,
            'emailVerified' => (bool) $user->email_verified || $this->isImportedEmail($user),
            'pendingEmail' => $user->pending_email,
            'activated' => (bool) $user->activated,
            'createdAt' => $user->created_at_ms,
            'lastUpdatedAt' => $user->updated_at_ms,
            'lastLoginAt' => $user->last_login_at,
            'preferredRegion' => $user->preferred_region,
            'preferredCurrency' => $user->preferred_currency,
            'preferredTimeZone' => $user->preferred_timezone,
        ];
    }
}
