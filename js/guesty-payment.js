// Add this at the very top to confirm JS is loaded
console.log('[guesty-payment.js] Loaded');

if (typeof jQuery === 'undefined') {
    console.error('[guesty-payment.js] jQuery is not loaded!');
}

// Load Stripe.js globally if not present
(function() {
    if (!window.Stripe) {
        var script = document.createElement('script');
        script.src = 'https://js.stripe.com/v3/';
        script.onload = function() { console.log('[guesty-payment.js] Stripe.js loaded'); };
        document.head.appendChild(script);
    }
})();

jQuery(document).ready(function ($) {
    if (!$('#guesty-payment-section').length) {
        console.warn('[guesty-payment.js] #guesty-payment-section not found in DOM. Is the [guesty_payment] shortcode present on this page?');
    }
    // Remove all hide/show logic
    window.guestyPaymentMethod = null;
    window.guestyStripe = null;
    window.guestyStripeElements = null;
    window.guestyStripeCard = null;
    window.guestyStripePk = null;

    // Helper: Update payment indicator
    function updatePaymentIndicator(method) {
        const indicator = $('#guesty-payment-indicator');
        if (method === 'stripe') {
            indicator.text('S').removeClass('guestypay').addClass('stripe');
        } else {
            indicator.text('GP').removeClass('stripe').addClass('guestypay');
        }
    }

    // Helper: Render Stripe Elements form
    function renderStripeForm(pk) {
        if (!window.Stripe) {
            $('#guesty-tokenization-container').html('<div style="color:red">Stripe.js not loaded. Please refresh.</div>');
            return;
        }
        window.guestyStripe = Stripe(pk);
        window.guestyStripeElements = window.guestyStripe.elements();
        $('#guesty-tokenization-container').html('<form id="guesty-stripe-form"><div id="guesty-stripe-card-element" style="margin-bottom:12px;"></div><div id="guesty-stripe-message" style="margin-top:10px;color:#b00;"></div></form>');
        window.guestyStripeCard = window.guestyStripeElements.create('card');
        window.guestyStripeCard.mount('#guesty-stripe-card-element');
        console.log('[guesty-payment.js] Stripe Elements form rendered');
    }

    // Helper: Remove Stripe form
    function clearStripeForm() {
        if (window.guestyStripeCard) {
            window.guestyStripeCard.unmount();
            window.guestyStripeCard = null;
        }
        $('#guesty-tokenization-container').empty();
    }

    // Helper: Render GuestyPay form (just clears container, GuestyPay renders on submit)
    function renderGuestyPayForm() {
        clearStripeForm();
        $('#guesty-tokenization-container').html(`
            <div id="guesty-tokenization-form">
                <div class="guesty-card-fields">
                    <div class="guesty-card-number-container">
                        <input type="text" id="guesty-card-number" placeholder="Card Number" required>
                    </div>
                    <div class="guesty-row">
                        <div class="guesty-card-expiry-container">
                            <input type="text" id="guesty-card-expiry" placeholder="MM/YY" required>
                        </div>
                        <div class="guesty-card-cvc-container">
                            <input type="text" id="guesty-card-cvc" placeholder="CVC" required>
                        </div>
                    </div>
                </div>
            </div>
        `);
        
        // Initialize GuestyPay tokenization with the form fields
        if (window.guestyTokenization) {
            try {
                window.guestyTokenization.init({
                    cardNumber: '#guesty-card-number',
                    cardExpiry: '#guesty-card-expiry',
                    cardCvc: '#guesty-card-cvc'
                });
                console.log('[guesty-payment.js] GuestyPay tokenization initialized');
            } catch (error) {
                console.error('[guesty-payment.js] Error initializing GuestyPay tokenization:', error);
            }
        } else {
            console.warn('[guesty-payment.js] GuestyPay tokenization SDK not loaded');
        }
        
        console.log('[guesty-payment.js] GuestyPay form rendered');
    }

    // Always fetch and display payment method label on page load (if token set is known)
    function updatePaymentMethodLabel() {
        const tokenSet = window.guestyTokenSet || 0;
        console.debug('[guesty-payment.js] updatePaymentMethodLabel called with tokenSet:', tokenSet);
        
        // If tokenSet is 0 and we don't have a quote yet, wait for it
        if (tokenSet === 0 && !window.guestyQuoteData) {
            console.debug('[guesty-payment.js] No token set available yet, waiting for token...');
            // labelDiv.text('Payment Method: Waiting for token...'); // This line is removed
            return;
        }
        
        $.post(guestyAjax.ajax_url, {
            action: 'get_guesty_payment_method',
            token_set: tokenSet
        }, function(response) {
            console.debug('[guesty-payment.js] get_guesty_payment_method response:', response);
            console.debug('[guesty-payment.js] Current window.guestyTokenSet:', window.guestyTokenSet);
            if (response.success && response.data && response.data.label) {
                // labelDiv.text('Payment Method: ' + response.data.label); // This line is removed
                window.guestyPaymentMethod = response.data.method;
                console.debug('[guesty-payment.js] Set payment method to:', response.data.method);
                
                // Update the payment indicator
                updatePaymentIndicator(response.data.method);
                
                if (response.data.method === 'stripe') {
                    // Fetch Stripe publishable key and render form
                    $.post(guestyAjax.ajax_url, {
                        action: 'get_guesty_stripe_pk',
                        token_set: tokenSet
                    }, function(pkResp) {
                        console.debug('[guesty-payment.js] get_guesty_stripe_pk response:', pkResp);
                        if (pkResp.success && pkResp.data && pkResp.data.pk) {
                            window.guestyStripePk = pkResp.data.pk;
                            renderStripeForm(pkResp.data.pk);
                        } else {
                            $('#guesty-tokenization-container').html('<div style="color:red">Could not load Stripe publishable key.</div>');
                        }
                    });
                } else {
                    renderGuestyPayForm();
                }
            } else {
                // labelDiv.text('Payment Method: Unknown'); // This line is removed
                clearStripeForm();
                console.warn('[guesty-payment.js] Could not determine payment method for tokenSet:', tokenSet);
            }
        });
    }
    
    // Wait for token to be ready before trying to get payment method
    if (window.guestyTokenSet) {
        updatePaymentMethodLabel();
    } else {
        $(document).on('guesty_token_ready', function () {
            console.debug('[guesty-payment.js] guesty_token_ready event received, updating payment method label');
            updatePaymentMethodLabel();
        });
    }
    
    // Also update when quote is ready (in case token set changes)
    $(document).on('guesty_quote_ready', function (e, quoteData) {
        console.debug('[guesty-payment.js] guesty_quote_ready event received, quoteData:', quoteData);
        // Try to extract listingId from all possible locations
        window.guestyListingId =
            quoteData?.listingId ||
            quoteData?.quote?.listingId ||
            quoteData?.debug?.listing_id ||
            null;

        const listingId = window.guestyListingId;
        const tokenSet = window.guestyTokenSet || 0;
        console.debug('[guesty-payment.js] listingId:', listingId, 'tokenSet:', tokenSet);
        // Only show error if user tries to proceed without listingId
        if (!listingId) {
            $('#guesty-payment-message').html('Could not determine listing ID. Please contact support.');
            return;
        } else {
            $('#guesty-payment-message').html('');
        }
        updatePaymentMethodLabel();
        // Fetch payment provider ID (for GuestyPay)
        $.post(guestyAjax.ajax_url, {
            action: 'get_guesty_payment_provider',
            listing_id: listingId,
            token_set: tokenSet
        }, function(response) {
            console.debug('[guesty-payment.js] get_guesty_payment_provider response:', response);
            if (response.success) {
                window.guestyPaymentProviderId = response.data.provider_id;
            } else {
                $('#guesty-payment-message').html('Could not fetch payment provider. Please contact support.');
            }
        });
    });

    // Remove guest form/payment form split: show all fields at once
    // On pay button click, handle payment for both GuestyPay and Stripe
    $('#guesty-pay-btn').off('click').on('click', async function (e) {
        e.preventDefault();
        console.debug('[guesty-payment.js] Pay button clicked');
        
        // Show loading state
        const $btn = $(this);
        const originalText = $btn.text();
        $btn.prop('disabled', true).html('<span class="loading-spinner"></span> Processing...');
        
        // Debug: Log the full quote data structure
        console.debug('[guesty-payment.js] Full quote data:', window.guestyQuoteData);
        console.debug('[guesty-payment.js] Quote total from different paths:', {
            'window.guestyQuoteData?.total': window.guestyQuoteData?.total,
            'window.guestyQuoteData?.quote?.total': window.guestyQuoteData?.quote?.total,
            'window.guestyQuoteData?.quote?.rates?.ratePlans?.[0]?.ratePlan?.money?.hostPayout': window.guestyQuoteData?.quote?.rates?.ratePlans?.[0]?.ratePlan?.money?.hostPayout,
            'window.guestyQuoteData?.rates?.ratePlans?.[0]?.ratePlan?.money?.hostPayout': window.guestyQuoteData?.rates?.ratePlans?.[0]?.ratePlan?.money?.hostPayout
        });
        
        // Gather guest info
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
        };
        const guest = window.guestyGuestInfo;
        const quoteId = window.guestyQuoteId;
        const ratePlanId = window.guestyRatePlanId;
        
        // Try multiple paths to get the amount
        let amount = 0;
        if (window.guestyQuoteData?.total) {
            amount = window.guestyQuoteData.total;
        } else if (window.guestyQuoteData?.quote?.total) {
            amount = window.guestyQuoteData.quote.total;
        } else if (window.guestyQuoteData?.quote?.rates?.ratePlans?.[0]?.ratePlan?.money?.hostPayout) {
            amount = window.guestyQuoteData.quote.rates.ratePlans[0].ratePlan.money.hostPayout;
        } else if (window.guestyQuoteData?.rates?.ratePlans?.[0]?.ratePlan?.money?.hostPayout) {
            amount = window.guestyQuoteData.rates.ratePlans[0].ratePlan.money.hostPayout;
        }
        
        console.debug('[guesty-payment.js] Extracted amount:', amount, 'Type:', typeof amount);
        
        const currency = window.guestyQuoteData?.quote?.rates?.ratePlans?.[0]?.money?.currency || 
                       window.guestyQuoteData?.rates?.ratePlans?.[0]?.money?.currency || 'USD';
        
        // Validate amount for Stripe
        if (amount <= 0) {
            console.error('[guesty-payment.js] Amount validation failed. Amount:', amount);
            $('#guesty-payment-message').html('Error: Invalid amount. Please refresh and try again.');
            $btn.prop('disabled', false).text(originalText); // Reset button
            return;
        }
        
        console.debug('[guesty-payment.js] Amount validation passed. Amount:', amount, 'Currency:', currency);
        
        if (window.guestyPaymentMethod === 'stripe') {
            // Stripe payment logic
            if (!window.guestyStripe || !window.guestyStripeCard) {
                $('#guesty-payment-message').html('Stripe form not ready.');
                $btn.prop('disabled', false).text(originalText); // Reset button
                return;
            }
            $('#guesty-payment-message').html('');
            
            // Step 1: Create PaymentMethod (tokenize the card)
            console.debug('[guesty-payment.js] Creating Stripe PaymentMethod...');
            const {paymentMethod, error} = await window.guestyStripe.createPaymentMethod({
                type: 'card',
                card: window.guestyStripeCard,
                billing_details: {
                    name: guest.firstName + ' ' + guest.lastName,
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
            if (error) {
                $('#guesty-stripe-message').text(error.message);
                $btn.prop('disabled', false).text(originalText); // Reset button
                return;
            }
            $('#guesty-stripe-message').text('');
            console.debug('[guesty-payment.js] PaymentMethod created:', paymentMethod.id);

            // Step 2: Create Guesty reservation using the PaymentMethod as ccToken
            console.debug('[guesty-payment.js] Creating Guesty reservation with PaymentMethod...');
            const reservationData = {
                action: 'create_guesty_stripe_reservation',
                token_set: window.guestyTokenSet || 0,
                payment_method: paymentMethod.id,
                quote_id: window.guestyQuoteId,
                rate_plan_id: window.guestyRatePlanId,
                guest: guest,
                listing_id: window.guestyListingId
            };
            console.debug('[guesty-payment.js] Sending reservation data:', reservationData);
            console.debug('[guesty-payment.js] Required values check:', {
                'payment_method': paymentMethod.id,
                'quote_id': window.guestyQuoteId,
                'rate_plan_id': window.guestyRatePlanId,
                'guest': guest,
                'listing_id': window.guestyListingId
            });
            
            $.post(guestyAjax.ajax_url, reservationData, function(response) {
                console.debug('[guesty-payment.js] create_guesty_stripe_reservation response:', response);
                if (!response.success) {
                    console.error('[guesty-payment.js] Reservation creation failed:', response.data);
                    $('#guesty-payment-message').html('Booking failed: ' + (response.data.message || 'Unknown error'));
                    $btn.prop('disabled', false).text(originalText); // Reset button
                    return;
                }
                console.debug('[guesty-payment.js] Reservation created successfully:', response.data);
                $('#guesty-payment-section').hide(); // Hide entire payment section
                // Show success message prominently
                $('<div id="guesty-success-message" style="background: #d4edda; color: #155724; padding: 20px; border-radius: 5px; margin: 20px 0; text-align: center; font-size: 18px; font-weight: bold;">✅ Booking confirmed! Confirmation #: ' + (response.data.confirmationCode || response.data._id) + '</div>').insertAfter('#guesty-payment-section');
            }).fail(function(xhr, status, error) {
                console.error('[guesty-payment.js] AJAX request failed:', {xhr, status, error});
                $('#guesty-payment-message').html('Network error: ' + error);
                $btn.prop('disabled', false).text(originalText); // Reset button
            });
            return;
        }
        // GuestyPay logic
        try {
            if (!window.guestyTokenization) {
                $('#guesty-payment-message').html('Payment system not loaded. Please refresh.');
                $btn.prop('disabled', false).text(originalText); // Reset button
                return;
            }
            if (!window.guestyPaymentProviderId) {
                $('#guesty-payment-message').html('Payment provider ID is missing. Please contact support.');
                $btn.prop('disabled', false).text(originalText); // Reset button
                return;
            }
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
            console.debug('[guesty-payment.js] Tokenized card, ccToken:', ccToken);
            // Now send AJAX to backend to create reservation
            $.post(guestyAjax.ajax_url, {
                action: 'guesty_create_reservation',
                guest: guest,
                ccToken: ccToken,
                quoteId: quoteId,
                ratePlanId: ratePlanId,
                token_set: window.guestyTokenSet || 0
            }, function (response) {
                console.debug('[guesty-payment.js] guesty_create_reservation response:', response);
                if (response.success) {
                    $('#guesty-payment-section').hide(); // Hide entire payment section
                    // Show success message prominently
                    $('<div id="guesty-success-message" style="background: #d4edda; color: #155724; padding: 20px; border-radius: 5px; margin: 20px 0; text-align: center; font-size: 18px; font-weight: bold;">✅ Booking confirmed! Confirmation #: ' + response.data.confirmationCode + '</div>').insertAfter('#guesty-payment-section');
                } else {
                    $('#guesty-payment-message').html('Booking failed: ' + (response.data.message || 'Unknown error'));
                    $btn.prop('disabled', false).text(originalText); // Reset button
                }
            });
        } catch (err) {
            $('#guesty-payment-message').html('Payment failed: ' + (err.message || 'Unknown error'));
            console.error('[guesty-payment.js] Payment failed:', err);
            $btn.prop('disabled', false).text(originalText); // Reset button
        }
    });
});