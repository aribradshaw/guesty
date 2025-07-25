<?php
// Shortcode for Guesty Payment
// IMPORTANT: Make sure to include the [guesty_payment] shortcode on the same page as the booking calendar for payment to work!
function guesty_payment_shortcode($atts) {
    ob_start();
    ?>
    <div id="guesty-payment-section">
        <script>
        // Generate nonce directly in shortcode
        window.guestyPaymentNonce = '<?php echo wp_create_nonce('guesty_payment_nonce'); ?>';
        console.log('[Shortcode] Generated payment nonce:', window.guestyPaymentNonce);
        </script>
        <div id="guesty-payment-fields">
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
                <select id="guest-country" required>
                    <option value="">Country</option>
                    <option value="US">United States</option>
                    <option value="CA">Canada</option>
                    <option value="GB">United Kingdom</option>
                    <option value="AU">Australia</option>
                    <option value="FR">France</option>
                    <option value="DE">Germany</option>
                    <option value="IT">Italy</option>
                    <option value="ES">Spain</option>
                    <option value="MX">Mexico</option>
                    <option value="BR">Brazil</option>
                    <option value="IN">India</option>
                    <option value="JP">Japan</option>
                    <option value="CN">China</option>
                    <option value="ZA">South Africa</option>
                    <option value="IE">Ireland</option>
                    <option value="NZ">New Zealand</option>
                    <option value="SG">Singapore</option>
                    <option value="NL">Netherlands</option>
                    <option value="SE">Sweden</option>
                    <option value="CH">Switzerland</option>
                    <option value="BE">Belgium</option>
                    <option value="AT">Austria</option>
                    <option value="DK">Denmark</option>
                    <option value="NO">Norway</option>
                    <option value="FI">Finland</option>
                    <option value="PL">Poland</option>
                    <option value="PT">Portugal</option>
                    <option value="RU">Russia</option>
                    <option value="KR">South Korea</option>
                    <option value="AR">Argentina</option>
                    <option value="CL">Chile</option>
                    <option value="CO">Colombia</option>
                    <option value="IL">Israel</option>
                    <option value="TR">Turkey</option>
                    <option value="GR">Greece</option>
                    <option value="CZ">Czech Republic</option>
                    <option value="HU">Hungary</option>
                    <option value="RO">Romania</option>
                    <option value="SK">Slovakia</option>
                    <option value="BG">Bulgaria</option>
                    <option value="HR">Croatia</option>
                    <option value="SI">Slovenia</option>
                    <option value="EE">Estonia</option>
                    <option value="LV">Latvia</option>
                    <option value="LT">Lithuania</option>
                    <option value="LU">Luxembourg</option>
                    <option value="MT">Malta</option>
                    <option value="CY">Cyprus</option>
                </select>
                <input type="text" id="guest-postal-code" placeholder="Postal Code" required>
            </div>
        </div>
        <div id="guesty-payment-form">
            <h3>Payment Details</h3>
            <div id="guesty-tokenization-container"></div>
            <button id="guesty-pay-btn" type="button">Pay Now</button>
            <div id="guesty-payment-message"></div>
        </div>
        <div id="guesty-payment-indicator"></div>
    </div>
    <script src="https://pay.guesty.com/tokenization/v2/init.js"></script>
    <?php
    return ob_get_clean();
}
add_shortcode('guesty_payment', 'guesty_payment_shortcode');

// Register and enqueue JS
add_action('wp_enqueue_scripts', function () {
    // Load the new server-side approach instead of the iframe approach
    wp_register_script(
        'guesty-payment-serverside-script',
        plugin_dir_url(dirname(__FILE__)) . '/js/guesty-payment-serverside.js',
        ['jquery'],
        '1.1',
        true
    );
    wp_enqueue_script('guesty-payment-serverside-script');
    
    // Also load the original script for Stripe compatibility
    wp_register_script(
        'guesty-payment-script',
        plugin_dir_url(dirname(__FILE__)) . '/js/guesty-payment.js',
        ['jquery'],
        '1.0',
        true
    );
    wp_enqueue_script('guesty-payment-script');
    
    // FIX: Use the same object name as in JS (guestyAjax)
    wp_localize_script('guesty-payment-serverside-script', 'guestyAjax', [
        'ajax_url' => admin_url('admin-ajax.php'),
    ]);
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
    
    // Add inline CSS for loading spinner
    wp_add_inline_style('guesty-payment-style', '
        .loading-spinner {
            display: inline-block;
            width: 16px;
            height: 16px;
            border: 2px solid #f3f3f3;
            border-top: 2px solid #3498db;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-right: 8px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        #guesty-payment-indicator {
            position: absolute;
            bottom: 8px;
            left: 8px;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            font-weight: bold;
            color: white;
            text-shadow: 0 1px 2px rgba(0,0,0,0.3);
            z-index: 10;
        }
        
        #guesty-payment-indicator.guestypay {
            background-color: #4CAF50;
        }
        
        #guesty-payment-indicator.stripe {
            background-color: #6772E5;
        }
        
        #guesty-payment-section {
            position: relative;
        }
        
        /* GuestyPay form styling */
        .guesty-card-fields {
            margin-bottom: 15px;
        }
        
        .guesty-card-number-container {
            margin-bottom: 10px;
        }
        
        .guesty-card-number-container input,
        .guesty-card-expiry-container input,
        .guesty-card-cvc-container input {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
            box-sizing: border-box;
        }
        
        .guesty-card-expiry-container,
        .guesty-card-cvc-container {
            flex: 1;
            margin-right: 10px;
        }
        
        .guesty-card-cvc-container {
            margin-right: 0;
        }
        
        /* Server-side payment form styling */
        #guesty-serverside-form {
            max-width: 400px;
            margin: 0 auto;
            padding: 20px;
            border: 1px solid #ddd;
            border-radius: 8px;
            background: #fff;
        }
        
        .payment-method-indicator {
            display: flex;
            align-items: center;
            margin-bottom: 20px;
            padding: 10px;
            background: #f8f9fa;
            border-radius: 6px;
        }
        
        .method-badge {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: bold;
            color: white;
            margin-right: 10px;
        }
        
        .method-badge.guestypay {
            background-color: #4CAF50;
        }
        
        .method-text {
            font-size: 14px;
            color: #666;
        }
        
        .card-input-group {
            margin-bottom: 15px;
        }
        
        .card-input-group label {
            display: block;
            margin-bottom: 5px;
            font-weight: 500;
            color: #333;
            font-size: 14px;
        }
        
        .card-input-group input {
            width: 100%;
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 16px;
            box-sizing: border-box;
            transition: border-color 0.3s ease;
        }
        
        .card-input-group input:focus {
            outline: none;
            border-color: #4CAF50;
            box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
        }
        
        .card-row {
            display: flex;
            gap: 15px;
        }
        
        .card-row .card-input-group {
            flex: 1;
        }
        
        .security-notice {
            display: flex;
            align-items: center;
            margin-top: 15px;
            padding: 10px;
            background: #e8f5e8;
            border-radius: 4px;
            font-size: 12px;
            color: #2e7d32;
        }
        
        .security-icon {
            margin-right: 8px;
            font-size: 16px;
        }
        
        .error-message {
            background: #ffebee;
            color: #c62828;
            padding: 10px;
            border-radius: 4px;
            border: 1px solid #ffcdd2;
            margin-bottom: 15px;
        }
    ');
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

    // Log payment verification details
    error_log('GUESTY PAYMENT SUCCESS: Reservation created with payment details: ' . json_encode([
        'reservation_id' => $data['_id'],
        'confirmation_code' => $data['confirmationCode'] ?? 'N/A',
        'status' => $data['status'] ?? 'N/A',
        'guest_email' => $guest['email'] ?? 'N/A',
        'cc_token_used' => $ccToken,
        'quote_id' => $quoteId,
        'rate_plan_id' => $ratePlanId,
        'token_set' => $token_set,
        'response_code' => wp_remote_retrieve_response_code($response)
    ]));

    wp_send_json_success($data);
}

// Include the server-side tokenization endpoint
require_once __DIR__ . '/guesty-tokenize-endpoint.php';