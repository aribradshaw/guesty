<?php
/**
 * Handles the [all_properties] shortcode to display all available properties for selected dates.
 */

add_shortcode('all_properties', 'guesty_all_properties_shortcode');

function guesty_all_properties_shortcode($atts) {
    // Enqueue JS and CSS only when shortcode is used
    if (!wp_script_is('guesty-all-properties-script', 'enqueued')) {
        wp_enqueue_script('guesty-all-properties-script');
    }
    if (!wp_style_is('guesty-all-properties-style', 'enqueued')) {
        wp_enqueue_style('guesty-all-properties-style');
    }
    $output = '<div id="guesty-all-properties">
        <form id="guesty-all-properties-form">
            <label>Check-in: <input type="date" id="guesty-checkin" required></label>
            <label>Check-out: <input type="date" id="guesty-checkout" required></label>
            <button type="submit">Search</button>
        </form>
        <div id="guesty-properties-list">Please select dates and search.</div>
    </div>';

    return $output;
}

add_action('wp_ajax_guesty_all_properties', 'guesty_all_properties_ajax');
add_action('wp_ajax_nopriv_guesty_all_properties', 'guesty_all_properties_ajax');

function guesty_all_properties_ajax() {
    $checkin = sanitize_text_field($_POST['checkin']);
    $checkout = sanitize_text_field($_POST['checkout']);
    $token_set = isset($_POST['token_set']) ? intval($_POST['token_set']) : 0;

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

    $url = "https://booking.guesty.com/api/listings?numberOfBedrooms=0&numberOfBathrooms=0&checkIn={$checkin}&checkOut={$checkout}&limit=20";
    $response = wp_remote_get($url, [
        'headers' => [
            'Authorization' => "Bearer $token",
            'Accept' => 'application/json; charset=utf-8',
        ],
    ]);
    $data = json_decode(wp_remote_retrieve_body($response), true);

    if (is_wp_error($response) || !is_array($data)) {
        wp_send_json_error(['message' => 'No valid data returned from API.']);
    }

    wp_send_json_success(['properties' => $data]);
}
