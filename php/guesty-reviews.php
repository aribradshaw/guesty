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

function guesty_get_review_identifier($review) {
    if (isset($review['_id']) && $review['_id'] !== '') {
        return (string) $review['_id'];
    }
    if (isset($review['id']) && $review['id'] !== '') {
        return (string) $review['id'];
    }
    if (isset($review['rawReview']['_id']) && $review['rawReview']['_id'] !== '') {
        return (string) $review['rawReview']['_id'];
    }
    if (isset($review['rawReview']['id']) && $review['rawReview']['id'] !== '') {
        return (string) $review['rawReview']['id'];
    }

    $raw = $review['rawReview'] ?? [];
    $title = $raw['title']['value'] ?? '';
    $body = $raw['body']['value'] ?? '';
    $created = $raw['createdDateTime'] ?? '';
    $rating = $raw['starRatingOverall'] ?? '';
    $guest = $raw['reservation']['primaryGuest'] ?? [];
    $guest_name = trim(($guest['firstName'] ?? '') . ' ' . ($guest['lastName'] ?? ''));
    $hash_source = wp_json_encode([$title, $body, $created, $rating, $guest_name]);
    return md5($hash_source);
}

function guesty_get_hidden_reviews_option() {
    $hidden = get_option('guesty_hidden_reviews', []);
    if (!is_array($hidden)) {
        $hidden = [];
    }
    return $hidden;
}

function guesty_filter_hidden_reviews($listing_id, $reviews) {
    $hidden = guesty_get_hidden_reviews_option();
    $hidden_ids = isset($hidden[$listing_id]) && is_array($hidden[$listing_id]) ? $hidden[$listing_id] : [];
    if (empty($hidden_ids)) {
        return $reviews;
    }
    return array_values(array_filter($reviews, function($review) use ($hidden_ids) {
        $rid = guesty_get_review_identifier($review);
        return !in_array($rid, $hidden_ids, true);
    }));
}

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

    // Only try fallback if token_set was not specified
    if ($token_set === 0 && (is_wp_error($response) || !isset($response['data']))) {
        $token = guesty_get_bearer_token($client_id_2, $client_secret_2);
        $response = guesty_fetch_reviews($listing_id, $token);
        $token_set = 2;
    }

    if (is_wp_error($response)) {
        wp_send_json_error(['message' => 'Error fetching reviews.', 'error' => $response->get_error_message()]);
    }

    if (empty($response['data'])) {
        wp_send_json_error(['message' => 'No reviews available.']);
    }

    $filtered_reviews = guesty_filter_hidden_reviews($listing_id, $response['data']);
    wp_send_json_success(['reviews' => $filtered_reviews, 'token_set' => $token_set]);
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

// Admin review moderation page
add_action('admin_menu', function () {
    add_submenu_page(
        'guesty-settings',
        'Review Moderation',
        'Review Moderation',
        'manage_options',
        'guesty-review-moderation',
        'guesty_review_moderation_page'
    );
});

function guesty_review_moderation_page() {
    if (!current_user_can('manage_options')) {
        return;
    }

    $hidden = guesty_get_hidden_reviews_option();
    $selected_listing_id = '';
    $selected_token_set = 1;
    $reviews = [];
    $error_message = '';

    if (!empty($_POST['guesty_review_listing']) && is_string($_POST['guesty_review_listing'])) {
        $selection = sanitize_text_field(wp_unslash($_POST['guesty_review_listing']));
        $parts = explode('::', $selection);
        if (count($parts) === 2) {
            $selected_token_set = intval($parts[0]);
            $selected_listing_id = sanitize_text_field($parts[1]);
        }
    }

    if (isset($_POST['guesty_reviews_save']) && isset($_POST['guesty_reviews_nonce']) && wp_verify_nonce($_POST['guesty_reviews_nonce'], 'guesty_reviews_save')) {
        $listing_id = sanitize_text_field($_POST['guesty_reviews_listing_id'] ?? '');
        if ($listing_id !== '') {
            $hidden_ids = [];
            if (!empty($_POST['hidden_reviews']) && is_array($_POST['hidden_reviews'])) {
                foreach ($_POST['hidden_reviews'] as $rid) {
                    $hidden_ids[] = sanitize_text_field($rid);
                }
            }
            $hidden[$listing_id] = array_values(array_unique($hidden_ids));
            update_option('guesty_hidden_reviews', $hidden);
            echo '<div class="notice notice-success"><p>Hidden reviews updated.</p></div>';
        }
    }

    if ($selected_listing_id !== '') {
        $client_id_1 = get_option('guesty_client_id_1', '');
        $client_secret_1 = get_option('guesty_client_secret_1', '');
        $client_id_2 = get_option('guesty_client_id_2', '');
        $client_secret_2 = get_option('guesty_client_secret_2', '');
        $token = null;
        if ($selected_token_set === 2) {
            $token = guesty_get_bearer_token($client_id_2, $client_secret_2);
        } else {
            $token = guesty_get_bearer_token($client_id_1, $client_secret_1);
        }
        $response = guesty_fetch_reviews($selected_listing_id, $token);
        if (is_wp_error($response)) {
            $error_message = $response->get_error_message();
        } elseif (!isset($response['data']) || !is_array($response['data'])) {
            $error_message = 'No reviews available for this listing.';
        } else {
            $reviews = $response['data'];
        }
    }

    $listings_by_token = function_exists('guesty_get_all_listings_grouped_by_token')
        ? guesty_get_all_listings_grouped_by_token()
        : [];
    ?>
    <div class="wrap">
        <h1>Review Moderation</h1>
        <form method="post">
            <table class="form-table">
                <tr>
                    <th scope="row"><label for="guesty_review_listing">Select Property</label></th>
                    <td>
                        <select name="guesty_review_listing" id="guesty_review_listing">
                            <option value="">-- Select a property --</option>
                            <?php foreach ($listings_by_token as $token_label => $listings): ?>
                                <optgroup label="<?php echo esc_attr($token_label); ?>">
                                    <?php
                                    $token_set = (stripos($token_label, '2') !== false) ? 2 : 1;
                                    foreach ($listings as $listing):
                                        $lid = $listing['_id'] ?? '';
                                        if ($lid === '') continue;
                                        $title = $listing['title'] ?? $listing['name'] ?? $lid;
                                        $value = $token_set . '::' . $lid;
                                        $selected = ($selected_listing_id === $lid && $selected_token_set === $token_set) ? 'selected' : '';
                                    ?>
                                        <option value="<?php echo esc_attr($value); ?>" <?php echo $selected; ?>>
                                            <?php echo esc_html($title . ' (' . $lid . ')'); ?>
                                        </option>
                                    <?php endforeach; ?>
                                </optgroup>
                            <?php endforeach; ?>
                        </select>
                        <button type="submit" class="button">Load Reviews</button>
                    </td>
                </tr>
            </table>
        </form>

        <?php if ($error_message): ?>
            <div class="notice notice-error"><p><?php echo esc_html($error_message); ?></p></div>
        <?php endif; ?>

        <?php if ($selected_listing_id && !empty($reviews)): ?>
            <form method="post">
                <?php wp_nonce_field('guesty_reviews_save', 'guesty_reviews_nonce'); ?>
                <input type="hidden" name="guesty_reviews_listing_id" value="<?php echo esc_attr($selected_listing_id); ?>">
                <p><strong><?php echo esc_html(count($reviews)); ?></strong> reviews found. Check any review to hide it from the front end.</p>
                <table class="widefat striped">
                    <thead>
                        <tr>
                            <th style="width:60px">Hide</th>
                            <th>Review</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php
                        $hidden_ids = isset($hidden[$selected_listing_id]) && is_array($hidden[$selected_listing_id])
                            ? $hidden[$selected_listing_id]
                            : [];
                        foreach ($reviews as $review):
                            $raw = $review['rawReview'] ?? [];
                            $title = $raw['title']['value'] ?? 'Guest Review';
                            $body = $raw['body']['value'] ?? '';
                            $date = $raw['createdDateTime'] ?? '';
                            $rating = $raw['starRatingOverall'] ?? '';
                            $guest = $raw['reservation']['primaryGuest'] ?? [];
                            $guest_name = trim(($guest['firstName'] ?? 'Guest') . ' ' . ($guest['lastName'] ?? ''));
                            $rid = guesty_get_review_identifier($review);
                            $is_hidden = in_array($rid, $hidden_ids, true);
                        ?>
                        <tr>
                            <td>
                                <input type="checkbox" name="hidden_reviews[]" value="<?php echo esc_attr($rid); ?>" <?php checked($is_hidden); ?>>
                            </td>
                            <td>
                                <strong><?php echo esc_html($title); ?></strong><br>
                                <span><?php echo esc_html($guest_name); ?></span>
                                <?php if ($date): ?>
                                    <span> — <?php echo esc_html(date('Y-m-d', strtotime($date))); ?></span>
                                <?php endif; ?>
                                <?php if ($rating !== ''): ?>
                                    <span> — Rating: <?php echo esc_html($rating); ?>/5</span>
                                <?php endif; ?>
                                <?php if ($body): ?>
                                    <p><?php echo esc_html($body); ?></p>
                                <?php endif; ?>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
                <p>
                    <button type="submit" class="button button-primary" name="guesty_reviews_save">Save Hidden Reviews</button>
                </p>
            </form>
        <?php elseif ($selected_listing_id && empty($reviews) && !$error_message): ?>
            <p>No reviews available for this listing.</p>
        <?php endif; ?>
    </div>
    <?php
}