<?php

namespace App\Services;

use App\Models\User;

class UserHandleGenerator
{
    private const ADJECTIVES = [
        'amber', 'azure', 'bold', 'brave', 'bright', 'calm', 'clever', 'cool', 'crisp', 'daring', 'dawn', 'easy', 'epic', 'fast', 'free', 'fresh', 'gentle', 'golden', 'grand', 'green', 'happy', 'kind', 'lively', 'lucky', 'mellow', 'mighty', 'nimble', 'noble', 'quiet', 'rapid', 'sharp', 'silver', 'sleek', 'smooth', 'solar', 'still', 'sunny', 'swift', 'teal', 'vivid', 'warm', 'witty',
    ];

    private const NOUNS = [
        'bay', 'birch', 'brook', 'canyon', 'cedar', 'cloud', 'coast', 'comet', 'creek', 'dune', 'falcon', 'fern', 'fjord', 'grove', 'hawk', 'hill', 'island', 'lake', 'lark', 'lotus', 'lynx', 'maple', 'mesa', 'moon', 'moss', 'otter', 'peak', 'pine', 'pond', 'quail', 'raven', 'reed', 'ridge', 'river', 'robin', 'rock', 'sage', 'snow', 'star', 'stone', 'storm', 'tide', 'vale', 'wave', 'wolf',
    ];

    /** Matches src/User/handle.ts: adjective_noun_1000-to-9999, then a timestamp fallback. */
    public function generate(int $maxAttempts = 8): string
    {
        for ($attempt = 0; $attempt < $maxAttempts; $attempt++) {
            $handle = $this->randomHandle();
            if (! $this->inUse($handle)) {
                return $handle;
            }
        }

        return 'user_' . base_convert((string) now()->getTimestampMs(), 10, 36) . '_' . random_int(1000, 9999);
    }

    private function randomHandle(): string
    {
        return self::ADJECTIVES[array_rand(self::ADJECTIVES)]
            . '_'
            . self::NOUNS[array_rand(self::NOUNS)]
            . '_'
            . random_int(1000, 9999);
    }

    private function inUse(string $handle): bool
    {
        return User::where('handle_key', strtolower($handle))->exists();
    }
}
