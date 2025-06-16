window.addEventListener('DOMContentLoaded', function () {
    var $ = jQuery;
    console.log('Guesty Attributes script loaded.');
    
    const listingDiv = $('#guesty-listing-id');
    const listingId = listingDiv.data('listing-id');

    if (!listingId) {
        $('#guesty-property-attributes').text('No listing ID found on the page.');
        return;
    }

    $.post(guestyAjax.ajax_url, {
        action: 'fetch_guesty_attributes',
        listing_id: listingId
    }, function(response) {
        if (response.success) {
            window.guestyTokenSet = response.data.token_set;
            $('#guesty-property-attributes').html(response.data.html);
            $(document).trigger('guesty_token_ready');
        } else {
            $('#guesty-property-attributes').text(response.data.message || 'Error fetching property attributes.');
        }
    }).fail(function(xhr, status, error) {
        $('#guesty-property-attributes').text('An error occurred while fetching property attributes.');
    });
});
