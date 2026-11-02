<?php

return [
    'cleanup_enabled' => env('INACTIVE_USER_CLEANUP_ENABLED', false),
    'inactive_days' => env('INACTIVE_USER_DAYS', 90),
];
