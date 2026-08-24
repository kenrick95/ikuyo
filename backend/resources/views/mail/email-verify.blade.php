<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>Verify your Ikuyo email</title></head>
<body>
    <p>Hello {{ $user->handle }},</p>
    <p>Confirm this email address for your Ikuyo account:</p>
    <p><a href="{{ $verifyUrl }}">{{ $verifyUrl }}</a></p>
    <p>This link expires in one hour. If you did not request this, you can ignore it.</p>
</body>
</html>
