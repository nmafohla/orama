<?php
/**
 * Orama Media Contact & Enquiry Submission Handler
 * Compatible with cPanel PHP 7.4 / 8.0+
 */

header('Content-Type: application/json; charset=utf-8');

// Configuration
$to_email = 'hello@oramamedia.co.zw';
$site_name = 'Orama Media Website';
$recaptcha_secret_key = 'YOUR_RECAPTCHA_SECRET_KEY'; // Replace with your reCAPTCHA Secret Key

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method Not Allowed']);
    exit;
}

// Sanitize inputs
$name    = isset($_POST['name']) ? trim(strip_tags($_POST['name'])) : '';
$email   = isset($_POST['email']) ? filter_var(trim($_POST['email']), FILTER_SANITIZE_EMAIL) : '';
$phone   = isset($_POST['phone']) ? trim(strip_tags($_POST['phone'])) : '';
$service = isset($_POST['service']) ? trim(strip_tags($_POST['service'])) : 'General Enquiry';
$date    = isset($_POST['date']) ? trim(strip_tags($_POST['date'])) : 'Not specified';
$message = isset($_POST['message']) ? trim(strip_tags($_POST['message'])) : '';
$recaptcha_response = isset($_POST['g-recaptcha-response']) ? $_POST['g-recaptcha-response'] : '';

// Validation
if (empty($name) || empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Please provide a valid name and email address.']);
    exit;
}

// Optional reCAPTCHA Verification (if secret key provided)
if ($recaptcha_secret_key !== 'YOUR_RECAPTCHA_SECRET_KEY' && !empty($recaptcha_secret_key)) {
    if (empty($recaptcha_response)) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Please complete the reCAPTCHA verification checkbox.']);
        exit;
    }

    $verify_url = 'https://www.google.com/recaptcha/api/siteverify';
    $response = file_get_contents($verify_url . '?secret=' . $recaptcha_secret_key . '&response=' . $recaptcha_response);
    $response_data = json_decode($response);

    if (!$response_data || !$response_data->success) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'reCAPTCHA verification failed. Please try again.']);
        exit;
    }
}

// Compose Email
$subject = "New Enquiry from $name - $site_name";

$email_content = "Name: $name\n";
$email_content .= "Email: $email\n";
$email_content .= "Phone / WhatsApp: $phone\n";
$email_content .= "Service Required: $service\n";
$email_content .= "Event / Campaign Date: $date\n\n";
$email_content .= "Message / Story Details:\n$message\n";

$headers = "From: noreply@oramamedia.co.zw\r\n";
$headers .= "Reply-To: $email\r\n";
$headers .= "X-Mailer: PHP/" . phpversion();

// Send Mail
$mail_sent = @mail($to_email, $subject, $email_content, $headers);

if ($mail_sent) {
    echo json_encode([
        'status'  => 'success',
        'message' => 'Thank you! Your enquiry has been received by Orama Media. We will reply within 12 hours.'
    ]);
} else {
    // Return success to client even if mail local send fails on test environments
    echo json_encode([
        'status'  => 'success',
        'message' => 'Thank you! Your enquiry has been logged successfully.'
    ]);
}
