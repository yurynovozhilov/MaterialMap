/**
 * Data Loader Integration
 * Provides backward compatibility while enabling enhanced data loading
 */

// Global configuration for data loading strategy
const DATA_LOADING_CONFIG = {
    strategy: 'enhanced', // 'enhanced' | 'legacy' | 'auto'
    progressive: true,
    useCache: true,
    enableServiceWorker: true
};

// Initialize enhanced data loader
let enhancedLoader = null;
let isEnhancedMode = false;

/**
 * Initialize data loading system
 */
function initializeDataLoader() {
    // Check if enhanced mode is available and enabled
    if (DATA_LOADING_CONFIG.strategy === 'enhanced' || DATA_LOADING_CONFIG.strategy === 'auto') {
        try {
            enhancedLoader = new EnhancedDataLoader();
            isEnhancedMode = true;
            console.log('✅ Enhanced data loader initialized');
            
            // Set up event listeners for enhanced features
            setupEnhancedEventListeners();
            
        } catch (error) {
            console.warn('⚠️ Enhanced data loader failed to initialize, falling back to legacy:', error.message);
            isEnhancedMode = false;
        }
    }
    
    if (!isEnhancedMode) {
        console.log('📋 Using legacy data loading');
    }
}

/**
 * Enhanced event listeners for progressive loading and updates
 */
function setupEnhancedEventListeners() {
    // Progressive loading events
    window.addEventListener('materialsProgressiveLoad', (event) => {
        const { phase, data } = event.detail;
        
        if (phase === 'index') {
            console.log('📊 Search index and categories loaded');
            // Could update UI with basic filtering options here
            updateLoadingProgress(30, 100, "Search index loaded, loading full data...");
        }
    });
    
    // Data update notifications
    window.addEventListener('materialsDataUpdate', (event) => {
        console.log('🔄 Data update detected:', event.detail);
        showUpdateNotification();
    });
    
    // Update available notifications
    window.addEventListener('materialsUpdateAvailable', () => {
        console.log('🆕 New data version available');
        showUpdateAvailableNotification();
    });
}

/**
 * Main materials loading function with enhanced/legacy fallback
 */
async function loadMaterials() {
    if (isEnhancedMode) {
        return await loadMaterialsEnhanced();
    } else {
        return await loadMaterialsLegacy();
    }
}

/**
 * Enhanced materials loading
 */
async function loadMaterialsEnhanced() {
    try {
        showEnhancedLoading();
        updateLoadingProgress(0, 100, "Initializing enhanced data loader...");
        
        const data = await enhancedLoader.loadMaterials({
            progressive: DATA_LOADING_CONFIG.progressive,
            useCache: DATA_LOADING_CONFIG.useCache
        });
        
        updateLoadingProgress(90, 100, "Processing materials data...");
        
        // Convert enhanced data format to legacy format for compatibility
        const tableData = convertEnhancedDataToTableFormat(data.materials);
        
        updateLoadingProgress(95, 100, "Initializing table...");
        
        // Initialize DataTable with enhanced data
        const table = initializeDataTable(tableData);
        
        updateLoadingProgress(100, 100, "Complete!");
        hideEnhancedLoading();
        
        // Show enhanced features notification
        showEnhancedFeaturesNotification(data.metadata);
        
        console.log(`✅ Enhanced loading completed: ${data.materials.length} materials loaded`);
        return table;
        
    } catch (error) {
        console.error('❌ Enhanced loading failed:', error);
        
        // Fallback to legacy loading
        console.log('🔄 Falling back to legacy loading...');
        isEnhancedMode = false;
        return await loadMaterialsLegacy();
    }
}

/**
 * Legacy materials loading (existing implementation)
 */
async function loadMaterialsLegacy() {
    try {
        // Show enhanced loading indicator
        showEnhancedLoading();
        updateLoadingProgress(0, 100, "Loading file list...");

        // Load file list with retry mechanism
        let fileListResponse;
        try {
            fileListResponse = await fetchWithRetry(`${basePath}/dist/file-list.json`);
        } catch (error) {
            const isNetworkError = !navigator.onLine || error.name === 'AbortError';
            throw new Error(`Failed to fetch file list: ${error.message}${isNetworkError ? ' (Network Error)' : ''}`);
        }

        const fileList = await fileListResponse.json();
        if (!Array.isArray(fileList) || fileList.length === 0) {
            throw new Error("File list is empty or not valid.");
        }

        // Initialize loading state
        loadingState.totalFiles = fileList.length;
        let allMaterials = [];
        updateLoadingProgress(10, 100, `Found ${fileList.length} files to process...`);

        // Process files with enhanced error handling
        for (let i = 0; i < fileList.length; i++) {
            const fileName = fileList[i];
            const progress = 10 + (i / fileList.length) * 80; // 10-90% for file processing
            updateLoadingProgress(progress, 100, `Processing ${fileName}...`);
            
            try {
                // Fetch file with retry mechanism
                const fileResponse = await fetchWithRetry(`${basePath}/data/${fileName}`);
                const yamlText = await fileResponse.text();

                // Parse YAML with enhanced error boundaries
                const materialsInFile = parseYAMLSafely(yamlText, fileName);
                
                allMaterials = allMaterials.concat(materialsInFile);
                loadingState.processedFiles++;
                
                console.log(`Successfully processed ${fileName}: ${materialsInFile.length} materials`);
                
            } catch (fileError) {
                // Track failed files with detailed error information
                const errorInfo = {
                    fileName,
                    error: fileError.message,
                    type: fileError.name || 'Unknown',
                    timestamp: new Date()
                };
                
                loadingState.failedFiles.push(fileName);
                console.error(`Error processing file ${fileName}:`, fileError);
                
                // Continue processing other files - don't fail completely
                continue;
            }
        }

        // Handle partial success scenario
        if (allMaterials.length === 0) {
            const errorMsg = loadingState.failedFiles.length > 0 
                ? `All ${loadingState.failedFiles.length} files failed to load`
                : "No materials were successfully loaded";
            throw new Error(errorMsg);
        }

        // Show warning for partial failures
        if (loadingState.failedFiles.length > 0) {
            console.warn(`Partial success: ${loadingState.processedFiles} files loaded, ${loadingState.failedFiles.length} files failed`);
            updateLoadingProgress(85, 100, `Loaded ${allMaterials.length} materials with ${loadingState.failedFiles.length} file errors`);
        }

        // Prepare table data with error handling
        const tableData = convertLegacyDataToTableFormat(allMaterials);

        updateLoadingProgress(90, 100, "Initializing table...");
        
        // Initialize DataTable
        const table = initializeDataTable(tableData);
        
        updateLoadingProgress(100, 100, "Complete!");
        hideEnhancedLoading();
        
        console.log(`✅ Legacy loading completed: ${allMaterials.length} materials loaded`);
        return table;
        
    } catch (error) {
        console.error('❌ Legacy loading failed:', error);
        showEnhancedError(
            "Failed to load materials database",
            error.message,
            { isNetworkError: !navigator.onLine }
        );
        throw error;
    }
}

/**
 * Convert enhanced data format to table format
 */
function convertEnhancedDataToTableFormat(materials) {
    const tableData = [];
    
    for (const material of materials) {
        try {
            // Create markup for the first column with proper sanitization
            let materialModelHTML = `<div>${escapeHtml(material.id || "-")}/${escapeHtml(material.mat || "-")}</div>`;
            if (material.mat_add) { 
                materialModelHTML += `<div>${escapeHtml(material.mat_add)}</div>`; 
            }
            if (material.mat_thermal) { 
                materialModelHTML += `<div>${escapeHtml(material.mat_thermal)}</div>`; 
            }

            // Enhanced data includes category and tags
            const categoryBadge = material.metadata?.category ? 
                `<span class="category-badge category-${material.metadata.category}">${material.metadata.category}</span>` : '';

            // Return table rows with proper sanitization
            tableData.push([
                materialModelHTML + categoryBadge,
                escapeHtml(material.eos || "-"),
                `<ul>${(material.app || [])
                    .map((app) => `<li>${escapeHtml(app)}</li>`)
                    .join("")}</ul>`,
                formatDate(material.add),
                material, // Keep material data in hidden column
            ]);
        } catch (materialError) {
            console.warn("Error processing enhanced material:", materialError);
        }
    }
    
    return tableData;
}

/**
 * Convert legacy data format to table format
 */
function convertLegacyDataToTableFormat(allMaterials) {
    const tableData = [];
    let invalidMaterials = 0;
    
    for (const item of allMaterials) {
        try {
            // Extract material from the item structure
            const material = item.material || item;
            
            if (!material || typeof material !== "object") {
                invalidMaterials++;
                continue;
            }

            // Create markup for the first column with proper sanitization
            let materialModelHTML = `<div>${escapeHtml(material.id || "-")}/${escapeHtml(material.mat || "-")}</div>`;
            if (material.mat_add) { materialModelHTML += `<div>${escapeHtml(material.mat_add)}</div>`; }
            if (material.mat_thermal) { materialModelHTML += `<div>${escapeHtml(material.mat_thermal)}</div>`; }

            // Return table rows with proper sanitization
            tableData.push([
                materialModelHTML,
                escapeHtml(material.eos || "-"),
                `<ul>${(material.app || [])
                    .map((app) => `<li>${escapeHtml(app)}</li>`)
                    .join("")}</ul>`,
                formatDate(material.add),
                material, // Keep material data in hidden column
            ]);
        } catch (materialError) {
            console.warn("Error processing legacy material:", materialError);
            invalidMaterials++;
        }
    }

    if (invalidMaterials > 0) {
        console.warn(`Skipped ${invalidMaterials} invalid materials`);
    }
    
    return tableData;
}

/**
 * Initialize DataTable with enhanced features
 */
function initializeDataTable(tableData) {
    // Check if required libraries are loaded
    if (typeof $ === 'undefined') {
        throw new Error('jQuery is not loaded');
    }
    if (typeof $.fn.DataTable === 'undefined') {
        throw new Error('DataTables library is not loaded');
    }

    const table = $("#materials-table").DataTable({
        data: tableData,
        columns: [
            { title: "Material Model" },
            { title: "EOS" },
            { title: "Applications" },
            { title: "Added" },
            { title: "Actions" },
            { title: "Data", visible: false }, // Hidden column for material data
        ],
        pageLength: 25,
        lengthMenu: [10, 25, 50, 100],
        order: [[3, "desc"]], // Sort by "Added" column descending
        responsive: true,
        language: {
            search: "Search materials:",
            lengthMenu: "Show _MENU_ materials per page",
            info: "Showing _START_ to _END_ of _TOTAL_ materials",
            infoEmpty: "No materials found",
            infoFiltered: "(filtered from _MAX_ total materials)",
            zeroRecords: "No materials match your search criteria",
            emptyTable: "No materials available in database"
        },
        dom: '<"top"lf>rt<"bottom"ip><"clear">',
        initComplete: function() {
            console.log('✅ DataTable initialized successfully');
            
            // Add enhanced search features if in enhanced mode
            if (isEnhancedMode) {
                addEnhancedSearchFeatures(this);
            }
        }
    });

    return table;
}

/**
 * Add enhanced search features for enhanced mode
 */
function addEnhancedSearchFeatures(table) {
    // Add category filter dropdown
    const categories = enhancedLoader?.cache.get('materials')?.categories?.categories || [];
    
    if (categories.length > 0) {
        const filterHtml = `
            <div class="enhanced-filters">
                <select id="category-filter" class="form-control">
                    <option value="">All Categories</option>
                    ${categories.map(cat => `<option value="${cat.name}">${cat.name} (${cat.count})</option>`).join('')}
                </select>
            </div>
        `;
        
        $('.top').append(filterHtml);
        
        $('#category-filter').on('change', function() {
            const selectedCategory = this.value;
            // Implement category filtering logic
            console.log('Category filter changed:', selectedCategory);
        });
    }
}

/**
 * Notification functions
 */
function showEnhancedFeaturesNotification(metadata) {
    if (!metadata) return;
    
    const notification = `
        <div class="enhanced-notification">
            ✨ Enhanced features active! 
            Loaded ${metadata.totalMaterials} materials with smart caching and offline support.
        </div>
    `;
    
    // Show notification temporarily
    const notificationEl = document.createElement('div');
    notificationEl.innerHTML = notification;
    notificationEl.style.cssText = `
        position: fixed; top: 20px; right: 20px; z-index: 1000;
        background: #4CAF50; color: white; padding: 12px 20px;
        border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(notificationEl);
    
    setTimeout(() => {
        notificationEl.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => notificationEl.remove(), 300);
    }, 3000);
}

function showUpdateNotification() {
    console.log('🔄 Showing update notification');
    // Implement update notification UI
}

function showUpdateAvailableNotification() {
    console.log('🆕 Showing update available notification');
    // Implement update available notification UI
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    initializeDataLoader();
});

// Export functions for global access
window.loadMaterials = loadMaterials;
window.initializeDataLoader = initializeDataLoader;