<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
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

        if (!$user || !$user->password_hash || !Hash::check($data['password'], $user->password_hash)) {
            return response()->json(['message' => 'Invalid credentials.'], 422);
        }

        Auth::login($user);
        $request->session()->regenerate();
        $user->forceFill(['last_login_at' => now()->getTimestampMs()])->save();

        return response()->json(['user' => $this->user($user)]);
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
            // Replace this log with a Laravel Notification/Mailable in production.
            logger()->info('Password reset link generated', [
                'user_id' => $user->id,
                'reset_token' => $rawToken,
            ]);
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