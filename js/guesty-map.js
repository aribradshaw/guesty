jQuery(document).ready(function ($) {
    const mapDiv = $('#guesty-map');
    const listingDiv = $('#guesty-listing-id');
    const listingId = listingDiv.data('listing-id');

    if (!listingId) {
        mapDiv.text('No listing ID found for map.');
        return;
    }

    $.ajax({
        url: guestyAjax.ajax_url,
        method: 'POST',
        data: {
            action: 'fetch_guesty_map_data',
            listing_id: listingId,
        },
        success: function (response) {
            if (response.success) {
                const { lat, lng } = response.data;

                if (!lat || !lng) {
                    mapDiv.text('No latitude/longitude data available.');
                    return;
                }

                const map = L.map('guesty-map').setView([lat, lng], 14);

                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; OpenStreetMap contributors',
                }).addTo(map);

                L.marker([lat, lng])
                    .addTo(map)
                    .bindPopup('Estate Location.')
                    .openPopup();
            } else {
                mapDiv.text(response.data.message || 'Error loading map data.');
            }
        },
        error: function () {
            mapDiv.text('An error occurred while loading the map.');
        },
    });
});