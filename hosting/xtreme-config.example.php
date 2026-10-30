<?php
// Primer konfiguracije za formu (web/public/api/upit.php).
// Na hostingu: kopiraj kao xtreme-config.php u HOME folder naloga – PORED public_html, NE unutar njega,
// da ne bude dostupan preko weba. Pravi ključevi nikad ne idu u git.
return [
    // Resend → API Keys → Create (Sending access)
    'RESEND_API_KEY' => '',
    // Gde stižu upiti
    'INQUIRY_TO_EMAIL' => 'infoxtrememotori@gmail.com',
    // Pošiljalac: dok domen nije potvrđen u Resendu ostaje onboarding@resend.dev
    'INQUIRY_FROM_EMAIL' => 'Xtreme Motors <onboarding@resend.dev>',
    // Cloudflare → Turnstile → secret key; prazno = provera se preskače (samo za probu)
    'TURNSTILE_SECRET_KEY' => '',
];
