<?php
/**
 * Orama Media enquiry handler.
 * The reCAPTCHA secret is never stored in this file.
 * Put it in the server environment as RECAPTCHA_SECRET_KEY,
 * or in /home/hakilico/.site-private/orama-recaptcha.txt
 */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

const TO_EMAIL = 'hello@oramamedia.co.zw';
const FROM_EMAIL = 'noreply@oramamedia.co.zw';

function orama_fail(int $code, string $msg): void {
    http_response_code($code);
    echo json_encode(['status' => 'error', 'message' => $msg]);
    exit;
}

function orama_clean($value, int $max = 2000): string {
    $value = trim(str_replace(["\r", "\n", "\0"], ' ', (string) $value));
    $value = trim(strip_tags($value));
    if (function_exists('mb_substr')) {
        return mb_substr($value, 0, $max);
    }
    return substr($value, 0, $max);
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    orama_fail(405, 'Method not allowed');
}

$privateDir = '/home/hakilico/.site-private';
if (!is_dir($privateDir)) {
    @mkdir($privateDir, 0700, true);
}

$secret = getenv('RECAPTCHA_SECRET_KEY');
if (!is_string($secret) || trim($secret) === '') {
    $secretFile = $privateDir . '/orama-recaptcha.txt';
    $secret = is_readable($secretFile) ? trim((string) file_get_contents($secretFile)) : '';
}

$ip = (string) ($_SERVER['REMOTE_ADDR'] ?? '');
if ($ip !== '' && is_dir($privateDir) && is_writable($privateDir)) {
    $rateFile = $privateDir . '/orama-rl-' . hash('sha256', $ip);
    $now = time();
    $hits = [];
    if (is_file($rateFile)) {
        $decoded = json_decode((string) @file_get_contents($rateFile), true);
        if (is_array($decoded)) {
            $hits = $decoded;
        }
    }
    $hits = array_values(array_filter($hits, function ($t) use ($now) {
        return is_int($t) && ($now - $t) < 3600;
    }));
    if (count($hits) >= 8) {
        orama_fail(429, 'Too many enquiries from this network. Please wait and try again.');
    }
    $hits[] = $now;
    @file_put_contents($rateFile, json_encode($hits), LOCK_EX);
}

$name = orama_clean($_POST['name'] ?? '', 200);
$email = orama_clean($_POST['email'] ?? '', 200);
$phone = orama_clean($_POST['phone'] ?? '', 60);
$service = orama_clean($_POST['service'] ?? 'General Enquiry', 200);
$date = orama_clean($_POST['date'] ?? 'Not specified', 80);
$message = orama_clean($_POST['message'] ?? '', 5000);
$captcha = orama_clean($_POST['g-recaptcha-response'] ?? '', 4000);

if ($name === '' || $email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    orama_fail(400, 'Please provide a valid name and email address.');
}

if ($secret !== '') {
    if ($captcha === '') {
        orama_fail(400, 'Please complete the captcha and try again.');
    }
    $verify = @file_get_contents('https://www.google.com/recaptcha/api/siteverify?' . http_build_query([
        'secret' => $secret,
        'response' => $captcha,
        'remoteip' => $ip,
    ]));
    $parsed = json_decode((string) $verify);
    if (!$parsed || empty($parsed->success)) {
        orama_fail(400, 'Captcha check failed. Please try again.');
    }
}

$body = "Name: $name\nEmail: $email\nPhone / WhatsApp: $phone\nService: $service\nDate: $date\n\n$message\n";
$headers = [
    'From: Orama Media <' . FROM_EMAIL . '>',
    'Reply-To: ' . $email,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
];
$subject = 'New enquiry from ' . $name;
$sent = @mail(
    TO_EMAIL,
    '=?UTF-8?B?' . base64_encode($subject) . '?=',
    $body,
    implode("\r\n", $headers),
    '-f' . FROM_EMAIL
);

if (!$sent) {
    orama_fail(502, 'The message could not be sent. Please try again shortly.');
}

echo json_encode([
    'status' => 'success',
    'message' => 'Thank you. Your enquiry has been sent to Orama Media.',
]);
