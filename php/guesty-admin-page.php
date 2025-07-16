<?php
// filepath: /C:/Users/Owner/Documents/Flygon Lc/WordPress Plugins/MannaPress Guesty/guesty-admin-page.php

// Add a menu item to the WordPress admin sidebar
add_action('admin_menu', function () {
    add_menu_page(
        'MannaGuesty', // Page title
        'MannaGuesty', // Menu title
        'edit_posts',      // Capability (lowered for testing)
        'guesty-settings', // Menu slug
        'guesty_settings_page', // Callback function
        'dashicons-calendar-alt', // Icon
        100 // Position
    );
});

// Render the settings page
function guesty_settings_page() {
    // Check if the user has submitted the form
    if (isset($_POST['guesty_settings_submit'])) {
        // Verify the nonce for security
        if (!isset($_POST['guesty_settings_nonce']) || !wp_verify_nonce($_POST['guesty_settings_nonce'], 'guesty_settings_save')) {
            echo '<div class="notice notice-error"><p>Invalid nonce. Settings not saved.</p></div>';
        } else {
            // Save the Client ID and Client Secret to the database
            update_option('guesty_client_id_1', sanitize_text_field($_POST['guesty_client_id_1']));
            update_option('guesty_client_secret_1', sanitize_text_field($_POST['guesty_client_secret_1']));
            update_option('guesty_client_id_2', sanitize_text_field($_POST['guesty_client_id_2']));
            update_option('guesty_client_secret_2', sanitize_text_field($_POST['guesty_client_secret_2']));
            // Save payment method and Stripe keys for each token set
            update_option('guesty_payment_method_1', sanitize_text_field($_POST['guesty_payment_method_1']));
            update_option('guesty_stripe_secret_1', sanitize_text_field($_POST['guesty_stripe_secret_1']));
            update_option('guesty_stripe_publishable_1', sanitize_text_field($_POST['guesty_stripe_publishable_1']));
            update_option('guesty_payment_method_2', sanitize_text_field($_POST['guesty_payment_method_2']));
            update_option('guesty_stripe_secret_2', sanitize_text_field($_POST['guesty_stripe_secret_2']));
            update_option('guesty_stripe_publishable_2', sanitize_text_field($_POST['guesty_stripe_publishable_2']));

            echo '<div class="notice notice-success"><p>Settings saved successfully.</p></div>';
        }
    }

    // Get the current values from the database
    $client_id_1 = get_option('guesty_client_id_1', '');
    $client_secret_1 = get_option('guesty_client_secret_1', '');
    $client_id_2 = get_option('guesty_client_id_2', '');
    $client_secret_2 = get_option('guesty_client_secret_2', '');
    // Get payment method and Stripe keys for each token set
    $payment_method_1 = get_option('guesty_payment_method_1', 'guesty');
    $stripe_secret_1 = get_option('guesty_stripe_secret_1', '');
    $stripe_publishable_1 = get_option('guesty_stripe_publishable_1', '');
    $payment_method_2 = get_option('guesty_payment_method_2', 'guesty');
    $stripe_secret_2 = get_option('guesty_stripe_secret_2', '');
    $stripe_publishable_2 = get_option('guesty_stripe_publishable_2', '');

    // Render the settings form
    ?>
    <div class="wrap">
        <h1>Guesty Settings</h1>
        <p><em><strong>MannaGuesty</strong> is a plugin produced by Ari Daniel Bradshaw for The Manna Agency on Guesty-Powered Websites</em></p>
        <form method="post">
            <?php wp_nonce_field('guesty_settings_save', 'guesty_settings_nonce'); ?>
            <table class="form-table">
                <tr>
                    <th scope="row"><label for="guesty_client_id_1">Client ID 1</label></th>
                    <td><input type="text" name="guesty_client_id_1" id="guesty_client_id_1" value="<?php echo esc_attr($client_id_1); ?>" class="regular-text"></td>
                </tr>
                <tr>
                    <th scope="row"><label for="guesty_client_secret_1">Client Secret 1</label></th>
                    <td><input type="text" name="guesty_client_secret_1" id="guesty_client_secret_1" value="<?php echo esc_attr($client_secret_1); ?>" class="regular-text"></td>
                </tr>
                <tr>
                    <th scope="row"><label for="guesty_client_id_2">Client ID 2 (fallback)</label></th>
                    <td><input type="text" name="guesty_client_id_2" id="guesty_client_id_2" value="<?php echo esc_attr($client_id_2); ?>" class="regular-text"></td>
                </tr>
                <tr>
                    <th scope="row"><label for="guesty_client_secret_2">Client Secret 2 (fallback)</label></th>
                    <td><input type="text" name="guesty_client_secret_2" id="guesty_client_secret_2" value="<?php echo esc_attr($client_secret_2); ?>" class="regular-text"></td>
                </tr>
                <tr>
                <th scope="row">Payment Method 1</th>
                <td>
                    <select name="guesty_payment_method_1" id="guesty_payment_method_1" onchange="toggleStripeFields(1)">
                        <option value="guesty" <?php selected($payment_method_1, 'guesty'); ?>>GuestyPay</option>
                        <option value="stripe" <?php selected($payment_method_1, 'stripe'); ?>>Stripe</option>
                    </select>
                </td>
            </tr>
            <tr class="stripe-fields-1" style="display:<?php echo ($payment_method_1 === 'stripe') ? 'table-row' : 'none'; ?>;">
                <th scope="row"><label for="guesty_stripe_secret_1">Stripe Secret Key 1</label></th>
                <td><input type="text" name="guesty_stripe_secret_1" id="guesty_stripe_secret_1" value="<?php echo esc_attr($stripe_secret_1); ?>" class="regular-text"></td>
            </tr>
            <tr class="stripe-fields-1" style="display:<?php echo ($payment_method_1 === 'stripe') ? 'table-row' : 'none'; ?>;">
                <th scope="row"><label for="guesty_stripe_publishable_1">Stripe Publishable Key 1</label></th>
                <td><input type="text" name="guesty_stripe_publishable_1" id="guesty_stripe_publishable_1" value="<?php echo esc_attr($stripe_publishable_1); ?>" class="regular-text"></td>
            </tr>
            <tr>
                <th scope="row">Payment Method 2 (fallback)</th>
                <td>
                    <select name="guesty_payment_method_2" id="guesty_payment_method_2" onchange="toggleStripeFields(2)">
                        <option value="guesty" <?php selected($payment_method_2, 'guesty'); ?>>GuestyPay</option>
                        <option value="stripe" <?php selected($payment_method_2, 'stripe'); ?>>Stripe</option>
                    </select>
                </td>
            </tr>
            <tr class="stripe-fields-2" style="display:<?php echo ($payment_method_2 === 'stripe') ? 'table-row' : 'none'; ?>;">
                <th scope="row"><label for="guesty_stripe_secret_2">Stripe Secret Key 2</label></th>
                <td><input type="text" name="guesty_stripe_secret_2" id="guesty_stripe_secret_2" value="<?php echo esc_attr($stripe_secret_2); ?>" class="regular-text"></td>
            </tr>
            <tr class="stripe-fields-2" style="display:<?php echo ($payment_method_2 === 'stripe') ? 'table-row' : 'none'; ?>;">
                <th scope="row"><label for="guesty_stripe_publishable_2">Stripe Publishable Key 2</label></th>
                <td><input type="text" name="guesty_stripe_publishable_2" id="guesty_stripe_publishable_2" value="<?php echo esc_attr($stripe_publishable_2); ?>" class="regular-text"></td>
            </tr>
            </table>
            <?php submit_button('Save Settings', 'primary', 'guesty_settings_submit'); ?>
        </form>
        <script>
        function toggleStripeFields(num) {
            var method = document.getElementById('guesty_payment_method_' + num).value;
            var fields = document.querySelectorAll('.stripe-fields-' + num);
            fields.forEach(function(row) {
                row.style.display = (method === 'stripe') ? 'table-row' : 'none';
            });
        }
        document.addEventListener('DOMContentLoaded', function() {
            toggleStripeFields(1);
            toggleStripeFields(2);
        });
        </script>
        <p><em><strong>MannaGuesty</strong> Shortcodes:</em></p>
        <ul>
            <li><strong>[guesty_map]</strong> - Displays the map for a specific listing.</li>
            <li><strong>[guesty_reviews]</strong> - Displays reviews for a specific listing.</li>
            <li><strong>[guesty_attributes]</strong> - Displays property attributes for a specific listing.</li>
            <li><strong>[guesty_booking_calendar]</strong> - Displays the booking calendar for a specific listing.</li>
            <li><strong>[guesty_payment]</strong> - Displays the payment form for a specific listing.</li>
            <li><strong>[guesty_all_properties]</strong> - Displays all properties with a search form.</li>
            <li><strong>[guesty_slides]</strong> - Displays a slideshow of images for a specific listing.</li>
        </ul>
    </div>
    <?php
}