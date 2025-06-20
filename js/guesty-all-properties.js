// guesty-all-properties.js
jQuery(function($) {
    $('#guesty-all-properties-form').on('submit', function(e) {
        e.preventDefault();
        const checkin = $('#guesty-checkin').val();
        const checkout = $('#guesty-checkout').val();
        if (!checkin || !checkout) return;
        $('#guesty-properties-list').html('Loading...');
        $.post(guestyBookingAjax.ajax_url, {
            action: 'guesty_all_properties',
            checkin,
            checkout,
            token_set: window.guestyTokenSet || 0
        }, function(response) {
            if (response.success && response.data.properties && response.data.properties.results) {
                const props = response.data.properties.results;
                if (props.length === 0) {
                    $('#guesty-properties-list').html('No properties available for these dates.');
                } else {
                    let html = '<ul class="guesty-properties-ul">';
                    props.forEach(function(p) {
                        let title = p.mapped_page && p.mapped_page.title ? p.mapped_page.title : (p.title || p.name);
                        let link = p.mapped_page && p.mapped_page.url ? p.mapped_page.url : null;
                        html += `<li class="guesty-property-item">`;
                        if (link) {
                            html += `<a href="${link}" target="_blank"><strong>${title}</strong></a>`;
                        } else {
                            html += `<strong>${title}</strong>`;
                        }
                        html += `<br>Bedrooms: ${p.bedrooms || '-'} | Bathrooms: ${p.bathrooms || '-'}<br>Max Guests: ${p.accommodates || '-'}<br>${p.address && p.address.formatted ? p.address.formatted : ''}</li>`;
                    });
                    html += '</ul>';
                    $('#guesty-properties-list').html(html);
                }
            } else {
                $('#guesty-properties-list').html('No properties found or error.');
            }
        });
    });
});
