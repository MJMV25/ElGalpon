<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class WelcomeUserMail extends Mailable
{
    use Queueable, SerializesModels;

    public string $nombreUsuario;
    public string $email;
    public string $rol;
    public string $passwordTemporal;
    public string $primerAccesoUrl;
    public string $expiraEn;

    /**
     * Create a new message instance.
     */
    public function __construct(
        string $nombreUsuario,
        string $email,
        string $rol,
        string $passwordTemporal,
        ?string $primerAccesoUrl = null,
        ?string $expiraEn = null
    )
    {
        $this->nombreUsuario = $nombreUsuario;
        $this->email = $email;
        $this->rol = $rol;
        $this->passwordTemporal = $passwordTemporal;
        $this->primerAccesoUrl = $primerAccesoUrl ?? url('/login');
        $this->expiraEn = $expiraEn ?? now()->addHours(48)->format('Y-m-d H:i:s');
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Bienvenido a El Galpón',
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.welcome-user',
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, \Illuminate\Mail\Mailables\Attachment>
     */
    public function attachments(): array
    {
        return [];
    }
}
