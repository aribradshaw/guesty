// Debug: Verify script loads
console.log('[DEBUG] guesty-booking-calendar.js file loaded');

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
                return true;
            } catch (error) {
                console.error('Error inserting calendar header:', error);
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
    const quoteDiv = $('<div id="quote-details" style="margin-top: 20px;"></div>').insertAfter(calendarDiv);

    let currentDate = new Date(); // Start with the current date
    const listingDiv = $('#guesty-listing-id');
    const listingId = listingDiv.data('listing-id');
    console.log('[Guesty Calendar] listingDiv:', listingDiv.length, 'listingId:', listingId);

    let selectedStartDate = null;
    let selectedEndDate = null;

    if (!listingId) {
        calendarGrid.text('No listing ID found.');
        console.error('[Guesty Calendar] No listing ID found on the page.');
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
    }    // Render the calendar
    const renderCalendar = (data, date) => {
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
            let cellContent = day;

            // Add price for this day, if available
            let priceHtml = '';
            if (dayData && dayData.price) {
                priceHtml = `<div class="calendar-price">$${dayData.price}</div>`;
            }

            if (currentDate < new Date()) {
                cellClass += ' past'; // Disable past dates
            } else if (dayData) {
                if (dayData.status === 'booked') {
                    cellClass += ' booked';
                } else if (dayData.status === 'unavailable') {
                    cellClass += ' unavailable';
                } else if (dayData.status === 'available') {
                    cellClass += ' available';
                }
            } else {
                cellClass += ' unavailable'; // Default to unavailable if no data
            }

            // Render day number and price (if any)
            const cell = $(`<div class="${cellClass}" data-date="${formattedDate}">
                <div>${cellContent}</div>
                ${priceHtml}
            </div>`);
            calendarGrid.append(cell);

            // Add click event for available dates
            if (cellClass.includes('available')) {
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
            }

            const diffInDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
            if (diffInDays < 2) {
                alert('Minimum stay is 2 nights.');
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
    };

    // Highlight the selected date range
    const highlightDateRange = (startDate, endDate) => {
        $('.calendar-cell').each(function () {
            const cellDate = new Date($(this).data('date'));
            if (cellDate >= startDate && cellDate <= endDate) {
                $(this).addClass('selected-range');
            }
        });

        $(`.calendar-cell[data-date="${formatDate(startDate)}"]`).addClass('selected-start');
        $(`.calendar-cell[data-date="${formatDate(endDate)}"]`).addClass('selected-end');
    };

    // Reset the selection
    const resetSelection = () => {
        selectedStartDate = null;
        selectedEndDate = null;
        window.selectedStartDateDisplay = '';
        window.selectedEndDateDisplay = '';
        $('.calendar-cell').removeClass('selected-range selected-start selected-end');
        quoteDiv.empty();
    };

    // Request a quote from the WordPress proxy
    const requestQuote = (startDate, endDate) => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (start < minDate || end > maxDate) {
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

        // Send the POST request to the WordPress proxy
        $('#guesty-quote-spinner').show(); // Show spinner
        $('#guesty-payment-section').hide(); // Hide form while loading

        $.ajax({
            url: guestyAjax.ajax_url,
            method: 'POST',
            data: requestData,
            success: function(response) {
                $('#guesty-quote-spinner').hide(); // Hide spinner
                $('#guesty-payment-section').show(); // Show form
                if (response.success) {
                    displayQuoteDetails(response.data); // Pass full data
                    // Fire the event with the full data object
                    $(document).trigger('guesty_quote_ready', [response.data]);
                } else {
                    quoteDiv.html('<p>An error occurred while fetching the quote. Please try again.</p>');
                }
            },
            error: (xhr, status, error) => {
                $('#guesty-quote-spinner').hide(); // Hide spinner
                $('#guesty-payment-section').show(); // Show form
                quoteDiv.html('<p>An error occurred while fetching the quote. Please try again.</p>');
            },
        });
    };

    // Display the quote details
    const displayQuoteDetails = (quote) => {
        if (!quote || !quote.rates || !quote.rates.ratePlans) {
            quoteDiv.html('<p>No quote details available.</p>');
            return;
        }

        const ratePlan = quote.rates.ratePlans[0];
        const money = ratePlan.ratePlan.money;

        // Extract the required values
        const fareAccommodation = money.fareAccommodation; // fare accommodation
        const fareCleaning = money.fareCleaning; // Convert cents to dollars
        const totalFees = money.totalFees; // Convert cents to dollars
        const totalTaxes = money.totalTaxes; // Convert cents to dollars
        const baseFee = totalFees - fareCleaning; // Base fee (total fees minus cleaning fee)
        const hostPayout = money.hostPayout; // Host payout (already in dollars)

        // Format numbers with commas
        const formatCurrency = (value) => value.toLocaleString('en-US', { style: 'currency', currency: money.currency });

        // Add selected dates display
        const checkIn = window.selectedStartDateDisplay || '';
        const checkOut = window.selectedEndDateDisplay || '';

        // Display the breakdown and total
        quoteDiv.html(`
            <h3>Quote Details</h3>
            <div><strong>Check-in:</strong> ${checkIn} &nbsp; <strong>Check-out:</strong> ${checkOut}</div>
            <ul>
                <li><strong>Nightly Accommodation Cost:</strong> ${formatCurrency(fareAccommodation)}</li>
                <li><strong>HÓZHÓ Fee:</strong> ${formatCurrency(baseFee)}</li>
                <li><strong>Cleaning:</strong> ${formatCurrency(fareCleaning)}</li>
                <li><strong>Taxes:</strong> ${formatCurrency(totalTaxes)}</li>
            </ul>
            <p><strong>Total Cost:</strong> ${formatCurrency(hostPayout)}</p>
        `);

        $(document).trigger('guesty_quote_ready', [{
            total: hostPayout,
            quote: quote,
            checkIn,
            checkOut
        }]);
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
});