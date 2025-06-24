// guesty-all-properties.js
jQuery(function($) {
    // Function to get URL parameters
    function getUrlParameter(name) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(name);
    }
    
    // Function to update URL parameters
    function updateUrlParameters(checkin, checkout) {
        const url = new URL(window.location);
        url.searchParams.set('checkin', checkin);
        url.searchParams.set('checkout', checkout);
        window.history.replaceState({}, '', url);
    }
    
    // Function to perform search
    function performSearch(checkin, checkout) {
        if (!checkin || !checkout) return;
        
        $('#guesty-properties-list').html('Loading...');
        updateUrlParameters(checkin, checkout);
        
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
                        let image = p.main_image || '';
                        
                        html += `<li class="guesty-property-item">`;
                        html += `<div class="property-details">`;
                        if (link) {
                            html += `<a href="${link}"><strong>${title}</strong></a>`;
                        } else {
                            html += `<strong>${title}</strong>`;
                        }
                        html += `<br>Bedrooms: ${p.bedrooms || '-'} | Bathrooms: ${p.bathrooms || '-'}<br>Max Guests: ${p.accommodates || '-'}<br>${p.address && p.address.formatted ? p.address.formatted : ''}`;                        html += `</div>`;
                        if (image) {
                            if (link) {
                                html += `<div class="property-image"><a href="${link}"><img src="${image}" alt="${title}" /></a></div>`;
                            } else {
                                html += `<div class="property-image"><img src="${image}" alt="${title}" /></div>`;
                            }
                        }
                        html += `</li>`;
                    });
                    html += '</ul>';
                    $('#guesty-properties-list').html(html);
                }
            } else {
                $('#guesty-properties-list').html('No properties found or error.');
            }
        });
    }
    
    // Load dates from URL on page load
    $(document).ready(function() {
        const urlCheckin = getUrlParameter('checkin');
        const urlCheckout = getUrlParameter('checkout');
        
        if (urlCheckin && urlCheckout) {
            $('#guesty-checkin').val(urlCheckin);
            $('#guesty-checkout').val(urlCheckout);
            performSearch(urlCheckin, urlCheckout);
        }
    });
    
    // Handle form submission
    $('#guesty-all-properties-form').on('submit', function(e) {
        e.preventDefault();
        const checkin = $('#guesty-checkin').val();
        const checkout = $('#guesty-checkout').val();
        performSearch(checkin, checkout);
    });
});
