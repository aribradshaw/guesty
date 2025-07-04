window.addEventListener('DOMContentLoaded', function () {
    var $ = jQuery;

    // --- Inject robust CSS for the days header ---
    (function injectCalendarHeaderCSS() {
        if (document.getElementById('guesty-calendar-header-style')) return;
        const style = document.createElement('style');
        style.id = 'guesty-calendar-header-style';
        style.textContent = `
        .guesty-calendar-days-row { 
            display: grid !important;
            grid-template-columns: repeat(7, 1fr) !important;
            width: 100% !important;
            background: #f7f7f7 !important;
            margin: 0 !important;
            padding: 0 !important;
            box-sizing: border-box !important;
            gap: 0 !important;
            border: none !important;
        }
        .guesty-calendar-day-header {
            text-align: center !important;
            font-weight: bold !important;
            padding: 0 !important;
            color: #333 !important;
            background: #f7f7f7 !important;
            font-size: 14px !important;
            letter-spacing: 1px !important;
            box-sizing: border-box !important;
            user-select: none !important;
            border: none !important;
        }
        #calendar-grid {
            display: grid !important;
            grid-template-columns: repeat(7, 1fr) !important;
            width: 100% !important;
            box-sizing: border-box !important;
        }
        `;
        document.head.appendChild(style);
    })();

    // --- Inject robust CSS for the calendar key ---
    (function injectCalendarKeyCSS() {
        if (document.getElementById('guesty-calendar-key-style')) return;
        const style = document.createElement('style');
        style.id = 'guesty-calendar-key-style';
        style.textContent = `
        .guesty-calendar-key-row {
            display: flex !important;
            justify-content: center !important;
            align-items: center !important;
            gap: 18px !important;
            margin: 32px 0 8px 0 !important;
            padding: 0 !important;
            font-size: 13px !important;
            background: transparent !important;
        }
        .guesty-calendar-key-item {
            display: flex !important;
            align-items: center !important;
            gap: 5px !important;
        }
        .guesty-calendar-key-box {
            width: 18px !important;
            height: 18px !important;
            border-radius: 4px !important;
            border: 1px solid #bbb !important;
            display: inline-block !important;
            margin-right: 4px !important;
        }
        .guesty-key-available { background: #CCFFCC !important; border-color: #CCFFCC !important; }
        .guesty-key-unavailable { background: #FFE6E6 !important; border-color: #FFE6E6 !important; }
        .guesty-key-reserved { background: #F3EDE6 !important; border-color: #F3EDE6 !important; }
        .guesty-key-booked { background: #FFCCCC !important; border-color: #FFCCCC !important; }
        .guesty-key-halfday { background: #FFFFCC !important; border-color: #FFFFCC !important; }
        `;
        document.head.appendChild(style);
    })();

    // --- Render the color key below the calendar grid ---
    function renderCalendarKey() {
        setTimeout(function() {
            const calendar = document.getElementById('guesty-booking-calendar');
            const grid = document.getElementById('calendar-grid');
            if (!calendar || !grid) return false;
            // Remove any existing key to avoid duplicates
            const prevKey = calendar.querySelector('.guesty-calendar-key-row');
            if (prevKey) prevKey.remove();
            // Create key row
            const keyRow = document.createElement('div');
            keyRow.className = 'guesty-calendar-key-row';
            keyRow.innerHTML = `
                <span class="guesty-calendar-key-item"><span class="guesty-calendar-key-box guesty-key-available"></span>Available</span>
                <span class="guesty-calendar-key-item"><span class="guesty-calendar-key-box guesty-key-unavailable"></span>Unavailable</span>
                <span class="guesty-calendar-key-item"><span class="guesty-calendar-key-box guesty-key-reserved"></span>Past</span>
                <span class="guesty-calendar-key-item"><span class="guesty-calendar-key-box guesty-key-booked"></span>Booked</span>
                <span class="guesty-calendar-key-item"><span class="guesty-calendar-key-box guesty-key-halfday"></span>Departure-Only Day</span>
            `;
            // Insert after the calendar grid
            if (grid.nextSibling) {
                calendar.insertBefore(keyRow, grid.nextSibling);
            } else {
                calendar.appendChild(keyRow);
            }
        }, 30);
    }

    // --- Render the days-of-the-week header above the calendar grid ---
    function renderDaysOfWeekHeader() {
        setTimeout(function() {
            const controls = document.getElementById('calendar-controls');
            const grid = document.getElementById('calendar-grid');
            if (!controls || !grid) return false;
            // Remove any existing header to avoid duplicates
            const prevHeader = controls.parentNode.querySelector('.guesty-calendar-days-row');
            if (prevHeader) prevHeader.remove();
            // Create header
            const daysRow = document.createElement('div');
            daysRow.className = 'guesty-calendar-days-row';
            daysRow.style.cssText = 'display: grid !important; grid-template-columns: repeat(7, 1fr) !important; width: 100% !important; background: #f7f7f7 !important; margin: 0 !important; padding: 0 !important; box-sizing: border-box !important; gap: 0 !important; border: none !important;';
            const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
            days.forEach(day => {
                const dayDiv = document.createElement('div');
                dayDiv.className = 'guesty-calendar-day-header';
                dayDiv.textContent = day;
                dayDiv.style.cssText = 'text-align: center !important; font-weight: bold !important; padding: 0 !important; color: #333 !important; background: #f7f7f7 !important; font-size: 14px !important; letter-spacing: 1px !important; box-sizing: border-box !important; user-select: none !important; border: none !important;';
                daysRow.appendChild(dayDiv);
            });
            try {
                controls.parentNode.insertBefore(daysRow, grid);
                return true;            } catch (error) {
                return false;
            }
        }, 50);
        return 'pending';
    }

    const calendarDiv = $('#guesty-booking-calendar');
    const calendarGrid = $('#calendar-grid');
    const currentMonthSpan = $('#current-month');
    const prevMonthButton = $('#prev-month');
    const nextMonthButton = $('#next-month');
    const quoteDiv = $('<div id="quote-details" style="margin-top: 20px;"></div>').insertAfter(calendarDiv);    let currentDate = new Date(); // Start with the current date
    const listingDiv = $('#guesty-listing-id');
    const listingId = listingDiv.data('listing-id');

    let selectedStartDate = null;
    let selectedEndDate = null;    if (!listingId) {
        calendarGrid.text('No listing ID found.');
        return;
    }

    // Format date as YYYY-MM-DD
    const formatDate = (date) => {
        return date.toISOString().split('T')[0];
    };

    // Get the first day of the month for a given date
    const getMonthStart = (date) => {
        return new Date(date.getFullYear(), date.getMonth(), 1);
    };

    // Get the last day of the month for a given date
    const getMonthEnd = (date) => {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0);
    };

    // Show loading animation
    const showLoading = (button) => {
        button.prop('disabled', true);
        button.html(`${button.text()} <span class="loading-spinner"></span>`);
    };

    // Hide loading animation
    const hideLoading = (button, originalText) => {
        button.prop('disabled', false);
        button.html(originalText);
    };

    // Fetch calendar data for the current month
    function fetchCalendarData(currentDate, button, originalText) {
        if (button) showLoading(button);
        $.post(guestyBookingAjax.ajax_url, {
            action: 'fetch_calendar_data',
            listing_id: $('#guesty-listing-id').data('listing-id'),
            from: formatDate(getMonthStart(currentDate)),
            to: formatDate(getMonthEnd(currentDate)),
            token_set: window.guestyTokenSet || 0 // Always use the token set from attributes
        }, function(response) {
            if (response.success) {
                // Do NOT overwrite window.guestyTokenSet here!
                if (Array.isArray(response.data.calendar)) {
                    renderCalendar(response.data.calendar, currentDate);
                } else {
                    calendarGrid.text('Calendar data is not available for this property.');
                }
            } else {
                calendarGrid.text(response.data.message || 'Error fetching calendar data.');
            }
        }).always(function() {
            if (button) hideLoading(button, originalText);
        });
    }    let renderCalendar = (data, date) => {
        renderDaysOfWeekHeader(); // Always inject header before rendering grid
        calendarGrid.empty();
        currentMonthSpan.text(date.toLocaleString('default', { month: 'long', year: 'numeric' }));

        const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay(); // Day of the week for the 1st
        const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate(); // Total days in the month

        // Add empty cells for days before the 1st
        for (let i = 0; i < firstDay; i++) {
            calendarGrid.append('<div class="calendar-cell empty"></div>');
        }

        // Add cells for each day of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const currentDate = new Date(date.getFullYear(), date.getMonth(), day);
            const formattedDate = formatDate(currentDate);
            const dayData = data.find((d) => d.date === formattedDate);

            let cellClass = 'calendar-cell';
            let cellContent = day;            // Add price for this day, if available
            let priceHtml = '';
            if (dayData && dayData.price) {
                priceHtml = `<div class="calendar-price">$${dayData.price}</div>`;
            }

            // Add minimum nights indicator
            let minNightsHtml = '';
            if (dayData && dayData.minNights && dayData.minNights > 1) {
                minNightsHtml = `<div class="min-nights">${dayData.minNights}n min</div>`;
                cellClass += ' has-min-nights';
            }

            // --- Half Day (Departure Day) Logic ---
            let isHalfDay = false;
            if (dayData && dayData.status === 'booked') {
                // Find previous day in data
                const prevDate = new Date(currentDate);
                prevDate.setDate(prevDate.getDate() - 1);
                const prevFormatted = formatDate(prevDate);
                const prevDayData = data.find((d) => d.date === prevFormatted);
                if (
                    prevDayData &&
                    prevDayData.status === 'available' &&
                    prevDayData.ctd === false // ctd = closed to departure
                ) {
                    cellClass += ' departure-day-half';
                    isHalfDay = true;
                }
            }

            if (currentDate < new Date()) {
                cellClass += ' past'; // Disable past dates
            } else if (dayData) {
                if (dayData.status === 'booked') {
                    if (!isHalfDay) cellClass += ' booked';
                } else if (dayData.status === 'unavailable') {
                    cellClass += ' unavailable';
                } else if (dayData.status === 'available') {
                    cellClass += ' available';
                }
            } else {
                cellClass += ' unavailable'; // Default to unavailable if no data
            }            // Render day number, price, and min nights
            const cell = $(`<div class="${cellClass}" data-date="${formattedDate}" data-min-nights="${dayData?.minNights || 1}">
                <div class="day-number">${cellContent}</div>
                ${priceHtml}
                ${minNightsHtml}
            </div>`);
            calendarGrid.append(cell);

            // Add click event for available and half-day (departure day) dates
            if (cellClass.includes('available') || cellClass.includes('departure-day-half')) {
                cell.on('click', function () {
                    handleDateSelection(formattedDate, cell);
                });
            }
        }

        // After rendering, re-highlight selected range if present
        if (window.selectedStartDateDisplay && window.selectedEndDateDisplay) {
            highlightDateRange(new Date(window.selectedStartDateDisplay), new Date(window.selectedEndDateDisplay));
        } else if (window.selectedStartDateDisplay) {
            $(`.calendar-cell[data-date="${window.selectedStartDateDisplay}"]`).addClass('selected-start');
        }

        updateCalendarControls(date);
    };

    // Handle date selection
    const handleDateSelection = (date, cell) => {
        if (!selectedStartDate || (selectedStartDate && selectedEndDate)) {
            // Reset selection
            resetSelection();
            selectedStartDate = date;
            cell.addClass('selected-start');
            window.selectedStartDateDisplay = date; // Save for display
            window.selectedEndDateDisplay = '';     // Reset
        } else {
            // Set end date
            const startDate = new Date(selectedStartDate);
            const endDate = new Date(date);

            if (endDate <= startDate) {
                alert('End date must be after the start date.');
                resetSelection();
                return;
            }            const diffInDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
            
            // Check minimum nights requirement for the start date
            const startDateMinNights = parseInt($(`.calendar-cell[data-date="${selectedStartDate}"]`).data('min-nights') || 1);
            if (diffInDays < startDateMinNights) {
                alert(`Minimum stay is ${startDateMinNights} night${startDateMinNights > 1 ? 's' : ''} for this check-in date.`);
                resetSelection();
                return;
            }

            // Prevent selection if any booked/unavailable dates are in the range
            let hasBlocked = false;
            $('.calendar-cell').each(function () {
                const cellDateStr = $(this).data('date');
                if (!cellDateStr) return;
                const cellDate = new Date(cellDateStr);
                if (
                    cellDate > startDate &&
                    cellDate < endDate &&
                    ($(this).hasClass('booked') || $(this).hasClass('unavailable'))
                ) {
                    hasBlocked = true;
                }
            });
            if (hasBlocked) {
                alert('You cannot select a range that includes booked or unavailable dates.');
                resetSelection();
                return;
            }

            selectedEndDate = date;
            window.selectedEndDateDisplay = date; // Save for display
            highlightDateRange(startDate, endDate);
            requestQuote(selectedStartDate, selectedEndDate);
        }
    };    // Highlight the selected date range
    const highlightDateRange = (startDate, endDate) => {
        $('.calendar-cell').each(function () {
            const cellDate = new Date($(this).data('date'));
            if (cellDate > startDate && cellDate < endDate) {
                // Only middle dates get selected-range class
                $(this).addClass('selected-range');
                // Force style update by triggering a reflow
                $(this)[0].offsetHeight;
            }
        });// Start and end dates get their specific classes (not selected-range)
        const startCell = $(`.calendar-cell[data-date="${formatDate(startDate)}"]`);
        const endCell = $(`.calendar-cell[data-date="${formatDate(endDate)}"]`);
        
        startCell.addClass('selected-start');
        endCell.addClass('selected-end');
        
        // Force DOM reflow and style recalculation
        setTimeout(() => {
            if (startCell[0]) startCell[0].offsetHeight;
            if (endCell[0]) endCell[0].offsetHeight;
            // Force repaint by toggling a harmless style
            if (startCell[0]) startCell.css('transform', 'translateZ(0)');
            if (endCell[0]) endCell.css('transform', 'translateZ(0)');
        }, 10);
        
        // Handle half-day departures
        $(`.calendar-cell[data-date="${formatDate(endDate)}"]`).each(function() {
            if ($(this).hasClass('departure-day-half')) {
                $(this).addClass('selected-halfday');
            }
        });
    };

    // Reset the selection
    const resetSelection = () => {
        selectedStartDate = null;
        selectedEndDate = null;
        window.selectedStartDateDisplay = '';
        window.selectedEndDateDisplay = '';
        $('.calendar-cell').removeClass('selected-range selected-start selected-end selected-halfday');
        quoteDiv.empty();
    };

    // Request a quote from the WordPress proxy
    const requestQuote = (startDate, endDate) => {
        console.debug('[guesty-booking-calendar] requestQuote called', { startDate, endDate });
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (start < minDate || end > maxDate) {
            console.warn('[guesty-booking-calendar] Selected dates out of range', { start, end, minDate, maxDate });
            quoteDiv.html('<p>Selected dates are outside the allowed booking range.</p>');
            return;
        }

        const requestData = {
            action: 'request_guesty_quote',
            guests_count: 1, // Default to 1 guest for now
            listing_id: listingId,
            check_in_date: startDate,
            check_out_date: endDate,
            token_set: window.guestyTokenSet || 0 // <-- ADD THIS LINE
        };

        console.debug('[guesty-booking-calendar] Sending AJAX for quote', requestData);
        // Send the POST request to the WordPress proxy
        $('#guesty-quote-spinner').show(); // Show spinner
        $('#guesty-payment-section').hide(); // Hide form while loading

        $.ajax({
            url: guestyAjax.ajax_url,
            method: 'POST',
            data: requestData,
            success: function(response) {
                console.debug('[guesty-booking-calendar] Quote AJAX success', response);
                $('#guesty-quote-spinner').hide(); // Hide spinner
                $('#guesty-payment-section').show(); // Show form
                if (response.success) {
                    displayQuoteDetails(response.data); // Pass full data
                } else {
                    console.error('[guesty-booking-calendar] Quote AJAX error (success=false)', response);
                    quoteDiv.html('<p>An error occurred while fetching the quote. Please try again.</p>');
                }
            },
            error: (xhr, status, error) => {
                console.error('[guesty-booking-calendar] Quote AJAX error', { xhr, status, error });
                $('#guesty-quote-spinner').hide(); // Hide spinner
                $('#guesty-payment-section').show(); // Show form
                quoteDiv.html('<p>An error occurred while fetching the quote. Please try again.</p>');
            },
        });
    };    // Display the quote details
    const displayQuoteDetails = (quote) => {
        console.debug('[guesty-booking-calendar] displayQuoteDetails called', quote);
        // Robust error handling and extraction
        if (!quote || !quote.rates || !Array.isArray(quote.rates.ratePlans) || !quote.rates.ratePlans[0]) {
            console.warn('[guesty-booking-calendar] No quote details available', quote);
            quoteDiv.html('<p>No quote details available. <span style="color:#b00;">[E1001]</span></p>');
            window.guestyQuoteId = null;
            window.guestyRatePlanId = null;
            window.guestyQuoteData = null;
            return;
        }

        const ratePlan = quote.rates.ratePlans[0];
        if (!ratePlan || !ratePlan.ratePlan || !ratePlan.ratePlan.money) {
            console.warn('[guesty-booking-calendar] Malformed ratePlan in quote', quote);
            quoteDiv.html('<p>Malformed quote data. <span style="color:#b00;">[E1002]</span></p>');
            window.guestyQuoteId = null;
            window.guestyRatePlanId = null;
            window.guestyQuoteData = null;
            return;
        }
        const money = ratePlan.ratePlan.money;

        // Get the total cost
        const hostPayout = money.hostPayout;
        const currency = money.currency;

        // Format currency
        const formatCurrency = (value) => value.toLocaleString('en-US', { style: 'currency', currency: currency });

        // Add selected dates display
        const checkIn = window.selectedStartDateDisplay || '';
        const checkOut = window.selectedEndDateDisplay || '';

        // Build invoice items list
        let invoiceItemsHtml = '';
        if (money.invoiceItems && Array.isArray(money.invoiceItems)) {
            money.invoiceItems.forEach(item => {
                invoiceItemsHtml += `<li><strong>${item.title}:</strong> ${formatCurrency(item.amount)}</li>`;
            });
        }

        // Set global variables for payment flow
        window.guestyQuoteId = quote._id || quote.quoteId || null;
        window.guestyRatePlanId = ratePlan.ratePlan._id || ratePlan.ratePlanId || null;
        window.guestyQuoteData = quote;

        // Defensive: show error if missing critical IDs
        if (!window.guestyQuoteId || !window.guestyRatePlanId) {
            quoteDiv.html('<p>Quote is missing required IDs. <span style="color:#b00;">[E1003]</span></p>');
            return;
        }

        // Clear existing content and event handlers to prevent duplication
        quoteDiv.off().empty();
        quoteDiv.html(`
            <h3>Quote Details</h3>
            <div><strong>Check-in:</strong> ${checkIn} &nbsp; <strong>Check-out:</strong> ${checkOut}</div>
            <p><strong>Total Cost:</strong> ${formatCurrency(hostPayout)}</p>
            <div class="quote-details-container">
                <button class="quote-details-toggle" type="button">
                    <span class="toggle-arrow">▼</span>
                    <span class="toggle-text">see details</span>
                </button>
                <ul class="quote-details-breakdown" style="display: none;">
                    ${invoiceItemsHtml}
                </ul>
            </div>
        `);

        // Add click handler for the details toggle
        quoteDiv.find('.quote-details-toggle').on('click', function() {
            const breakdown = quoteDiv.find('.quote-details-breakdown');
            const arrow = $(this).find('.toggle-arrow');
            const text = $(this).find('.toggle-text');
            
            if (breakdown.is(':visible')) {
                breakdown.slideUp(200);
                text.text('see details');
                arrow.text('▼');
            } else {
                breakdown.slideDown(200);
                text.text('hide details');
                arrow.text('▲');
            }
        });

        // DEBUG: Log all relevant data before firing event
        const eventPayload = {
            total: hostPayout,
            quote: quote,
            checkIn,
            checkOut,
            listingId: listingId // <-- use the actual listingId from the calendar context
        };
        window.guestyQuoteId = quote?._id || null;
        window.guestyRatePlanId = ratePlan?._id || null;
        window.guestyQuoteData = quote;
        console.debug('[guesty-booking-calendar] About to trigger guesty_quote_ready', eventPayload);
        $(document).trigger('guesty_quote_ready', [eventPayload]);
        console.log('[guesty-booking-calendar] guesty_quote_ready event triggered', eventPayload);
    };

    // Initial fetch: wait for guestyTokenSet to be ready
    function startCalendar() {
        fetchCalendarData(currentDate);
    }

    if (window.guestyTokenSet) {
        startCalendar();
    } else {
        $(document).on('guesty_token_ready', function () {
            startCalendar();
        });
    }

    // Handle Previous and Next buttons
    prevMonthButton.on('click', function () {
        const tempDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
        if (tempDate < minDate) return;
        const originalText = prevMonthButton.text();
        currentDate.setMonth(currentDate.getMonth() - 1);
        fetchCalendarData(currentDate, prevMonthButton, originalText); // Pass button and text!
    });

    nextMonthButton.on('click', function () {
        const tempDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
        if (tempDate > maxDate) return;
        const originalText = nextMonthButton.text();
        currentDate.setMonth(currentDate.getMonth() + 1);
        fetchCalendarData(currentDate, nextMonthButton, originalText); // Pass button and text!
    });

    const today = new Date();
    const minDate = new Date(today.getFullYear(), today.getMonth(), 1);
    const maxDate = new Date(today.getFullYear() + 2, today.getMonth(), 1);

    function updateCalendarControls(currentDate) {
        // Disable "Previous" if at or before minDate
        document.getElementById('prev-month').disabled = (
            currentDate.getFullYear() === minDate.getFullYear() &&
            currentDate.getMonth() === minDate.getMonth()
        );        // Disable "Next" if the first day of the displayed month is >= maxDate
        const firstOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        document.getElementById('next-month').disabled = (firstOfMonth >= maxDate);
    }

    // Call header rendering on initial load
    renderDaysOfWeekHeader();
    // Call key rendering on initial load
    renderCalendarKey();

    // Prefill calendar from URL if checkin/checkout are present, but defer until after first render
    let prefillState = null; // null | 'goto-checkin' | 'select-checkin' | 'goto-checkout' | 'select-checkout' | 'done'
    let prefillCheckinDate = null;
    let prefillCheckoutDate = null;
    let prefillStepCount = 0;
    const PREFILL_STEP_LIMIT = 24; // Max months to advance
    function getUrlParameter(name) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(name);
    }
    const urlCheckin = getUrlParameter('checkin');
    const urlCheckout = getUrlParameter('checkout');
    console.log('[guesty-booking-calendar] URL checkin:', urlCheckin, 'checkout:', urlCheckout);

    function getCurrentMonthYear() {
        // Expects format like 'June 2025'
        const text = $('#current-month').text();
        if (!text) return null;
        const [monthName, year] = text.split(' ');
        const month = new Date(Date.parse(monthName + ' 1, 2000')).getMonth();
        return { month, year: parseInt(year, 10) };
    }

    function getMonthYearFromDate(dateStr) {
        const d = new Date(dateStr);
        return { month: d.getMonth(), year: d.getFullYear() };
    }

    const originalRenderCalendar = renderCalendar;
    renderCalendar = function(data, date) {
        originalRenderCalendar(data, date);
        // Autofill state machine
        if (!urlCheckin || !urlCheckout) return;
        if (!prefillState) {
            prefillCheckinDate = urlCheckin;
            prefillCheckoutDate = urlCheckout;
            prefillStepCount = 0;
            prefillState = 'goto-checkin';
        }
        if (prefillState === 'goto-checkin') {
            const current = getCurrentMonthYear();
            const target = getMonthYearFromDate(prefillCheckinDate);
            if (!current) return;
            if (current.year === target.year && current.month === target.month) {
                prefillState = 'select-checkin';
                setTimeout(() => renderCalendar(data, date), 50);
                return;
            } else if (prefillStepCount < PREFILL_STEP_LIMIT) {
                prefillStepCount++;
                if (current.year > target.year || (current.year === target.year && current.month > target.month)) {
                    $('#prev-month').trigger('click');
                } else {
                    $('#next-month').trigger('click');
                }
                return;
            } else {
                prefillState = 'done';
                console.warn('[guesty-booking-calendar] Prefill: step limit reached for check-in month.');
                return;
            }
        }
        if (prefillState === 'select-checkin') {
            const checkinCell = $(`.calendar-cell[data-date="${prefillCheckinDate}"]`);
            if (checkinCell.length) {
                checkinCell.trigger('click');
                prefillState = 'goto-checkout';
                setTimeout(() => renderCalendar(data, date), 100);
                return;
            } else {
                prefillState = 'done';
                console.warn('[guesty-booking-calendar] Prefill: could not find check-in cell.');
                return;
            }
        }
        if (prefillState === 'goto-checkout') {
            const current = getCurrentMonthYear();
            const target = getMonthYearFromDate(prefillCheckoutDate);
            if (!current) return;
            if (current.year === target.year && current.month === target.month) {
                prefillState = 'select-checkout';
                setTimeout(() => renderCalendar(data, date), 50);
                return;
            } else if (prefillStepCount < PREFILL_STEP_LIMIT) {
                prefillStepCount++;
                if (current.year > target.year || (current.year === target.year && current.month > target.month)) {
                    $('#prev-month').trigger('click');
                } else {
                    $('#next-month').trigger('click');
                }
                return;
            } else {
                prefillState = 'done';
                console.warn('[guesty-booking-calendar] Prefill: step limit reached for checkout month.');
                return;
            }
        }
        if (prefillState === 'select-checkout') {
            const checkoutCell = $(`.calendar-cell[data-date="${prefillCheckoutDate}"]`);
            if (checkoutCell.length) {
                checkoutCell.trigger('click');
                prefillState = 'done';
                return;
            } else {
                prefillState = 'done';
                console.warn('[guesty-booking-calendar] Prefill: could not find checkout cell.');
                return;
            }
        }
    };
});