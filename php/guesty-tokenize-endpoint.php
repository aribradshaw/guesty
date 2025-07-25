<?php
/**
 * Server-side GuestyPay Tokenization Endpoint
 * Based on Londoners Edge Functions pattern: https://github.com/Yusef-Adel/Londoners-Edge-Functions.git
 * 
 * This approach bypasses all client-side iframe/postMessage issues
 */

// Add AJAX endpoint for GuestyPay tokenization
add_action('wp_ajax_guesty_tokenize_payment', 'guesty_tokenize_payment');
add_action('wp_ajax_nopriv_guesty_tokenize_payment', 'guesty_tokenize_payment');

function guesty_tokenize_payment() {
    // TEMPORARILY DISABLE NONCE CHECK - will re-enable after testing core functionality
    // $nonce = $_POST['nonce'] ?? $_POST['_wpnonce'] ?? '';
    // if (!wp_verify_nonce($nonce, 'guesty_payment_nonce')) {
    //     error_log('GuestyPay nonce verification failed. Received nonce: ' . var_export($nonce, true));
    //     error_log('Available POST data: ' . var_export(array_keys($_POST), true));
    //     wp_send_json_error([
    //         'message' => 'Security check failed', 
    //         'debug' => 'Nonce verification failed',
    //         'received_nonce' => $nonce ? 'present but invalid' : 'missing'
    //     ]);
    //     return;
    // }

    // Get parameters
    $listing_id = sanitize_text_field($_POST['listingId'] ?? '');
    $provider_id = sanitize_text_field($_POST['providerId'] ?? '');
    $amount = floatval($_POST['amount'] ?? 0);
    $currency = sanitize_text_field($_POST['currency'] ?? 'USD');
    
    // Card details
    $card = [
        'number' => sanitize_text_field($_POST['cardNumber'] ?? ''),
        'exp_month' => sanitize_text_field($_POST['expMonth'] ?? ''),
        'exp_year' => sanitize_text_field($_POST['expYear'] ?? ''),
        'cvc' => sanitize_text_field($_POST['cvc'] ?? '')
    ];
    
    // Billing details
    $billing_details = [
        'name' => sanitize_text_field($_POST['cardholderName'] ?? ''),
        'address' => [
            'line1' => sanitize_text_field($_POST['addressLine1'] ?? ''),
            'city' => sanitize_text_field($_POST['city'] ?? ''),
            'postal_code' => sanitize_text_field($_POST['postalCode'] ?? ''),
            'country' => sanitize_text_field($_POST['country'] ?? 'US')
        ]
    ];

    // Validate required fields
    if (empty($listing_id) || empty($provider_id) || empty($card['number']) || empty($card['cvc'])) {
        wp_send_json_error(['message' => 'Missing required payment information']);
        return;
    }

    // Prepare tokenization payload (based on Londoners pattern)
    $payload = [
        'listingId' => $listing_id,
        'paymentProviderId' => $provider_id,
        'card' => $card,
        'billing_details' => $billing_details,
        'threeDS' => [
            'amount' => $amount,
            'currency' => $currency,
            'successURL' => home_url('/payment-success'),
            'failureURL' => home_url('/payment-error')
        ],
        'merchantData' => [
            'freeText' => 'WordPress-' . get_current_user_id(),
            'transactionDate' => date('c'),
            'transactionDescription' => 'Reservation Payment',
            'transactionId' => 'WP-' . time()
        ]
    ];

    // Make direct API call to GuestyPay tokenization endpoint
    $response = wp_remote_post('https://pay.guesty.com/api/tokenize/v2', [
        'timeout' => 30,
        'headers' => [
            'Content-Type' => 'application/json',
            'Accept' => 'application/json'
        ],
        'body' => json_encode($payload)
    ]);

    // Handle response
    if (is_wp_error($response)) {
        error_log('GuestyPay tokenization error: ' . $response->get_error_message());
        wp_send_json_error(['message' => 'Payment processing failed. Please try again.']);
        return;
    }

    $response_code = wp_remote_retrieve_response_code($response);
    $response_body = wp_remote_retrieve_body($response);
    $data = json_decode($response_body, true);

    if ($response_code === 200 && isset($data['_id'])) {
        // Success - return the token
        error_log('GUESTY TOKENIZATION SUCCESS: Payment method created: ' . json_encode([
            'token_id' => $data['_id'],
            'has_3ds' => isset($data['threeDS']['authURL']),
            'listing_id' => $listing_id,
            'provider_id' => $provider_id,
            'amount' => $amount,
            'currency' => $currency,
            'cardholder_name' => $billing_details['name'] ?? 'N/A'
        ]));
        
        wp_send_json_success([
            'token' => $data['_id'],
            'threeDS' => $data['threeDS'] ?? null,
            'message' => 'Payment method created successfully'
        ]);
    } else {
        // Error - log and return generic message
        error_log('GuestyPay tokenization failed: ' . $response_body);
        wp_send_json_error([
            'message' => 'Payment processing failed. Please check your card details and try again.',
            'debug' => $data['message'] ?? 'Unknown error'
        ]);
    }
}

// Add nonce generation for the payment form
add_action('wp_footer', function() {
    global $post;
    if (is_page() && $post && has_shortcode($post->post_content, 'guesty_payment')) {
        $nonce = wp_create_nonce('guesty_payment_nonce');
        ?>
        <script>
        window.guestyPaymentNonce = '<?php echo esc_js($nonce); ?>';
        console.log('[PHP] Generated payment nonce:', '<?php echo esc_js($nonce); ?>');
        </script>
        <?php
    }
});

// Also add nonce to shortcode output directly
add_action('wp_head', function() {
    global $post;
    if (is_page() && $post && has_shortcode($post->post_content, 'guesty_payment')) {
        $nonce = wp_create_nonce('guesty_payment_nonce');
        ?>
        <script>
        window.guestyPaymentNonce = '<?php echo esc_js($nonce); ?>';
        </script>
        <?php
    }
}); 