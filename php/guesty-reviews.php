<?php
// filepath: /C:/Users/Owner/Documents/Flygon Lc/WordPress Plugins/MannaPress Guesty/guesty-reviews.php

// Shortcode for displaying reviews
function guesty_reviews_shortcode($atts) {
    error_log('Guesty Reviews Shortcode executed.');
    return '<div id="guesty-reviews">Loading reviews...</div>';
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