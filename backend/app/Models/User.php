<?php

namespace App\Models;

use App\Models\Concerns\HasMsTimestamps;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

#[Fillable(['email', 'handle', 'handle_key', 'auth_namespace_id', 'image_url', 'password_hash', 'activated', 'preferred_region', 'preferred_currency', 'preferred_timezone', 'last_login_at', 'created_at_ms', 'updated_at_ms'])]
#[Hidden(['password_hash', 'reset_token', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, HasMsTimestamps;

    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    // Inverse of Trip::users(): trips a user belongs to, with their role on the pivot.
    public function trips(): BelongsToMany
    {
        return $this->belongsToMany(Trip::class, 'trip_user')
            ->withPivot('id', 'role', 'created_at_ms', 'updated_at_ms');
    }
}