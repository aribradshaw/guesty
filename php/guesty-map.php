<?php
// filepath: /C:/Users/Owner/Documents/Flygon Lc/WordPress Plugins/MannaPress Guesty/guesty-map.php

// Shortcode for displaying the map
function guesty_map_shortcode($atts) {
    error_log('Guesty Map Shortcode executed.');
    return '
        <!-- Guesty Listing Map Section -->
        <div id="guesty-map" style="height: 400px; margin-top: 20px;">Loading map...</div>
        <!-- Load Leaflet (Free Map Library) -->
        <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
    ';
}
add_shortcode('guesty_map', 'guesty_map_shortcode');

// AJAX handler for fetching map data
add_action('wp_ajax_fetch_guesty_map_data', 'fetch_guesty_map_data');
add_action('wp_ajax_nopriv_fetch_guesty_map_data', 'fetch_guesty_map_data');

function fetch_guesty_map_data() {
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
    $response = guesty_fetch_map_data($listing_id, $token);

    // Check if the response is invalid
    if (is_wp_error($response) || !isset($response['address']['lat']) || !isset($response['address']['lng'])) {
        $token = guesty_get_bearer_token($client_id_2, $client_secret_2);
        $response = guesty_fetch_map_data($listing_id, $token);
    }

    if (is_wp_error($response)) {
        wp_send_json_error(['message' => 'Error fetching map data.', 'error' => $response->get_error_message()]);
    }

    if (empty($response['address']['lat']) || empty($response['address']['lng'])) {
        wp_send_json_error(['message' => 'No latitude/longitude data available.']);
    }

    wp_send_json_success([
        'lat' => $response['address']['lat'],
        'lng' => $response['address']['lng'],
    ]);
}

function guesty_fetch_map_data($listing_id, $token) {
    if (!$token) {
        return new WP_Error('no_token', 'Unable to retrieve API token.');
    }

    $response = wp_remote_get("https://booking.guesty.com/api/listings/{$listing_id}?fields=address.lat%20address.lng", [
        'headers' => ['Authorization' => "Bearer $token"],
    ]);

    if (is_wp_error($response)) {
        return $response;
    }

    return json_decode(wp_remote_retrieve_body($response), true);
}