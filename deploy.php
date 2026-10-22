<?php
/**
 * GitHub -> cPanel auto-deploy for orama.
 *
 * - Verifies GitHub's X-Hub-Signature-256 (HMAC-SHA256) with hash_equals.
 * - Only deploys on a "push" to refs/heads/main.
 * - Runs `git fetch origin main && git reset --hard origin/main` in this file's folder.
 * - Secret is read from a file OUTSIDE the web root (never stored in the repo):
 *       /home/hakilico/.deploy-secrets/orama.txt
 * - Brief log: /home/hakilico/.deploy-logs/orama.log
 */

const SITE        = 'orama';
const HOME_DIR    = '/home/hakilico';
const SECRET_FILE = HOME_DIR . '/.deploy-secrets/' . SITE . '.txt';
const LOG_DIR     = HOME_DIR . '/.deploy-logs';
const DEPLOY_DIR  = __DIR__;   // the site folder, which must be a git clone of the repo
const BRANCH      = 'main';

header('Content-Type: text/plain; charset=utf-8');
header('Cache-Control: no-store');

function deploy_log(string $msg): void {
    if (!is_dir(LOG_DIR)) { @mkdir(LOG_DIR, 0700, true); }
    @file_put_contents(LOG_DIR . '/' . SITE . '.log', gmdate('c') . ' ' . $msg . "\n", FILE_APPEND | LOCK_EX);
}

function finish(int $code, string $msg): void {
    http_response_code($code);
    echo $msg . "\n";
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    finish(405, 'Method Not Allowed');
}

$secret = is_readable(SECRET_FILE) ? trim((string) file_get_contents(SECRET_FILE)) : '';
if ($secret === '') {
    deploy_log('ERROR secret file missing or empty');
    finish(500, 'Deploy not configured');
}

$payload   = file_get_contents('php://input');
$signature = $_SERVER['HTTP_X_HUB_SIGNATURE_256'] ?? '';
$expected  = 'sha256=' . hash_hmac('sha256', $payload === false ? '' : $payload, $secret);
if ($signature === '' || !hash_equals($expected, $signature)) {
    deploy_log('DENIED bad signature from ' . ($_SERVER['REMOTE_ADDR'] ?? '?'));
    finish(403, 'Forbidden');
}

$event = $_SERVER['HTTP_X_GITHUB_EVENT'] ?? '';
if ($event === 'ping') {
    deploy_log('ping ok');
    finish(200, 'pong');
}
if ($event !== 'push') {
    finish(202, 'Ignored event: ' . preg_replace('/[^a-z_]/', '', $event));
}

// Body may be JSON or form-encoded (payload=...).
$data = json_decode((string) $payload, true);
if (!is_array($data) && isset($_POST['payload'])) {
    $data = json_decode((string) $_POST['payload'], true);
}
$ref = is_array($data) ? (string) ($data['ref'] ?? '') : '';
if ($ref !== 'refs/heads/' . BRANCH) {
    finish(202, 'Ignored ref');
}

if (!is_dir(DEPLOY_DIR . '/.git')) {
    deploy_log('ERROR ' . DEPLOY_DIR . ' is not a git checkout');
    finish(500, 'Deploy folder is not a git checkout');
}
if (!function_exists('exec')) {
    deploy_log('ERROR exec() disabled');
    finish(500, 'exec() is disabled');
}

$cmd = 'export HOME=' . escapeshellarg(HOME_DIR)
     . ' && export PATH="$PATH:/usr/local/bin:/usr/bin:/bin:/usr/local/cpanel/3rdparty/bin"'
     . ' && cd ' . escapeshellarg(DEPLOY_DIR)
     . ' && git fetch --quiet origin ' . BRANCH
     . ' && git reset --hard origin/' . BRANCH
     . ' 2>&1';
$out = [];
$rc  = 1;
exec($cmd, $out, $rc);
$summary = trim(implode(' | ', array_slice($out, -3)));
$after   = substr((string) ($data['after'] ?? ''), 0, 12);

if ($rc !== 0) {
    deploy_log("FAIL rc=$rc commit=$after $summary");
    finish(500, 'Deploy failed');
}
deploy_log("OK commit=$after $summary");
finish(200, 'Deployed ' . $after);
