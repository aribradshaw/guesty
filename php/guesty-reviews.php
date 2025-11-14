<?php
// filepath: /C:/Users/Owner/Documents/Flygon Lc/WordPress Plugins/MannaPress Guesty/guesty-reviews.php

// Shortcode for displaying reviews
function guesty_reviews_shortcode($atts) {
    // Register, localize, and enqueue JS and CSS only when shortcode is used
    if (!wp_script_is('guesty-reviews-script', 'enqueued')) {
        wp_register_script(
            'guesty-reviews-script',
            plugin_dir_url(__FILE__) . '../js/guesty-reviews.js',
            array('jquery'),
            '2.0',
            true
        );
        wp_localize_script(
            'guesty-reviews-script',
            'guestyAjax',
            array(
                'ajax_url' => admin_url('admin-ajax.php'),
            )
        );
        wp_enqueue_script('guesty-reviews-script');
    }
    
    if (!wp_style_is('guesty-reviews-style', 'enqueued')) {
        wp_register_style(
            'guesty-reviews-style',
            plugin_dir_url(__FILE__) . '../css/guesty-reviews.css',
            [],
            '2.0'
        );
        wp_enqueue_style('guesty-reviews-style');
    }
    
    $plugin_url = plugin_dir_url(__FILE__);
    return '<div id="guesty-reviews">
        <div class="guesty-reviews-header">
            <h2 class="guesty-reviews-title">Guest Reviews</h2>
            <div class="guesty-powered-by">
                <span class="guesty-powered-by-text">POWERED BY</span>
                <div class="guesty-powered-by-logos">
                    <img src="' . $plugin_url . '../assets/airbnb.svg" alt="Airbnb" class="guesty-powered-by-logo">
                    <img src="' . $plugin_url . '../assets/booking.com.svg" alt="Booking.com" class="guesty-powered-by-logo">
                    <img src="' . $plugin_url . '../assets/vrbo.svg" alt="VRBO" class="guesty-powered-by-logo">
                </div>
            </div>
        </div>
        <div class="guesty-reviews-content">Loading reviews...</div>
    </div>';
}
add_shortcode('guesty_reviews', 'guesty_reviews_shortcode');

// AJAX handler for fetching reviews
add_action('wp_ajax_fetch_guesty_reviews', 'fetch_guesty_reviews');
add_action('wp_ajax_nopriv_fetch_guesty_reviews', 'fetch_guesty_reviews');

function fetch_guesty_reviews() {
    $listing_id = isset($_POST['listing_id']) ? sanitize_text_field($_POST['listing_id']) : '';
    $token_set = isset($_POST['token_set']) ? intval($_POST['token_set']) : 0;

    if (empty($listing_id)) {
        wp_send_json_error(['message' => 'No listing ID provided.']);
    }

    $client_id_1 = get_option('guesty_client_id_1', '');
    $client_secret_1 = get_option('guesty_client_secret_1', '');
    $client_id_2 = get_option('guesty_client_id_2', '');
    $client_secret_2 = get_option('guesty_client_secret_2', '');

    if ($token_set === 2) {
        $token = guesty_get_bearer_token($client_id_2, $client_secret_2);
    } else {
        $token = guesty_get_bearer_token($client_id_1, $client_secret_1);
    }
    $response = guesty_fetch_reviews($listing_id, $token);

    $debug = [
        'raw_response' => $response,
        'token_set' => $token_set,
        'listing_id' => $listing_id,
    ];

    // Only try fallback if token_set was not specified
    if ($token_set === 0 && (is_wp_error($response) || !isset($response['data']))) {
        $token = guesty_get_bearer_token($client_id_2, $client_secret_2);
        $response = guesty_fetch_reviews($listing_id, $token);
        $token_set = 2;
        $debug['fallback_response'] = $response;
        $debug['token_set_after_fallback'] = $token_set;
    }

    if (is_wp_error($response)) {
        wp_send_json_error(['message' => 'Error fetching reviews.', 'error' => $response->get_error_message(), 'debug' => $debug]);
    }

    if (empty($response['data'])) {
        wp_send_json_error(['message' => 'No reviews available.', 'debug' => $debug]);
    }

    wp_send_json_success(['reviews' => $response['data'], 'token_set' => $token_set, 'debug' => $debug]);
}

function guesty_fetch_reviews($listing_id, $token) {
    if (!$token) {
        return new WP_Error('no_token', 'Unable to retrieve API token.');
    }

    $response = wp_remote_get("https://booking.guesty.com/api/reviews?listingId={$listing_id}", [
        'headers' => ['Authorization' => "Bearer $token"],
    ]);

    if (is_wp_error($response)) {
        return $response;
    }

    return json_decode(wp_remote_retrieve_body($response), true);
}