/**
 * GuestyPay Server-side Implementation
 * Based on Londoners Edge Functions pattern: https://github.com/Yusef-Adel/Londoners-Edge-Functions.git
 * 
 * This approach completely avoids iframe/postMessage issues by using server-side tokenization
 */

jQuery(document).ready(function ($) {
    console.log('[guesty-payment-serverside.js] Loaded - Server-side approach');
    
    // Signal that server-side approach is enabled
    window.guestyServerSideEnabled = true;

    // Helper: Render server-side payment form (no iframe!)
    function renderServerSidePaymentForm() {
        console.log('[guesty-payment-serverside.js] Rendering server-side payment form');
        
        $('#guesty-tokenization-container').html(`
            <div id="guesty-serverside-form">
                <div class="payment-method-indicator">
                    <span class="method-badge guestypay">GP</span>
                    <span class="method-text">Secure Payment Processing</span>
                </div>
                
                <div class="card-input-group">
                    <label for="guesty-card-number">Card Number</label>
                    <input type="text" id="guesty-card-number" placeholder="1234 5678 9012 3456" maxlength="19" required>
                </div>
                
                <div class="card-row">
                    <div class="card-input-group">
                        <label for="guesty-card-expiry">Expiry</label>
                        <input type="text" id="guesty-card-expiry" placeholder="MM/YY" maxlength="5" required>
                    </div>
                    <div class="card-input-group">
                        <label for="guesty-card-cvc">CVC</label>
                        <input type="text" id="guesty-card-cvc" placeholder="123" maxlength="4" required>
                    </div>
                </div>
                
                <div class="card-input-group">
                    <label for="guesty-cardholder-name">Cardholder Name</label>
                    <input type="text" id="guesty-cardholder-name" placeholder="John Smith" required>
                </div>
                
                <div class="security-notice">
                    <i class="security-icon">🔒</i>
                    <span>Your payment information is encrypted and secure</span>
                </div>
            </div>
        `);
        
        // Add input formatting
        setupCardInputFormatting();
        
        console.log('[guesty-payment-serverside.js] Server-side payment form rendered');
    }

    // Helper: Set up card input formatting and validation
    function setupCardInputFormatting() {
        // Card number formatting
        $('#guesty-card-number').on('input', function() {
            let value = this.value.replace(/\D/g, '');
            value = value.replace(/(\d{4})(?=\d)/g, '$1 ');
            this.value = value;
        });

        // Expiry formatting
        $('#guesty-card-expiry').on('input', function() {
            let value = this.value.replace(/\D/g, '');
            if (value.length >= 2) {
                value = value.substring(0, 2) + '/' + value.substring(2, 4);
            }
            this.value = value;
        });

        // CVC numeric only
        $('#guesty-card-cvc').on('input', function() {
            this.value = this.value.replace(/\D/g, '');
        });

        // Cardholder name - letters and spaces only
        $('#guesty-cardholder-name').on('input', function() {
            this.value = this.value.replace(/[^a-zA-Z\s]/g, '');
        });
    }

    // Helper: Validate card inputs
    function validateCardInputs() {
        const cardNumber = $('#guesty-card-number').val().replace(/\s/g, '');
        const expiry = $('#guesty-card-expiry').val();
        const cvc = $('#guesty-card-cvc').val();
        const name = $('#guesty-cardholder-name').val().trim();

        const errors = [];

        // Card number validation (basic)
        if (!cardNumber || cardNumber.length < 13 || cardNumber.length > 19) {
            errors.push('Please enter a valid card number');
        }

        // Expiry validation
        if (!expiry || !expiry.match(/^\d{2}\/\d{2}$/)) {
            errors.push('Please enter expiry as MM/YY');
        } else {
            const [month, year] = expiry.split('/');
            const currentYear = new Date().getFullYear() % 100;
            const currentMonth = new Date().getMonth() + 1;
            
            if (parseInt(month) < 1 || parseInt(month) > 12) {
                errors.push('Invalid expiry month');
            } else if (parseInt(year) < currentYear || (parseInt(year) === currentYear && parseInt(month) < currentMonth)) {
                errors.push('Card has expired');
            }
        }

        // CVC validation
        if (!cvc || cvc.length < 3 || cvc.length > 4) {
            errors.push('Please enter a valid CVC');
        }

        // Name validation
        if (!name || name.length < 2) {
            errors.push('Please enter the cardholder name');
        }

        return errors;
    }

    // Helper: Server-side tokenization
    async function tokenizePaymentServerSide(paymentData) {
        console.log('[guesty-payment-serverside.js] Starting server-side tokenization...');

        try {
            // Check if nonce is available
            if (!window.guestyPaymentNonce) {
                throw new Error('Security nonce not available. Please refresh the page and try again.');
            }
            
            console.log('[guesty-payment-serverside.js] Sending tokenization request with nonce:', window.guestyPaymentNonce);
            const response = await $.post(guestyAjax.ajax_url, {
                action: 'guesty_tokenize_payment',
                nonce: window.guestyPaymentNonce,
                ...paymentData
            });

            console.log('[guesty-payment-serverside.js] Tokenization response:', response);

            if (response.success) {
                return {
                    success: true,
                    token: response.data.token,
                    threeDS: response.data.threeDS
                };
            } else {
                throw new Error(response.data.message || 'Tokenization failed');
            }

        } catch (error) {
            console.error('[guesty-payment-serverside.js] Tokenization error:', error);
            throw new Error(error.responseJSON?.data?.message || error.message || 'Payment processing failed');
        }
    }

    // Main payment processing function
    async function processServerSidePayment() {
        console.log('[guesty-payment-serverside.js] Processing server-side payment...');

        // Validate inputs
        const validationErrors = validateCardInputs();
        if (validationErrors.length > 0) {
            $('#guesty-payment-message').html('<div class="error-message">' + validationErrors.join('<br>') + '</div>');
            return false;
        }

        // Clear any previous messages
        $('#guesty-payment-message').html('');
        
        // Prevent multiple simultaneous payments
        if (window.guestyPaymentProcessing) {
            console.log('[guesty-payment-serverside.js] Payment already in progress, skipping');
            return false;
        }
        window.guestyPaymentProcessing = true;

        // Gather payment data
        const cardNumber = $('#guesty-card-number').val().replace(/\s/g, '');
        const expiry = $('#guesty-card-expiry').val().split('/');
        const cvc = $('#guesty-card-cvc').val();
        const cardholderName = $('#guesty-cardholder-name').val().trim();

        // Gather guest info
        const guest = {
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

        // Get booking details - try multiple paths for amount
        let amount = 0;
        if (window.guestyQuoteData?.total) {
            amount = window.guestyQuoteData.total;
        } else if (window.guestyQuoteData?.quote?.rates?.ratePlans?.[0]?.ratePlan?.money?.hostPayout) {
            amount = window.guestyQuoteData.quote.rates.ratePlans[0].ratePlan.money.hostPayout;
        } else if (window.guestyQuoteData?.rates?.ratePlans?.[0]?.ratePlan?.money?.hostPayout) {
            amount = window.guestyQuoteData.rates.ratePlans[0].ratePlan.money.hostPayout;
        }
        
        const currency = window.guestyQuoteData?.quote?.rates?.ratePlans?.[0]?.money?.currency || 
                        window.guestyQuoteData?.rates?.ratePlans?.[0]?.money?.currency || 'USD';
        
        console.log('[guesty-payment-serverside.js] Amount calculation:', {
            'guestyQuoteData.total': window.guestyQuoteData?.total,
            'ratePlan.hostPayout': window.guestyQuoteData?.quote?.rates?.ratePlans?.[0]?.ratePlan?.money?.hostPayout,
            'final amount': amount,
            'currency': currency
        });
        
        // Validate amount
        if (amount <= 0) {
            console.error('[guesty-payment-serverside.js] Invalid amount:', amount);
            $('#guesty-payment-message').html('<div class="error-message">Invalid booking amount. Please refresh and try again.</div>');
            window.guestyPaymentProcessing = false;
            return false;
        }

        const paymentData = {
            // Payment details
            listingId: window.guestyListingId,
            providerId: window.guestyPaymentProviderId,
            amount: amount,
            currency: currency,
            
            // Card details
            cardNumber: cardNumber,
            expMonth: expiry[0],
            expYear: '20' + expiry[1], // Convert YY to YYYY
            cvc: cvc,
            cardholderName: cardholderName,
            
            // Billing address (use guest address)
            addressLine1: guest.address.line1,
            city: guest.address.city,
            postalCode: guest.address.postal_code,
            country: guest.address.country
        };

        console.log('[guesty-payment-serverside.js] Payment data prepared:', {
            ...paymentData,
            cardNumber: '****',
            cvc: '***'
        });

        try {
            // Step 1: Tokenize payment method
            const tokenResult = await tokenizePaymentServerSide(paymentData);
            
            if (tokenResult.threeDS?.authURL) {
                // Handle 3D Secure if required
                console.log('[guesty-payment-serverside.js] 3D Secure required, redirecting...');
                window.location.href = tokenResult.threeDS.authURL;
                return true;
            }

            // Step 2: Create reservation with token
            console.log('[guesty-payment-serverside.js] Creating reservation with token:', tokenResult.token);
            
            const reservationResponse = await $.post(guestyAjax.ajax_url, {
                action: 'guesty_create_reservation',
                guest: guest,
                ccToken: tokenResult.token,
                quoteId: window.guestyQuoteId,
                ratePlanId: window.guestyRatePlanId,
                token_set: window.guestyTokenSet || 0
            });

            console.log('[guesty-payment-serverside.js] Reservation response:', reservationResponse);

            if (reservationResponse.success) {
                // Success! Log payment details for verification
                console.log('[guesty-payment-serverside.js] PAYMENT SUCCESS - Full reservation data:', reservationResponse.data);
                console.log('[guesty-payment-serverside.js] Payment verification details:', {
                    'confirmation_code': reservationResponse.data.confirmationCode,
                    'reservation_id': reservationResponse.data._id,
                    'payment_status': reservationResponse.data.status,
                    'guest_id': reservationResponse.data.guestId,
                    'platform': reservationResponse.data.platform,
                    'created_at': reservationResponse.data.createdAt,
                    'listing_id': window.guestyListingId,
                    'payment_amount': amount,
                    'payment_currency': currency,
                    'payment_token_used': tokenResult.token
                });
                
                $('#guesty-payment-section').hide();
                $('<div id="guesty-success-message" style="background: #d4edda; color: #155724; padding: 20px; border-radius: 5px; margin: 20px 0; text-align: center; font-size: 18px; font-weight: bold;">✅ Booking confirmed! Confirmation #: ' + reservationResponse.data.confirmationCode + '<br><small>Payment processed for $' + amount + ' ' + currency + '</small></div>').insertAfter('#guesty-payment-section');
                return true;
            } else {
                throw new Error(reservationResponse.data.message || 'Reservation creation failed');
            }

        } catch (error) {
            console.error('[guesty-payment-serverside.js] Payment error:', error);
            $('#guesty-payment-message').html('<div class="error-message">Payment failed: ' + error.message + '</div>');
            window.guestyPaymentProcessing = false;
            return false;
        } finally {
            // Always reset processing flag
            window.guestyPaymentProcessing = false;
        }
    }

    // Wait for quote ready, then render form
    $(document).on('guesty_quote_ready', function (e, quoteData) {
        console.log('[guesty-payment-serverside.js] Quote ready, checking if should render server-side form');
        
        // Only render for GuestyPay (not Stripe)
        if (window.guestyPaymentMethod === 'guesty' || window.guestyPaymentMethod !== 'stripe') {
            console.log('[guesty-payment-serverside.js] Rendering server-side payment form for GuestyPay');
            renderServerSidePaymentForm();
        }
    });

    // Handle pay button click with higher priority
    $(document).off('click', '#guesty-pay-btn').on('click', '#guesty-pay-btn', async function (e) {
        e.preventDefault();
        e.stopImmediatePropagation(); // Stop other handlers from running
        console.log('[guesty-payment-serverside.js] Pay button clicked - server-side handler');
        
        // Only handle if this is a GuestyPay payment and server-side form is active
        if (!window.guestyServerSideEnabled || !$('#guesty-serverside-form').length) {
            console.log('[guesty-payment-serverside.js] Not a server-side payment, letting other handlers take over');
            return;
        }
        
        console.log('[guesty-payment-serverside.js] Processing server-side GuestyPay payment');

        // Show loading state
        const $btn = $(this);
        const originalText = $btn.text();
        $btn.prop('disabled', true).html('<span class="loading-spinner"></span> Processing Payment...');

        try {
            const success = await processServerSidePayment();
            if (!success) {
                // Reset button on failure
                $btn.prop('disabled', false).text(originalText);
            }
        } catch (error) {
            console.error('[guesty-payment-serverside.js] Payment processing error:', error);
            $('#guesty-payment-message').html('<div class="error-message">Payment failed: ' + error.message + '</div>');
            $btn.prop('disabled', false).text(originalText);
        }
    });

    console.log('[guesty-payment-serverside.js] Server-side payment handler initialized');
    
    // Debug: Check if button exists and add some diagnostic info
    setTimeout(() => {
        console.log('[guesty-payment-serverside.js] Debug check:', {
            'Pay button exists': $('#guesty-pay-btn').length > 0,
            'Server-side form exists': $('#guesty-serverside-form').length > 0,
            'guestyServerSideEnabled': window.guestyServerSideEnabled,
            'Current payment method': window.guestyPaymentMethod
        });
    }, 2000);
}); 