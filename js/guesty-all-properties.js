// guesty-all-properties.js
jQuery(function($) {
    // Debug - let's see what plugin_url contains
    console.log('Plugin URL:', guestyBookingAjax.plugin_url);
    console.log('Full SVG URL:', guestyBookingAjax.plugin_url + 'svg/bed.svg');
    
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
        }, function(response) {
            if (response.success && response.data.properties && response.data.properties.results) {
                const props = response.data.properties.results;
                if (props.length === 0) {
                    $('#guesty-properties-list').html('No properties available for these dates.');
                } else {
                    // Sort properties by bedrooms (most to least)
                    props.sort((a, b) => (b.bedrooms || 0) - (a.bedrooms || 0));
                    let html = '<ul class="guesty-properties-ul">';
                    props.forEach(function(p) {
                        let title = p.mapped_page && p.mapped_page.title ? p.mapped_page.title : (p.title || p.name);
                        let link = p.mapped_page && p.mapped_page.url ? p.mapped_page.url : null;
                        // Always use the checkin/checkout from the current search
                        if (link) {
                            link += (link.includes('?') ? '&' : '?') + 'checkin=' + encodeURIComponent(checkin) + '&checkout=' + encodeURIComponent(checkout);
                        }
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
                        }                        html += `<div class="property-amenities">`;
                        // Construct the proper plugin URL - ensure it includes the plugin directory name
                        let pluginUrl = guestyBookingAjax.plugin_url;
                        if (typeof pluginUrl === 'undefined') {
                            console.error('[guesty-all-properties] guestyBookingAjax.plugin_url is undefined!');
                            pluginUrl = '';
                        }
                        if (!pluginUrl.includes('MannaPress')) {
                            pluginUrl = pluginUrl.endsWith('/') ? pluginUrl + 'MannaPress%20Guesty/' : pluginUrl + '/MannaPress%20Guesty/';
                        } else {
                            pluginUrl = pluginUrl.endsWith('/') ? pluginUrl : pluginUrl + '/';
                        }                        html += `<span class="amenity"><img src="${pluginUrl}svg/bed.svg" class="icon" alt="Bedrooms" title="Number of bedrooms"> ${p.bedrooms || '-'}</span>`;
                        html += `<span class="amenity"><img src="${pluginUrl}svg/bathroom.svg" class="icon" alt="Bathrooms" title="Number of bathrooms"> ${p.bathrooms || '-'}</span>`;
                        html += `<span class="amenity"><img src="${pluginUrl}svg/accomodates.svg" class="icon" alt="Max Guests" title="Maximum number of guests"> ${p.accommodates || '-'}</span>`;
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
        // Set minimum date to today for check-in
        const today = new Date().toISOString().split('T')[0];
        $('#guesty-checkin').attr('min', today);
        
        // Update checkout minimum when check-in changes
        $('#guesty-checkin').on('change', function() {
            const checkinDate = $(this).val();
            if (checkinDate) {
                // Set checkout minimum to the day after check-in
                const checkinDateObj = new Date(checkinDate);
                checkinDateObj.setDate(checkinDateObj.getDate() + 1);
                const minCheckout = checkinDateObj.toISOString().split('T')[0];
                $('#guesty-checkout').attr('min', minCheckout);
                
                // Clear checkout if it's now invalid
                const currentCheckout = $('#guesty-checkout').val();
                if (currentCheckout && currentCheckout <= checkinDate) {
                    $('#guesty-checkout').val('');
                }
            }
        });
        
        // Validate checkout is after check-in
        $('#guesty-checkout').on('change', function() {
            const checkinDate = $('#guesty-checkin').val();
            const checkoutDate = $(this).val();
            
            if (checkinDate && checkoutDate && checkoutDate <= checkinDate) {
                alert('Check-out date must be after check-in date.');
                $(this).val('');
                return;
            }
        });
        
        const urlCheckin = getUrlParameter('checkin');
        const urlCheckout = getUrlParameter('checkout');
        
        if (urlCheckin && urlCheckout) {
            $('#guesty-checkin').val(urlCheckin);
            $('#guesty-checkout').val(urlCheckout);
            // Trigger change event to set proper minimums
            $('#guesty-checkin').trigger('change');
            performSearch(urlCheckin, urlCheckout);
        }
    });
      // Handle form submission
    $('#guesty-all-properties-form').on('submit', function(e) {
        e.preventDefault();
        const checkin = $('#guesty-checkin').val();
        const checkout = $('#guesty-checkout').val();
        
        // Validate dates
        if (!checkin || !checkout) {
            alert('Please select both check-in and check-out dates.');
            return;
        }
        
        const today = new Date().toISOString().split('T')[0];
        if (checkin < today) {
            alert('Check-in date cannot be in the past.');
            return;
        }
        
        if (checkout <= checkin) {
            alert('Check-out date must be after check-in date.');
            return;
        }
        
        performSearch(checkin, checkout);
    });
});
