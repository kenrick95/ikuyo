<?php

// Artisan's prerendered maintenance handler falls through for JSON requests.
// This deployment handler blocks API requests before loading files being replaced.
if (!file_exists(__DIR__ . '/down')) {
    return;
}
http_response_code(503);
header('Retry-After: 60');
header('Cache-Control: no-store');
header('Content-Type: application/json');
echo '{"message":"Ikuyo is being updated. Please try again shortly."}';
exit;
