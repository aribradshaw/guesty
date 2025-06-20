<?php
/**
 * Admin subpage for mapping Guesty listing IDs to WordPress pages.
 */

// Register the admin subpage
add_action('admin_menu', function() {
    add_submenu_page(
        'guesty-settings', // Parent slug updated to match your main menu slug
        'Listing to Page Mapping',
        'Listing/Page Mapping',
        'manage_options',
        'guesty-listing-page-mapping',
        'guesty_listing_page_mapping_admin_page'
    );
});

function guesty_listing_page_mapping_admin_page() {
    if (!current_user_can('manage_options')) return;    // Save mappings if form submitted
    if (isset($_POST['guesty_listing_page_mapping_submit']) && isset($_POST['guesty_listing_page_mapping_nonce']) && wp_verify_nonce($_POST['guesty_listing_page_mapping_nonce'], 'guesty_listing_page_mapping')) {
        $mapping = [];
        if (!empty($_POST['listing_page_map']) && is_array($_POST['listing_page_map'])) {
            foreach ($_POST['listing_page_map'] as $lid => $pid) {
                $lid = sanitize_text_field($lid);
                $pid = sanitize_text_field($pid);
                if ($pid !== '') { // Only save if a page is selected
                    $mapping[$lid] = $pid;
                }
            }
        }
        update_option('guesty_listing_page_mapping', $mapping);
        echo '<div class="updated"><p>Mappings saved successfully!</p></div>';
    }
    // Fetch all listings grouped by token
    $listings_by_token = guesty_get_all_listings_grouped_by_token();
    // Fetch all pages
    $pages = get_pages(['post_status' => 'publish']);    // Get current mapping
    $mapping = get_option('guesty_listing_page_mapping', []);
    echo '<div class="wrap"><h1>Listing to Page Mapping</h1>';
    echo '<form method="post">';
    wp_nonce_field('guesty_listing_page_mapping', 'guesty_listing_page_mapping_nonce');
    echo '<style>.guesty-mapping-columns{display:flex;gap:40px;align-items:flex-start}.guesty-mapping-col{flex:1;min-width:320px;background:#fff;border:1px solid #ddd;padding:20px;border-radius:8px;box-shadow:0 2px 8px #0001}.guesty-mapping-col h2{margin-top:0;font-size:1.1em;border-bottom:1px solid #eee;padding-bottom:8px;margin-bottom:16px}</style>';
    echo '<div class="guesty-mapping-columns">';
    foreach ($listings_by_token as $token_label => $listings) {
        echo '<div class="guesty-mapping-col">';
        echo '<h2>' . esc_html($token_label) . '</h2>';
        if (empty($listings)) {
            echo '<p style="color:#888">No properties found for this token.</p>';
        } else {
            echo '<table class="form-table"><tbody>';            foreach ($listings as $listing) {
                $lid = isset($listing['_id']) && $listing['_id'] !== '' ? $listing['_id'] : (isset($listing['name']) ? md5($listing['name']) : md5(json_encode($listing)));
                $lid_attr = esc_attr($lid);
                $ltitle = esc_html($listing['title'] ?? $listing['name'] ?? $lid);
                if (!isset($listing['_id']) || $listing['_id'] === '') {
                    echo '<tr><td colspan="2" style="color:red;font-size:0.95em;">Warning: Listing "' . $ltitle . '" is missing an _id. Using fallback key.</td></tr>';
                }
                echo '<tr><th style="width:60%">' . $ltitle . ' (' . $lid_attr . ')</th><td>';
                echo '<select name="listing_page_map[' . $lid_attr . ']">';
                echo '<option value="">-- No Page --</option>';                foreach ($pages as $page) {
                    $selected = (isset($mapping[$lid_attr]) && $mapping[$lid_attr] == $page->ID) ? 'selected' : '';
                    echo '<option value="' . $page->ID . '" ' . $selected . '>' . esc_html($page->post_title) . '</option>';
                }
                echo '</select></td></tr>';
            }
            echo '</tbody></table>';
        }
        echo '</div>';
    }
    echo '</div>';
    echo '<p><input type="submit" name="guesty_listing_page_mapping_submit" class="button-primary" value="Save Mappings"></p>';
    echo '</form></div>';
}

function guesty_get_all_listings_grouped_by_token() {
    $client_id_1 = get_option('guesty_client_id_1', '');
    $client_secret_1 = get_option('guesty_client_secret_1', '');
    $client_id_2 = get_option('guesty_client_id_2', '');
    $client_secret_2 = get_option('guesty_client_secret_2', '');
    $result = [];
    if ($client_id_1 && $client_secret_1) {
        $token1 = guesty_get_bearer_token($client_id_1, $client_secret_1);
        $listings = [];
        if ($token1) {
            $url = "https://booking.guesty.com/api/listings?limit=100";
            $response = wp_remote_get($url, [
                'headers' => [
                    'Authorization' => "Bearer $token1",
                    'Accept' => 'application/json; charset=utf-8',
                ],
            ]);
            if (!is_wp_error($response)) {
                $data = json_decode(wp_remote_retrieve_body($response), true);
                if (is_array($data) && isset($data['results']) && is_array($data['results'])) {
                    $listings = $data['results'];
                }
            }
        }
        $result['Token 1 Properties'] = $listings;
    }
    if ($client_id_2 && $client_secret_2) {
        $token2 = guesty_get_bearer_token($client_id_2, $client_secret_2);
        $listings = [];
        if ($token2) {
            $url = "https://booking.guesty.com/api/listings?limit=100";
            $response = wp_remote_get($url, [
                'headers' => [
                    'Authorization' => "Bearer $token2",
                    'Accept' => 'application/json; charset=utf-8',
                ],
            ]);
            if (!is_wp_error($response)) {
                $data = json_decode(wp_remote_retrieve_body($response), true);
                if (is_array($data) && isset($data['results']) && is_array($data['results'])) {
                    $listings = $data['results'];
                }
            }
        }
        $result['Token 2 Properties'] = $listings;
    }
    return $result;
}
