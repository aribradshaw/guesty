jQuery(document).ready(function ($) {
    $('#guesty-payment-section').hide();
    $('#guesty-guest-form').hide();
    $('#guesty-payment-form').hide();

    // 1. Show guest form when quote is ready
    $(document).on('guesty_quote_ready', function (e, quoteData) {
        $('#guesty-payment-section').show();
        $('#guesty-guest-form').show();        $('#guesty-payment-form').hide();

        // Try to extract listingId from all possible locations
        window.guestyListingId =
            quoteData?.listingId ||
            quoteData?.quote?.listingId ||
            quoteData?.debug?.listing_id ||
            null;

        const listingId = window.guestyListingId;
        const tokenSet = window.guestyTokenSet || 0;        // Only show error if user tries to proceed without listingId
        if (!listingId) {
            $('#guesty-payment-section').hide();
            $('#guesty-payment-message').html('Could not determine listing ID. Please contact support.');
            return;
        } else {
            $('#guesty-payment-message').html('');
        }

        // Fetch payment provider ID
        $.post(guestyAjax.ajax_url, {
            action: 'get_guesty_payment_provider',
            listing_id: listingId,
            token_set: tokenSet
        }, function(response) {
            if (response.success) {                window.guestyPaymentProviderId = response.data.provider_id;
            } else {
                $('#guesty-payment-message').html('Could not fetch payment provider. Please contact support.');
            }
        });
    });

    // 2. On guest form submit, show payment form
    $('#guesty-guest-form').on('submit', async function (e) {
        e.preventDefault();
        $('#guesty-guest-form').hide();
        $('#guesty-payment-form').show();

        // Save guest info for later use
        window.guestyGuestInfo = {
            firstName: $('#guest-first-name').val(),
            lastName: $('#guest-last-name').val(),
            email: $('#guest-email').val(),
            phone: $('#guest-phone').val(),
            address: {
                line1: $('#guest-address-line1').val(),
                city: $('#guest-city').val(),
                country: $('#guest-country').val(),
                postal_code: $('#guest-postal-code').val()
            }
        };        try {
            if (!window.guestyTokenization) {
                $('#guesty-payment-message').html('Payment system not loaded. Please refresh.');
                return;
            }
            if (!window.guestyPaymentProviderId) {
                $('#guesty-payment-message').html('Payment provider ID is missing. Please contact support.');
                return;
            }
            await window.guestyTokenization.render({
                containerId: "guesty-tokenization-container",
                providerId: window.guestyPaymentProviderId
            });        } catch (err) {
            $('#guesty-payment-message').html('Failed to load payment form.');
        }
    });

    // 3. On payment form submit, tokenize and book
    $('#guesty-pay-btn').on('click', async function (e) {
        e.preventDefault();

        // Get quote info
        const quoteId = window.guestyQuoteId;
        const ratePlanId = window.guestyRatePlanId;
        const guest = window.guestyGuestInfo;

        // Get total/currency from quote for 3DS
        const amount = window.guestyQuoteData?.total || 0;
        const currency = window.guestyQuoteData?.quote?.rates?.ratePlans?.[0]?.money?.currency || 'USD';

        try {
            // Submit payment form to tokenize card
            const paymentMethod = await window.guestyTokenization.submit({
                amount,
                currency,
                apiVersion: 'v2',
                quoteId,
                guest: {
                    firstName: guest.firstName,
                    lastName: guest.lastName,
                    email: guest.email,
                    phone: guest.phone,
                    address: {
                        line1: guest.address.line1,
                        city: guest.address.city,
                        country: guest.address.country,
                        postal_code: guest.address.postal_code
                    }
                }
            });

            const ccToken = paymentMethod._id;

            // Now send AJAX to backend to create reservation
            $.post(guestyAjax.ajax_url, {
                action: 'guesty_create_reservation',
                guest: guest,
                ccToken: ccToken,
                quoteId: quoteId,
                ratePlanId: ratePlanId,
                token_set: window.guestyTokenSet || 0
            }, function (response) {
                if (response.success) {
                    $('#guesty-payment-message').html('Booking confirmed! Confirmation #: ' + response.data.confirmationCode);
                } else {
                    $('#guesty-payment-message').html('Booking failed: ' + (response.data.message || 'Unknown error'));
                }
            });
        } catch (err) {
            $('#guesty-payment-message').html('Payment failed: ' + (err.message || 'Unknown error'));
        }
    });
});