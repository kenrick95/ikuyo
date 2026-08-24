<?php

namespace App\Enums;

/**
 * Polymorphic comment target type, stored as integer on comment_group_objects.object_type.
 */
enum CommentObjectType: int
{
    case Trip = 0;
    case Activity = 1;
    case Accommodation = 2;
    case MacroPlan = 3;
    case Expense = 4;
    case Task = 5;

    public function entityName(): string
    {
        return match ($this) {
            self::Trip => 'trips',
            self::Activity => 'activities',
            self::Accommodation => 'accommodations',
            self::MacroPlan => 'macroplans',
            self::Expense => 'expenses',
            self::Task => 'tasks',
        };
    }

    public static function fromEntity(string $entity): self
    {
        return match ($entity) {
            'trips' => self::Trip,
            'activities' => self::Activity,
            'accommodations' => self::Accommodation,
            'macroplans' => self::MacroPlan,
            'expenses' => self::Expense,
            'tasks' => self::Task,
            default => self::Trip,
        };
    }
}
