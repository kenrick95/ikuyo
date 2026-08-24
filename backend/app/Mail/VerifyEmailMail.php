<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class VerifyEmailMail extends Mailable
{
    use Queueable;

    public function __construct(
        public readonly User $user,
        public readonly string $verifyUrl,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Verify your Ikuyo email');
    }

    public function content(): Content
    {
        return new Content(
            view: 'mail.email-verify',
            with: ['user' => $this->user, 'verifyUrl' => $this->verifyUrl],
        );
    }
}