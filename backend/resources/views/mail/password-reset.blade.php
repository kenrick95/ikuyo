<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>Reset your Ikuyo password</title></head>
<body>
    <p>Hello {{ $user->handle }},</p>
    <p>Use the link below to choose a new password for your Ikuyo account:</p>
    <p><a href="{{ $resetUrl }}">Reset password</a></p>
    <p>This link expires in one hour. If you did not request this, you can ignore this email.</p>
</body>
</html>
