<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Trip;
use App\Models\TripUser;
use App\Models\User;
use App\Services\TripAccessService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class UserController extends Controller
{
    public function me(Request $request): JsonResponse
    {
        return response()->json($this->serialize($request->user()));
    }

    public function checkEmail(Request $request): JsonResponse
    {
        $data = $request->validate(['email' => ['required', 'email'], 'excludeUserId' => ['nullable', 'string']]);
        $query = User::where('email', $data['email']);
        if (! empty($data['excludeUserId'])) {
            $query->where('id', '!=', $data['excludeUserId']);
        }

        return response()->json(['taken' => $query->exists()]);
    }

    public function updatePreferences(Request $request): JsonResponse
    {
        $data = $request->validate([
            'region' => ['sometimes', 'nullable', 'string', 'max:8'],
            'currency' => ['sometimes', 'nullable', 'string', 'max:8'],
            'timeZone' => ['sometimes', 'nullable', 'string', 'max:64'],
        ]);
        $request->user()->update([
            'preferred_region' => $data['region'] ?? $request->user()->preferred_region,
            'preferred_currency' => $data['currency'] ?? $request->user()->preferred_currency,
            'preferred_timezone' => $data['timeZone'] ?? $request->user()->preferred_timezone,
        ]);

        return response()->json($this->serialize($request->user()->fresh()));
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'handle' => ['sometimes', 'string', 'min:2', 'max:64', 'unique:users,handle,' . $request->user()->id],
            'email' => ['sometimes', 'nullable', 'email', 'unique:users,email,' . $request->user()->id],
        ]);
        if (isset($data['handle'])) {
            $data['handle_key'] = strtolower($data['handle']);
        }
        $request->user()->update($data);

        return response()->json($this->serialize($request->user()->fresh()));
    }

    public function addMember(Request $request, Trip $trip): JsonResponse
    {
        $data = $request->validate(['email' => ['required', 'email'], 'role' => ['required', 'integer', 'in:1,2']]);
        $user = User::firstOrCreate(
            ['email' => $data['email']],
            ['id' => (string) Str::uuid(), 'handle' => 'guest_' . Str::lower(Str::random(12)), 'activated' => false],
        );
        $trip->users()->syncWithoutDetaching([$user->id => [
            'id' => (string) Str::uuid(), 'role' => $data['role'], 'created_at_ms' => $this->nowMs(), 'updated_at_ms' => $this->nowMs(),
        ]]);

        return response()->json(['user' => $this->serialize($user)], 201);
    }

    public function updateMember(Request $request, Trip $trip, string $member): JsonResponse
    {
        $data = $request->validate(['role' => ['required', 'integer', 'in:1,2']]);
        // `member` is the membership (pivot) row id, not the related user id.
        $membership = TripUser::whereKey($member)->where('trip_id', $trip->id)->firstOrFail();
        $membership->update(['role' => $data['role'], 'updated_at_ms' => $this->nowMs()]);

        return response()->json(['ok' => true]);
    }

    public function updateMemberByEmail(Request $request, Trip $trip): JsonResponse
    {
        $data = $request->validate(['email' => ['required', 'email'], 'role' => ['required', 'integer', 'in:1,2']]);
        $member = $trip->users()->where('email', $data['email'])->firstOrFail();
        $trip->users()->updateExistingPivot($member->id, ['role' => $data['role'], 'updated_at_ms' => $this->nowMs()]);

        return response()->json(['ok' => true]);
    }

    public function removeMemberById(Request $request, string $member): JsonResponse
    {
        abort_unless($request->user(), 401);
        $membership = TripUser::with('trip')->whereKey($member)->firstOrFail();
        $access = app(TripAccessService::class);
        abort_unless($access->canManage($membership->trip, $request->user()), 403);
        $membership->delete();

        return response()->json(['ok' => true]);
    }

    public function removeMember(Trip $trip, string $member): JsonResponse
    {
        $trip->users()->detach($member);

        return response()->json(['ok' => true]);
    }

    private function nowMs(): int
    {
        return (int) round(microtime(true) * 1000);
    }

    private function serialize(User $user): array
    {
        return ['id' => $user->id, 'handle' => $user->handle, 'email' => $user->email, 'activated' => (bool) $user->activated, 'createdAt' => $user->created_at_ms, 'lastUpdatedAt' => $user->updated_at_ms, 'lastLoginAt' => $user->last_login_at, 'preferredRegion' => $user->preferred_region, 'preferredCurrency' => $user->preferred_currency, 'preferredTimeZone' => $user->preferred_timezone];
    }
}
