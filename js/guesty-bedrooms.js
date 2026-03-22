(function () {
    'use strict';

    function init() {
        var root = document.getElementById('guesty-bedrooms-root');
        if (!root || typeof jQuery === 'undefined' || typeof guestyBedroomsAjax === 'undefined') {
            return;
        }

        var $ = jQuery;
        var listingId = root.getAttribute('data-listing-id');
        if (!listingId) {
            var listingDiv = document.getElementById('guesty-listing-id');
            if (listingDiv && listingDiv.getAttribute('data-listing-id')) {
                listingId = listingDiv.getAttribute('data-listing-id');
            }
        }

        if (!listingId) {
            root.classList.remove('guesty-bedrooms-root--loading');
            root.innerHTML =
                '<div class="guesty-bedrooms-module guesty-bedrooms-module--notice"><p class="guesty-bedrooms-empty">No listing ID found on the page.</p></div>';
            return;
        }

        var includeShared = root.getAttribute('data-include-shared') === '1' ? '1' : '0';
        var expanded = root.getAttribute('data-expanded') === '1' ? '1' : '0';
        var moduleTitle = root.getAttribute('data-module-title') || '';
        var minWidth = root.getAttribute('data-min-width') || '260';

        $.post(guestyBedroomsAjax.ajax_url, {
            action: 'fetch_guesty_bedrooms',
            listing_id: listingId,
            include_shared: includeShared,
            expanded: expanded,
            module_title: moduleTitle,
            min_width: minWidth
        })
            .done(function (response) {
                if (response.success && response.data && response.data.html) {
                    if (typeof response.data.token_set !== 'undefined') {
                        window.guestyTokenSet = response.data.token_set;
                    }
                    root.innerHTML = response.data.html;
                    root.classList.remove('guesty-bedrooms-root--loading');
                    root.classList.add('guesty-bedrooms-loaded');
                } else {
                    root.classList.remove('guesty-bedrooms-root--loading');
                    root.innerHTML =
                        '<div class="guesty-bedrooms-module guesty-bedrooms-module--notice"><p class="guesty-bedrooms-empty">' +
                        (response.data && response.data.message
                            ? response.data.message
                            : 'Could not load bedrooms.') +
                        '</p></div>';
                }
            })
            .fail(function () {
                root.classList.remove('guesty-bedrooms-root--loading');
                root.innerHTML =
                    '<div class="guesty-bedrooms-module guesty-bedrooms-module--notice"><p class="guesty-bedrooms-empty">An error occurred while loading bedrooms.</p></div>';
            });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
