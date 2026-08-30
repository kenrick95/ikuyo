<?php

namespace App\Http\Middleware;

use App\Models\Trip;
use App\Services\TripAccessService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureTripContentWritable
{
    public function __construct(private readonly TripAccessService $access) {}

    public function handle(Request $request, Closure $next): Response
    {
        /** @var Trip $trip */
        $trip = $request->route('trip');
        $this->access->ensureContentWritable($trip);

        return $next($request);
    }
}
