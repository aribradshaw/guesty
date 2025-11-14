<?php
/**
 * Handles the [guesty_menu] shortcode to display a filterable property menu.
 */

add_shortcode('guesty_menu', 'guesty_menu_shortcode');

function guesty_menu_shortcode($atts) {
    // Register, localize, and enqueue JS and CSS only when shortcode is used
    if (!wp_script_is('guesty-menu-script', 'enqueued')) {
        wp_register_script(
            'guesty-menu-script',
            plugin_dir_url(__FILE__) . '../js/guesty-menu.js',
            array('jquery'),
            '1.0',
            true
        );
        wp_localize_script(
            'guesty-menu-script',
            'guestyMenuAjax',
            array(
                'ajax_url' => admin_url('admin-ajax.php'),
                'plugin_url' => plugin_dir_url(__FILE__) . '../'
            )
        );
        wp_enqueue_script('guesty-menu-script');
    }
    
    if (!wp_style_is('guesty-menu-style', 'enqueued')) {
        wp_register_style(
            'guesty-menu-style',
            plugin_dir_url(__FILE__) . '../css/guesty-menu.css',
            [],
            '1.0'
        );
        wp_enqueue_style('guesty-menu-style');
    }

    $output = '<div id="guesty-menu">
        <div class="guesty-menu-container">
            <div class="guesty-filters">
                <div class="filter-group">
                    <label for="bedrooms-filter">Bedrooms:</label>
                    <select id="bedrooms-filter">
                        <option value="">All Bedrooms</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label for="accommodates-filter">Accommodates:</label>
                    <select id="accommodates-filter">
                        <option value="">All Sizes</option>
                        <option value="1-10">1-10 Guests</option>
                        <option value="11-15">11-15 Guests</option>
                        <option value="16-20">16-20 Guests</option>
                        <option value="21+">21+ Guests</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label for="bathrooms-filter">Bathrooms:</label>
                    <select id="bathrooms-filter">
                        <option value="">All Bathrooms</option>
                        <option value="1-2">1-2 Bathrooms</option>
                        <option value="3-4">3-4 Bathrooms</option>
                        <option value="5-6">5-6 Bathrooms</option>
                        <option value="7+">7+ Bathrooms</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label for="beds-filter">Beds:</label>
                    <select id="beds-filter">
                        <option value="">All Beds</option>
                        <option value="1-5">1-5 Beds</option>
                        <option value="6-10">6-10 Beds</option>
                        <option value="11-15">11-15 Beds</option>
                        <option value="16+">16+ Beds</option>
                    </select>
                </div>
            </div>
            <div class="guesty-properties">
                <div class="properties-list" id="properties-list">
                    <!-- Properties will be loaded here -->
                </div>
            </div>
        </div>
    </div>';

    return $output;
}

add_action('wp_ajax_guesty_menu_properties', 'guesty_menu_properties_ajax');
add_action('wp_ajax_nopriv_guesty_menu_properties', 'guesty_menu_properties_ajax');

function guesty_menu_properties_ajax() {
    // Log the AJAX call for debugging
    error_log('[guesty_menu] AJAX call received');
    
    $filters = array(
        'bedrooms' => sanitize_text_field($_POST['bedrooms'] ?? ''),
        'accommodates' => sanitize_text_field($_POST['accommodates'] ?? ''),
        'bathrooms' => sanitize_text_field($_POST['bathrooms'] ?? ''),
        'beds' => sanitize_text_field($_POST['beds'] ?? '')
    );

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
    $listing_page_map = get_option('guesty_listing_page_mapping', []);
    
    foreach ($tokens as $token) {
        $url = "https://booking.guesty.com/api/listings?numberOfBedrooms=0&numberOfBathrooms=0&limit=100";
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
        
        $data = json_decode(wp_remote_retrieve_body($response), true);
        if (is_array($data) && isset($data['results']) && is_array($data['results'])) {
            foreach ($data['results'] as $listing) {
                $lid = $listing['_id'];
                if (isset($listing_page_map[$lid]) && $listing_page_map[$lid]) {
                    $page_id = $listing_page_map[$lid];
                    $page = get_post($page_id);
                    if ($page && $page->post_status === 'publish') {
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
                        
                        if ($main_image) {
                            $listing['main_image'] = $main_image;
                        }
                        
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

    // Apply filters
    $filtered_results = apply_property_filters($all_results, $filters);
    
    // Log the results for debugging
    error_log('[guesty_menu] Found ' . count($filtered_results) . ' properties');

    wp_send_json_success([
        'properties' => $filtered_results,
        'total_count' => count($filtered_results),
        'filters_applied' => $filters
    ]);
}

function apply_property_filters($properties, $filters) {
    $filtered = $properties;
    
    foreach ($filters as $filter_type => $filter_value) {
        if (empty($filter_value)) continue;
        
        $filtered = array_filter($filtered, function($property) use ($filter_type, $filter_value) {
            $value = $property[$filter_type] ?? 0;
            
            switch ($filter_type) {
                case 'bedrooms':
                    return match_bedroom_filter($value, $filter_value);
                case 'accommodates':
                    return match_accommodates_filter($value, $filter_value);
                case 'bathrooms':
                    return match_bathroom_filter($value, $filter_value);
                case 'beds':
                    return match_beds_filter($value, $filter_value);
                default:
                    return true;
            }
        });
    }
    
    return array_values($filtered);
}

function match_bedroom_filter($bedrooms, $filter) {
    if (empty($filter)) return true;
    
    // Handle individual bedroom numbers (exact match)
    if (is_numeric($filter)) {
        return $bedrooms == intval($filter);
    }
    
    return true;
}

function match_accommodates_filter($accommodates, $filter) {
    if (empty($filter)) return true;
    
    // Handle individual accommodates numbers (exact match)
    if (is_numeric($filter)) {
        return $accommodates == intval($filter);
    }
    
    return true;
}

function match_bathroom_filter($bathrooms, $filter) {
    if (empty($filter)) return true;
    
    // Handle individual bathroom numbers (exact match)
    if (is_numeric($filter)) {
        return $bathrooms == intval($filter);
    }
    
    return true;
}

function match_beds_filter($beds, $filter) {
    if (empty($filter)) return true;
    
    // Handle individual beds numbers (exact match)
    if (is_numeric($filter)) {
        return $beds == intval($filter);
    }
    
    return true;
}

function group_properties_by_bedrooms($properties) {
    $grouped = [
        '6-7' => [],
        '8' => [],
        '9' => [],
        '10+' => []
    ];
    
    foreach ($properties as $property) {
        $bedrooms = $property['bedrooms'] ?? 0;
        
        if ($bedrooms >= 6 && $bedrooms <= 7) {
            $grouped['6-7'][] = $property;
        } elseif ($bedrooms == 8) {
            $grouped['8'][] = $property;
        } elseif ($bedrooms == 9) {
            $grouped['9'][] = $property;
        } elseif ($bedrooms >= 10) {
            $grouped['10+'][] = $property;
        }
    }
    
    return $grouped;
}
