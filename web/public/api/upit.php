<?php
// Forma "Pošaljite upit" za shared hosting (Apache + PHP 8.1+). Isto ponašanje kao ranija Cloudflare ruta:
// provera polja → honeypot → Cloudflare Turnstile → mejl prodaji (Resend) → potvrda kupcu.
// Odgovor: JSON { ok, errors } kad klijent traži JSON (scripts/pages/contact.ts), inače preusmeravanje.
// Tajne su u xtreme-config.php IZVAN public_html (vidi hosting/xtreme-config.example.php).

declare(strict_types=1);

const RESEND_URL = 'https://api.resend.com/emails';
const TURNSTILE_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

$wantsJson = str_contains($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json');

function respond(bool $ok, array $errors = [], int $status = 200): never
{
    global $wantsJson;
    if ($wantsJson) {
        http_response_code($ok ? 200 : $status);
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store');
        echo json_encode($ok ? ['ok' => true] : ['ok' => false, 'errors' => $errors], JSON_UNESCAPED_UNICODE);
    } else {
        header('Location: ' . ($ok ? '/hvala' : '/kontakt?greska=1#forma'), true, 303);
    }
    exit;
}
function fail(array $errors, int $status = 400): never
{
    respond(false, $errors, $status);
}

function load_config(): array
{
    $candidates = array_filter([
        getenv('XTREME_CONFIG') ?: null,
        dirname($_SERVER['DOCUMENT_ROOT'] ?? __DIR__) . '/xtreme-config.php', // pored public_html
        dirname(__DIR__, 2) . '/xtreme-config.php',
    ]);
    foreach ($candidates as $file) {
        if (is_file($file)) {
            $config = require $file;
            if (is_array($config)) return $config;
        }
    }
    return [];
}

function len(string $s): int
{
    return function_exists('mb_strlen') ? mb_strlen($s, 'UTF-8') : strlen($s);
}
function e(string $s): string
{
    return htmlspecialchars($s, ENT_QUOTES | ENT_HTML5, 'UTF-8');
}

function post_json(string $url, array $payload, array $headers = []): array
{
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE),
        CURLOPT_HTTPHEADER => array_merge(['Content-Type: application/json'], $headers),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 15,
    ]);
    $body = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $error = curl_error($ch); // curl_close() nije potreban od PHP 8 (u 8.5 je zastareo)
    return [$status, $body === false ? null : json_decode($body, true), $error];
}

function verify_turnstile(string $secret, string $token, ?string $ip): bool
{
    if ($secret === '') return true; // bez ključa (npr. proba) provera se preskače
    $fields = ['secret' => $secret, 'response' => $token] + ($ip ? ['remoteip' => $ip] : []);
    $ch = curl_init(TURNSTILE_URL);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => http_build_query($fields),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 10,
    ]);
    $body = curl_exec($ch);
    $data = is_string($body) ? json_decode($body, true) : null;
    return is_array($data) && ($data['success'] ?? false) === true;
}

function send_mail(string $apiKey, array $mail): bool
{
    [$status, $data, $error] = post_json(RESEND_URL, $mail, ['Authorization: Bearer ' . $apiKey]);
    if ($status >= 200 && $status < 300) return true;
    error_log('[upit] Resend greška ' . $status . ': ' . ($error ?: json_encode($data)));
    return false;
}

function sales_email(array $i, string $modelName): string
{
    $rows = [
        ['Model', $modelName],
        ['Boja', $i['color'] !== '' ? $i['color'] : '—'],
        ['Ime i prezime', $i['name']],
        ['Telefon', $i['phone']],
        ['Email', $i['email']],
        ['Želi kontakt putem', $i['contactPreference'] === 'telefon' ? 'Telefona' : 'Email-a'],
    ];
    $html = '<h2 style="font-family:sans-serif">Novi upit: ' . e($modelName) . ($i['color'] !== '' ? ' (' . e($i['color']) . ')' : '') . '</h2>';
    $html .= '<table style="font-family:sans-serif;border-collapse:collapse">';
    foreach ($rows as [$k, $v]) {
        $html .= '<tr><td style="padding:6px 16px 6px 0;color:#666">' . $k . '</td><td style="padding:6px 0"><strong>' . e($v) . '</strong></td></tr>';
    }
    $html .= '</table>';
    if ($i['message'] !== '') $html .= '<p style="font-family:sans-serif;white-space:pre-line;margin-top:16px">' . e($i['message']) . '</p>';
    $tel = preg_replace('/[^\d+]/', '', $i['phone']);
    $html .= '<p style="font-family:sans-serif;margin-top:24px"><a href="tel:' . e($tel) . '">Pozovi kupca</a> · Odgovorom na ovaj email pišete direktno kupcu.</p>';
    return $html;
}

function customer_email(array $i, string $modelName, string $company, string $phone): string
{
    $way = $i['contactPreference'] === 'telefon' ? 'telefonom' : 'mejlom';
    return '<p style="font-family:sans-serif">Poštovani/a ' . e($i['name']) . ',</p>'
        . '<p style="font-family:sans-serif">hvala na interesovanju za <strong>' . e($modelName) . '</strong>'
        . ($i['color'] !== '' ? ' u boji <strong>' . e($i['color']) . '</strong>' : '') . '. '
        . 'Primili smo vaš upit i javićemo vam se ' . $way . ' u najkraćem roku.</p>'
        . '<p style="font-family:sans-serif">Ako vam je hitno, pozovite nas na ' . e($phone) . '.</p>'
        . '<p style="font-family:sans-serif">Srdačan pozdrav,<br>' . e($company) . '</p>';
}

// --- Obrada zahteva ------------------------------------------------------------

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    header('Allow: POST');
    http_response_code(405);
    exit;
}

// Honeypot: ljudi ne vide ovo polje, botovi ga popune – tiho "uspeh"
if (trim((string) ($_POST['website'] ?? '')) !== '') respond(true);

$field = fn (string $k): string => trim((string) ($_POST[$k] ?? ''));
$i = [
    'name' => $field('name'),
    'phone' => $field('phone'),
    'email' => $field('email'),
    'model' => $field('model'),
    'color' => $field('color'),
    'contactPreference' => $field('contactPreference') ?: 'telefon',
    'message' => $field('message'),
];

// Ista pravila kao ranije (zod šema)
$errors = [];
if (len($i['name']) < 2 || len($i['name']) > 100) $errors['name'] = 'Unesite ime i prezime';
if (!preg_match('/^\+?[0-9\s\/().-]{6,20}$/', $i['phone'])) $errors['phone'] = 'Unesite ispravan broj telefona';
if (!filter_var($i['email'], FILTER_VALIDATE_EMAIL) || len($i['email']) > 200) $errors['email'] = 'Unesite ispravnu email adresu';
if ($i['model'] === '') $errors['model'] = 'Izaberite model';
if (len($i['color']) > 60) $errors['color'] = 'Naziv boje je predugačak';
if (!in_array($i['contactPreference'], ['telefon', 'email'], true)) $errors['contactPreference'] = 'Izaberite način kontakta';
if (len($i['message']) > 2000) $errors['message'] = 'Poruka može imati najviše 2000 znakova';
if (($_POST['consent'] ?? '') !== 'on') $errors['consent'] = 'Potrebna je saglasnost za obradu podataka';
if ($errors) fail($errors);

$config = load_config();
$ip = $_SERVER['REMOTE_ADDR'] ?? null;
if (!verify_turnstile((string) ($config['TURNSTILE_SECRET_KEY'] ?? ''), $field('cf-turnstile-response'), $ip)) {
    fail(['form' => 'Provera protiv spama nije uspela. Osvežite stranicu i pokušajte ponovo.']);
}

// Nazivi modela i kontakt firme iz build-a (src/pages/api/site-data.json.ts)
$site = json_decode((string) @file_get_contents(__DIR__ . '/site-data.json'), true) ?: [];
$settings = $site['settings'] ?? [];
$modelName = $site['models'][$i['model']] ?? ($i['model'] === 'ostalo' ? 'Opšti upit' : $i['model']);

$apiKey = (string) ($config['RESEND_API_KEY'] ?? '');
$to = (string) (($config['INQUIRY_TO_EMAIL'] ?? '') ?: ($settings['email'] ?? ''));
$from = (string) (($config['INQUIRY_FROM_EMAIL'] ?? '') ?: 'Xtreme Motors <onboarding@resend.dev>');
if ($apiKey === '' || $to === '') {
    error_log('[upit] nedostaje RESEND_API_KEY ili INQUIRY_TO_EMAIL u xtreme-config.php');
    fail(['form' => 'Slanje trenutno nije moguće. Pozovite nas telefonom.'], 500);
}

$subject = 'Upit: ' . $modelName . ($i['color'] !== '' ? ' – ' . $i['color'] : '') . ' (' . $i['name'] . ')';
if (!send_mail($apiKey, ['from' => $from, 'to' => [$to], 'reply_to' => $i['email'], 'subject' => $subject, 'html' => sales_email($i, $modelName)])) {
    fail(['form' => 'Došlo je do greške pri slanju. Pokušajte ponovo ili nas pozovite.'], 502);
}

// Potvrda kupcu – neuspeh ne obara upit jer je prodaja već obaveštena
send_mail($apiKey, [
    'from' => $from,
    'to' => [$i['email']],
    'reply_to' => (string) ($settings['email'] ?? $to),
    'subject' => 'Primili smo vaš upit – ' . $modelName,
    'html' => customer_email($i, $modelName, (string) ($settings['companyName'] ?? 'Xtreme Motors'), (string) ($settings['phone'] ?? '')),
]);

respond(true);
