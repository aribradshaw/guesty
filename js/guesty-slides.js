// guesty-slides.js
// Responsive image slider with lightbox for Guesty listings
jQuery(document).ready(function ($) {
    $('.guesty-slides-wrapper').each(function () {
        const wrapper = $(this);
        const gallery = wrapper.find('.guesty-slides-gallery');
        const escapeHtml = (str) => {
            if (typeof str !== 'string') return '';
            return str
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        };
        
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
            
            const images = response.data.images;
            
            // Build slider HTML (track only)
            let slidesHtml = '<div class="guesty-slider-track">';
            images.forEach((img, idx) => {
                slidesHtml += `
                    <div class="guesty-slide">
                        <div class="guesty-slide-aspect">
                            <img src="${img.url}" data-original="${img.original}" alt="${escapeHtml(String(img.caption || `Image ${idx + 1}`))}" data-idx="${idx}" class="guesty-slide-img"/>
                        </div>
                    </div>
                `;
            });
            slidesHtml += '</div>';
            
            // Add enhanced lightbox container with navigation
            slidesHtml += `
                <div class="guesty-lightbox" style="display:none;">
                    <span class="guesty-lightbox-close">&times;</span>
                    <button class="guesty-lightbox-prev" aria-label="Previous Image">&#10094;</button>
                    <button class="guesty-lightbox-next" aria-label="Next Image">&#10095;</button>
                    <img class="guesty-lightbox-img" src="" alt="" />
                    <div class="guesty-lightbox-caption" style="display:none;"></div>
                    <div class="guesty-lightbox-counter">
                        <span class="guesty-lightbox-current">1</span> / <span class="guesty-lightbox-total">${images.length}</span>
                    </div>
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
            
            // Navigation event handlers
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

            // Enhanced lightbox logic with infinite scrolling
            let currentLightboxIndex = 0;
            
            function updateLightbox() {
                const img = images[currentLightboxIndex];
                const altText = img.caption || `Image ${currentLightboxIndex + 1}`;
                gallery.find('.guesty-lightbox-img').attr('src', img.original).attr('alt', altText);
                const $cap = gallery.find('.guesty-lightbox-caption');
                if (img.caption && img.caption.trim().length > 0) {
                    $cap.text(img.caption).show();
                } else {
                    $cap.hide().text('');
                }
                gallery.find('.guesty-lightbox-current').text(currentLightboxIndex + 1);
            }
            
            function goToLightboxImage(idx) {
                if (idx < 0) {
                    currentLightboxIndex = images.length - 1;
                } else if (idx >= images.length) {
                    currentLightboxIndex = 0;
                } else {
                    currentLightboxIndex = idx;
                }
                updateLightbox();
            }
            
            // Open lightbox
            $slides.find('img').on('click', function () {
                currentLightboxIndex = parseInt($(this).data('idx'));
                updateLightbox();
                gallery.find('.guesty-lightbox').fadeIn(150);
                $('body').css('overflow', 'hidden'); // Prevent background scrolling
            });
            
            // Close lightbox
            function closeLightbox() {
                gallery.find('.guesty-lightbox').fadeOut(150);
                $('body').css('overflow', ''); // Restore scrolling
            }
            
            gallery.find('.guesty-lightbox-close').on('click', closeLightbox);
            
            // Click outside image to close
            gallery.find('.guesty-lightbox').on('click', function (e) {
                if (e.target === this) {
                    closeLightbox();
                }
            });
            
            // Lightbox navigation
            gallery.find('.guesty-lightbox-prev').on('click', function (e) {
                e.stopPropagation();
                goToLightboxImage(currentLightboxIndex - 1);
            });
            
            gallery.find('.guesty-lightbox-next').on('click', function (e) {
                e.stopPropagation();
                goToLightboxImage(currentLightboxIndex + 1);
            });
            
            // Keyboard navigation
            $(document).on('keydown.guesty-lightbox', function (e) {
                if (gallery.find('.guesty-lightbox').is(':visible')) {
                    if (e.key === 'ArrowLeft') {
                        e.preventDefault();
                        goToLightboxImage(currentLightboxIndex - 1);
                    } else if (e.key === 'ArrowRight') {
                        e.preventDefault();
                        goToLightboxImage(currentLightboxIndex + 1);
                    } else if (e.key === 'Escape') {
                        e.preventDefault();
                        closeLightbox();
                    }
                }
            });
        });
    });
});