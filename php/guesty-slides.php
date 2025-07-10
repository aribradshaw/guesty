<?php
/**
 * Shortcode: [guesty_slides listing_id="..."]
 * Outputs a responsive image slider with lightbox for a Guesty listing.
 */

function guesty_slides_shortcode($atts) {
    // No need for listing_id attribute; will be detected by JS from #guesty-listing-id
    $output = '<div class="guesty-slides-wrapper">
        <div class="guesty-slides-gallery">Loading images...</div>
    </div>';
    // Enqueue JS and CSS
    wp_enqueue_script('guesty-slides-script');
    wp_enqueue_style('guesty-slides-style');
    return $output;
}
add_shortcode('guesty_slides', 'guesty_slides_shortcode');

// Register JS and CSS
add_action('wp_enqueue_scripts', function () {
    // Use plugin root URL constant defined in main plugin file
    $plugin_url = defined('MANNAPRESS_PLUGIN_URL') ? MANNAPRESS_PLUGIN_URL : plugin_dir_url(dirname(__FILE__));
    wp_register_script(
        'guesty-slides-script',
        $plugin_url . 'js/guesty-slides.js',
        ['jquery'],
        '1.0',
        true
    );
    wp_localize_script('guesty-slides-script', 'guestySlidesAjax', [
        'ajax_url' => admin_url('admin-ajax.php'),
    ]);
    wp_register_style(
        'guesty-slides-style',
        $plugin_url . 'css/guesty-slides.css',
        [],
        '1.0'
    );
});

// AJAX handler to fetch images from Guesty API
add_action('wp_ajax_fetch_guesty_images', 'fetch_guesty_images');
add_action('wp_ajax_nopriv_fetch_guesty_images', 'fetch_guesty_images');
function fetch_guesty_images() {
    $listing_id = isset($_POST['listing_id']) ? sanitize_text_field($_POST['listing_id']) : '';
    if (!$listing_id) {
        wp_send_json_error(['message' => 'No listing ID provided.']);
    }
    $client_id_1 = get_option('guesty_client_id_1', '');
    $client_secret_1 = get_option('guesty_client_secret_1', '');
    $client_id_2 = get_option('guesty_client_id_2', '');
    $client_secret_2 = get_option('guesty_client_secret_2', '');

    $images = [];
    $errors = [];
    // Try first API key
    $token = function_exists('guesty_get_bearer_token') ? guesty_get_bearer_token($client_id_1, $client_secret_1) : '';
    if ($token) {
        $response = wp_remote_get("https://booking.guesty.com/api/listings/{$listing_id}", [
            'headers' => [
                'Authorization' => "Bearer $token",
                'Accept' => 'application/json; charset=utf-8',
            ],
        ]);
        if (!is_wp_error($response)) {
            $data = json_decode(wp_remote_retrieve_body($response), true);
            $pictures = isset($data['pictures']) && is_array($data['pictures']) ? $data['pictures'] : [];
            foreach ($pictures as $pic) {
                if (!empty($pic['thumbnail']) && !empty($pic['original'])) {
                    $images[] = [
                        'url' => $pic['thumbnail'],
                        'original' => $pic['original'],
                        'caption' => isset($pic['caption']) ? $pic['caption'] : ''
                    ];
                }
            }
            // If no pictures, fallback to 'images' (legacy)
            if (empty($images) && isset($data['images']) && is_array($data['images'])) {
                foreach ($data['images'] as $img) {
                    if (!empty($img['url'])) {
                        $images[] = [
                            'url' => $img['url'],
                            'original' => $img['url'],
                            'caption' => isset($img['caption']) ? $img['caption'] : ''
                        ];
                    }
                }
            }
        } else {
            $errors[] = $response->get_error_message();
        }
    }
    // If no images, try second API key
    if (empty($images) && $client_id_2 && $client_secret_2) {
        $token2 = function_exists('guesty_get_bearer_token') ? guesty_get_bearer_token($client_id_2, $client_secret_2) : '';
        if ($token2) {
            $response2 = wp_remote_get("https://booking.guesty.com/api/listings/{$listing_id}", [
                'headers' => [
                    'Authorization' => "Bearer $token2",
                    'Accept' => 'application/json; charset=utf-8',
                ],
            ]);
            if (!is_wp_error($response2)) {
                $data2 = json_decode(wp_remote_retrieve_body($response2), true);
                $pictures2 = isset($data2['pictures']) && is_array($data2['pictures']) ? $data2['pictures'] : [];
                foreach ($pictures2 as $pic) {
                    if (!empty($pic['thumbnail']) && !empty($pic['original'])) {
                        $images[] = [
                            'url' => $pic['thumbnail'],
                            'original' => $pic['original'],
                            'caption' => isset($pic['caption']) ? $pic['caption'] : ''
                        ];
                    }
                }
                // If no pictures, fallback to 'images' (legacy)
                if (empty($images) && isset($data2['images']) && is_array($data2['images'])) {
                    foreach ($data2['images'] as $img) {
                        if (!empty($img['url'])) {
                            $images[] = [
                                'url' => $img['url'],
                                'original' => $img['url'],
                                'caption' => isset($img['caption']) ? $img['caption'] : ''
                            ];
                        }
                    }
                }
            } else {
                $errors[] = $response2->get_error_message();
            }
        }
    }
    if (!empty($images)) {
        wp_send_json_success(['images' => $images]);
    } else {
        wp_send_json_error(['message' => 'No images found for this listing.', 'errors' => $errors]);
    }
}
