<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\UserHandleGenerator;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class GoogleAuthController extends Controller
{
    public function configuration(): JsonResponse
    {
        return response()->json(['enabled' => $this->enabled()]);
    }

    // POST keeps starting a login/guest upgrade behind the existing CSRF check.
    public function start(Request $request): JsonResponse
    {
        abort_unless($this->enabled(), 503, 'Google login is not configured.');
        $data = $request->validate(['upgrade' => ['sometimes', 'boolean']]);
        $upgrade = $data['upgrade'] ?? false;
        abort_if($upgrade && (! $request->user() || $request->user()->email), 422, 'Only guest accounts can be upgraded.');
        abort_if(! $upgrade && $request->user(), 422, 'You are already signed in.');

        $state = Str::random(64);
        $verifier = Str::random(64);
        $request->session()->put('google_oauth', [
            'state' => $state,
            'verifier' => $verifier,
            'expires' => now()->addMinutes(10)->timestamp,
            'actor' => $request->user()?->id,
            'upgrade' => $upgrade,
        ]);

        return response()->json(['url' => 'https://accounts.google.com/o/oauth2/v2/auth?' . http_build_query([
            'client_id' => config('services.google.client_id'),
            'redirect_uri' => config('services.google.redirect_uri'),
            'response_type' => 'code',
            'scope' => 'openid email',
            'state' => $state,
            'code_challenge' => rtrim(strtr(base64_encode(hash('sha256', $verifier, true)), '+/', '-_'), '='),
            'code_challenge_method' => 'S256',
            'prompt' => 'select_account',
        ], '', '&', PHP_QUERY_RFC3986)]);
    }

    public function callback(Request $request): RedirectResponse
    {
        // Consume the state even on failure; callbacks cannot be replayed.
        $flow = $request->session()->pull('google_oauth');
        $upgrade = is_array($flow) && ($flow['upgrade'] ?? false);
        $destination = $upgrade ? '/account/upgrade' : '/login';
        $state = $request->query('state');
        if (! $this->enabled() || ! is_array($flow) || ! is_string($state)
            || ! hash_equals($flow['state'], $state) || $flow['expires'] < now()->timestamp
            || $flow['actor'] !== $request->user()?->id) {
            return $this->failure($destination, 'expired');
        }
        if ($request->query('error')) {
            return $this->failure($destination, 'cancelled');
        }
        $code = $request->query('code');
        if (! is_string($code) || $code === '') {
            return $this->failure($destination, 'failed');
        }

        try {
            $token = Http::asForm()->acceptJson()->timeout(15)->post('https://oauth2.googleapis.com/token', [
                'client_id' => config('services.google.client_id'),
                'client_secret' => config('services.google.client_secret'),
                'redirect_uri' => config('services.google.redirect_uri'),
                'grant_type' => 'authorization_code',
                'code' => $code,
                'code_verifier' => $flow['verifier'],
            ])->throw()->json('access_token');
            if (! is_string($token) || $token === '') {
                return $this->failure($destination, 'failed');
            }
            // Fetch identity directly from Google's authenticated endpoint. No
            // client-supplied profile or unverified JWT claims are trusted.
            $profile = Http::withToken($token)->acceptJson()->timeout(15)
                ->get('https://openidconnect.googleapis.com/v1/userinfo')->throw()->json();
        } catch (ConnectionException|RequestException $e) {
            // Do not log OAuth codes, tokens, or response bodies.
            return $this->failure($destination, 'failed');
        }
        if (! is_array($profile) || ! is_string($profile['sub'] ?? null)
            || $profile['sub'] === '' || strlen($profile['sub']) > 255
            || ($profile['email_verified'] ?? false) !== true
            || ! is_string($profile['email'] ?? null)
            || strlen($profile['email']) > 255 || ! filter_var($profile['email'], FILTER_VALIDATE_EMAIL)) {
            return $this->failure($destination, 'unverified');
        }
        $email = strtolower($profile['email']);
        // Google is authoritative for Gmail and verified Workspace addresses.
        // Third-party emails require an explicit signed-in linking flow instead
        // of automatically gaining access to an existing account by email.
        $authoritative = str_ends_with($email, '@gmail.com')
            || (is_string($profile['hd'] ?? null) && $profile['hd'] !== '');

        try {
            $result = DB::transaction(function () use ($flow, $profile, $email, $authoritative): User|string {
                $actor = $flow['actor'] ? User::whereKey($flow['actor'])->lockForUpdate()->first() : null;
                if ($flow['actor'] && (! $actor || $actor->email)) {
                    return 'conflict';
                }
                $linked = User::withTrashed()->where('google_subject', $profile['sub'])->lockForUpdate()->first();
                $matching = User::withTrashed()->whereRaw('LOWER(email) = ?', [$email])->lockForUpdate()->first();
                if ($linked?->trashed() || $matching?->trashed()) {
                    return 'unavailable';
                }
                if ($actor) {
                    if (($linked && $linked->id !== $actor->id) || ($matching && $matching->id !== $actor->id)) {
                        return 'conflict';
                    }
                    $user = $actor;
                    $user->email = $email;
                } elseif ($linked) {
                    $user = $linked;
                } elseif ($matching) {
                    if ($matching->google_subject || ! $authoritative
                        || ($matching->password_hash && ! $matching->email_verified && ! $matching->auth_namespace_id)) {
                        return 'link_required';
                    }
                    $user = $matching;
                } else {
                    $handle = app(UserHandleGenerator::class)->generate();
                    $user = new User([
                        'id' => (string) Str::uuid(), 'handle' => $handle,
                        'handle_key' => strtolower($handle), 'email' => $email,
                    ]);
                }
                $user->google_subject = $profile['sub'];
                $user->activated = true;
                $user->last_login_at = now()->getTimestampMs();
                if (strtolower((string) $user->email) === $email) {
                    $user->email_verified = true;
                }
                $user->save();

                return $user;
            }, 3);
        } catch (UniqueConstraintViolationException $e) {
            return $this->failure($destination, 'conflict');
        }
        if (is_string($result)) {
            return $this->failure($destination, $result);
        }
        Auth::login($result);
        $request->session()->regenerate();

        return redirect()->away($this->frontendUrl($upgrade ? '/account/edit' : '/trip'));
    }

    private function enabled(): bool
    {
        return filled(config('services.google.client_id'))
            && filled(config('services.google.client_secret'))
            && filled(config('services.google.redirect_uri'));
    }

    private function frontendUrl(string $path): string
    {
        return rtrim((string) config('app.url'), '/') . $path;
    }

    private function failure(string $destination, string $error): RedirectResponse
    {
        return redirect()->away($this->frontendUrl($destination) . '?google_error=' . $error);
    }
}
