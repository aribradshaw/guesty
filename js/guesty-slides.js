// guesty-slides.js
// Responsive image slider with lightbox for Guesty listings

// UNIVERSAL LIGHTBOX CAPTION INJECTOR
// This will work with ANY lightbox system on the page
console.log('=== UNIVERSAL LIGHTBOX CAPTION INJECTOR LOADED ===');

function injectCaptionsIntoAnyLightbox() {
    console.log('=== INJECTING CAPTIONS INTO ANY LIGHTBOX ===');
    
    // Look for common lightbox patterns
    const lightboxSelectors = [
        '.lightbox',
        '.fancybox',
        '.magnific-popup', 
        '.photoswipe',
        '.guesty-lightbox',
        '.gallery-lightbox',
        '.image-lightbox',
        '[class*="lightbox"]',
        '[class*="popup"]',
        '[class*="modal"]'
    ];
    
    let lightboxFound = false;
    let $lightbox = null;
    
    // Try to find any active lightbox
    lightboxSelectors.forEach(selector => {
        const $found = jQuery(selector).filter(':visible');
        if ($found.length > 0) {
            console.log('Found lightbox with selector:', selector, $found);
            $lightbox = $found;
            lightboxFound = true;
        }
    });
    
    if (!lightboxFound) {
        console.log('No lightbox found with common selectors');
        return;
    }
    
    console.log('Lightbox found:', $lightbox);
    
    // Look for image in lightbox
    const $lightboxImg = $lightbox.find('img').first();
    if ($lightboxImg.length === 0) {
        console.log('No image found in lightbox');
        return;
    }
    
    console.log('Lightbox image found:', $lightboxImg);
    
    // Get the image source to match with slider images
    const lightboxImgSrc = $lightboxImg.attr('src');
    console.log('Lightbox image source:', lightboxImgSrc);
    
    // Find the corresponding slider image
    const $sliderImg = jQuery('.guesty-slide img, .slider img, .gallery img').filter(function() {
        const src = jQuery(this).attr('src') || jQuery(this).attr('data-original');
        return src === lightboxImgSrc || src === lightboxImgSrc.replace(/^https?:/, '');
    }).first();
    
    if ($sliderImg.length === 0) {
        console.log('No matching slider image found');
        return;
    }
    
    console.log('Matching slider image found:', $sliderImg);
    
    // Get caption from slider image alt attribute or nearby caption element
    let caption = $sliderImg.attr('alt') || '';
    
    // Look for caption in nearby elements
    const $slideContainer = $sliderImg.closest('.guesty-slide, .slide, .gallery-item');
    if ($slideContainer.length > 0) {
        const $slideCaption = $slideContainer.find('.guesty-slide-caption, .slide-caption, .caption, .description');
        if ($slideCaption.length > 0) {
            caption = $slideCaption.text().trim();
        }
    }
    
    console.log('Extracted caption:', caption);
    
    if (!caption || caption.length === 0) {
        console.log('No caption found');
        return;
    }
    
    // Remove any existing caption in lightbox
    $lightbox.find('.universal-caption').remove();
    
    // Create and inject caption
    const $caption = jQuery('<div class="universal-caption"></div>')
        .html(caption)
        .css({
            'position': 'absolute',
            'bottom': '20px',
            'left': '50%',
            'transform': 'translateX(-50%)',
            'color': '#fff',
            'background': '#000',
            'padding': '12px 20px',
            'border-radius': '8px',
            'font-size': '1.1em',
            'font-weight': '600',
            'z-index': '10003',
            'border': '2px solid #fff',
            'box-shadow': '0 4px 20px rgba(0,0,0,0.8)',
            'text-shadow': '1px 1px 2px rgba(0,0,0,0.8)',
            'max-width': '80vw',
            'text-align': 'center',
            'word-break': 'break-word'
        });
    
    $lightbox.append($caption);
    console.log('Caption injected successfully');
}

// Monitor for lightbox opening events
jQuery(document).on('click', 'img[data-original], .guesty-slide img, .slider img, .gallery img', function() {
    console.log('Image clicked, waiting for lightbox to open');
    setTimeout(injectCaptionsIntoAnyLightbox, 500);
});

// Monitor for lightbox navigation
jQuery(document).on('click', '[class*="next"], [class*="prev"], [class*="arrow"]', function() {
    console.log('Lightbox navigation clicked');
    setTimeout(injectCaptionsIntoAnyLightbox, 300);
});

// Periodic check for lightbox changes
setInterval(injectCaptionsIntoAnyLightbox, 1000);

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
            console.log('=== AJAX RESPONSE ===');
            console.log('Full response:', response);
            console.log('Response success:', response.success);
            console.log('Response data:', response.data);
            
            if (!response.success || !Array.isArray(response.data.images) || response.data.images.length === 0) {
                console.log('ERROR: No images found');
                gallery.html('<div class="guesty-slides-error">No images found for this listing.</div>');
                return;
            }
            
            const images = response.data.images;
            console.log('Images array:', images);
            console.log('First image:', images[0]);
            console.log('First image caption:', images[0] ? images[0].caption : 'N/A');
            console.log('=== END AJAX RESPONSE ===');
            
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
                
                // DEBUG: Log everything about the image and caption
                console.log('=== LIGHTBOX UPDATE DEBUG ===');
                console.log('Current image index:', currentLightboxIndex);
                console.log('Full image object:', img);
                console.log('Image caption:', img.caption);
                console.log('Caption type:', typeof img.caption);
                console.log('Caption length:', img.caption ? img.caption.length : 'N/A');
                console.log('Caption trimmed:', img.caption ? img.caption.trim() : 'N/A');
                console.log('Caption element found:', $cap.length);
                console.log('Caption element:', $cap);
                
                if (img.caption && String(img.caption).trim().length > 0) {
                    const captionText = String(img.caption).trim();
                    console.log('SETTING CAPTION:', captionText);
                    $cap.html(captionText).css({
                        'display': 'block !important',
                        'opacity': '1 !important',
                        'visibility': 'visible !important',
                        'color': '#fff !important',
                        'background': '#000 !important',
                        'border': '3px solid #fff !important'
                    }).show();
                    console.log('Caption should now be visible');
                } else {
                    console.log('NO CAPTION - hiding caption element');
                    $cap.hide().text('');
                }
                gallery.find('.guesty-lightbox-current').text(currentLightboxIndex + 1);
                console.log('=== END LIGHTBOX UPDATE ===');
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
                console.log('=== LIGHTBOX OPENING ===');
                console.log('Opening lightbox for index:', currentLightboxIndex);
                updateLightbox();
                gallery.find('.guesty-lightbox').fadeIn(150);
                $('body').css('overflow', 'hidden'); // Prevent background scrolling
                
                // Force caption visibility after lightbox is fully open
                setTimeout(function() {
                    console.log('=== FORCING CAPTION VISIBILITY ===');
                    const $cap = gallery.find('.guesty-lightbox-caption');
                    const img = images[currentLightboxIndex];
                    console.log('Force check - Image:', img);
                    console.log('Force check - Caption element:', $cap);
                    console.log('Force check - Caption element length:', $cap.length);
                    
                    if (img.caption && String(img.caption).trim().length > 0) {
                        const captionText = String(img.caption).trim();
                        console.log('FORCE SETTING CAPTION:', captionText);
                        $cap.html(captionText).css({
                            'display': 'block !important',
                            'opacity': '1 !important',
                            'visibility': 'visible !important',
                            'color': '#fff !important',
                            'background': '#000 !important',
                            'border': '3px solid #fff !important',
                            'position': 'absolute !important',
                            'bottom': '64px !important',
                            'left': '50% !important',
                            'transform': 'translateX(-50%) !important',
                            'z-index': '10002 !important',
                            'padding': '16px 24px !important',
                            'border-radius': '12px !important',
                            'font-size': '1.2em !important',
                            'font-weight': '600 !important'
                        }).show();
                        console.log('Caption forced to be visible');
                    } else {
                        console.log('NO CAPTION DATA TO DISPLAY');
                        // Show a test caption to verify the element works
                        $cap.html('TEST CAPTION - NO DATA').css({
                            'display': 'block !important',
                            'opacity': '1 !important',
                            'visibility': 'visible !important',
                            'color': '#fff !important',
                            'background': '#000 !important',
                            'border': '3px solid #fff !important'
                        }).show();
                    }
                }, 300);
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