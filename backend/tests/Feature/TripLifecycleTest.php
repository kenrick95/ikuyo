<?php

namespace Tests\Feature;

use App\Http\Middleware\SerializeTripLifecycle;
use App\Models\Activity;
use App\Models\Trip;
use App\Models\User;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Routing\Route;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class TripLifecycleTest extends TestCase
{
    use RefreshDatabase;

    private function user(): User
    {
        return User::create(['id' => (string) Str::uuid(), 'handle' => Str::random(12), 'activated' => true]);
    }

    private function trip(): Trip
    {
        return Trip::create([
            'id' => (string) Str::uuid(), 'title' => 'Trip', 'region' => 'JP',
            'currency' => 'JPY', 'timezone' => 'Asia/Tokyo',
            'timestamp_start_ms' => 100, 'timestamp_end_ms' => 200, 'sharing_level' => 0,
        ]);
    }

    private function request(string $method, string $uri, User $user, array $parameters): Request
    {
        $request = Request::create('/' . $uri, $method);
        $route = new Route($method, $uri, fn () => null);
        $route->bind($request);
        foreach ($parameters as $key => $value) {
            $route->setParameter($key, $value);
        }
        $request->setRouteResolver(fn () => $route);
        $request->setUserResolver(fn () => $user);

        return $request;
    }

    public function test_all_write_methods_run_in_a_transaction_and_refresh_the_bound_trip(): void
    {
        $user = $this->user();
        $trip = $this->trip();
        DB::table('trips')->where('id', $trip->id)->update(['title' => 'Changed before lock']);
        $level = DB::transactionLevel();
        foreach (['POST', 'PUT', 'PATCH', 'DELETE'] as $method) {
            $request = $this->request($method, 'api/trips/{trip}', $user, ['trip' => $trip]);
            app(SerializeTripLifecycle::class)->handle($request, function (Request $locked) use ($level) {
                $this->assertSame($level + 1, DB::transactionLevel());
                $this->assertSame('Changed before lock', $locked->route('trip')->title);

                return response()->json(['ok' => true]);
            });
        }
    }

    public function test_write_rejects_a_trip_deleted_after_route_binding(): void
    {
        $user = $this->user();
        $trip = $this->trip();
        $request = $this->request('POST', 'api/trips/{trip}/activities', $user, ['trip' => $trip]);
        Trip::findOrFail($trip->id)->delete();

        try {
            app(SerializeTripLifecycle::class)->handle($request, function () {
                $this->fail('Deleted trip must not reach the controller.');
            });
            $this->fail('Expected a 404 response.');
        } catch (HttpException $exception) {
            $this->assertSame(404, $exception->getStatusCode());
        }
    }

    public function test_direct_write_rejects_a_child_deleted_after_route_binding(): void
    {
        $user = $this->user();
        $trip = $this->trip();
        $activity = Activity::create(['id' => Str::uuid(), 'trip_id' => $trip->id, 'title' => 'Activity', 'location' => 'Tokyo']);
        $request = $this->request('PUT', 'api/activities/{activity}', $user, ['activity' => $activity]);
        Activity::findOrFail($activity->id)->delete();

        $this->expectException(ModelNotFoundException::class);
        app(SerializeTripLifecycle::class)->handle($request, function () {
            $this->fail('Deleted child must not reach the controller.');
        });
    }

    public function test_trip_creation_rechecks_a_user_deleted_after_authentication(): void
    {
        $user = $this->user();
        $request = $this->request('POST', 'api/trips', $user, []);
        User::findOrFail($user->id)->delete();

        try {
            app(SerializeTripLifecycle::class)->handle($request, function () {
                $this->fail('Deleted user must not create a trip.');
            });
            $this->fail('Expected a 401 response.');
        } catch (HttpException $exception) {
            $this->assertSame(401, $exception->getStatusCode());
        }
    }
}
