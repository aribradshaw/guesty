window.addEventListener('DOMContentLoaded', function () {
    var $ = jQuery;
    const reviewsDiv = $('#guesty-reviews');
    const listingDiv = $('#guesty-listing-id');
    const listingId = listingDiv.data('listing-id');
    console.log('[Guesty Reviews] listingDiv:', listingDiv.length, 'listingId:', listingId);

    if (!listingId) {
        reviewsDiv.text('No listing ID found on the page.');
        console.error('[Guesty Reviews] No listing ID found on the page.');
        return;
    }

    function fetchGuestyReviews(listingId) {
        $.ajax({
            url: guestyAjax.ajax_url,
            method: 'POST',
            data: {
                action: 'fetch_guesty_reviews',
                listing_id: listingId,
                token_set: window.guestyTokenSet || 0
            },
            success: function (response) {
                console.log('[Guesty Reviews] AJAX response:', response);
                if (response.data && response.data.debug) {
                }
                if (response.success) {
                    if (response.data.token_set && response.data.token_set !== window.guestyTokenSet) {
                        window.guestyTokenSet = response.data.token_set;
                    }
                    renderReviews(response.data.reviews);
                } else {
                    reviewsDiv.text(response.data.message || 'Error loading reviews.');
                }
            },
            error: function (xhr, status, error) {
                console.error('[Guesty Reviews] AJAX error:', status, error, xhr);
                reviewsDiv.text('Error loading reviews.');
            }
        });
    }

    function renderReviews(reviews) {
        if (reviews.length === 0) {
            reviewsDiv.text('No reviews available.');
            return;
        }
        reviewsDiv.empty();
        reviews.forEach(review => {
            const raw = review.rawReview || {};
            const reservation = raw.reservation;
            const guest = reservation && reservation.primaryGuest
                ? reservation.primaryGuest
                : { firstName: "Guest", lastName: "" };
            const title = raw.title?.value || "Guest Review";
            const body = raw.body?.value || "";
            const dateObj = raw.createdDateTime ? new Date(raw.createdDateTime) : null;
            const date = (dateObj && !isNaN(dateObj)) ? dateObj.toLocaleDateString() : null;
            const rating = raw.starRatingOverall; // <-- Just use the property directly
            const response = raw.response?.body?.value;

            // Skip reviews with no date, no rating, and no body
            if ((!date && !rating && !body) || (rating < 4)) return;

            const reviewHtml = `
                <div class="review">
                    <h4>${title}</h4>
                    <p><strong>${guest.firstName} ${guest.lastName || ''}</strong>${date ? ' - ' + date : ''}</p>
                    ${rating ? `<p>Rating: ⭐️ ${rating}/5</p>` : ''}
                    ${body ? `<p>${body}</p>` : ''}
                    ${response ? `<div class="host-response"><strong>Host Response:</strong><p>${response}</p></div>` : ''}
                </div>
                <hr/>
            `;
            reviewsDiv.append(reviewHtml);
        });
    }

    // Wait for guestyTokenSet to be ready
    if (window.guestyTokenSet) {
        fetchGuestyReviews(listingId);
    } else {
        $(document).on('guesty_token_ready', function () {
            fetchGuestyReviews(listingId);
        });
    }
});