<?php
// Shortcode for Guesty Payment
// IMPORTANT: Make sure to include the [guesty_payment] shortcode on the same page as the booking calendar for payment to work!
function guesty_payment_shortcode($atts) {
    ob_start();
    ?>
    <div id="guesty-payment-section" style="display:none;">
        <form id="guesty-guest-form" style="display:none;">
            <h3>Guest Details</h3>
            <div class="guesty-row">
                <input type="text" id="guest-first-name" placeholder="First Name" required>
                <input type="text" id="guest-last-name" placeholder="Last Name" required>
            </div>
            <div class="guesty-row">
                <input type="email" id="guest-email" placeholder="Email" required>
                <input type="tel" id="guest-phone" placeholder="Phone" required>
            </div>
            <input type="text" id="guest-address-line1" placeholder="Address Line 1" required>
            <div class="guesty-row">
                <input type="text" id="guest-city" placeholder="City" required>
                <input type="text" id="guest-country" placeholder="Country (e.g. US)" required>
                <input type="text" id="guest-postal-code" placeholder="Postal Code" required>
            </div>
            <button type="submit">Continue to Payment</button>
        </form>
        <form id="guesty-payment-form" style="display:none;">
            <h3>Payment Details</h3>
            <div id="guesty-tokenization-container"></div>
            <button id="guesty-pay-btn" type="button">Book Now</button>
            <div id="guesty-payment-message"></div>
        </form>
    </div>
    <script src="https://pay.guesty.com/tokenization/v2/init.js"></script>
    <?php
    return ob_get_clean();
}
add_shortcode('guesty_payment', 'guesty_payment_shortcode');

// Register and enqueue JS
add_action('wp_enqueue_scripts', function () {
    wp_register_script(
        'guesty-payment-script',
        plugin_dir_url(dirname(__FILE__)) . '/js/guesty-payment.js',
        ['jquery'],
        '1.0',
        true
    );
    wp_enqueue_script('guesty-payment-script');
    // FIX: Use the same object name as in JS (guestyAjax)
    wp_localize_script('guesty-payment-script', 'guestyAjax', [
        'ajax_url' => admin_url('admin-ajax.php'),
    ]);
});

add_action('wp_enqueue_scripts', function () {
    wp_enqueue_style(
        'guesty-payment-style',
        plugin_dir_url(dirname(__FILE__)) . 'css/guesty-payment.css',
        [],
        '1.0'
    );
});

add_action('wp_ajax_guesty_create_reservation', 'guesty_create_reservation');
add_action('wp_ajax_nopriv_guesty_create_reservation', 'guesty_create_reservation');

function guesty_create_reservation() {
    $guest = isset($_POST['guest']) ? $_POST['guest'] : [];
    $ccToken = sanitize_text_field($_POST['ccToken'] ?? '');
    $quoteId = sanitize_text_field($_POST['quoteId'] ?? '');
    $ratePlanId = sanitize_text_field($_POST['ratePlanId'] ?? '');
    $token_set = intval($_POST['token_set'] ?? 0);

    // Get correct API token as in your other handlers
    $client_id_1 = get_option('guesty_client_id_1', '');
    $client_secret_1 = get_option('guesty_client_secret_1', '');
    $client_id_2 = get_option('guesty_client_id_2', '');
    $client_secret_2 = get_option('guesty_client_secret_2', '');

    $token = ($token_set === 2)
        ? guesty_get_bearer_token($client_id_2, $client_secret_2)
        : guesty_get_bearer_token($client_id_1, $client_secret_1);

    if (!$token) {
        wp_send_json_error(['message' => 'Unable to retrieve API token.']);
    }

    // Build the reservation payload
    $payload = [
        'ratePlanId' => $ratePlanId,
        'ccToken' => $ccToken,
        'guest' => $guest,
        // Add policy object if needed
    ];

    $response = wp_remote_post("https://booking.guesty.com/api/reservations/quotes/{$quoteId}/instant", [
        'headers' => [
            'Authorization' => "Bearer $token",
            'Content-Type' => 'application/json',
            'Accept' => 'application/json; charset=utf-8',
        ],
        'body' => json_encode($payload),
    ]);

    if (is_wp_error($response)) {
        wp_send_json_error(['message' => 'Error communicating with Guesty API.', 'error' => $response->get_error_message()]);
    }

    $data = json_decode(wp_remote_retrieve_body($response), true);

    if (empty($data['_id'])) {
        wp_send_json_error(['message' => 'No confirmation returned from Guesty.', 'raw' => $data]);
    }

    wp_send_json_success($data);
}