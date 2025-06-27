<?php
/**
 * Handles the [all_properties] shortcode to display all available properties for selected dates.
 */

add_shortcode('all_properties', 'guesty_all_properties_shortcode');

function guesty_all_properties_shortcode($atts) {
    // Register, localize, and enqueue JS and CSS only when shortcode is used
    if (!wp_script_is('guesty-all-properties-script', 'enqueued')) {
        wp_register_script(
            'guesty-all-properties-script',
            plugin_dir_url(__FILE__) . '../js/guesty-all-properties.js',
            array('jquery'),
            '2.1',
            true
        );
        wp_localize_script(
            'guesty-all-properties-script',
            'guestyBookingAjax',
            array(
                'ajax_url' => admin_url('admin-ajax.php'),
                'plugin_url' => plugin_dir_url(__FILE__) . '../'
            )
        );
        wp_enqueue_script('guesty-all-properties-script');
    }
    if (!wp_style_is('guesty-all-properties-style', 'enqueued')) {
        wp_register_style(
            'guesty-all-properties-style',
            plugin_dir_url(__FILE__) . '../css/guesty-all-properties.css',
            [],
            '2.1'
        );
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

    $client_id_1 = get_option('guesty_client_id_1', '');
    $client_secret_1 = get_option('guesty_client_secret_1', '');
    $client_id_2 = get_option('guesty_client_id_2', '');
    $client_secret_2 = get_option('guesty_client_secret_2', '');

    $tokens = [];
    if ($client_id_1 && $client_secret_1) {
        $token1 = guesty_get_bearer_token($client_id_1, $client_secret_1);
        if ($token1) $tokens[] = $token1;
    }
    if ($client_id_2 && $client_secret_2) {
        $token2 = guesty_get_bearer_token($client_id_2, $client_secret_2);
        if ($token2) $tokens[] = $token2;
    }

    if (empty($tokens)) {
        wp_send_json_error(['message' => 'Unable to retrieve any API tokens.']);
    }

    $all_results = [];
    $errors = [];
    // Load listing-page mapping
    $listing_page_map = get_option('guesty_listing_page_mapping', []);
    foreach ($tokens as $token) {
        $url = "https://booking.guesty.com/api/listings?numberOfBedrooms=0&numberOfBathrooms=0&checkIn={$checkin}&checkOut={$checkout}&limit=20";
        $response = wp_remote_get($url, [
            'headers' => [
                'Authorization' => "Bearer $token",
                'Accept' => 'application/json; charset=utf-8',
            ],
        ]);
        if (is_wp_error($response)) {
            $errors[] = $response->get_error_message();
            continue;
        }
        $data = json_decode(wp_remote_retrieve_body($response), true);        if (is_array($data) && isset($data['results']) && is_array($data['results'])) {
            foreach ($data['results'] as $listing) {
                $lid = $listing['_id']; // Use _id instead of id to match the mapping
                if (isset($listing_page_map[$lid]) && $listing_page_map[$lid]) {
                    $page_id = $listing_page_map[$lid];
                    $page = get_post($page_id);                    if ($page && $page->post_status === 'publish') {
                        // Get the main property image
                        $main_image = null;
                        if (isset($listing['pictures']) && is_array($listing['pictures']) && !empty($listing['pictures'])) {
                            $main_image = $listing['pictures'][0]['thumbnail'] ?? $listing['pictures'][0]['url'] ?? null;
                        }
                        
                        // Get pricing for this property
                        $price_info = guesty_get_property_price($lid, $checkin, $checkout, $token);
                        
                        $listing['mapped_page'] = [
                            'ID' => $page->ID,
                            'title' => $page->post_title,
                            'url' => get_permalink($page->ID)
                        ];
                        
                        // Add the main image to the listing data
                        if ($main_image) {
                            $listing['main_image'] = $main_image;
                        }
                        
                        // Add pricing information
                        if ($price_info) {
                            $listing['price_info'] = $price_info;
                        }
                        
                        // Only add to results if it has a valid mapping
                        $all_results[] = $listing;
                    }
                }
            }
        }
    }

    if (empty($all_results)) {
        $msg = 'No valid data returned from API.';
        if (!empty($errors)) {
            $msg .= ' Errors: ' . implode('; ', $errors);
        }
        wp_send_json_error(['message' => $msg]);
    }

    wp_send_json_success(['properties' => ['results' => $all_results]]);
}

/**
 * Get property pricing for the given dates
 */
function guesty_get_property_price($listing_id, $checkin, $checkout, $token) {
    if (!$token || !$listing_id || !$checkin || !$checkout) {
        return null;
    }
    
    $response = wp_remote_post('https://booking.guesty.com/api/reservations/quotes', [
        'headers' => [
            'Authorization' => "Bearer $token",
            'Content-Type' => 'application/json',
            'Accept' => 'application/json; charset=utf-8',
        ],
        'body' => json_encode([
            'guestsCount' => 1,
            'listingId' => $listing_id,
            'checkInDateLocalized' => $checkin,
            'checkOutDateLocalized' => $checkout,
        ]),
        'timeout' => 10, // Add timeout to prevent hanging
    ]);

    if (is_wp_error($response)) {
        return null;
    }

    $data = json_decode(wp_remote_retrieve_body($response), true);
    
    if (empty($data) || !isset($data['rates']) || !isset($data['rates']['ratePlans'])) {
        return null;
    }

    $rate_plan = $data['rates']['ratePlans'][0] ?? null;
    if (!$rate_plan || !isset($rate_plan['ratePlan']['money'])) {
        return null;
    }

    $money = $rate_plan['ratePlan']['money'];
    return [
        'total' => $money['hostPayout'] ?? 0,
        'currency' => $money['currency'] ?? 'USD',
        'formatted' => number_format($money['hostPayout'] ?? 0, 2)
    ];
}
