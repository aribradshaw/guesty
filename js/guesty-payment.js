// Add this at the very top to confirm JS is loaded
console.log('[guesty-payment.js] Loaded - Version 1.0 with enhanced debugging');

if (typeof jQuery === 'undefined') {
    console.error('[guesty-payment.js] jQuery is not loaded!');
}

// Load Stripe.js globally if not present
(function() {
    if (!window.Stripe) {
        console.log('[guesty-payment.js] Stripe not found, loading Stripe.js...');
        var script = document.createElement('script');
        script.src = 'https://js.stripe.com/v3/';
        script.onload = function() { 
            console.log('[guesty-payment.js] Stripe.js loaded successfully');
            console.log('[guesty-payment.js] Stripe object after load:', typeof window.Stripe);
        };
        script.onerror = function() {
            console.error('[guesty-payment.js] Failed to load Stripe.js');
        };
        document.head.appendChild(script);
    } else {
        console.log('[guesty-payment.js] Stripe already loaded');
    }
})();

jQuery(document).ready(function ($) {
    console.log('[guesty-payment.js] DOM ready - Starting initialization');
    
    if (!$('#guesty-payment-section').length) {
        console.warn('[guesty-payment.js] #guesty-payment-section not found in DOM. Is the [guesty_payment] shortcode present on this page?');
    }
    
    // Add mobile debugging
    console.debug('[guesty-payment.js] DOM ready - Window width:', $(window).width());
    console.debug('[guesty-payment.js] DOM ready - Is mobile:', $(window).width() <= 768);
    console.debug('[guesty-payment.js] DOM ready - Payment section exists:', $('#guesty-payment-section').length);
    console.debug('[guesty-payment.js] DOM ready - Payment section is visible:', $('#guesty-payment-section').is(':visible'));
    console.debug('[guesty-payment.js] DOM ready - Payment section display:', $('#guesty-payment-section').css('display'));
    
    // Remove all hide/show logic
    window.guestyPaymentMethod = null;
    window.guestyStripe = null;
    window.guestyStripeElements = null;
    window.guestyStripeCard = null;
    window.guestyStripePk = null;

    // Helper: Update payment indicator
    function updatePaymentIndicator(method) {
        console.log('[guesty-payment.js] updatePaymentIndicator called with method:', method);
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
            console.debug('[guesty-payment.js] Mobile detected, ensuring payment section is visible');
            const $paymentSection = $('#guesty-payment-section');
            if ($paymentSection.length && !$paymentSection.is(':visible')) {
                console.debug('[guesty-payment.js] Payment section not visible on mobile, forcing show');
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
        console.log('[guesty-payment.js] renderStripeForm called with pk:', pk ? pk.substring(0, 10) + '...' : 'null');
        if (!window.Stripe) {
            console.error('[guesty-payment.js] Stripe not available for renderStripeForm');
            $('#guesty-tokenization-container').html('<div style="color:red">Stripe.js not loaded. Please refresh.</div>');
            return;
        }
        window.guestyStripe = Stripe(pk);
        window.guestyStripeElements = window.guestyStripe.elements();
        $('#guesty-tokenization-container').html('<form id="guesty-stripe-form"><div id="guesty-stripe-card-element" style="margin-bottom:12px;"></div><div id="guesty-stripe-message" style="margin-top:10px;color:#b00;"></div></form>');
        window.guestyStripeCard = window.guestyStripeElements.create('card');
        window.guestyStripeCard.mount('#guesty-stripe-card-element');
        console.log('[guesty-payment.js] Stripe Elements form rendered successfully');
    }

    // Helper: Remove Stripe form
    function clearStripeForm() {
        console.log('[guesty-payment.js] clearStripeForm called');
        
        // Don't clear if server-side form is active
        if (window.guestyServerSideEnabled && $('#guesty-serverside-form').length > 0) {
            console.log('[guesty-payment.js] Server-side form is active, not clearing');
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
        console.log('[guesty-payment.js] renderGuestyPayForm called');
        
        // DISABLE IFRAME APPROACH - Let server-side handle GuestyPay
        if (window.guestyServerSideEnabled) {
            console.log('[guesty-payment.js] Server-side approach is enabled, skipping iframe render');
            return;
        }
        
        // Robust duplicate prevention - check for existing iframe
        const existingIframe = document.querySelector('#guesty-tokenization-iframe iframe');
        if (existingIframe) {
            console.log('[guesty-payment.js] GuestyPay iframe already exists, skipping render...');
            return;
        }
        
        // Prevent multiple simultaneous render calls
        if (window.guestyPayFormRendering) {
            console.log('[guesty-payment.js] Form already rendering, skipping...');
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
        
        console.log('[guesty-payment.js] Attempting to initialize GuestyPay tokenization...');
        
        // Set up message event listener for GuestyPay iframe communication
        if (!window.guestyPayMessageListener) {
            window.guestyPayMessageListener = function(event) {
                // Only handle messages from pay.guesty.com
                if (event.origin !== 'https://pay.guesty.com') {
                    return;
                }
                
                console.log('[guesty-payment.js] Received message from GuestyPay iframe:', event.data);
                
                // Handle different message types
                if (event.data && event.data.type) {
                    switch (event.data.type) {
                        case 'GUESTY_TOKENIZATION_FORM_READY':
                            console.log('[guesty-payment.js] GuestyPay iframe is ready for tokenization');
                            // Acknowledge the iframe is ready
                            try {
                                event.source.postMessage({
                                    type: 'READY_ACKNOWLEDGED',
                                    timestamp: Date.now()
                                }, event.origin);
                                console.log('[guesty-payment.js] Sent acknowledgment to GuestyPay iframe');
                            } catch (ackError) {
                                console.log('[guesty-payment.js] Could not send acknowledgment (this is OK):', ackError.message);
                            }
                            break;
                        case 'iframe-ready':
                            console.log('[guesty-payment.js] GuestyPay iframe is ready');
                            break;
                        case 'payment-success':
                            console.log('[guesty-payment.js] Payment successful:', event.data);
                            break;
                        case 'payment-error':
                            console.error('[guesty-payment.js] Payment error:', event.data);
                            break;
                        case 'GUESTY_TOKENIZATION_SUCCESS':
                            console.log('[guesty-payment.js] Tokenization successful:', event.data);
                            break;
                        case 'GUESTY_TOKENIZATION_ERROR':
                            console.error('[guesty-payment.js] Tokenization error:', event.data);
                            break;
                        default:
                            console.log('[guesty-payment.js] Unknown message type:', event.data.type, event.data);
                    }
                }
            };
            
            window.addEventListener('message', window.guestyPayMessageListener, false);
            console.log('[guesty-payment.js] GuestyPay message listener set up');
            
            // Also set up an error handler to catch any postMessage errors from the iframe
            if (!window.guestyPayErrorHandler) {
                window.guestyPayErrorHandler = function(error) {
                    // Check if it's the known GuestyPay postMessage error
                    if ((error.message && error.message.includes('postMessage')) || 
                        (error.filename && error.filename.includes('init.js')) ||
                        (error.error && error.error.message && error.error.message.includes('postMessage'))) {
                        console.log('[guesty-payment.js] Suppressed known GuestyPay postMessage error (non-critical):', error.message || error.error?.message);
                        if (error.preventDefault) error.preventDefault();
                        if (error.stopPropagation) error.stopPropagation();
                        return true; // Handled
                    }
                };
                window.addEventListener('error', window.guestyPayErrorHandler, true);
                
                // Also add unhandledrejection handler for promise-based errors
                window.addEventListener('unhandledrejection', function(event) {
                    if (event.reason && event.reason.message && event.reason.message.includes('postMessage')) {
                        console.log('[guesty-payment.js] Suppressed unhandled postMessage promise rejection (non-critical)');
                        event.preventDefault();
                    }
                });
                
                console.log('[guesty-payment.js] GuestyPay error handler set up');
            }
        }
        
        if (!window.guestyTokenization) {
            console.error('[guesty-payment.js] GuestyPay tokenization SDK not loaded');
            $('#guesty-tokenization-container').html('<div style="color:red; padding:20px;">GuestyPay not available. Please refresh the page.</div>');
            window.guestyPayFormRendering = false;
            return;
        }
        
        // Single render attempt with provider ID check
        const attemptRender = () => {
            const providerId = window.guestyPaymentProviderId;
            if (!providerId) {
                console.log('[guesty-payment.js] Provider ID not available yet, waiting...');
                setTimeout(attemptRender, 300);
                return;
            }
            
            console.log('[guesty-payment.js] Rendering with providerId:', providerId);
            
            // Clear container and ensure clean state
            const container = document.getElementById(containerId);
            if (!container) {
                console.error('[guesty-payment.js] Container not found');
                window.guestyPayFormRendering = false;
                return;
            }
            
            container.innerHTML = '';
            
            // Log the exact URL that will be loaded
            const guestyPayUrl = `https://pay.guesty.com?providerId=${providerId}&version=v2`;
            console.log('[guesty-payment.js] GuestyPay iframe URL will be:', guestyPayUrl);
            
            // Call render and handle as promise
            try {
                console.log('[guesty-payment.js] About to call guestyTokenization.render()');
                console.log('[guesty-payment.js] guestyTokenization object:', window.guestyTokenization);
                console.log('[guesty-payment.js] Available methods:', Object.getOwnPropertyNames(window.guestyTokenization));
                
                const renderPromise = window.guestyTokenization.render({
                    containerId: containerId,
                    providerId: providerId
                });
                
                console.log('[guesty-payment.js] render() returned:', renderPromise);
                
                // Check container immediately after render call
                setTimeout(() => {
                    console.log('[guesty-payment.js] Container contents 100ms after render call:', container.innerHTML);
                }, 100);
                
                if (renderPromise && typeof renderPromise.then === 'function') {
                    renderPromise.then((result) => {
                        console.log('[guesty-payment.js] GuestyPay render completed successfully');
                        console.log('[guesty-payment.js] Render result:', result);
                        
                        // Check container immediately and after delay
                        console.log('[guesty-payment.js] Container contents immediately after render:', container.innerHTML);
                        
                        // Verify iframe creation
                        setTimeout(() => {
                            console.log('[guesty-payment.js] Container contents after 1 second:', container.innerHTML);
                            const iframe = container.querySelector('iframe');
                            if (iframe) {
                                console.log('[guesty-payment.js] GuestyPay iframe successfully created');
                                console.log('[guesty-payment.js] Iframe src:', iframe.src);
                                console.log('[guesty-payment.js] Iframe ready state:', iframe.readyState);
                                
                                // Ensure proper iframe styling
                                iframe.style.width = '100%';
                                iframe.style.height = '400px';
                                iframe.style.border = 'none';
                                
                                // Check if iframe loads successfully
                                iframe.onload = () => {
                                    console.log('[guesty-payment.js] Iframe loaded successfully');
                                    console.log('[guesty-payment.js] Iframe contentWindow:', iframe.contentWindow);
                                    console.log('[guesty-payment.js] Iframe contentDocument:', iframe.contentDocument);
                                };
                                iframe.onerror = (error) => {
                                    console.error('[guesty-payment.js] Iframe failed to load:', error);
                                };
                                
                                // Test postMessage capability
                                setTimeout(() => {
                                    try {
                                        if (iframe.contentWindow) {
                                            console.log('[guesty-payment.js] Testing postMessage to iframe...');
                                            iframe.contentWindow.postMessage({test: 'message'}, '*');
                                            console.log('[guesty-payment.js] PostMessage test sent successfully');
                                        }
                                    } catch (postError) {
                                        console.error('[guesty-payment.js] PostMessage test failed:', postError);
                                    }
                                }, 2000);
                            } else {
                                console.error('[guesty-payment.js] No iframe found after render completion');
                                console.log('[guesty-payment.js] Container contents:', container.innerHTML);
                                
                                // Try creating a simple test iframe to see if that works
                                console.log('[guesty-payment.js] Attempting simple iframe test...');
                                container.innerHTML = `<iframe src="${guestyPayUrl}" style="width:100%;height:400px;border:none;" onload="console.log('Simple iframe loaded')" onerror="console.log('Simple iframe error')"></iframe>`;
                            }
                            window.guestyPayFormRendering = false;
                        }, 1000);
                    }).catch((error) => {
                        console.error('[guesty-payment.js] GuestyPay render promise rejected:', error);
                        console.log('[guesty-payment.js] Trying simple iframe as fallback...');
                        container.innerHTML = `<iframe src="${guestyPayUrl}" style="width:100%;height:400px;border:none;" onload="console.log('Fallback iframe loaded')" onerror="console.log('Fallback iframe error')"></iframe>`;
                        window.guestyPayFormRendering = false;
                    });
                } else {
                    // Non-promise response, check after delay
                    setTimeout(() => {
                        const iframe = container.querySelector('iframe');
                        if (iframe) {
                            console.log('[guesty-payment.js] GuestyPay iframe created (non-promise)');
                            console.log('[guesty-payment.js] Non-promise iframe src:', iframe.src);
                        } else {
                            console.error('[guesty-payment.js] No iframe created (non-promise)');
                            console.log('[guesty-payment.js] Container contents after non-promise:', container.innerHTML);
                            
                            // Try creating a simple test iframe
                            console.log('[guesty-payment.js] Attempting simple iframe test (non-promise)...');
                            container.innerHTML = `<iframe src="${guestyPayUrl}" style="width:100%;height:400px;border:none;" onload="console.log('Simple iframe loaded (non-promise)')" onerror="console.log('Simple iframe error (non-promise)')"></iframe>`;
                        }
                        window.guestyPayFormRendering = false;
                    }, 1000);
                }
                
            } catch (error) {
                console.error('[guesty-payment.js] Error calling render():', error);
                console.log('[guesty-payment.js] Attempting manual iframe creation as fallback...');
                
                // Try manual iframe creation as fallback
                try {
                    const manualIframe = document.createElement('iframe');
                    manualIframe.src = guestyPayUrl;
                    manualIframe.style.width = '100%';
                    manualIframe.style.height = '400px';
                    manualIframe.style.border = 'none';
                    manualIframe.id = 'guesty-manual-iframe';
                    
                    manualIframe.onload = () => {
                        console.log('[guesty-payment.js] Manual iframe loaded successfully');
                    };
                    manualIframe.onerror = (error) => {
                        console.error('[guesty-payment.js] Manual iframe failed to load:', error);
                    };
                    
                    container.appendChild(manualIframe);
                    console.log('[guesty-payment.js] Manual iframe created');
                } catch (manualError) {
                    console.error('[guesty-payment.js] Manual iframe creation also failed:', manualError);
                    $('#guesty-tokenization-container').html('<div style="color:red; padding:20px;">Payment form error. Please refresh and try again.</div>');
        }
        
                window.guestyPayFormRendering = false;
            }
        };
        
        // Start render process
        setTimeout(attemptRender, 100);
        
        console.log('[guesty-payment.js] GuestyPay form setup initiated');
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
        
        console.debug('[guesty-payment.js] Making AJAX request to get payment method...');
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
                    console.debug('[guesty-payment.js] Rendering Stripe form...');
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
                            console.error('[guesty-payment.js] Failed to get Stripe PK, falling back to GuestyPay');
                            $('#guesty-tokenization-container').html('<div style="color:red">Could not load Stripe publishable key. Falling back to GuestyPay.</div>');
                            renderGuestyPayForm();
                        }
                        ensurePaymentSectionVisible(); // Ensure payment section is visible on mobile
                    });
                } else {
                    console.debug('[guesty-payment.js] Payment method is GuestyPay, waiting for quote ready...');
                    // Don't render GuestyPay form immediately - wait for quote to be ready
                    ensurePaymentSectionVisible(); // Ensure payment section is visible on mobile
                }
            } else {
                console.warn('[guesty-payment.js] Could not determine payment method for tokenSet:', tokenSet);
                console.warn('[guesty-payment.js] Response was:', response);
                // Fallback: wait for quote ready instead of rendering immediately
                console.debug('[guesty-payment.js] Payment method detection failed, waiting for quote ready...');
                ensurePaymentSectionVisible(); // Ensure payment section is visible on mobile
            }
        }).fail(function(xhr, status, error) {
            console.error('[guesty-payment.js] AJAX request failed:', {xhr, status, error});
            // Fallback: wait for quote ready instead of rendering immediately
            console.debug('[guesty-payment.js] AJAX failed, waiting for quote ready...');
            ensurePaymentSectionVisible(); // Ensure payment section is visible on mobile
        });
    }
    
    // Wait for token to be ready before trying to get payment method
    if (window.guestyTokenSet) {
        console.log('[guesty-payment.js] Token set already available, updating payment method label');
        updatePaymentMethodLabel();
    } else {
        console.log('[guesty-payment.js] No token set yet, waiting for guesty_token_ready event');
        $(document).on('guesty_token_ready', function () {
            console.debug('[guesty-payment.js] guesty_token_ready event received, updating payment method label');
            updatePaymentMethodLabel();
        });
    }
    
    // Ensure payment section is visible on mobile after a short delay
    setTimeout(function() {
        console.log('[guesty-payment.js] 1-second timeout - checking payment section visibility');
        ensurePaymentSectionVisible();
        
        // Test: Always render a payment form if none exists
        if ($('#guesty-tokenization-container').is(':empty')) {
            console.debug('[guesty-payment.js] No payment form found after 1 second, rendering test form...');
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
        console.debug('[guesty-payment.js] guesty_quote_ready event received, quoteData:', quoteData);
        
        // Add mobile debugging
        console.debug('[guesty-payment.js] Quote ready - Window width:', $(window).width());
        console.debug('[guesty-payment.js] Quote ready - Is mobile:', $(window).width() <= 768);
        console.debug('[guesty-payment.js] Quote ready - Payment section exists:', $('#guesty-payment-section').length);
        console.debug('[guesty-payment.js] Quote ready - Payment section is visible:', $('#guesty-payment-section').is(':visible'));
        console.debug('[guesty-payment.js] Quote ready - Payment section display:', $('#guesty-payment-section').css('display'));
        
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
                console.log('[guesty-payment.js] Set payment provider ID to:', response.data.provider_id);
                
                // If GuestyPay form is pending and we now have the provider ID, render it
                if (window.guestyPayFormPending && window.guestyPaymentMethod !== 'stripe') {
                    console.log('[guesty-payment.js] Provider ID now available, rendering pending GuestyPay form...');
                    window.guestyPayFormPending = false;
                    renderGuestyPayForm();
                }
            } else {
                console.error('[guesty-payment.js] Failed to get payment provider ID');
                $('#guesty-payment-message').html('Could not fetch payment provider. Please contact support.');
            }
        });
        ensurePaymentSectionVisible(); // Ensure payment section is visible on mobile
        
        // Now that we have quote data and provider ID, render the appropriate payment form
        console.log('[guesty-payment.js] Quote ready - rendering payment form now');
        console.log('[guesty-payment.js] Current payment method:', window.guestyPaymentMethod);
        console.log('[guesty-payment.js] Provider ID available:', !!window.guestyPaymentProviderId);
        
        if (window.guestyPaymentMethod === 'stripe') {
            console.log('[guesty-payment.js] Quote ready - payment method is Stripe, form should already be rendered');
        } else {
            console.log('[guesty-payment.js] Quote ready - payment method is GuestyPay');
            // For GuestyPay, we need to wait for both quote AND provider ID
            if (window.guestyPaymentProviderId) {
                console.log('[guesty-payment.js] Provider ID already available, rendering GuestyPay form now...');
                renderGuestyPayForm();
            } else {
                console.log('[guesty-payment.js] Provider ID not yet available, will render after provider ID is set');
                // Set a flag so we know to render when provider ID becomes available
                window.guestyPayFormPending = true;
            }
        }
    });

    // Remove guest form/payment form split: show all fields at once
    // On pay button click, handle payment for both GuestyPay and Stripe
    $('#guesty-pay-btn').on('click.old-handler', async function (e) {
        e.preventDefault();
        console.log('[guesty-payment.js] Pay button clicked - Starting payment process');
        
        // DISABLE OLD APPROACH - Let server-side handle GuestyPay
        if (window.guestyServerSideEnabled && window.guestyPaymentMethod !== 'stripe') {
            console.log('[guesty-payment.js] Server-side approach is handling this payment, skipping old handler');
            return;
        }
        
        // Debug: Log current state before payment
        console.log('[guesty-payment.js] Payment state check:', {
            'window.guestyPaymentMethod': window.guestyPaymentMethod,
            'window.guestyTokenization': typeof window.guestyTokenization,
            'window.guestyPaymentProviderId': window.guestyPaymentProviderId,
            'window.guestyTokenSet': window.guestyTokenSet,
            'window.guestyQuoteId': window.guestyQuoteId,
            'window.guestyRatePlanId': window.guestyRatePlanId,
            'window.guestyListingId': window.guestyListingId
        });
        
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
        
        console.log('[guesty-payment.js] Guest info gathered:', guest);
        console.log('[guesty-payment.js] Quote ID:', quoteId, 'Rate Plan ID:', ratePlanId);
        
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
            console.log('[guesty-payment.js] Processing Stripe payment...');
            // Stripe payment logic
            if (!window.guestyStripe || !window.guestyStripeCard) {
                console.error('[guesty-payment.js] Stripe form not ready');
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
                console.error('[guesty-payment.js] Stripe PaymentMethod creation failed:', error);
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
        console.log('[guesty-payment.js] Processing GuestyPay payment...');
        try {
            // Debug: Check GuestyPay objects before payment
            console.log('[guesty-payment.js] GuestyPay payment - Objects check:', {
                'window.guestyTokenization': typeof window.guestyTokenization,
                'window.guestyPaymentProviderId': window.guestyPaymentProviderId,
                'window.guestyTokenization?.submit': typeof window.guestyTokenization?.submit
            });
            
            if (!window.guestyTokenization) {
                console.error('[guesty-payment.js] GuestyPay tokenization not available');
                $('#guesty-payment-message').html('Payment system not loaded. Please refresh.');
                $btn.prop('disabled', false).text(originalText); // Reset button
                return;
            }
            if (!window.guestyPaymentProviderId) {
                console.error('[guesty-payment.js] Payment provider ID is missing');
                $('#guesty-payment-message').html('Payment provider ID is missing. Please contact support.');
                $btn.prop('disabled', false).text(originalText); // Reset button
                return;
            }
            
            // Check if iframe exists before submitting
            const iframe = document.querySelector('#guesty-tokenization-iframe iframe');
            if (!iframe) {
                console.error('[guesty-payment.js] GuestyPay iframe not found. Re-rendering...');
                $('#guesty-payment-message').html('Payment form not ready. Please try again in a moment.');
                renderGuestyPayForm(); // Re-render the form
                $btn.prop('disabled', false).text(originalText); // Reset button
                return;
            }
            
            console.log('[guesty-payment.js] Calling window.guestyTokenization.submit()...');
            console.log('[guesty-payment.js] Submit parameters:', {
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
            
            console.log('[guesty-payment.js] GuestyPay submit() completed successfully:', paymentMethod);
            const ccToken = paymentMethod._id;
            console.debug('[guesty-payment.js] Tokenized card, ccToken:', ccToken);
            
            // Now send AJAX to backend to create reservation
            console.log('[guesty-payment.js] Creating reservation with ccToken:', ccToken);
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
                    console.log('[guesty-payment.js] Reservation created successfully');
                    $('#guesty-payment-section').hide(); // Hide entire payment section
                    // Show success message prominently
                    $('<div id="guesty-success-message" style="background: #d4edda; color: #155724; padding: 20px; border-radius: 5px; margin: 20px 0; text-align: center; font-size: 18px; font-weight: bold;">✅ Booking confirmed! Confirmation #: ' + response.data.confirmationCode + '</div>').insertAfter('#guesty-payment-section');
                } else {
                    console.error('[guesty-payment.js] Reservation creation failed:', response.data);
                    $('#guesty-payment-message').html('Booking failed: ' + (response.data.message || 'Unknown error'));
                    $btn.prop('disabled', false).text(originalText); // Reset button
                }
            }).fail(function(xhr, status, error) {
                console.error('[guesty-payment.js] Reservation AJAX failed:', {xhr, status, error});
                $('#guesty-payment-message').html('Network error: ' + error);
                $btn.prop('disabled', false).text(originalText); // Reset button
            });
        } catch (err) {
            console.error('[guesty-payment.js] GuestyPay payment failed with error:', err);
            console.error('[guesty-payment.js] Error stack:', err.stack);
            $('#guesty-payment-message').html('Payment failed: ' + (err.message || 'Unknown error'));
            $btn.prop('disabled', false).text(originalText); // Reset button
        }
    });
    
    // Handle window resize to ensure payment section stays visible on mobile
    $(window).on('resize', function() {
        const isMobile = $(window).width() <= 768;
        if (isMobile) {
            console.debug('[guesty-payment.js] Window resized on mobile, checking payment section visibility');
            ensurePaymentSectionVisible();
        }
    });
    
    // Debug: Log final state after initialization
    console.log('[guesty-payment.js] Initialization complete');
});