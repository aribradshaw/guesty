jQuery(document).ready(function ($) {
    // Listen for a custom event triggered by the calendar when dates are selected
    $(document).on('guesty_dates_selected', async function () {
        var listingId = $('#guesty-listing-id').data('listing-id');
        if (!listingId) {
            $('#guesty-payment-message').html('No listing ID found.');
            return;
        }
        // Ask backend for provider/token set
        let providerInfo = null;
        try {
            providerInfo = await new Promise((resolve, reject) => {
                $.post(ajaxurl || guestyAjax.ajax_url, {
                    action: 'guesty_v2_get_provider',
                    listing_id: listingId
                }, function(response) {
                    if (response.success) {
                        resolve(response.data);
                    } else {
                        reject(response.data ? response.data.message : 'Unknown error');
                    }
                });
            });
        } catch (err) {
            $('#guesty-payment-message').html('Could not determine payment provider.');
            return;
        }
        if (providerInfo.provider === 'stripe') {
            // Show Stripe form
            if (!window.Stripe || !providerInfo.stripe_publishable_key) {
                $('#guesty-payment-message').html('Stripe.js or key not loaded. Please refresh.');
                return;
            }
            var stripe = Stripe(providerInfo.stripe_publishable_key);
            var elements = stripe.elements();
            var card = elements.create('card');
            card.mount('#guesty-tokenization-container');
            $('#guesty-payment-section').show();
            $('#guesty-payment-form').show();
            $('#guesty-payment-message').html('');
            $('#guesty-pay-btn').off('click').on('click', async function (e) {
                e.preventDefault();
                const {paymentMethod, error} = await stripe.createPaymentMethod({
                    type: 'card',
                    card: card,
                });
                if (error) {
                    $('#guesty-payment-message').html('Stripe error: ' + error.message);
                } else {
                    $('#guesty-payment-message').html('Payment method created: ' + paymentMethod.id);
                    // TODO: Send paymentMethod.id to your backend for further processing
                }
            });
        } else if (providerInfo.provider === 'guestypay') {
            // TODO: Implement GuestyPay form logic
            $('#guesty-payment-message').html('GuestyPay form coming soon.');
        } else {
            $('#guesty-payment-message').html('Unknown payment provider.');
        }
    });
}); 