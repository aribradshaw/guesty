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
        
        // Calculate number of nights
        const checkinDate = new Date(checkin);
        const checkoutDate = new Date(checkout);
        const timeDiff = checkoutDate.getTime() - checkinDate.getTime();
        const nights = Math.ceil(timeDiff / (1000 * 3600 * 24));
        
        $('#guesty-properties-list').html('Loading...');
        updateUrlParameters(checkin, checkout);
        
        $.post(guestyBookingAjax.ajax_url, {
            action: 'guesty_all_properties',
            checkin,
            checkout,
            token_set: window.guestyTokenSet || 0
        }, function(response) {            if (response.success && response.data.properties && response.data.properties.results) {
                const props = response.data.properties.results;
                if (props.length === 0) {
                    $('#guesty-properties-list').html('No properties available for these dates.');
                } else {
                    // Sort properties by bedrooms (most to least)
                    props.sort((a, b) => (b.bedrooms || 0) - (a.bedrooms || 0));
                    
                    let html = '<ul class="guesty-properties-ul">';                    props.forEach(function(p) {
                        let title = p.mapped_page && p.mapped_page.title ? p.mapped_page.title : (p.title || p.name);
                        let link = p.mapped_page && p.mapped_page.url ? p.mapped_page.url : null;
                        let image = p.main_image || '';
                        let priceHtml = '';
                        
                        // Add price information if available
                        if (p.price_info && p.price_info.total) {
                            const symbol = p.price_info.currency === 'USD' ? '$' : p.price_info.currency;
                            const nightText = nights === 1 ? 'night' : 'nights';
                            priceHtml = `<div class="property-price"><span class="price-amount">${symbol}${p.price_info.formatted}</span> <span class="price-duration">for ${nights} ${nightText}</span></div>`;
                        }
                        
                        html += `<li class="guesty-property-item">`;
                        html += `<div class="property-details">`;
                        if (link) {
                            html += `<a href="${link}"><strong>${title}</strong></a>`;
                        } else {
                            html += `<strong>${title}</strong>`;
                        }
                        html += `<div class="property-amenities">`;
                        html += `<span class="amenity"><span class="icon">🛏️</span> ${p.bedrooms || '-'}</span>`;
                        html += `<span class="amenity"><span class="icon">🛁</span> ${p.bathrooms || '-'}</span>`;
                        html += `<span class="amenity"><span class="icon">👥</span> ${p.accommodates || '-'}</span>`;
                        html += `</div>`;
                        if (p.address && p.address.formatted) {
                            html += `<div class="property-address">${p.address.formatted}</div>`;
                        }
                        html += priceHtml; // Add price at the bottom
                        html += `</div>`;
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
