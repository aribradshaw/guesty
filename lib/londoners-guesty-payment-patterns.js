/**
 * Londoners Edge Functions - Guesty Payment Patterns
 * Reference implementation based on: https://github.com/Yusef-Adel/Londoners-Edge-Functions.git
 * 
 * This library contains patterns and approaches used by successful Guesty implementations
 */

// ============================================================================
// CREATE QUOTE PATTERN
// ============================================================================
const createQuotePattern = {
    endpoint: 'https://booking.guesty.com/api/reservations/quotes',
    method: 'POST',
    headers: {
        'Accept': 'application/json; charset=utf-8',
        'Content-Type': 'application/json',
        'Authorization': 'Bearer {token}'
    },
    payload: {
        checkInDateLocalized: '2022-12-28',
        checkOutDateLocalized: '2023-01-15',
        listingId: 'string',
        guestsCount: 1,
        coupons: 'DISCOUNT_50_$,DISCOUNT_60_$', // Optional
        guest: {
            guestId: 'string', // Optional
            firstName: 'John',
            lastName: 'Doe',
            phone: 'string',
            email: 'string'
        }
    },
    responsePattern: {
        _id: 'quote_id',
        rates: {
            ratePlans: [{
                money: {
                    hostPayout: 0,
                    currency: 'USD'
                }
            }]
        },
        expiresAt: '2022-04-06T14:36:02.553Z'
    }
};

// ============================================================================
// CREATE PAYMENT METHOD PATTERN (GuestyPay)
// ============================================================================
const createPaymentMethodPattern = {
    endpoint: 'https://pay.guesty.com/api/tokenize/v2',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    payload: {
        listingId: '64f03f9094d741004fda977d',
        paymentProviderId: 'provider_id_here', // Critical parameter
        card: {
            number: '4580458045804580',
            exp_month: '12',
            exp_year: '2024',
            cvc: '123'
        },
        billing_details: {
            name: 'John Smith',
            address: {
                line1: '20 W 34th St',
                city: 'New York',
                postal_code: '10001',
                country: 'US'
            }
        },
        threeDS: {
            amount: 500,
            currency: 'USD',
            successURL: 'https://book.pms.com?{orderN}',
            failureURL: 'https://book.pms.com/fail?{orderN}'
        },
        merchantData: {
            freeText: 'PayeeId-1234567',
            transactionDate: '2023-11-14T12:12:33.162Z',
            transactionDescription: 'Descriptor',
            transactionId: 'Reservation-2000583'
        }
    },
    responsePattern: {
        _id: 'payment_method_token_id',
        threeDS: {
            authURL: 'https://api.checkout.com/sessions-interceptor/sid_.....'
        }
    }
};

// ============================================================================
// CREATE RESERVATION PATTERN
// ============================================================================
const createReservationPattern = {
    endpoint: 'https://booking.guesty.com/api/reservations/quotes/{quoteId}/instant',
    method: 'POST',
    headers: {
        'Accept': 'application/json; charset=utf-8',
        'Content-Type': 'application/json',
        'Authorization': 'Bearer {token}'
    },
    payload: {
        ratePlanId: 'rate_plan_id',
        ccToken: 'payment_method_token_from_tokenize', // From createPaymentMethod
        guest: {
            firstName: 'John',
            lastName: 'Doe',
            phone: '+1234567890',
            email: 'john@example.com',
            address: {
                line1: '123 Main St',
                city: 'New York',
                country: 'US',
                postal_code: '10001'
            }
        }
    },
    responsePattern: {
        _id: 'reservation_id',
        status: 'confirmed',
        platform: 'direct',
        confirmationCode: 'ABC123',
        createdAt: '11/7/2021, 3:57:29 PM',
        guestId: 'guest_id'
    }
};

// ============================================================================
// PAYMENT PROVIDER LOOKUP PATTERN
// ============================================================================
const getPaymentProviderPattern = {
    endpoint: 'https://api.guesty.com/api/v2/listings/{listingId}/payment-providers',
    method: 'GET',
    headers: {
        'Authorization': 'Bearer {token}',
        'Accept': 'application/json'
    },
    responsePattern: {
        data: [{
            _id: 'payment_provider_id',
            type: 'guestypay',
            enabled: true
        }]
    }
};

// ============================================================================
// EDGE FUNCTION IMPLEMENTATION PATTERNS
// ============================================================================

/**
 * Pattern for implementing serverless payment functions
 * Based on the Londoners repository structure
 */
const edgeFunctionPatterns = {
    
    // Quote Creation Function
    createQuote: async (request) => {
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        };

        try {
            const { checkIn, checkOut, listingId, guests, guest } = await request.json();
            
            // Get Guesty token
            const token = await getGuestyToken();
            
            // Create quote
            const quoteResponse = await fetch('https://booking.guesty.com/api/reservations/quotes', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json; charset=utf-8'
                },
                body: JSON.stringify({
                    checkInDateLocalized: checkIn,
                    checkOutDateLocalized: checkOut,
                    listingId: listingId,
                    guestsCount: guests,
                    guest: guest
                })
            });

            const quoteData = await quoteResponse.json();
            
            return new Response(JSON.stringify(quoteData), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            });

        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            });
        }
    },

    // Payment Method Creation Function
    createPaymentMethod: async (request) => {
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        };

        try {
            const { listingId, providerId, card, billingDetails, amount, currency } = await request.json();
            
            // Tokenize with GuestyPay
            const tokenizeResponse = await fetch('https://pay.guesty.com/api/tokenize/v2', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    listingId: listingId,
                    paymentProviderId: providerId,
                    card: card,
                    billing_details: billingDetails,
                    threeDS: {
                        amount: amount,
                        currency: currency,
                        successURL: `${request.headers.get('origin')}/payment-success`,
                        failureURL: `${request.headers.get('origin')}/payment-error`
                    }
                })
            });

            const tokenData = await tokenizeResponse.json();
            
            return new Response(JSON.stringify(tokenData), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            });

        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            });
        }
    },

    // Reservation Creation Function
    createReservation: async (request) => {
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        };

        try {
            const { quoteId, ratePlanId, ccToken, guest } = await request.json();
            
            // Get Guesty token
            const token = await getGuestyToken();
            
            // Create reservation
            const reservationResponse = await fetch(`https://booking.guesty.com/api/reservations/quotes/${quoteId}/instant`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json; charset=utf-8'
                },
                body: JSON.stringify({
                    ratePlanId: ratePlanId,
                    ccToken: ccToken,
                    guest: guest
                })
            });

            const reservationData = await reservationResponse.json();
            
            return new Response(JSON.stringify(reservationData), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            });

        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            });
        }
    }
};

// ============================================================================
// KEY DIFFERENCES AND INSIGHTS
// ============================================================================

/**
 * CRITICAL INSIGHTS from the Londoners implementation:
 * 
 * 1. SERVERLESS APPROACH:
 *    - They use Edge Functions (likely Supabase or Vercel)
 *    - Each payment step is a separate function
 *    - No client-side SDK usage - all server-side API calls
 * 
 * 2. PAYMENT FLOW:
 *    - Step 1: Create Quote (server-side)
 *    - Step 2: Get Payment Provider ID (server-side)
 *    - Step 3: Tokenize Card (server-side using direct API)
 *    - Step 4: Create Reservation with token (server-side)
 * 
 * 3. NO CLIENT-SIDE IFRAME:
 *    - They avoid the iframe/SDK issues entirely
 *    - Direct API calls to pay.guesty.com/api/tokenize/v2
 *    - Server-side only approach
 * 
 * 4. CORS HANDLING:
 *    - Proper CORS headers in all functions
 *    - Origin-based success/failure URLs
 * 
 * 5. ERROR HANDLING:
 *    - Comprehensive try-catch blocks
 *    - Proper HTTP status codes
 *    - Structured error responses
 */

const keyInsights = {
    avoidClientSideSDK: {
        reason: "Client-side iframe has postMessage and CSP issues",
        solution: "Use server-side API calls exclusively"
    },
    
    separateSteps: {
        reason: "Easier debugging and error handling",
        solution: "Each payment step is its own endpoint"
    },
    
    directTokenization: {
        reason: "Bypasses iframe communication issues",
        solution: "Direct POST to https://pay.guesty.com/api/tokenize/v2"
    },
    
    properCORS: {
        reason: "Cross-origin requests need proper headers",
        solution: "Include CORS headers in all responses"
    }
};

// ============================================================================
// RECOMMENDED IMPLEMENTATION APPROACH
// ============================================================================

const recommendedApproach = {
    architecture: "Server-side API endpoints instead of client-side iframe",
    
    endpoints: [
        "POST /api/guesty/create-quote",
        "POST /api/guesty/tokenize-payment", 
        "POST /api/guesty/create-reservation"
    ],
    
    flow: [
        "1. User fills form on frontend",
        "2. Frontend calls /api/guesty/create-quote",
        "3. Frontend calls /api/guesty/tokenize-payment with card data",
        "4. Frontend calls /api/guesty/create-reservation with token",
        "5. Show confirmation to user"
    ],
    
    benefits: [
        "No iframe/postMessage issues",
        "No CSP conflicts", 
        "Better error handling",
        "More secure (card data never touches client)",
        "Easier debugging"
    ]
};

module.exports = {
    createQuotePattern,
    createPaymentMethodPattern,
    createReservationPattern,
    getPaymentProviderPattern,
    edgeFunctionPatterns,
    keyInsights,
    recommendedApproach
}; 