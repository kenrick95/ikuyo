<?php

namespace App\Enums;

/**
 * Membership role stored as integer on trip_user.role.
 * Matches the backend wire format used by the API.
 */
enum TripRole: int
{
    case Owner = 0;
    case Editor = 1;
    case Viewer = 2;

    public function label(): string
    {
        return match ($this) {
            self::Owner => 'owner',
            self::Editor => 'editor',
            self::Viewer => 'viewer',
        };
    }

    public static function fromLabel(string $label): self
    {
        return match ($label) {
            'owner' => self::Owner,
            'editor' => self::Editor,
            default => self::Viewer,
        };
    }
}
