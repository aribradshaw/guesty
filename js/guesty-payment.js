// Add this at the very top to confirm JS is loaded

if (typeof jQuery === 'undefined') {
}

// Load Stripe.js globally if not present
(function() {
    if (!window.Stripe) {
        var script = document.createElement('script');
        script.src = 'https://js.stripe.com/v3/';
        script.onload = function() { 
        };
        script.onerror = function() {
        };
        document.head.appendChild(script);
    } else {
    }
})();

jQuery(document).ready(function ($) {
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

    // Helper: Ensure payment section is visible on mobile
    function ensurePaymentSectionVisible() {
        const isMobile = $(window).width() <= 768;
        if (isMobile) {
            const $paymentSection = $('#guesty-payment-section');
            if ($paymentSection.length && !$paymentSection.is(':visible')) {
                $paymentSection.show();
                // Force display block in case it's hidden by CSS
                $paymentSection.css({
                    'display': 'block',
                    'visibility': 'visible',
                    'opacity': '1'
                });
            }
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
    }

    // Helper: Remove Stripe form
    function clearStripeForm() {
        
        // Don't clear if server-side form is active
        if (window.guestyServerSideEnabled && $('#guesty-serverside-form').length > 0) {
            return;
        }
        
        if (window.guestyStripeCard) {
            window.guestyStripeCard.unmount();
            window.guestyStripeCard = null;
        }
        $('#guesty-tokenization-container').empty();
    }

    // Helper: Render GuestyPay form (just clears container, GuestyPay renders on submit)
    function renderGuestyPayForm() {
        
        // DISABLE IFRAME APPROACH - Let server-side handle GuestyPay
        if (window.guestyServerSideEnabled) {
            return;
        }
        
        // Robust duplicate prevention - check for existing iframe
        const existingIframe = document.querySelector('#guesty-tokenization-iframe iframe');
        if (existingIframe) {
            return;
        }
        
        // Prevent multiple simultaneous render calls
        if (window.guestyPayFormRendering) {
            return;
        }
        window.guestyPayFormRendering = true;
        
        clearStripeForm();
        
        // Create container with unique ID to avoid conflicts
        const containerId = 'guesty-tokenization-iframe';
        $('#guesty-tokenization-container').html(`
            <div id="guesty-tokenization-form">
                <div id="${containerId}" style="min-height: 400px; width: 100%; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 15px; background: #f9f9f9; position: relative;">
                    <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #666;">Loading payment form...</div>
                </div>
            </div>
        `);
        
        
        // Set up message event listener for GuestyPay iframe communication
        if (!window.guestyPayMessageListener) {
            window.guestyPayMessageListener = function(event) {
                // Only handle messages from pay.guesty.com
                if (event.origin !== 'https://pay.guesty.com') {
                    return;
                }
                
                
                // Handle different message types
                if (event.data && event.data.type) {
                    switch (event.data.type) {
                        case 'GUESTY_TOKENIZATION_FORM_READY':
                            // Acknowledge the iframe is ready
                            try {
                                event.source.postMessage({
                                    type: 'READY_ACKNOWLEDGED',
                                    timestamp: Date.now()
                                }, event.origin);
                            } catch (ackError) {
                            }
                            break;
                        case 'iframe-ready':
                            break;
                        case 'payment-success':
                            break;
                        case 'payment-error':
                            break;
                        case 'GUESTY_TOKENIZATION_SUCCESS':
                            break;
                        case 'GUESTY_TOKENIZATION_ERROR':
                            break;
                        default:
                    }
                }
            };
            
            window.addEventListener('message', window.guestyPayMessageListener, false);
            
            // Also set up an error handler to catch any postMessage errors from the iframe
            if (!window.guestyPayErrorHandler) {
                window.guestyPayErrorHandler = function(error) {
                    // Check if it's the known GuestyPay postMessage error
                    if ((error.message && error.message.includes('postMessage')) || 
                        (error.filename && error.filename.includes('init.js')) ||
                        (error.error && error.error.message && error.error.message.includes('postMessage'))) {
                        if (error.preventDefault) error.preventDefault();
                        if (error.stopPropagation) error.stopPropagation();
                        return true; // Handled
                    }
                };
                window.addEventListener('error', window.guestyPayErrorHandler, true);
                
                // Also add unhandledrejection handler for promise-based errors
                window.addEventListener('unhandledrejection', function(event) {
                    if (event.reason && event.reason.message && event.reason.message.includes('postMessage')) {
                        event.preventDefault();
                    }
                });
                
            }
        }
        
        if (!window.guestyTokenization) {
            $('#guesty-tokenization-container').html('<div style="color:red; padding:20px;">GuestyPay not available. Please refresh the page.</div>');
            window.guestyPayFormRendering = false;
            return;
        }
        
        // Single render attempt with provider ID check
        const attemptRender = () => {
            const providerId = window.guestyPaymentProviderId;
            if (!providerId) {
                setTimeout(attemptRender, 300);
                return;
            }
            
            
            // Clear container and ensure clean state
            const container = document.getElementById(containerId);
            if (!container) {
                window.guestyPayFormRendering = false;
                return;
            }
            
            container.innerHTML = '';
            
            // Log the exact URL that will be loaded
            const guestyPayUrl = `https://pay.guesty.com?providerId=${providerId}&version=v2`;
            
            // Call render and handle as promise
            try {
                
                const renderPromise = window.guestyTokenization.render({
                    containerId: containerId,
                    providerId: providerId
                });
                
                
                // Check container immediately after render call
                setTimeout(() => {
                }, 100);
                
                if (renderPromise && typeof renderPromise.then === 'function') {
                    renderPromise.then((result) => {
                        
                        // Check container immediately and after delay
                        
                        // Verify iframe creation
                        setTimeout(() => {
                            const iframe = container.querySelector('iframe');
                            if (iframe) {
                                
                                // Ensure proper iframe styling
                                iframe.style.width = '100%';
                                iframe.style.height = '400px';
                                iframe.style.border = 'none';
                                
                                // Check if iframe loads successfully
                                iframe.onload = () => {
                                };
                                iframe.onerror = (error) => {
                                };
                                
                                // Test postMessage capability
                                setTimeout(() => {
                                    try {
                                        if (iframe.contentWindow) {
                                            iframe.contentWindow.postMessage({test: 'message'}, '*');
                                        }
                                    } catch (postError) {
                                    }
                                }, 2000);
                            } else {
                                
                                // Try creating a simple test iframe to see if that works
                                container.innerHTML = `<iframe src="${guestyPayUrl}" style="width:100%;height:400px;border:none;" ></iframe>`;
                            }
                            window.guestyPayFormRendering = false;
                        }, 1000);
                    }).catch((error) => {
                        container.innerHTML = `<iframe src="${guestyPayUrl}" style="width:100%;height:400px;border:none;" ></iframe>`;
                        window.guestyPayFormRendering = false;
                    });
                } else {
                    // Non-promise response, check after delay
                    setTimeout(() => {
                        const iframe = container.querySelector('iframe');
                        if (iframe) {
                        } else {
                            
                            // Try creating a simple test iframe
                            container.innerHTML = `<iframe src="${guestyPayUrl}" style="width:100%;height:400px;border:none;" ></iframe>`;
                        }
                        window.guestyPayFormRendering = false;
                    }, 1000);
                }
                
            } catch (error) {
                
                // Try manual iframe creation as fallback
                try {
                    const manualIframe = document.createElement('iframe');
                    manualIframe.src = guestyPayUrl;
                    manualIframe.style.width = '100%';
                    manualIframe.style.height = '400px';
                    manualIframe.style.border = 'none';
                    manualIframe.id = 'guesty-manual-iframe';
                    
                    manualIframe.onload = () => {
                    };
                    manualIframe.onerror = (error) => {
                    };
                    
                    container.appendChild(manualIframe);
                } catch (manualError) {
                    $('#guesty-tokenization-container').html('<div style="color:red; padding:20px;">Payment form error. Please refresh and try again.</div>');
        }
        
                window.guestyPayFormRendering = false;
            }
        };
        
        // Start render process
        setTimeout(attemptRender, 100);
        
    }

    // Always fetch and display payment method label on page load (if token set is known)
    function updatePaymentMethodLabel() {
        const tokenSet = window.guestyTokenSet || 0;
        
        // If tokenSet is 0 and we don't have a quote yet, wait for it
        if (tokenSet === 0 && !window.guestyQuoteData) {
            // labelDiv.text('Payment Method: Waiting for token...'); // This line is removed
            return;
        }
        
        $.post(guestyAjax.ajax_url, {
            action: 'get_guesty_payment_method',
            token_set: tokenSet
        }, function(response) {
            if (response.success && response.data && response.data.label) {
                // labelDiv.text('Payment Method: ' + response.data.label); // This line is removed
                window.guestyPaymentMethod = response.data.method;
                
                // Update the payment indicator
                updatePaymentIndicator(response.data.method);
                
                if (response.data.method === 'stripe') {
                    // Fetch Stripe publishable key and render form
                    $.post(guestyAjax.ajax_url, {
                        action: 'get_guesty_stripe_pk',
                        token_set: tokenSet
                    }, function(pkResp) {
                        if (pkResp.success && pkResp.data && pkResp.data.pk) {
                            window.guestyStripePk = pkResp.data.pk;
                            renderStripeForm(pkResp.data.pk);
                        } else {
                            $('#guesty-tokenization-container').html('<div style="color:red">Could not load Stripe publishable key. Falling back to GuestyPay.</div>');
                            renderGuestyPayForm();
                        }
                        ensurePaymentSectionVisible(); // Ensure payment section is visible on mobile
                    });
                } else {
                    // Don't render GuestyPay form immediately - wait for quote to be ready
                    ensurePaymentSectionVisible(); // Ensure payment section is visible on mobile
                }
            } else {
                // Fallback: wait for quote ready instead of rendering immediately
                ensurePaymentSectionVisible(); // Ensure payment section is visible on mobile
            }
        }).fail(function(xhr, status, error) {
            // Fallback: wait for quote ready instead of rendering immediately
            ensurePaymentSectionVisible(); // Ensure payment section is visible on mobile
        });
    }
    
    // Wait for token to be ready before trying to get payment method
    if (window.guestyTokenSet) {
        updatePaymentMethodLabel();
    } else {
        $(document).on('guesty_token_ready', function () {
            updatePaymentMethodLabel();
        });
    }
    
    // Ensure payment section is visible on mobile after a short delay
    setTimeout(function() {
        ensurePaymentSectionVisible();
        
        // Test: Always render a payment form if none exists
        if ($('#guesty-tokenization-container').is(':empty')) {
            $('#guesty-tokenization-container').html(`
                <div style="border: 1px solid #ddd; padding: 15px; border-radius: 5px; background: #f9f9f9;">
                    <h4 style="margin: 0 0 10px 0; color: #666;">Payment Details</h4>
                    <p style="margin: 0; color: #888; font-size: 14px;">Payment form will load here once you have selected dates.</p>
                    <div style="margin-top: 10px; padding: 10px; background: #fff; border: 1px solid #ccc; border-radius: 3px;">
                        <p style="margin: 0; font-size: 12px; color: #666;">Loading payment method...</p>
                    </div>
                </div>
            `);
        }
    }, 1000);
    
    // Also update when quote is ready (in case token set changes)
    $(document).on('guesty_quote_ready', function (e, quoteData) {
        // Try to extract listingId from all possible locations
        window.guestyListingId =
            quoteData?.listingId ||
            quoteData?.quote?.listingId ||
            quoteData?.quote?.listing_id ||
            null;

        const listingId = window.guestyListingId;
        const tokenSet = window.guestyTokenSet || 0;
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
            if (response.success) {
                window.guestyPaymentProviderId = response.data.provider_id;
                
                // If GuestyPay form is pending and we now have the provider ID, render it
                if (window.guestyPayFormPending && window.guestyPaymentMethod !== 'stripe') {
                    window.guestyPayFormPending = false;
                    renderGuestyPayForm();
                }
            } else {
                $('#guesty-payment-message').html('Could not fetch payment provider. Please contact support.');
            }
        });
        ensurePaymentSectionVisible(); // Ensure payment section is visible on mobile
        
        // Now that we have quote data and provider ID, render the appropriate payment form
        
        if (window.guestyPaymentMethod === 'stripe') {
        } else {
            // For GuestyPay, we need to wait for both quote AND provider ID
            if (window.guestyPaymentProviderId) {
                renderGuestyPayForm();
            } else {
                // Set a flag so we know to render when provider ID becomes available
                window.guestyPayFormPending = true;
            }
        }
    });

    // Remove guest form/payment form split: show all fields at once
    // On pay button click, handle payment for both GuestyPay and Stripe
    $('#guesty-pay-btn').on('click.old-handler', async function (e) {
        e.preventDefault();
        
        // DISABLE OLD APPROACH - Let server-side handle GuestyPay
        if (window.guestyServerSideEnabled && window.guestyPaymentMethod !== 'stripe') {
            return;
        }

        // Show loading state
        const $btn = $(this);
        const originalText = $btn.text();
        $btn.prop('disabled', true).html('<span class="loading-spinner"></span> Processing...');

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
        
        
        const currency = window.guestyQuoteData?.quote?.rates?.ratePlans?.[0]?.money?.currency || 
                       window.guestyQuoteData?.rates?.ratePlans?.[0]?.money?.currency || 'USD';
        
        // Validate amount for Stripe
        if (amount <= 0) {
            $('#guesty-payment-message').html('Error: Invalid amount. Please refresh and try again.');
            $btn.prop('disabled', false).text(originalText); // Reset button
            return;
        }
        
        
        if (window.guestyPaymentMethod === 'stripe') {
            // Stripe payment logic
            if (!window.guestyStripe || !window.guestyStripeCard) {
                $('#guesty-payment-message').html('Stripe form not ready.');
                $btn.prop('disabled', false).text(originalText); // Reset button
                return;
            }
            $('#guesty-payment-message').html('');
            
            // Step 1: Create PaymentMethod (tokenize the card)
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

            // Step 2: Create Guesty reservation using the PaymentMethod as ccToken
            const reservationData = {
                action: 'create_guesty_stripe_reservation',
                token_set: window.guestyTokenSet || 0,
                payment_method: paymentMethod.id,
                quote_id: window.guestyQuoteId,
                rate_plan_id: window.guestyRatePlanId,
                guest: guest,
                listing_id: window.guestyListingId
            };

            $.post(guestyAjax.ajax_url, reservationData, function(response) {
                if (!response.success) {
                    $('#guesty-payment-message').html('Booking failed: ' + (response.data.message || 'Unknown error'));
                    $btn.prop('disabled', false).text(originalText); // Reset button
                    return;
                }
                $('#guesty-payment-section').hide(); // Hide entire payment section
                // Show success message prominently
                $('<div id="guesty-success-message" style="background: #d4edda; color: #155724; padding: 20px; border-radius: 5px; margin: 20px 0; text-align: center; font-size: 18px; font-weight: bold;">✅ Booking confirmed! Confirmation #: ' + (response.data.confirmationCode || response.data._id) + '</div>').insertAfter('#guesty-payment-section');
            }).fail(function(xhr, status, error) {
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
            
            // Check if iframe exists before submitting
            const iframe = document.querySelector('#guesty-tokenization-iframe iframe');
            if (!iframe) {
                $('#guesty-payment-message').html('Payment form not ready. Please try again in a moment.');
                renderGuestyPayForm(); // Re-render the form
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
                    $('#guesty-payment-section').hide(); // Hide entire payment section
                    // Show success message prominently
                    $('<div id="guesty-success-message" style="background: #d4edda; color: #155724; padding: 20px; border-radius: 5px; margin: 20px 0; text-align: center; font-size: 18px; font-weight: bold;">✅ Booking confirmed! Confirmation #: ' + response.data.confirmationCode + '</div>').insertAfter('#guesty-payment-section');
                } else {
                    $('#guesty-payment-message').html('Booking failed: ' + (response.data.message || 'Unknown error'));
                    $btn.prop('disabled', false).text(originalText); // Reset button
                }
            }).fail(function(xhr, status, error) {
                $('#guesty-payment-message').html('Network error: ' + error);
                $btn.prop('disabled', false).text(originalText); // Reset button
            });
        } catch (err) {
            $('#guesty-payment-message').html('Payment failed: ' + (err.message || 'Unknown error'));
            $btn.prop('disabled', false).text(originalText); // Reset button
        }
    });
    
    // Handle window resize to ensure payment section stays visible on mobile
    $(window).on('resize', function() {
        const isMobile = $(window).width() <= 768;
        if (isMobile) {
            ensurePaymentSectionVisible();
        }
    });
    
});