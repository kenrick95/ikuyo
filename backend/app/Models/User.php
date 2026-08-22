<?php

namespace App\Models;

use App\Models\Concerns\HasMsTimestamps;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

#[Hidden(['password_hash', 'reset_token', 'remember_token'])]
class User extends Authenticatable
{
    protected $guarded = [];

    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, HasMsTimestamps;

    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    public function getAuthPasswordName(): string
    {
        return 'password_hash';
    }

    public function getAuthPassword(): string
    {
        return (string) $this->password_hash;
    }

    // Inverse of Trip::users(): trips a user belongs to, with their role on the pivot.
    public function trips(): BelongsToMany
    {
        return $this->belongsToMany(Trip::class, 'trip_user')
            ->withPivot('id', 'role', 'created_at_ms', 'updated_at_ms');
    }
}