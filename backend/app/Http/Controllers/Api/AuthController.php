<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\PasswordResetMail;
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
        $data = $request->validate(['email' => ['required', 'email'], 'password' => ['required', 'string']]);
        $user = User::where('email', $data['email'])->first();

        if (!$user) {
            return response()->json(['message' => 'Invalid credentials.'], 422);
        }

        if (!$user->password_hash) {
            // Legacy accounts (magic-link/Google from the previous InstantDB era)
            // have an email but never stored a password. Guide them to set one.
            return response()->json([
                'message' => "You haven't set a password for this account yet. We'll send you a link to create one so you can log in.",
                'needsPasswordSetup' => true,
            ], 422);
        }

        if (!Hash::check($data['password'], $user->password_hash)) {
            return response()->json(['message' => 'Invalid credentials.'], 422);
        }

        Auth::login($user);
        $request->session()->regenerate();
        $user->forceFill(['last_login_at' => now()->getTimestampMs()])->save();

        return response()->json(['user' => $this->user($user)]);
    }

    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
        ]);

        $handle = $this->uniqueHandle(strstr($data['email'], '@', true) ?: 'user');
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

    /** Build a unique handle from a local-part, falling back to random. */
    private function uniqueHandle(string $localPart): string
    {
        $base = preg_replace('/[^a-z0-9_]/i', '_', strtolower(trim($localPart))) ?: 'user';
        $base = substr($base, 0, 24);
        $candidate = $base;
        $i = 1;
        while (User::where('handle_key', $candidate)->exists()) {
            $candidate = substr($base, 0, 20) . '_' . $i++;
        }
        return $candidate;
    }

    public function guest(Request $request): JsonResponse
    {
        $id = (string) Str::uuid();
        $handle = 'guest_' . Str::lower(Str::random(12));
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

    private function user(User $user): array
    {
        return [
            'id' => $user->id,
            'handle' => $user->handle,
            'email' => $user->email,
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