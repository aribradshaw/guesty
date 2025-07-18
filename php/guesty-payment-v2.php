<?php
// Guesty Payment v2 - Admin and backend logic

// Ensure the main Guesty menu exists, or add it if not
add_action('admin_menu', function () {
    if (!has_action('admin_menu', 'guesty_settings_page')) {
        add_menu_page(
            'MannaGuesty',
            'MannaGuesty',
            'manage_options',
            'guesty-settings',
            function () { echo '<h1>MannaGuesty Settings</h1>'; },
            'dashicons-calendar-alt',
            100
        );
    }
    add_submenu_page(
        'guesty-settings',
        'Payment Providers v2',
        'Payment Providers v2',
        'manage_options',
        'guesty-payment-v2-settings',
        'guesty_payment_v2_settings_page'
    );
});

function guesty_payment_v2_settings_page() {
    if (isset($_POST['guesty_payment_v2_submit'])) {
        check_admin_referer('guesty_payment_v2_save', 'guesty_payment_v2_nonce');
        update_option('guesty_v2_payment_provider_1', sanitize_text_field($_POST['guesty_v2_payment_provider_1']));
        update_option('guesty_v2_payment_provider_2', sanitize_text_field($_POST['guesty_v2_payment_provider_2']));
        update_option('guesty_v2_stripe_publishable_key', sanitize_text_field($_POST['guesty_v2_stripe_publishable_key']));
        update_option('guesty_v2_stripe_secret_key', sanitize_text_field($_POST['guesty_v2_stripe_secret_key']));
        echo '<div class="updated"><p>Settings saved.</p></div>';
    }
    $provider_1 = get_option('guesty_v2_payment_provider_1', 'guestypay');
    $provider_2 = get_option('guesty_v2_payment_provider_2', 'guestypay');
    $stripe_publishable_key = get_option('guesty_v2_stripe_publishable_key', '');
    $stripe_secret_key = get_option('guesty_v2_stripe_secret_key', '');
    ?>
    <div class="wrap">
        <h1>Guesty Payment Providers v2</h1>
        <p><strong>Instructions:</strong> Select the payment provider for each Guesty API token set. Enter your Stripe keys if using Stripe. These settings control which payment form appears for each property.</p>
        <form method="post">
            <?php wp_nonce_field('guesty_payment_v2_save', 'guesty_payment_v2_nonce'); ?>
            <table class="form-table">
                <tr>
                    <th>Payment Provider 1</th>
                    <td>
                        <select name="guesty_v2_payment_provider_1">
                            <option value="guestypay" <?php selected($provider_1, 'guestypay'); ?>>GuestyPay</option>
                            <option value="stripe" <?php selected($provider_1, 'stripe'); ?>>Stripe</option>
                        </select>
                    </td>
                </tr>
                <tr>
                    <th>Payment Provider 2 (fallback)</th>
                    <td>
                        <select name="guesty_v2_payment_provider_2">
                            <option value="guestypay" <?php selected($provider_2, 'guestypay'); ?>>GuestyPay</option>
                            <option value="stripe" <?php selected($provider_2, 'stripe'); ?>>Stripe</option>
                        </select>
                    </td>
                </tr>
                <tr>
                    <th>Stripe Publishable Key</th>
                    <td><input type="text" name="guesty_v2_stripe_publishable_key" value="<?php echo esc_attr($stripe_publishable_key); ?>" class="regular-text"></td>
                </tr>
                <tr>
                    <th>Stripe Secret Key</th>
                    <td><input type="text" name="guesty_v2_stripe_secret_key" value="<?php echo esc_attr($stripe_secret_key); ?>" class="regular-text"></td>
                </tr>
            </table>
            <?php submit_button('Save Settings', 'primary', 'guesty_payment_v2_submit'); ?>
        </form>
    </div>
    <?php
}

// 2. AJAX endpoint: Given a listingId, return token set and provider
add_action('wp_ajax_guesty_v2_get_provider', 'guesty_v2_get_provider');
add_action('wp_ajax_nopriv_guesty_v2_get_provider', 'guesty_v2_get_provider');
function guesty_v2_get_provider() {
    $listing_id = isset($_POST['listing_id']) ? sanitize_text_field($_POST['listing_id']) : '';
    if (!$listing_id) {
        wp_send_json_error(['message' => 'No listing ID provided.']);
    }
    // Try token 1
    $client_id_1 = get_option('guesty_client_id_1', '');
    $client_secret_1 = get_option('guesty_client_secret_1', '');
    $client_id_2 = get_option('guesty_client_id_2', '');
    $client_secret_2 = get_option('guesty_client_secret_2', '');
    $provider_1 = get_option('guesty_v2_payment_provider_1', 'guestypay');
    $provider_2 = get_option('guesty_v2_payment_provider_2', 'guestypay');
    $stripe_publishable_key = get_option('guesty_v2_stripe_publishable_key', '');
    $token1 = guesty_get_bearer_token($client_id_1, $client_secret_1);
    $token2 = guesty_get_bearer_token($client_id_2, $client_secret_2);
    if ($token1) {
        $response = wp_remote_get("https://booking.guesty.com/api/listings/{$listing_id}", [
            'headers' => [
                'Authorization' => "Bearer $token1",
                'Accept' => 'application/json; charset=utf-8',
            ],
        ]);
        $data = json_decode(wp_remote_retrieve_body($response), true);
        if (!is_wp_error($response) && isset($data['_id'])) {
            wp_send_json_success([
                'token_set' => 1,
                'provider' => $provider_1,
                'stripe_publishable_key' => $provider_1 === 'stripe' ? $stripe_publishable_key : '',
            ]);
        }
    }
    if ($token2) {
        $response = wp_remote_get("https://booking.guesty.com/api/listings/{$listing_id}", [
            'headers' => [
                'Authorization' => "Bearer $token2",
                'Accept' => 'application/json; charset=utf-8',
            ],
        ]);
        $data = json_decode(wp_remote_retrieve_body($response), true);
        if (!is_wp_error($response) && isset($data['_id'])) {
            wp_send_json_success([
                'token_set' => 2,
                'provider' => $provider_2,
                'stripe_publishable_key' => $provider_2 === 'stripe' ? $stripe_publishable_key : '',
            ]);
        }
    }
    wp_send_json_error(['message' => 'Could not determine provider for this listing.']);
} 