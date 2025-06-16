<?php
/**
 * Plugin Name: MannaGuesty by The Manna Agency and Flygon LC
 * Description: Securely handles Guesty API bearer token and exposes it to front-end JavaScript. Allows various Guesty API shortcode calls.
 * Version: 1.9e - Calendar Mobile Load
 * Author: Ari Daniel Bradshaw - Flygon LC & Dan Park - The Manna Agency
 */

if ( ! defined( 'MANNAPRESS_FILE' ) ) {
	define( 'MANNAPRESS_FILE', __FILE__ );
}

// Load the other php files plugin.
require_once dirname( MANNAPRESS_FILE ) . '/php/guesty-booking-calendar.php';
require_once dirname( MANNAPRESS_FILE ) . '/php/guesty-admin-page.php';
require_once dirname( MANNAPRESS_FILE ) . '/php/guesty-reviews.php';
require_once dirname( MANNAPRESS_FILE ) . '/php/guesty-map.php';
require_once dirname( MANNAPRESS_FILE ) . '/php/guesty-payment.php';

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

add_action('wp_enqueue_scripts', function () {
    // Enqueue the JavaScript file for the booking calendar
    wp_register_script('guesty-booking-calendar-script', plugin_dir_url(__FILE__) . 'js/guesty-booking-calendar.js', ['jquery'], '1.0', true);
    wp_localize_script('guesty-booking-calendar-script', 'guestyBookingAjax', [
        'ajax_url' => admin_url('admin-ajax.php'),
    ]);
    wp_enqueue_script('guesty-booking-calendar-script');

    // Enqueue the CSS file for the booking calendar
    wp_enqueue_style('guesty-booking-calendar-style', plugin_dir_url(__FILE__) . 'css/guesty-booking-calendar.css', [], '1.0');
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
        'bedrooms'     => '🛏️ Bedrooms',
        'bathrooms'    => '🛁 Bathrooms',
        'accommodates' => '👥 Accommodates',
        'beds'         => '🛌 Beds',
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
    }

    $data = json_decode(wp_remote_retrieve_body($response), true);

    $debug = [
        'raw_response' => $data,
        'listing_id' => $listing_id,
        'check_in_date' => $check_in_date,
        'check_out_date' => $check_out_date,
        'guests_count' => $guests_count,
        'token_set' => $token_set,
    ];

    if (empty($data)) {
        wp_send_json_error(['message' => 'No data returned from Guesty API.', 'debug' => $debug]);
    }

    // Return the response from the Guesty API
    wp_send_json_success(array_merge($data, ['debug' => $debug]));
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