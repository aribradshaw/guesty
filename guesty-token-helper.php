<?php
/**
 * Plugin Name: MannaGuesty by The Manna Agency and Flygon LC
 * Description: Securely handles Guesty API bearer token and exposes it to front-end JavaScript. Allows various Guesty API shortcode calls.
 * Version: 2.12 - flatpickr 3 Month Calendar Integration
 * Author: Ari Daniel Bradshaw - Flygon LC & Dan Park - The Manna Agency
 */

if ( ! defined( 'MANNAPRESS_FILE' ) ) {
    define( 'MANNAPRESS_FILE', __FILE__ );
}
if ( ! defined( 'MANNAPRESS_PLUGIN_URL' ) ) {
    define( 'MANNAPRESS_PLUGIN_URL', plugin_dir_url( __FILE__ ) );
}

// Load the other php files plugin.
require_once dirname( MANNAPRESS_FILE ) . '/php/guesty-booking-calendar.php';
require_once dirname( MANNAPRESS_FILE ) . '/php/guesty-admin-page.php';
require_once dirname( MANNAPRESS_FILE ) . '/php/guesty-reviews.php';
require_once dirname( MANNAPRESS_FILE ) . '/php/guesty-map.php';
require_once dirname( MANNAPRESS_FILE ) . '/php/guesty-payment.php';
require_once dirname( MANNAPRESS_FILE ) . '/php/guesty-all-properties.php';
// Load the new listing/page mapping admin page
require_once dirname( MANNAPRESS_FILE ) . '/php/guesty-listing-page-mapping.php';
require_once dirname( MANNAPRESS_FILE ) . '/php/guesty-slides.php';

add_action('wp_ajax_get_guesty_token', 'guesty_token_ajax');
add_action('wp_ajax_nopriv_get_guesty_token', 'guesty_token_ajax');

// Enqueue JavaScript and CSS files for the shortcode
add_action('wp_enqueue_scripts', function () {
    // Enqueue the JavaScript file
    wp_register_script('guesty-attributes-script', plugin_dir_url(__FILE__) . 'js/guesty-attributes.js', ['jquery'], '1.0', true);
    wp_localize_script('guesty-attributes-script', 'guestyAjax', [
        'ajax_url' => admin_url('admin-ajax.php'),
    ]);
    wp_enqueue_script('guesty-attributes-script');

    // Enqueue the CSS file
    wp_enqueue_style('guesty-attributes-style', plugin_dir_url(__FILE__) . 'css/guesty-attributes.css', [], '1.0');
});

add_action('wp_enqueue_scripts', function () {
    // Enqueue the JavaScript file for reviews
    wp_register_script('guesty-reviews-script', plugin_dir_url(__FILE__) . 'js/guesty-reviews.js', ['jquery'], '1.0', true);
    wp_localize_script('guesty-reviews-script', 'guestyAjax', [
        'ajax_url' => admin_url('admin-ajax.php'),
    ]);
    wp_enqueue_script('guesty-reviews-script');
});

add_action('wp_enqueue_scripts', function () {
    // Enqueue the JavaScript file for the map
    wp_register_script('guesty-map-script', plugin_dir_url(__FILE__) . 'js/guesty-map.js', ['jquery'], '1.0', true);
    wp_localize_script('guesty-map-script', 'guestyAjax', [
        'ajax_url' => admin_url('admin-ajax.php'),
    ]);
    wp_enqueue_script('guesty-map-script');
});

add_action('wp_enqueue_scripts', function () {    // Register (but don't enqueue) the JavaScript file for the booking calendar
    wp_register_script('guesty-booking-calendar-script', plugin_dir_url(__FILE__) . 'js/guesty-booking-calendar.js', ['jquery'], '2.2', true);
    wp_localize_script('guesty-booking-calendar-script', 'guestyBookingAjax', [
        'ajax_url' => admin_url('admin-ajax.php'),
    ]);    // Register (but don't enqueue) the CSS file for the booking calendar
    wp_register_style('guesty-booking-calendar-style', plugin_dir_url(__FILE__) . 'css/guesty-booking-calendar.css', [], '2.3');
});

function guesty_get_bearer_token($client_id, $client_secret) {
    $cache_key = 'guesty_bearer_token_' . md5($client_id); // Cache token per client ID
    $stored_token = get_transient($cache_key);
    if ($stored_token) {
        return $stored_token;
    }

    $response = wp_remote_post('https://booking.guesty.com/oauth2/token', [
        'headers' => ['Content-Type' => 'application/x-www-form-urlencoded'],
        'body' => [
            'grant_type' => 'client_credentials',
            'scope' => 'booking_engine:api',
            'client_id' => $client_id,
            'client_secret' => $client_secret,
        ],
    ]);

    if (is_wp_error($response)) {
        return null;
    }

    $data = json_decode(wp_remote_retrieve_body($response), true);
    if (empty($data['access_token'])) {
        return null;
    }

    set_transient($cache_key, $data['access_token'], 60 * 60 * 23); // Cache for 23 hours
    return $data['access_token'];
}

function guesty_token_ajax() {
    // Retrieve credentials from the database
    $client_id = get_option('guesty_client_id_1', '');
    $client_secret = get_option('guesty_client_secret_1', '');

    // Generate the token
    $token = guesty_get_bearer_token($client_id, $client_secret);

    if ($token) {
        wp_send_json_success(['token' => $token]);
    } else {
        wp_send_json_error('Could not retrieve token.');
    }
}

/**
 * Handles the property attributes shortcode and AJAX functionality.
 */

// Property Attributes - Bedrooms / Bathrooms / Accommodates / Beds [guesty_attributes]
function guesty_property_attributes_shortcode($atts) {
    // Output a placeholder div for the attributes
    $output = '<div id="guesty-property-attributes">Loading property attributes...</div>';

    // Enqueue the JavaScript file
    wp_enqueue_script('guesty-attributes-script');

    return $output;
}
add_shortcode('guesty_attributes', 'guesty_property_attributes_shortcode');

// AJAX handler for fetching property attributes
add_action('wp_ajax_fetch_guesty_attributes', 'fetch_guesty_attributes');
add_action('wp_ajax_nopriv_fetch_guesty_attributes', 'fetch_guesty_attributes');

function fetch_guesty_attributes() {
    $listing_id = isset($_POST['listing_id']) ? sanitize_text_field($_POST['listing_id']) : '';

    if (empty($listing_id)) {
        wp_send_json_error(['message' => 'No listing ID provided.']);
    }

    // Retrieve credentials from the database
    $client_id_1 = get_option('guesty_client_id_1', '');
    $client_secret_1 = get_option('guesty_client_secret_1', '');
    $client_id_2 = get_option('guesty_client_id_2', '');
    $client_secret_2 = get_option('guesty_client_secret_2', '');

    // Try the first token
    $token = guesty_get_bearer_token($client_id_1, $client_secret_1);
    $response = guesty_fetch_listing_data($listing_id, $token);
    $token_set = 1;

    // If the first fails, try the second
    if (is_wp_error($response) || !isset($response['bedrooms'])) {
        $token = guesty_get_bearer_token($client_id_2, $client_secret_2);
        $response = guesty_fetch_listing_data($listing_id, $token);
        $token_set = 2;
    }

    if (is_wp_error($response)) {
        wp_send_json_error(['message' => 'Error fetching listing data.', 'error' => $response->get_error_message()]);
    }

    if (empty($response)) {
        wp_send_json_error(['message' => 'No data returned from API.']);
    }

    // Generate the HTML for attributes dynamically
    $attributes = [
        'bedrooms'     => '<img src="' . plugin_dir_url(__FILE__) . 'svg/bed.svg" alt="Bedrooms" style="width:1em;height:1em;vertical-align:middle;"> Bedrooms',
        'bathrooms'    => '<img src="' . plugin_dir_url(__FILE__) . 'svg/bathroom.svg" alt="Bathrooms" style="width:1em;height:1em;vertical-align:middle;"> Bathrooms',
        'accommodates' => '<img src="' . plugin_dir_url(__FILE__) . 'svg/accomodates.svg" alt="Accommodates" style="width:1em;height:1em;vertical-align:middle;"> Accommodates',
        'beds'         => '<img src="' . plugin_dir_url(__FILE__) . 'svg/Bed2.svg" alt="Beds" style="width:1em;height:1em;vertical-align:middle;"> Beds',
    ];

    $output = '<div id="guesty-property-attributes">';
    foreach ($attributes as $key => $label) {
        $value = esc_html($response[$key] ?? 'N/A');
        $output .= "<div><span>{$label}</span>: {$value}</div>";
    }
    $output .= '</div>';

    // Return the token_set so JS can use it for all other requests
    wp_send_json_success(['html' => $output, 'token_set' => $token_set]);
}

function guesty_fetch_listing_data($listing_id, $token) {
    if (!$token) {
        return new WP_Error('no_token', 'Unable to retrieve API token.');
    }

    $response = wp_remote_get("https://booking.guesty.com/api/listings/{$listing_id}", [
        'headers' => ['Authorization' => "Bearer $token"],
    ]);

    if (is_wp_error($response)) {
        return $response;
    }

    return json_decode(wp_remote_retrieve_body($response), true);
}

// AJAX handler for requesting a quote
add_action('wp_ajax_request_guesty_quote', 'request_guesty_quote');
add_action('wp_ajax_nopriv_request_guesty_quote', 'request_guesty_quote');

function request_guesty_quote() {
    // Retrieve the required data from the AJAX request
    $listing_id = isset($_POST['listing_id']) ? sanitize_text_field($_POST['listing_id']) : '';
    $check_in_date = isset($_POST['check_in_date']) ? sanitize_text_field($_POST['check_in_date']) : '';
    $check_out_date = isset($_POST['check_out_date']) ? sanitize_text_field($_POST['check_out_date']) : '';
    $guests_count = isset($_POST['guests_count']) ? intval($_POST['guests_count']) : 1;
    $token_set = isset($_POST['token_set']) ? intval($_POST['token_set']) : 0;

    if (empty($listing_id) || empty($check_in_date) || empty($check_out_date)) {
        wp_send_json_error(['message' => 'Missing required parameters.']);
    }

    // Retrieve the correct Guesty API token based on token_set
    $client_id_1 = get_option('guesty_client_id_1', '');
    $client_secret_1 = get_option('guesty_client_secret_1', '');
    $client_id_2 = get_option('guesty_client_id_2', '');
    $client_secret_2 = get_option('guesty_client_secret_2', '');

    if ($token_set === 2) {
        $token = guesty_get_bearer_token($client_id_2, $client_secret_2);
    } else {
        $token = guesty_get_bearer_token($client_id_1, $client_secret_1);
    }

    if (!$token) {
        wp_send_json_error(['message' => 'Unable to retrieve API token.']);
    }

    // Prepare the request to the Guesty API
    $response = wp_remote_post('https://booking.guesty.com/api/reservations/quotes', [
        'headers' => [
            'Authorization' => "Bearer $token",
            'Content-Type' => 'application/json',
            'Accept' => 'application/json; charset=utf-8',
        ],
        'body' => json_encode([
            'guestsCount' => $guests_count,
            'listingId' => $listing_id,
            'checkInDateLocalized' => $check_in_date,
            'checkOutDateLocalized' => $check_out_date,
        ]),
    ]);

    if (is_wp_error($response)) {
        wp_send_json_error(['message' => 'Error communicating with Guesty API.', 'error' => $response->get_error_message()]);
    }    $data = json_decode(wp_remote_retrieve_body($response), true);

    if (empty($data)) {
        wp_send_json_error(['message' => 'No data returned from Guesty API.', 'listing_id' => $listing_id]);
    }

    // Return the response from the Guesty API
    wp_send_json_success($data);
}

// AJAX handler for fetching payment provider
add_action('wp_ajax_get_guesty_payment_provider', 'guesty_get_payment_provider');
add_action('wp_ajax_nopriv_get_guesty_payment_provider', 'guesty_get_payment_provider');

function guesty_get_payment_provider() {
    $listing_id = isset($_POST['listing_id']) ? sanitize_text_field($_POST['listing_id']) : '';
    $token_set = isset($_POST['token_set']) ? intval($_POST['token_set']) : 0;

    if (empty($listing_id)) {
        wp_send_json_error(['message' => 'Missing listing ID.']);
    }

    // Retrieve the correct Guesty API token based on token_set
    $client_id_1 = get_option('guesty_client_id_1', '');
    $client_secret_1 = get_option('guesty_client_secret_1', '');
    $client_id_2 = get_option('guesty_client_id_2', '');
    $client_secret_2 = get_option('guesty_client_secret_2', '');

    if ($token_set === 2) {
        $token = guesty_get_bearer_token($client_id_2, $client_secret_2);
    } else {
        $token = guesty_get_bearer_token($client_id_1, $client_secret_1);
    }

    if (!$token) {
        wp_send_json_error(['message' => 'Unable to retrieve API token.']);
    }

    $response = wp_remote_get("https://booking.guesty.com/api/listings/{$listing_id}/payment-provider", [
        'headers' => [
            'Authorization' => "Bearer $token",
            'Accept' => 'application/json; charset=utf-8',
        ],
    ]);

    if (is_wp_error($response)) {
        wp_send_json_error(['message' => 'Error communicating with Guesty API.', 'error' => $response->get_error_message()]);
    }

    $data = json_decode(wp_remote_retrieve_body($response), true);

    if (empty($data['_id'])) {
        wp_send_json_error(['message' => 'No payment provider found for this listing.', 'raw' => $data]);
    }

    wp_send_json_success(['provider_id' => $data['_id'], 'raw' => $data]);
}

// AJAX handler to get payment method for a token set
add_action('wp_ajax_get_guesty_payment_method', 'guesty_get_payment_method');
add_action('wp_ajax_nopriv_get_guesty_payment_method', 'guesty_get_payment_method');

function guesty_get_payment_method() {
    $token_set = isset($_POST['token_set']) ? intval($_POST['token_set']) : 0;
    
    // Debug logging
    error_log('[guesty_get_payment_method] Received token_set: ' . $token_set);
    
    if ($token_set === 2) {
        $method = get_option('guesty_payment_method_2', 'guesty');
        error_log('[guesty_get_payment_method] Using token_set 2, method: ' . $method);
    } else {
        $method = get_option('guesty_payment_method_1', 'guesty');
        error_log('[guesty_get_payment_method] Using token_set 1, method: ' . $method);
    }
    
    // Return a human-friendly label
    $label = ($method === 'stripe') ? 'Stripe' : 'GuestyPay';
    error_log('[guesty_get_payment_method] Returning label: ' . $label);
    
    wp_send_json_success(['method' => $method, 'label' => $label]);
}

// AJAX handler to get Stripe publishable key for a token set
add_action('wp_ajax_get_guesty_stripe_pk', 'guesty_get_stripe_pk');
add_action('wp_ajax_nopriv_get_guesty_stripe_pk', 'guesty_get_stripe_pk');

function guesty_get_stripe_pk() {
    $token_set = isset($_POST['token_set']) ? intval($_POST['token_set']) : 0;
    if ($token_set === 2) {
        $pk = get_option('guesty_stripe_publishable_2', '');
    } else {
        $pk = get_option('guesty_stripe_publishable_1', '');
    }
    if (!$pk) {
        wp_send_json_error(['message' => 'No Stripe publishable key set for this token set.']);
    }
    wp_send_json_success(['pk' => $pk]);
}

add_action('wp_ajax_create_guesty_stripe_payment_intent', 'create_guesty_stripe_payment_intent');
add_action('wp_ajax_nopriv_create_guesty_stripe_payment_intent', 'create_guesty_stripe_payment_intent');

function create_guesty_stripe_payment_intent() {
    // TEST: Add this line to verify updated code is running
    error_log('[create_guesty_stripe_payment_intent] TEST: Updated code is running - version 2.3');
    
    $token_set = isset($_POST['token_set']) ? intval($_POST['token_set']) : 0;
    $amount = isset($_POST['amount']) ? intval($_POST['amount']) : 0;
    $currency = isset($_POST['currency']) ? sanitize_text_field($_POST['currency']) : 'usd';
    $payment_method = isset($_POST['payment_method']) ? sanitize_text_field($_POST['payment_method']) : '';
    $guest = isset($_POST['guest']) ? $_POST['guest'] : [];
    $listing_id = isset($_POST['listing_id']) ? sanitize_text_field($_POST['listing_id']) : '';
    $check_in = isset($_POST['check_in']) ? sanitize_text_field($_POST['check_in']) : '';
    $check_out = isset($_POST['check_out']) ? sanitize_text_field($_POST['check_out']) : '';

    // Validate amount
    if ($amount <= 0) {
        wp_send_json_error(['message' => 'Invalid amount: amount must be greater than 0.']);
    }

    // Get the correct Stripe secret key
    if ($token_set === 2) {
        $sk = get_option('guesty_stripe_secret_2', '');
    } else {
        $sk = get_option('guesty_stripe_secret_1', '');
    }
    if (!$sk) {
        wp_send_json_error(['message' => 'Stripe secret key not set.']);
    }

    // Get property name from listing ID
    $property_name = 'HÓZHÓ Scottsdale'; // Default property name
    if ($listing_id) {
        // Get the correct API token for fetching property details
        $client_id_1 = get_option('guesty_client_id_1', '');
        $client_secret_1 = get_option('guesty_client_secret_1', '');
        $client_id_2 = get_option('guesty_client_id_2', '');
        $client_secret_2 = get_option('guesty_client_secret_2', '');

        $token = ($token_set === 2) 
            ? guesty_get_bearer_token($client_id_2, $client_secret_2)
            : guesty_get_bearer_token($client_id_1, $client_secret_1);

        if ($token) {
            $response = wp_remote_get("https://booking.guesty.com/api/listings/{$listing_id}", [
                'headers' => [
                    'Authorization' => "Bearer $token",
                    'Accept' => 'application/json; charset=utf-8',
                ],
            ]);
            
            if (!is_wp_error($response)) {
                $listing_data = json_decode(wp_remote_retrieve_body($response), true);
                if ($listing_data && isset($listing_data['title'])) {
                    $property_name = $listing_data['title'];
                }
            }
        }
    }

    // Format dates for description
    $description = '';
    if ($check_in && $check_out) {
        $check_in_formatted = date('m-d-Y', strtotime($check_in));
        $check_out_formatted = date('m-d-Y', strtotime($check_out));
        $description = "From: {$check_in_formatted} To: {$check_out_formatted} {$property_name}";
    } else {
        $description = $property_name;
    }

    // Load Stripe PHP SDK
    if (!class_exists('\Stripe\Stripe')) {
        require_once dirname(__FILE__) . '/stripe-php/init.php';
    }
    \Stripe\Stripe::setApiKey($sk);

    try {
        // Amount is already in cents from frontend, no need to multiply by 100
        $payment_intent_params = [
            'amount' => $amount, // Already in cents
            'currency' => $currency,
            'payment_method' => $payment_method,
            'confirm' => true,
            'return_url' => site_url('/success'), // Use site_url instead of home_url
            'automatic_payment_methods' => [
                'enabled' => true,
                'allow_redirects' => 'never'
            ],
            'description' => $description,
            'metadata' => [
                'guest_name' => ($guest['firstName'] ?? '') . ' ' . ($guest['lastName'] ?? ''),
                'guest_email' => $guest['email'] ?? '',
                'listing_id' => $listing_id,
                'check_in' => $check_in,
                'check_out' => $check_out,
            ],
            'receipt_email' => $guest['email'] ?? '',
        ];
        
        // Debug logging - show exactly what we're sending
        error_log('[create_guesty_stripe_payment_intent] VERSION: 2.3 - Added descriptive description');
        error_log('[create_guesty_stripe_payment_intent] Creating PaymentIntent with params: ' . json_encode($payment_intent_params));
        error_log('[create_guesty_stripe_payment_intent] Description: ' . $description);
        
        $intent = \Stripe\PaymentIntent::create($payment_intent_params);
        
        error_log('[create_guesty_stripe_payment_intent] PaymentIntent created successfully: ' . $intent->id);
        
        wp_send_json_success([
            'client_secret' => $intent->client_secret,
            'status' => $intent->status,
        ]);
    } catch (Exception $e) {
        error_log('[create_guesty_stripe_payment_intent] Error creating PaymentIntent: ' . $e->getMessage());
        error_log('[create_guesty_stripe_payment_intent] Error details: ' . $e->getTraceAsString());
        wp_send_json_error(['message' => $e->getMessage()]);
    }
}

add_action('wp_ajax_create_guesty_stripe_reservation', 'create_guesty_stripe_reservation');
add_action('wp_ajax_nopriv_create_guesty_stripe_reservation', 'create_guesty_stripe_reservation');

function create_guesty_stripe_reservation() {
    error_log('[create_guesty_stripe_reservation] Function called');
    
    $token_set = isset($_POST['token_set']) ? intval($_POST['token_set']) : 0;
    $guest = isset($_POST['guest']) ? $_POST['guest'] : [];
    $payment_method = isset($_POST['payment_method']) ? sanitize_text_field($_POST['payment_method']) : '';
    $quote_id = isset($_POST['quote_id']) ? sanitize_text_field($_POST['quote_id']) : '';
    $rate_plan_id = isset($_POST['rate_plan_id']) ? sanitize_text_field($_POST['rate_plan_id']) : '';
    $listing_id = isset($_POST['listing_id']) ? sanitize_text_field($_POST['listing_id']) : '';

    // Debug: Log all received parameters
    error_log('[create_guesty_stripe_reservation] Received parameters:');
    error_log('[create_guesty_stripe_reservation] token_set: ' . $token_set);
    error_log('[create_guesty_stripe_reservation] payment_method: ' . $payment_method);
    error_log('[create_guesty_stripe_reservation] quote_id: ' . $quote_id);
    error_log('[create_guesty_stripe_reservation] rate_plan_id: ' . $rate_plan_id);
    error_log('[create_guesty_stripe_reservation] listing_id: ' . $listing_id);
    error_log('[create_guesty_stripe_reservation] guest: ' . json_encode($guest));

    if (empty($payment_method)) {
        error_log('[create_guesty_stripe_reservation] ERROR: payment_method is empty');
        wp_send_json_error(['message' => 'Missing required parameter: payment_method']);
    }
    if (empty($quote_id)) {
        error_log('[create_guesty_stripe_reservation] ERROR: quote_id is empty');
        wp_send_json_error(['message' => 'Missing required parameter: quote_id']);
    }
    if (empty($rate_plan_id)) {
        error_log('[create_guesty_stripe_reservation] ERROR: rate_plan_id is empty');
        wp_send_json_error(['message' => 'Missing required parameter: rate_plan_id']);
    }

    if (empty($payment_method) || empty($quote_id) || empty($rate_plan_id)) {
        wp_send_json_error(['message' => 'Missing required parameters.']);
    }

    // Get the correct Guesty API token
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
        'ratePlanId' => $rate_plan_id,
        'ccToken' => $payment_method, // Use the Stripe PaymentMethod ID as ccToken
        'guest' => $guest,
    ];

    error_log('[create_guesty_stripe_reservation] Creating reservation with payload: ' . json_encode($payload));

    $response = wp_remote_post("https://booking.guesty.com/api/reservations/quotes/{$quote_id}/instant", [
        'headers' => [
            'Authorization' => "Bearer $token",
            'Content-Type' => 'application/json',
            'Accept' => 'application/json; charset=utf-8',
        ],
        'body' => json_encode($payload),
    ]);

    if (is_wp_error($response)) {
        error_log('[create_guesty_stripe_reservation] Error: ' . $response->get_error_message());
        wp_send_json_error(['message' => 'Error communicating with Guesty API.', 'error' => $response->get_error_message()]);
    }

    $data = json_decode(wp_remote_retrieve_body($response), true);
    error_log('[create_guesty_stripe_reservation] Response: ' . json_encode($data));

    if (empty($data['_id'])) {
        wp_send_json_error(['message' => 'No confirmation returned from Guesty.', 'raw' => $data]);
    }

    wp_send_json_success($data);
}

add_action('wp_ajax_get_guesty_stripe_payment_provider', 'get_guesty_stripe_payment_provider');
add_action('wp_ajax_nopriv_get_guesty_stripe_payment_provider', 'get_guesty_stripe_payment_provider');

function get_guesty_stripe_payment_provider() {
    $listing_id = isset($_POST['listing_id']) ? sanitize_text_field($_POST['listing_id']) : '';
    $token_set = isset($_POST['token_set']) ? intval($_POST['token_set']) : 0;

    if (empty($listing_id)) {
        wp_send_json_error(['message' => 'Missing listing ID.']);
    }

    // Get the correct API token based on token_set
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

    $response = wp_remote_get("https://booking.guesty.com/api/listings/{$listing_id}/payment-provider", [
        'headers' => [
            'Authorization' => "Bearer $token",
            'Accept' => 'application/json; charset=utf-8',
        ],
    ]);

    if (is_wp_error($response)) {
        wp_send_json_error(['message' => 'Error communicating with Guesty API.', 'error' => $response->get_error_message()]);
    }

    $data = json_decode(wp_remote_retrieve_body($response), true);

    if (empty($data['_id'])) {
        wp_send_json_error(['message' => 'No payment provider found for this listing.', 'raw' => $data]);
    }

    wp_send_json_success($data);
}