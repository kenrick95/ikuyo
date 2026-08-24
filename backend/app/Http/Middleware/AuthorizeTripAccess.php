<?php

namespace App\Http\Middleware;

use App\Models\Trip;
use App\Services\TripAccessService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuthorizeTripAccess
{
    public function __construct(private readonly TripAccessService $access) {}

    public function handle(Request $request, Closure $next, string $ability = 'view'): Response
    {
        /** @var Trip $trip */
        $trip = $request->route('trip');
        $user = $request->user();

        $allowed = match ($ability) {
            'view' => $this->access->canView($trip, $user),
            'edit' => $this->access->canEdit($trip, $user),
            'manage' => $this->access->canManage($trip, $user),
            default => false,
        };

        abort_unless($allowed, $user ? 403 : 401);

        $request->attributes->set('tripRole', $this->access->role($trip, $user));

        return $next($request);
    }
}
