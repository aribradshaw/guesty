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
                        
                        $listing['mapped_page'] = [
                            'ID' => $page->ID,
                            'title' => $page->post_title,
                            'url' => get_permalink($page->ID)
                        ];
                        
                        // Add the main image to the listing data
                        if ($main_image) {
                            $listing['main_image'] = $main_image;
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
