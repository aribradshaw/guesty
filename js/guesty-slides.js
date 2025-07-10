// guesty-slides.js
// Responsive image slider with lightbox for Guesty listings
jQuery(document).ready(function ($) {
    $('.guesty-slides-wrapper').each(function () {
        const wrapper = $(this);
        const gallery = wrapper.find('.guesty-slides-gallery');
        // Try to get listingId from #guesty-listing-id
        let listingId = wrapper.data('listing-id');
        if (!listingId) {
            const $listingDiv = $('#guesty-listing-id');
            listingId = $listingDiv.data('listing-id');
        }
        if (!listingId) {
            gallery.html('<div class="guesty-slides-error">No listing ID found on this page.</div>');
            return;
        }
        // Fetch images via AJAX
        $.post(guestySlidesAjax.ajax_url, {
            action: 'fetch_guesty_images',
            listing_id: listingId
        }, function (response) {
            if (!response.success || !Array.isArray(response.data.images) || response.data.images.length === 0) {
                gallery.html('<div class="guesty-slides-error">No images found for this listing.</div>');
                return;
            }
            // Build slider HTML (track only)
            let slidesHtml = '<div class="guesty-slider-track">';
            response.data.images.forEach((img, idx) => {
                slidesHtml += `
                    <div class="guesty-slide">
                        <div class="guesty-slide-aspect">
                            <img src="${img.url}" data-original="${img.original}" alt="Listing Image ${idx + 1}" data-idx="${idx}" class="guesty-slide-img"/>
                        </div>
                    </div>
                `;
            });
            slidesHtml += '</div>';
            // Add lightbox container
            slidesHtml += `
                <div class="guesty-lightbox" style="display:none;">
                    <span class="guesty-lightbox-close">&times;</span>
                    <img class="guesty-lightbox-img" src="" alt="" />
                </div>
            `;
            gallery.html(slidesHtml);
            // Add navigation arrows outside the gallery
            if (wrapper.find('.guesty-slider-prev').length === 0) {
                wrapper.append('<button class="guesty-slider-prev" aria-label="Previous">&#10094;</button>');
            }
            if (wrapper.find('.guesty-slider-next').length === 0) {
                wrapper.append('<button class="guesty-slider-next" aria-label="Next">&#10095;</button>');
            }

            // Responsive slider logic
            const $track = gallery.find('.guesty-slider-track');
            const $slides = gallery.find('.guesty-slide');
            let current = 0;
            function getSlidesToShow() {
                const w = window.innerWidth;
                if (w < 400) return 1;
                if (w < 600) return 2;
                if (w < 768) return 3;
                if (w < 1024) return 4;
                return 6;
            }
            function updateSlider() {
                const slidesToShow = getSlidesToShow();
                const slideWidth = 100 / slidesToShow;
                $slides.css({ width: slideWidth + '%', flex: '0 0 ' + slideWidth + '%' });
                $track.css({ width: '100%' });
                // Clamp current
                if (current > $slides.length - slidesToShow) {
                    current = Math.max(0, $slides.length - slidesToShow);
                }
                const offset = -(current * (100 / slidesToShow));
                $track.css('transform', `translateX(${offset}%)`);
            }
            function goTo(idx) {
                const slidesToShow = getSlidesToShow();
                const maxIdx = Math.max(0, $slides.length - slidesToShow);
                if (idx < 0) {
                    current = maxIdx;
                } else if (idx > maxIdx) {
                    current = 0;
                } else {
                    current = idx;
                }
                updateSlider();
            }
            wrapper.find('.guesty-slider-prev').off('click').on('click', function () {
                goTo(current - 1);
            });
            wrapper.find('.guesty-slider-next').off('click').on('click', function () {
                goTo(current + 1);
            });
            $(window).on('resize', function () {
                updateSlider();
            });
            updateSlider();

            // Lightbox logic
            $slides.find('img').on('click', function () {
                const src = $(this).data('original') || $(this).attr('src');
                const alt = $(this).attr('alt');
                gallery.find('.guesty-lightbox-img').attr('src', src).attr('alt', alt);
                gallery.find('.guesty-lightbox').fadeIn(150);
            });
            gallery.find('.guesty-lightbox-close, .guesty-lightbox').on('click', function (e) {
                if (e.target !== this) return;
                gallery.find('.guesty-lightbox').fadeOut(150);
            });
        });
    });
});
