// guesty-menu.js
jQuery(function($) {
    let allProperties = [];
    let filteredProperties = [];
    let currentFilters = {
        bedrooms: '',
        accommodates: '',
        bathrooms: '',
        beds: ''
    };
    // Initialize the menu
    $(document).ready(function() {
        setupEventHandlers();
        
        // Load properties immediately to populate dropdowns and display
        loadAllProperties();
    });

    function loadAllProperties() {
        // Show loading state
        $('#properties-list').html('<div class="loading">Loading properties...</div>');
        
        $.post(guestyMenuAjax.ajax_url, {
            action: 'guesty_menu_properties',
            bedrooms: '',
            accommodates: '',
            bathrooms: '',
            beds: ''
        }, function(response) {
            console.log('AJAX response received:', response);
            if (response.success && response.data.properties) {
                allProperties = response.data.properties;
                filteredProperties = [...allProperties]; // Create a copy for filtering
                
                // Initially populate all dropdowns with all available options
                populateBedroomOptionsFromData(allProperties);
                populateAccommodatesOptionsFromData(allProperties);
                populateBathroomOptionsFromData(allProperties);
                populateBedsOptionsFromData(allProperties);
                
                // Update filter descriptions with counts when they're empty
                updateFilterDescriptions(allProperties);
                
                // Display all properties immediately
                displayProperties(sortPropertiesByBedroomsDesc(allProperties));
                
                console.log('Properties loaded successfully:', allProperties.length);
            } else {
                console.error('Failed to load properties:', response.data);
                $('#properties-list').html('<div class="no-properties">No properties available</div>');
            }
        }).fail(function(xhr, status, error) {
            console.error('AJAX request failed:', error);
            $('#properties-list').html('<div class="no-properties">Error loading properties</div>');
        });
    }

    function repopulateDropdownsFromFiltered(filteredProperties) {
        // Store current selections before repopulating
        const currentBedrooms = $('#bedrooms-filter').val();
        const currentAccommodates = $('#accommodates-filter').val();
        const currentBathrooms = $('#bathrooms-filter').val();
        const currentBeds = $('#beds-filter').val();
        
        // Repopulate each dropdown based on filtered properties
        populateBedroomOptionsFromData(filteredProperties);
        populateAccommodatesOptionsFromData(filteredProperties);
        populateBathroomOptionsFromData(filteredProperties);
        populateBedsOptionsFromData(filteredProperties);
        
        // Restore selections if they still exist in the new options
        if (currentBedrooms && $('#bedrooms-filter option[value="' + currentBedrooms + '"]').length > 0) {
            $('#bedrooms-filter').val(currentBedrooms);
        }
        if (currentAccommodates && $('#accommodates-filter option[value="' + currentAccommodates + '"]').length > 0) {
            $('#accommodates-filter').val(currentAccommodates);
        }
        if (currentBathrooms && $('#bathrooms-filter option[value="' + currentBathrooms + '"]').length > 0) {
            $('#bathrooms-filter').val(currentBathrooms);
        }
        if (currentBeds && $('#beds-filter option[value="' + currentBeds + '"]').length > 0) {
            $('#beds-filter').val(currentBeds);
        }
    }

    function populateBedroomOptionsFromData(properties) {
        const bedroomSelect = $('#bedrooms-filter');
        const availableBedrooms = new Set();
        
        // Collect all available bedroom counts from filtered properties
        if (Array.isArray(properties)) {
            properties.forEach(function(property) {
                if (property.bedrooms) {
                    availableBedrooms.add(property.bedrooms);
                }
            });
        }
        
        // Clear existing options except "All Bedrooms"
        bedroomSelect.find('option:not(:first)').remove();
        
        // Add available bedroom options
        const sortedBedrooms = Array.from(availableBedrooms).sort((a, b) => a - b);
        sortedBedrooms.forEach(function(bedroomCount) {
            bedroomSelect.append(`<option value="${bedroomCount}">${bedroomCount} Bedrooms</option>`);
        });
    }

    function populateAccommodatesOptionsFromData(properties) {
        const accommodatesSelect = $('#accommodates-filter');
        const availableAccommodates = new Set();
        
        // Collect all available accommodates counts from filtered properties
        if (Array.isArray(properties)) {
            properties.forEach(function(property) {
                if (property.accommodates) {
                    availableAccommodates.add(property.accommodates);
                }
            });
        }
        
        // Clear existing options except "All Sizes"
        accommodatesSelect.find('option:not(:first)').remove();
        
        // Add available accommodates options
        const sortedAccommodates = Array.from(availableAccommodates).sort((a, b) => a - b);
        sortedAccommodates.forEach(function(accommodatesCount) {
            accommodatesSelect.append(`<option value="${accommodatesCount}">${accommodatesCount} Guests</option>`);
        });
    }

    function populateBathroomOptionsFromData(properties) {
        const bathroomSelect = $('#bathrooms-filter');
        const availableBathrooms = new Set();
        
        // Collect all available bathroom counts from filtered properties
        if (Array.isArray(properties)) {
            properties.forEach(function(property) {
                if (property.bathrooms) {
                    availableBathrooms.add(property.bathrooms);
                }
            });
        }
        
        // Clear existing options except "All Bathrooms"
        bathroomSelect.find('option:not(:first)').remove();
        
        // Add available bathroom options
        const sortedBathrooms = Array.from(availableBathrooms).sort((a, b) => a - b);
        sortedBathrooms.forEach(function(bathroomCount) {
            bathroomSelect.append(`<option value="${bathroomCount}">${bathroomCount} Bathrooms</option>`);
        });
    }

    function populateBedsOptionsFromData(properties) {
        const bedsSelect = $('#beds-filter');
        const availableBeds = new Set();
        
        // Collect all available beds counts from filtered properties
        if (Array.isArray(properties)) {
            properties.forEach(function(property) {
                if (property.beds) {
                    availableBeds.add(property.beds);
                }
            });
        }
        
        // Clear existing options except "All Beds"
        bedsSelect.find('option:not(:first)').remove();
        
        // Add available beds options
        const sortedBeds = Array.from(availableBeds).sort((a, b) => a - b);
        sortedBeds.forEach(function(bedsCount) {
            bedsSelect.append(`<option value="${bedsCount}">${bedsCount} Beds</option>`);
        });
    }

    
    function updateFilterDescriptions(properties) {
        // Update dropdown labels with counts
        const propCount = properties.length;
        
        if (propCount > 0) {
            $('#bedrooms-filter').find('option:first').text(`All Bedrooms (${propCount})`);
        }
    }

    function setupEventHandlers() {
        // Filter change handlers
        $('#bedrooms-filter, #accommodates-filter, #bathrooms-filter, #beds-filter').on('change', function() {
            applyFilters();
        });
    }

    function applyFilters() {
        currentFilters = {
            bedrooms: $('#bedrooms-filter').val(),
            accommodates: $('#accommodates-filter').val(),
            bathrooms: $('#bathrooms-filter').val(),
            beds: $('#beds-filter').val()
        };

        // Filter properties locally based on current selections
        filteredProperties = filterPropertiesLocally(allProperties, currentFilters);
        
        // Display filtered properties
        displayProperties(sortPropertiesByBedroomsDesc(filteredProperties));
        updatePropertyCount();
        
        // Repopulate dropdowns based on filtered results
        repopulateDropdownsFromFiltered(filteredProperties);
    }

    function filterPropertiesLocally(properties, filters) {
        return properties.filter(function(property) {
            // Check bedrooms filter
            if (filters.bedrooms && property.bedrooms != filters.bedrooms) {
                return false;
            }
            
            // Check accommodates filter
            if (filters.accommodates && property.accommodates != filters.accommodates) {
                return false;
            }
            
            // Check bathrooms filter
            if (filters.bathrooms && property.bathrooms != filters.bathrooms) {
                return false;
            }
            
            // Check beds filter
            if (filters.beds && property.beds != filters.beds) {
                return false;
            }
            
            return true;
        });
    }


    function displayProperties(properties) {
        const propertiesList = $('#properties-list');
        
        if (properties.length === 0) {
            propertiesList.html('<div class="no-properties">No properties available</div>');
        } else {
            let html = '';
            properties.forEach(function(property) {
                html += generatePropertyCard(property);
            });
            propertiesList.html(html);
        }
    }

    function sortPropertiesByBedroomsDesc(properties) {
        if (!Array.isArray(properties)) {
            return [];
        }
        return [...properties].sort((a, b) => {
            const aBedrooms = parseFloat(a?.bedrooms) || 0;
            const bBedrooms = parseFloat(b?.bedrooms) || 0;
            return bBedrooms - aBedrooms;
        });
    }

    function generatePropertyCard(property) {
        const title = property.mapped_page && property.mapped_page.title ? 
            property.mapped_page.title : (property.title || property.name);
        const link = property.mapped_page && property.mapped_page.url ? 
            property.mapped_page.url : null;
        const image = property.main_image || '';
        
        let html = '<div class="property-card">';
        
        if (image) {
            if (link) {
                html += `<div class="property-image"><a href="${link}"><img src="${image}" alt="${title}" /></a></div>`;
            } else {
                html += `<div class="property-image"><img src="${image}" alt="${title}" /></div>`;
            }
        }
        
        html += '<div class="property-info">';
        
        if (link) {
            html += `<h5><a href="${link}">${title}</a></h5>`;
        } else {
            html += `<h5>${title}</h5>`;
        }
        
        html += '<div class="property-amenities">';
        
        // Construct the proper plugin URL
        let pluginUrl = guestyMenuAjax.plugin_url;
        if (typeof pluginUrl === 'undefined') {
            console.error('[guesty-menu] guestyMenuAjax.plugin_url is undefined!');
            pluginUrl = '';
        }
        if (!pluginUrl.includes('MannaPress')) {
            pluginUrl = pluginUrl.endsWith('/') ? pluginUrl + 'MannaPress%20Guesty/' : pluginUrl + '/MannaPress%20Guesty/';
        } else {
            pluginUrl = pluginUrl.endsWith('/') ? pluginUrl : pluginUrl + '/';
        }
        
        html += `<span class="amenity"><img src="${pluginUrl}svg/bed.svg" class="icon" alt="Bedrooms" title="Number of bedrooms"> ${property.bedrooms || '-'}</span>`;
        html += `<span class="amenity"><img src="${pluginUrl}svg/bathroom.svg" class="icon" alt="Bathrooms" title="Number of bathrooms"> ${property.bathrooms || '-'}</span>`;
        html += `<span class="amenity"><img src="${pluginUrl}svg/accomodates.svg" class="icon" alt="Max Guests" title="Maximum number of guests"> ${property.accommodates || '-'}</span>`;
        
        html += '</div>';
        
        if (property.address && property.address.formatted) {
            html += `<div class="property-address">${property.address.formatted}</div>`;
        }
        
        html += '</div>';
        html += '</div>';
        
        return html;
    }

    function updatePropertyCount() {
        let totalCount = 0;
        Object.values(allProperties).forEach(function(propertyList) {
            totalCount += propertyList.length;
        });
        
        // Property count is now handled in the display logic
        // No need for a separate count display
    }
});
