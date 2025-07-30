// Universal base path calculator
function getBasePath() {
  const { origin, pathname, port } = window.location;

  // Check if the site is running via file:// protocol
  if (origin.startsWith("file://")) {
    const pathParts = pathname.split("/");
    pathParts.pop(); // Remove 'index.html' or the last segment
    return pathParts.join("/");
  }

  // Check if the site is running on localhost with a non-privileged port
  if (origin.includes("localhost") || origin.includes("127.0.0.1") || (port && parseInt(port) > 1024)) {
    return "./";
  }

  // For GitHub Pages deployment
  const repoName = pathname.split("/")[1];
  return repoName ? `/${repoName}` : "/";
}
const basePath = getBasePath();

// Theme management
function initializeTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeToggle(savedTheme);
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  updateThemeToggle(newTheme);
}

function updateThemeToggle(theme) {
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
    themeToggle.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
  }
}

// Enhanced loading state management with error tracking
let loadingState = {
  totalFiles: 0,
  processedFiles: 0,
  failedFiles: [],
  isOffline: false,
  lastError: null
};

function showEnhancedLoading() {
  const loadingContainer = document.getElementById("loading-container");
  const legacyLoading = document.getElementById("loading");
  const errorContainer = document.getElementById("error-container");
  
  // Reset loading state
  loadingState = {
    totalFiles: 0,
    processedFiles: 0,
    failedFiles: [],
    isOffline: !navigator.onLine,
    lastError: null
  };
  
  if (loadingContainer) {
    loadingContainer.style.display = "flex";
  } else {
    legacyLoading.style.display = "block";
  }
  
  if (errorContainer) {
    errorContainer.style.display = "none";
  }
}

function hideEnhancedLoading() {
  const loadingContainer = document.getElementById("loading-container");
  const legacyLoading = document.getElementById("loading");
  
  if (loadingContainer) {
    loadingContainer.style.display = "none";
  }
  legacyLoading.style.display = "none";
}

function updateLoadingProgress(current, total, details) {
  const progressFill = document.getElementById("progress-fill");
  const loadingDetails = document.getElementById("loading-details");
  
  if (progressFill) {
    const percentage = (current / total) * 100;
    progressFill.style.width = `${percentage}%`;
  }
  
  if (loadingDetails && details) {
    // Enhanced details with error information
    let detailsText = details;
    if (loadingState.failedFiles.length > 0) {
      detailsText += ` (${loadingState.failedFiles.length} files failed)`;
    }
    if (loadingState.isOffline) {
      detailsText += " [Offline Mode]";
    }
    loadingDetails.textContent = detailsText;
  }
}

function showEnhancedError(message, details, options = {}) {
  const errorContainer = document.getElementById("error-container");
  const errorDescription = document.getElementById("error-description");
  const legacyError = document.getElementById("error-message");
  
  hideEnhancedLoading();
  
  // Store error in loading state
  loadingState.lastError = { message, details, timestamp: new Date() };
  
  if (errorContainer && errorDescription) {
    let errorText = details || message;
    
    // Add contextual information
    if (loadingState.failedFiles.length > 0) {
      errorText += `\n\nFailed files (${loadingState.failedFiles.length}): ${loadingState.failedFiles.slice(0, 3).join(', ')}`;
      if (loadingState.failedFiles.length > 3) {
        errorText += ` and ${loadingState.failedFiles.length - 3} more...`;
      }
    }
    
    if (loadingState.processedFiles > 0) {
      errorText += `\n\nSuccessfully processed: ${loadingState.processedFiles} files`;
    }
    
    if (options.isNetworkError && !navigator.onLine) {
      errorText += "\n\nYou appear to be offline. Please check your internet connection.";
    }
    
    errorDescription.textContent = errorText;
    errorContainer.style.display = "flex";
  } else {
    legacyError.textContent = message;
    legacyError.classList.add("visible-error");
  }
}

// Network utilities
async function fetchWithRetry(url, options = {}, maxRetries = 3) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });
      
      if (response.ok) {
        return response;
      }
      
      // If it's a client error (4xx), don't retry
      if (response.status >= 400 && response.status < 500) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      // For server errors (5xx), retry
      lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
      
    } catch (error) {
      lastError = error;
      
      // Don't retry on timeout or network errors if offline
      if (error.name === 'AbortError' || !navigator.onLine) {
        break;
      }
    }
    
    // Wait before retry (exponential backoff)
    if (attempt < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
  
  throw lastError;
}

// YAML validation and parsing with error boundaries
function parseYAMLSafely(yamlText, fileName) {
  try {
    // Basic validation before parsing
    if (!yamlText || typeof yamlText !== 'string') {
      throw new Error('Invalid YAML content: empty or non-string input');
    }
    
    if (yamlText.trim().length === 0) {
      throw new Error('Invalid YAML content: empty file');
    }
    
    // Parse YAML with security options
    const parsed = jsyaml.load(yamlText, {
      schema: jsyaml.CORE_SCHEMA,
      json: false,
      filename: fileName
    });
    
    // Validate structure
    if (!Array.isArray(parsed)) {
      throw new Error('Invalid YAML structure: expected array of materials');
    }
    
    if (parsed.length === 0) {
      throw new Error('Invalid YAML content: empty materials array');
    }
    
    // Validate each material has required structure
    const validMaterials = [];
    for (let i = 0; i < parsed.length; i++) {
      const item = parsed[i];
      if (!item || typeof item !== 'object') {
        console.warn(`Skipping invalid material at index ${i} in ${fileName}`);
        continue;
      }
      
      // Check if item has material property or is a material itself
      const material = item.material || item;
      if (!material || typeof material !== 'object' || !material.id) {
        console.warn(`Skipping invalid material at index ${i} in ${fileName} - missing id`);
        continue;
      }
      
      validMaterials.push(item);
    }
    
    if (validMaterials.length === 0) {
      throw new Error('No valid materials found in file');
    }
    
    return validMaterials;
    
  } catch (error) {
    // Enhance error message with context
    const enhancedError = new Error(`YAML parsing failed in ${fileName}: ${error.message}`);
    enhancedError.originalError = error;
    enhancedError.fileName = fileName;
    throw enhancedError;
  }
}

// Load materials from specified files with enhanced error handling
async function loadMaterials() {
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

        // Create edit button HTML with unique material identifier
        const materialId = `material_${tableData.length}_${Date.now()}`;
        const editButtonHTML = `<button class="btn btn-edit btn-sm" 
                                        data-material-id="${materialId}"
                                        onclick="handleEditMaterial(this)" 
                                        title="Suggest edit for this material">
                                   ✏️ Edit
                                 </button>`;

        // Return table rows with proper sanitization
        tableData.push([
          materialModelHTML,
          escapeHtml(material.eos || "-"),
          `<ul>${(material.app || [])
            .map((app) => `<li>${escapeHtml(app)}</li>`)
            .join("")}</ul>`,
          formatDate(material.add),
          editButtonHTML,
          material, // Keep material data in hidden column
        ]);
      } catch (materialError) {
        console.warn("Error processing material:", materialError);
        invalidMaterials++;
      }
    }

    if (invalidMaterials > 0) {
      console.warn(`Skipped ${invalidMaterials} invalid materials`);
    }

    updateLoadingProgress(90, 100, "Initializing table...");
    
    // Initialize DataTable with error handling
    let table;
    try {
      // Check if required libraries are loaded
      if (typeof $ === 'undefined') {
        throw new Error('jQuery is not loaded');
      }
      if (typeof $.fn.DataTable === 'undefined') {
        throw new Error('DataTables library is not loaded');
      }

      table = $("#materials-table").DataTable({
        data: tableData,
        columns: [
          { title: "Material Model" },
          { title: "EOS" },
          { title: "Applications" },
          { title: "Added" },
          { title: "Actions", orderable: false, searchable: false },
          { visible: false }, // Material data column
        ],
        order: [[0, "asc"]],
        pageLength: 20,
        language: {
          emptyTable: "No materials available",
          loadingRecords: "Loading materials...",
          processing: "Processing materials...",
          search: "Search materials:",
          zeroRecords: "No matching materials found"
        },
        // Error handling for DataTable
        drawCallback: function(settings) {
          if (settings.json && settings.json.error) {
            console.error('DataTable error:', settings.json.error);
          }
        }
      });
      
      updateLoadingProgress(95, 100, "Setting up interactions...");

      // Handle row click events with error boundaries
      $("#materials-table tbody").on("click", "tr", function () {
        try {
          const tr = $(this);
          const row = table.row(tr);
          const rowData = row.data();
          
          if (!rowData || rowData.length < 6) {
            console.warn("Invalid row data:", rowData);
            return;
          }
          
          const material = rowData[5]; // Material data is now in column 5
          if (!material) {
            console.warn("No material data available for row:", rowData);
            return;
          }

          if (row.child.isShown()) {
            row.child.hide();
            tr.removeClass("shown");
          } else {
            const matDataHtml = material.mat_data
              ? createCodeBlock("*MAT", material.mat_data)
              : "";
            const eosDataHtml = material.eos_data
              ? createCodeBlock("*EOS", material.eos_data)
              : "";
            const matAddDataHtml = material.mat_add_data
              ? createCodeBlock("*MAT_ADD", material.mat_add_data)
              : "";
            const matThermalDataHtml = material.mat_thermal_data
              ? createCodeBlock("*MAT_THERMAL", material.mat_thermal_data)
              : "";
            const referenceHtml = material.ref
              ? `<div class="reference-block"><strong>Reference: </strong><a href="${sanitizeUrl(material.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(material.ref)}</a></div>`
              : `<div class="reference-block"><strong>Reference: </strong><a href="${sanitizeUrl(material.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(material.url)}</a></div>`;

            row.child(
              `${referenceHtml}${matDataHtml}${eosDataHtml}${matAddDataHtml}${matThermalDataHtml}`
            ).show();
            tr.addClass("shown");
          }
        } catch (rowError) {
          console.error("Error handling row click:", rowError);
        }
      });

    } catch (tableError) {
      console.error("DataTable initialization failed:", tableError);
      throw new Error(`Failed to initialize data table: ${tableError.message}`);
    }
    
    updateLoadingProgress(100, 100, "Complete!");

    // Log success with statistics
    const stats = {
      totalMaterials: allMaterials.length,
      validTableRows: tableData.length,
      processedFiles: loadingState.processedFiles,
      failedFiles: loadingState.failedFiles.length,
      invalidMaterials
    };
    console.log("Materials loading completed:", stats);
    
    // Show completion message with warnings if needed
    if (loadingState.failedFiles.length > 0 || invalidMaterials > 0) {
      setTimeout(() => {
        hideEnhancedLoading();
        // Could show a non-blocking notification about partial failures
      }, 1000);
    } else {
      setTimeout(() => {
        hideEnhancedLoading();
      }, 500);
    }
    
  } catch (error) {
    console.error("Error details:", error);
    const isNetworkError = !navigator.onLine || error.message.includes('Network Error');
    showEnhancedError("Unable to load material data", error.message, { isNetworkError });
  }
}

// Create a code block with title and copy button
function createCodeBlock(title, content) {
  const escapedContent = escapeHtml(content); // Escape HTML for safe display
  const escapedTitle = escapeHtml(title); // Escape title for safety
  return `
    <div class="code-container">
      <div class="code-header">
        <span class="code-title">${escapedTitle}</span>
        <button class="copy-button" onclick="copyToClipboard('${encodeURIComponent(content)}')">Copy</button>
      </div>
      <pre><code>${escapedContent}</code></pre>
    </div>`;
}

// Escape HTML special characters
function escapeHtml(unsafe) {
  if (typeof unsafe !== 'string') {
    return String(unsafe);
  }
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Validate and sanitize URLs
function sanitizeUrl(url) {
  if (!url || typeof url !== 'string') {
    return '#';
  }
  
  try {
    const urlObj = new URL(url);
    // Only allow http and https protocols
    if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
      return '#';
    }
    return escapeHtml(url);
  } catch (e) {
    // Invalid URL
    return '#';
  }
}

// Copy text to clipboard
function copyToClipboard(content) {
  const decodedContent = decodeURIComponent(content);
  navigator.clipboard
    .writeText(decodedContent)
    .then(() => {
      // Show a temporary notification instead of an alert
      const notification = document.createElement("div");
      notification.className = "copy-notification";
      notification.textContent = "Copied to clipboard!";
      document.body.appendChild(notification);
      
      // Remove the notification after a delay
      setTimeout(() => {
        notification.classList.add("fade-out");
        setTimeout(() => document.body.removeChild(notification), 500);
      }, 2000);
    })
    .catch((err) => {
      console.error("Copy failed:", err);
      alert("Failed to copy: " + err);
    });
}

// Format date in DD.MM.YYYY format
function formatDate(dateString) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

// Network status monitoring
function setupNetworkMonitoring() {
  // Monitor online/offline status
  window.addEventListener('online', () => {
    console.log('Network connection restored');
    loadingState.isOffline = false;
    
    // Show a brief notification
    showNetworkNotification('Connection restored', 'success');
    
    // If there was a previous error due to network issues, offer to retry
    if (loadingState.lastError && loadingState.lastError.message.includes('Network Error')) {
      setTimeout(() => {
        if (confirm('Network connection restored. Would you like to retry loading materials?')) {
          loadMaterials();
        }
      }, 1000);
    }
  });

  window.addEventListener('offline', () => {
    console.log('Network connection lost');
    loadingState.isOffline = true;
    showNetworkNotification('You are now offline', 'warning');
  });
}

// Show network status notifications
function showNetworkNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `network-notification ${type}`;
  notification.textContent = message;
  
  // Style the notification
  Object.assign(notification.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    padding: '12px 20px',
    borderRadius: '8px',
    color: 'white',
    fontWeight: '500',
    zIndex: '10000',
    opacity: '0',
    transform: 'translateY(-20px)',
    transition: 'all 0.3s ease'
  });
  
  // Set background color based on type
  const colors = {
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6'
  };
  notification.style.backgroundColor = colors[type] || colors.info;
  
  document.body.appendChild(notification);
  
  // Animate in
  setTimeout(() => {
    notification.style.opacity = '1';
    notification.style.transform = 'translateY(0)';
  }, 100);
  
  // Remove after delay
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateY(-20px)';
    setTimeout(() => {
      if (notification.parentNode) {
        document.body.removeChild(notification);
      }
    }, 300);
  }, 3000);
}

// Initialize Material Editor System
function initializeMaterialEditor() {
  try {
    // Check if all required classes are available
    console.log('Checking Material Editor components:');
    console.log('MaterialEditor:', typeof MaterialEditor);
    console.log('ChangeTracker:', typeof ChangeTracker);
    console.log('ValidationEngine:', typeof ValidationEngine);
    console.log('GitHubIntegration:', typeof GitHubIntegration);
    console.log('UIManager:', typeof UIManager);
    
    if (typeof MaterialEditor === 'undefined' || 
        typeof ChangeTracker === 'undefined' || 
        typeof ValidationEngine === 'undefined' || 
        typeof GitHubIntegration === 'undefined' || 
        typeof UIManager === 'undefined') {
      console.warn('Material Editor components not fully loaded. Edit functionality will be disabled.');
      return;
    }
    
    // Initialize the material editor
    materialEditor = new MaterialEditor();
    console.log('Material Editor system initialized successfully');
    
    // Add connection status indicator
    addConnectionStatusIndicator();
    
  } catch (error) {
    console.error('Failed to initialize Material Editor:', error);
    materialEditor = null;
  }
}

// Add connection status indicator to the page
function addConnectionStatusIndicator() {
  const statusIndicator = document.createElement('div');
  statusIndicator.className = 'connection-status';
  statusIndicator.id = 'connection-status';
  statusIndicator.textContent = navigator.onLine ? 'Online' : 'Offline';
  statusIndicator.classList.add(navigator.onLine ? 'online' : 'offline');
  
  document.body.appendChild(statusIndicator);
}

// Handle edit material button clicks
function handleEditMaterial(buttonElement) {
  try {
    if (!materialEditor) {
      console.warn('Material Editor not initialized');
      alert('Material editing is not available. Please refresh the page and try again.');
      return;
    }

    // Get the table and find the row containing this button
    const table = $('#materials-table').DataTable();
    const row = table.row($(buttonElement).closest('tr'));
    const rowData = row.data();
    
    if (!rowData || rowData.length < 6) {
      console.error('Invalid row data for edit:', rowData);
      alert('Unable to edit this material. Invalid data.');
      return;
    }

    const material = rowData[5]; // Material data is in column 5
    if (!material) {
      console.error('No material data found for edit');
      alert('Unable to edit this material. No material data found.');
      return;
    }

    // Extract filename and index (this would need to be enhanced based on actual data structure)
    const filename = extractFilenameFromMaterial(material);
    const materialIndex = extractMaterialIndexFromTable(row.index());
    
    // Start the edit session
    materialEditor.uiManager.startMaterialEdit(material, {
      filename: filename,
      index: materialIndex,
      rowIndex: row.index()
    });

  } catch (error) {
    console.error('Error starting material edit:', error);
    alert(`Failed to start editing: ${error.message}`);
  }
}

// Helper function to extract filename from material data
function extractFilenameFromMaterial(material) {
  // This is a placeholder - in a real implementation, you'd need to track
  // which file each material came from during the loading process
  // For now, we'll use a default filename
  return 'unknown.yaml';
}

// Helper function to extract material index
function extractMaterialIndexFromTable(rowIndex) {
  // This is a placeholder - in a real implementation, you'd need to track
  // the original index of each material within its file
  // For now, we'll use the row index as a fallback
  return rowIndex;
}

// Enhanced retry functionality
function setupRetryMechanism() {
  const retryButton = document.getElementById("retry-button");
  if (retryButton) {
    retryButton.addEventListener("click", () => {
      // Clear previous error state
      loadingState.lastError = null;
      loadingState.failedFiles = [];
      
      // Check network status before retry
      if (!navigator.onLine) {
        showNetworkNotification('Please check your internet connection', 'warning');
        return;
      }
      
      loadMaterials();
    });
  }
}

// Global material editor instance
let materialEditor = null;

// Load materials when the page opens
window.addEventListener("load", () => {
  // Initialize theme
  initializeTheme();
  
  // Set up theme toggle
  const themeToggle = document.getElementById("theme-toggle");
  if (themeToggle) {
    themeToggle.addEventListener("click", toggleTheme);
  }
  
  // Set up network monitoring
  setupNetworkMonitoring();
  
  // Set up enhanced retry mechanism
  setupRetryMechanism();
  
  // Initialize material editor system
  initializeMaterialEditor();
  
  // Load materials
  loadMaterials();

  // Change cursor appearance when hovering over table rows
  const tableElement = document.getElementById("materials-table");
  if (tableElement) {
    tableElement.addEventListener("mouseenter", (event) => {
      if (event.target && event.target.closest("tr")) {
        event.target.closest("tr").style.cursor = "pointer";
      }
    }, true);

    tableElement.addEventListener("mouseleave", (event) => {
      if (event.target && event.target.closest("tr")) {
        event.target.closest("tr").style.cursor = "default";
      }
    }, true);
  }
});
