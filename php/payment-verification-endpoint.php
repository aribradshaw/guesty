<?php
/**
 * Payment Verification Endpoint
 * Helps verify that payments are going to the correct accounts
 */

// Add AJAX endpoint for payment verification
add_action('wp_ajax_verify_guesty_payment', 'verify_guesty_payment');
add_action('wp_ajax_nopriv_verify_guesty_payment', 'verify_guesty_payment');

function verify_guesty_payment() {
    $reservation_id = sanitize_text_field($_POST['reservationId'] ?? '');
    $token_set = intval($_POST['token_set'] ?? 0);

    if (empty($reservation_id)) {
        wp_send_json_error(['message' => 'Reservation ID required']);
        return;
    }

    // Get correct API token
    $client_id_1 = get_option('guesty_client_id_1', '');
    $client_secret_1 = get_option('guesty_client_secret_1', '');
    $client_id_2 = get_option('guesty_client_id_2', '');
    $client_secret_2 = get_option('guesty_client_secret_2', '');

    $token = ($token_set === 2)
        ? guesty_get_bearer_token($client_id_2, $client_secret_2)
        : guesty_get_bearer_token($client_id_1, $client_secret_1);

    if (!$token) {
        wp_send_json_error(['message' => 'Unable to retrieve API token']);
        return;
    }

    // Get reservation details
    $reservation_response = wp_remote_get("https://api.guesty.com/api/v2/reservations/{$reservation_id}", [
        'headers' => [
            'Authorization' => "Bearer $token",
            'Accept' => 'application/json'
        ]
    ]);

    if (is_wp_error($reservation_response)) {
        wp_send_json_error(['message' => 'Error fetching reservation details']);
        return;
    }

    $reservation_data = json_decode(wp_remote_retrieve_body($reservation_response), true);

    if (empty($reservation_data['_id'])) {
        wp_send_json_error(['message' => 'Reservation not found']);
        return;
    }

    // Get listing details to find payment provider
    $listing_id = $reservation_data['listingId'] ?? '';
    $listing_response = wp_remote_get("https://api.guesty.com/api/v2/listings/{$listing_id}", [
        'headers' => [
            'Authorization' => "Bearer $token",
            'Accept' => 'application/json'
        ]
    ]);

    $listing_data = [];
    if (!is_wp_error($listing_response)) {
        $listing_data = json_decode(wp_remote_retrieve_body($listing_response), true);
    }

    // Extract payment verification info
    $verification_data = [
        'reservation' => [
            'id' => $reservation_data['_id'],
            'confirmation_code' => $reservation_data['confirmationCode'] ?? 'N/A',
            'status' => $reservation_data['status'] ?? 'N/A',
            'created_at' => $reservation_data['createdAt'] ?? 'N/A',
            'guest_email' => $reservation_data['guest']['email'] ?? 'N/A',
            'listing_id' => $listing_id
        ],
        'financial' => [
            'total_price' => $reservation_data['money']['totalPrice'] ?? 'N/A',
            'currency' => $reservation_data['money']['currency'] ?? 'N/A',
            'host_payout' => $reservation_data['money']['hostPayout'] ?? 'N/A',
            'guest_fee' => $reservation_data['money']['guestFee'] ?? 'N/A',
            'payment_method' => $reservation_data['paymentMethod'] ?? 'N/A',
        ],
        'property' => [
            'title' => $listing_data['title'] ?? 'N/A',
            'address' => $listing_data['address']['full'] ?? 'N/A',
            'owner_id' => $listing_data['accountId'] ?? 'N/A'
        ],
        'payment_provider' => [
            'provider_used' => 'To be determined from payment details',
            'payment_status' => $reservation_data['paymentStatus'] ?? 'N/A'
        ]
    ];

    wp_send_json_success($verification_data);
}

// Add JavaScript to call verification
add_action('wp_footer', function() {
    global $post;
    if (is_page() && $post && has_shortcode($post->post_content, 'guesty_payment')) {
        ?>
        <script>
        window.verifyGuestyPayment = function(reservationId, tokenSet = 0) {
            console.log('[Verification] Checking payment for reservation:', reservationId);
            
            return jQuery.post(guestyAjax.ajax_url, {
                action: 'verify_guesty_payment',
                reservationId: reservationId,
                token_set: tokenSet
            }).done(function(response) {
                if (response.success) {
                    console.log('[Verification] Payment verification data:', response.data);
                    console.table('RESERVATION DETAILS', response.data.reservation);
                    console.table('FINANCIAL DETAILS', response.data.financial);
                    console.table('PROPERTY DETAILS', response.data.property);
                    
                    // Show verification in a nice format
                    const verificationHtml = `
                        <div style="background: #f0f8ff; border: 1px solid #4CAF50; padding: 15px; margin: 10px 0; border-radius: 5px;">
                            <h4 style="color: #2e7d32; margin-top: 0;">💰 Payment Verification Results</h4>
                            <p><strong>Reservation:</strong> ${response.data.reservation.confirmation_code}</p>
                            <p><strong>Amount:</strong> $${response.data.financial.total_price} ${response.data.financial.currency}</p>
                            <p><strong>Host Payout:</strong> $${response.data.financial.host_payout} ${response.data.financial.currency}</p>
                            <p><strong>Property:</strong> ${response.data.property.title}</p>
                            <p><strong>Owner ID:</strong> ${response.data.property.owner_id}</p>
                            <p><strong>Payment Status:</strong> ${response.data.payment_provider.payment_status}</p>
                            <p style="color: #2e7d32; font-weight: bold;">✅ Payment successfully processed!</p>
                        </div>
                    `;
                    
                    jQuery('#guesty-success-message').after(verificationHtml);
                } else {
                    console.error('[Verification] Error:', response.data.message);
                }
            }).fail(function(xhr, status, error) {
                console.error('[Verification] AJAX failed:', error);
            });
        };
        
        // Auto-verify last payment if we have the data
        if (window.lastGuestyReservationId) {
            setTimeout(() => {
                window.verifyGuestyPayment(window.lastGuestyReservationId, window.guestyTokenSet || 0);
            }, 2000);
        }
        </script>
        <?php
    }
});
?> 