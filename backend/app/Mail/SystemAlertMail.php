<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class SystemAlertMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $titulo,
        public readonly string $mensaje,
        public readonly string $nivel,
        public readonly array $meta = []
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "[Alerta {$this->nivel}] {$this->titulo}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.system-alert',
        );
    }

    public function attachments(): array
    {
        return [];
    }
}

