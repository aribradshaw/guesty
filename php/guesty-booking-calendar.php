<?php
/**
 * Handles the booking calendar shortcode for Guesty listings.
 */

// Booking Calendar Shortcode
function guesty_booking_calendar_shortcode($atts) {
    // Output a placeholder div for the booking calendar
    $output = '<div id="guesty-booking-calendar">
        <div id="calendar-controls">
            <button id="prev-month">Previous</button>
            <span id="current-month"></span>
            <button id="next-month">Next</button>
        </div>
        <div id="calendar-grid">Loading booking calendar...</div>
    </div>
    <div id="guesty-quote-spinner" style="display:none; text-align:center; margin: 30px 0;">
      <div class="guesty-spinner"></div>
    </div>';

    // Enqueue the JavaScript and CSS files for the calendar
    wp_enqueue_script('guesty-booking-calendar-script');
    wp_enqueue_style('guesty-booking-calendar-style');

    return $output;
}
add_shortcode('guesty_booking_calendar', 'guesty_booking_calendar_shortcode');

// Register and enqueue the JavaScript and CSS files
add_action('wp_enqueue_scripts', function () {
    wp_register_script('guesty-booking-calendar-script', plugin_dir_url(dirname(__FILE__)) . '/js/guesty-booking-calendar.js', ['jquery'], '1.0', true);
    wp_register_style('guesty-booking-calendar-style', plugin_dir_url(__FILE__) . '../css/guesty-booking-calendar.css', [], '1.0');
    wp_localize_script('guesty-booking-calendar-script', 'guestyBookingAjax', [
        'ajax_url' => admin_url('admin-ajax.php'),
    ]);
});

add_action('wp_ajax_fetch_calendar_data', 'fetch_calendar_data');
add_action('wp_ajax_nopriv_fetch_calendar_data', 'fetch_calendar_data');

function fetch_calendar_data() {
    $listing_id = sanitize_text_field($_POST['listing_id']);
    $from = sanitize_text_field($_POST['from']);
    $to = sanitize_text_field($_POST['to']);
    $token_set = isset($_POST['token_set']) ? intval($_POST['token_set']) : 0;

    // Retrieve credentials from the database
    $client_id_1 = get_option('guesty_client_id_1', '');
    $client_secret_1 = get_option('guesty_client_secret_1', '');
    $client_id_2 = get_option('guesty_client_id_2', '');
    $client_secret_2 = get_option('guesty_client_secret_2', '');

    // Use the requested token set, or try both if not specified
    if ($token_set === 1) {
        $token = guesty_get_bearer_token($client_id_1, $client_secret_1);
    } elseif ($token_set === 2) {
        $token = guesty_get_bearer_token($client_id_2, $client_secret_2);
    } else {
        // Try both if not specified
        $token = guesty_get_bearer_token($client_id_1, $client_secret_1);
        $token_set = 1;
        $response = wp_remote_get("https://booking.guesty.com/api/listings/{$listing_id}/calendar?from={$from}&to={$to}", [
            'headers' => [
                'Authorization' => "Bearer $token",
                'Accept' => 'application/json; charset=utf-8',
            ],
        ]);
        $data = json_decode(wp_remote_retrieve_body($response), true);
        if (is_wp_error($response) || !is_array($data)) {
            $token = guesty_get_bearer_token($client_id_2, $client_secret_2);
            $token_set = 2;
        }
    }

    if (!$token) {
        wp_send_json_error(['message' => 'Unable to retrieve API token.']);
    }

    $response = wp_remote_get("https://booking.guesty.com/api/listings/{$listing_id}/calendar?from={$from}&to={$to}", [
        'headers' => [
            'Authorization' => "Bearer $token",
            'Accept' => 'application/json; charset=utf-8',
        ],
    ]);
    $data = json_decode(wp_remote_retrieve_body($response), true);

    // Instead of error_log, add debug info to the response
    $debug = [
        'raw_response' => $data,
        'token_set' => $token_set,
        'listing_id' => $listing_id,
    ];

    if (is_wp_error($response) || !is_array($data)) {
        wp_send_json_error(['message' => 'No valid data returned from API.', 'debug' => $debug]);
    }

    wp_send_json_success(['calendar' => $data, 'token_set' => $token_set, 'debug' => $debug]);
}