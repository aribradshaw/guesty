// Universal Lightbox Caption Injector
// This script will work with ANY lightbox system on the page
console.log('=== UNIVERSAL LIGHTBOX CAPTION INJECTOR LOADED ===');

jQuery(document).ready(function ($) {
    console.log('=== UNIVERSAL CAPTION SCRIPT INITIALIZING ===');
    
    // Function to inject captions into any lightbox
    function injectCaptionsIntoLightbox() {
        console.log('=== INJECTING CAPTIONS INTO LIGHTBOX ===');
        
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
            const $found = $(selector).filter(':visible');
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
        const $sliderImg = $('.guesty-slide img, .slider img, .gallery img').filter(function() {
            const src = $(this).attr('src') || $(this).attr('data-original');
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
        const $caption = $('<div class="universal-caption"></div>')
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
    const originalShow = $.fn.show;
    $.fn.show = function() {
        const result = originalShow.apply(this, arguments);
        setTimeout(injectCaptionsIntoLightbox, 100);
        return result;
    };
    
    const originalFadeIn = $.fn.fadeIn;
    $.fn.fadeIn = function() {
        const result = originalFadeIn.apply(this, arguments);
        setTimeout(injectCaptionsIntoLightbox, 200);
        return result;
    };
    
    // Monitor for common lightbox events
    $(document).on('click', 'img[data-original], .guesty-slide img, .slider img, .gallery img', function() {
        console.log('Image clicked, waiting for lightbox to open');
        setTimeout(injectCaptionsIntoLightbox, 500);
    });
    
    // Monitor for lightbox navigation
    $(document).on('click', '[class*="next"], [class*="prev"], [class*="arrow"]', function() {
        console.log('Lightbox navigation clicked');
        setTimeout(injectCaptionsIntoLightbox, 300);
    });
    
    // Periodic check for lightbox changes
    setInterval(injectCaptionsIntoLightbox, 1000);
    
    console.log('=== UNIVERSAL CAPTION SCRIPT READY ===');
});
