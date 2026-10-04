<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class SerializeAuthMutations
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->isMethodSafe()) {
            return $next($request);
        }

        $actor = $request->user();

        return DB::transaction(function () use ($request, $next, $actor): Response {
            // Authentication may have resolved the session before deletion took
            // the user lock. Reload it before any mutation uses that identity.
            if ($actor) {
                $user = User::whereKey($actor->getAuthIdentifier())->lockForUpdate()->first();
                abort_unless($user !== null, 401);
                $request->setUserResolver(fn () => $user);
            }
            // Login/reset/verification also lock their email- or token-selected
            // user in the controller, within this same transaction.
            $response = $next($request);
            if ($response->getStatusCode() >= 400) {
                throw new HttpResponseException($response);
            }

            return $response;
        }, 3);
    }
}
