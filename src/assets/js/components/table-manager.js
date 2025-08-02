/**
 * Table Manager for Material MAP
 * Handles DataTable initialization and interactions
 */

import { escapeHtml, sanitizeUrl, formatDate } from '../utils/string-utils.js';
import notificationSystem from './notification-system.js';

/**
 * Table Manager
 */
class TableManager {
  constructor() {
    this.table = null;
    this.tableElement = null;
  }

  /**
   * Initialize the table
   * @param {Array} materials - The materials data
   * @returns {Object} The DataTable instance
   */
  initialize(materials) {
    this.tableElement = document.getElementById('materials-table');
    if (!this.tableElement) {
      throw new Error('Table element not found');
    }

    // Convert materials to table data
    const tableData = this.convertToTableFormat(materials);
    
    // Initialize DataTable
    try {
      // Check if required libraries are loaded
      if (typeof $ === 'undefined') {
        throw new Error('jQuery is not loaded');
      }
      if (typeof $.fn.DataTable === 'undefined') {
        throw new Error('DataTables library is not loaded');
      }

      this.table = $(this.tableElement).DataTable({
        data: tableData,
        columns: [
          { title: "Material Model" },
          { title: "EOS" },
          { title: "Applications" },
          { title: "Added" },
          { visible: false }, // Material data column
        ],
        order: [[3, "desc"]], // Sort by date added, newest first
        pageLength: 20,
        lengthMenu: [10, 20, 50, 100],
        language: {
          emptyTable: "No materials available",
          loadingRecords: "Loading materials...",
          processing: "Processing materials...",
          search: "Search materials:",
          zeroRecords: "No matching materials found",
          info: "Showing _START_ to _END_ of _TOTAL_ materials",
          infoEmpty: "Showing 0 to 0 of 0 materials",
          infoFiltered: "(filtered from _MAX_ total materials)",
          lengthMenu: "Show _MENU_ materials per page",
          paginate: {
            first: "First",
            last: "Last",
            next: "Next",
            previous: "Previous"
          }
        },
        responsive: true,
        dom: '<"top"lf>rt<"bottom"ip><"clear">',
        // Error handling for DataTable
        drawCallback: function(settings) {
          if (settings.json && settings.json.error) {
            console.error('DataTable error:', settings.json.error);
          }
        }
      });
      
      // Set up row click handler
      this.setupRowClickHandler();
      
      console.log('✅ DataTable initialized successfully');
      return this.table;
      
    } catch (error) {
      console.error('❌ Failed to initialize DataTable:', error);
      notificationSystem.error(`Failed to initialize table: ${error.message}`);
      throw error;
    }
  }

  /**
   * Convert materials to table format
   * @param {Array} materials - The materials data
   * @returns {Array} The table data
   */
  convertToTableFormat(materials) {
    const tableData = [];
    let invalidCount = 0;
    
    for (const item of materials) {
      try {
        // Extract material from the item structure
        const material = item.material || item;
        
        if (!material || typeof material !== "object") {
          invalidCount++;
          continue;
        }

        // Create markup for the first column with proper sanitization - only ID and MAT information
        let materialModelHTML = `<div>${escapeHtml(material.id || "-")}/${escapeHtml(material.mat || "-")}</div>`;
        if (material.mat_add) { materialModelHTML += `<div>${escapeHtml(material.mat_add)}</div>`; }
        if (material.mat_thermal) { materialModelHTML += `<div>${escapeHtml(material.mat_thermal)}</div>`; }
        
        // No category badges in Material Model column

        // Create applications HTML with proper handling for empty arrays
        const appArray = material.app || [];
        let applicationsHTML = "<ul>";
        if (appArray.length > 0) {
          applicationsHTML += appArray.map(app => `<li>${escapeHtml(app)}</li>`).join("");
        } else {
          applicationsHTML += "<li>-</li>";
        }
        applicationsHTML += "</ul>";

        // Format date with proper handling for empty values
        const formattedDate = material.add ? formatDate(material.add) : "N/A";

        // Return table rows with proper sanitization
        tableData.push([
          materialModelHTML,
          escapeHtml(material.eos || "-"),
          applicationsHTML,
          formattedDate,
          material, // Keep material data in hidden column
        ]);
      } catch (error) {
        console.warn("Error processing material:", error);
        invalidCount++;
      }
    }

    if (invalidCount > 0) {
      console.warn(`Skipped ${invalidCount} invalid materials`);
    }
    
    return tableData;
  }

  /**
   * Set up row click handler
   */
  setupRowClickHandler() {
    if (!this.table) return;
    
    $(this.tableElement).find('tbody').on("click", "tr", (event) => {
      try {
        const tr = $(event.currentTarget);
        const row = this.table.row(tr);
        const rowData = row.data();
        
        if (!rowData || rowData.length < 5) {
          console.warn("Invalid row data:", rowData);
          return;
        }
        
        const material = rowData[4]; // Material data is in column 4
        if (!material) {
          console.warn("No material data available for row:", rowData);
          return;
        }

        if (row.child.isShown()) {
          row.child.hide();
          tr.removeClass("shown");
        } else {
          const matDataHtml = material.mat_data
            ? this.createCodeBlock("*MAT", material.mat_data)
            : "";
          const eosDataHtml = material.eos_data
            ? this.createCodeBlock("*EOS", material.eos_data)
            : "";
          const matAddDataHtml = material.mat_add_data
            ? this.createCodeBlock("*MAT_ADD", material.mat_add_data)
            : "";
          const matThermalDataHtml = material.mat_thermal_data
            ? this.createCodeBlock("*MAT_THERMAL", material.mat_thermal_data)
            : "";
          const referenceHtml = material.ref
            ? `<div class="reference-block"><strong>Reference: </strong><a href="${sanitizeUrl(material.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(material.ref)}</a></div>`
            : `<div class="reference-block"><strong>Reference: </strong><a href="${sanitizeUrl(material.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(material.url)}</a></div>`;

          row.child(
            `${referenceHtml}${matDataHtml}${eosDataHtml}${matAddDataHtml}${matThermalDataHtml}`
          ).show();
          tr.addClass("shown");
        }
      } catch (error) {
        console.error("Error handling row click:", error);
      }
    });
  }

  /**
   * Create a code block with title and copy button
   * @param {string} title - The code block title
   * @param {string} content - The code block content
   * @returns {string} The HTML for the code block
   */
  createCodeBlock(title, content) {
    const escapedContent = escapeHtml(content);
    const escapedTitle = escapeHtml(title);
    return `
      <div class="code-container">
        <div class="code-header">
          <span class="code-title">${escapedTitle}</span>
          <button class="copy-button" onclick="copyToClipboard('${encodeURIComponent(content)}')">Copy</button>
        </div>
        <pre><code>${escapedContent}</code></pre>
      </div>`;
  }

  /**
   * Refresh the table with new data
   * @param {Array} materials - The new materials data
   */
  refresh(materials) {
    if (!this.table) {
      return this.initialize(materials);
    }
    
    // Clear existing data
    this.table.clear();
    
    // Add new data
    const tableData = this.convertToTableFormat(materials);
    this.table.rows.add(tableData);
    
    // Redraw the table
    this.table.draw();
    
    console.log('✅ Table refreshed with new data');
  }

  /**
   * Apply a filter to the table
   * @param {string} column - The column to filter
   * @param {string} value - The value to filter by
   */
  applyFilter(column, value) {
    if (!this.table) return;
    
    this.table.column(column).search(value).draw();
  }

  /**
   * Clear all filters
   */
  clearFilters() {
    if (!this.table) return;
    
    this.table.search('').columns().search('').draw();
  }

  /**
   * Get the current table state
   * @returns {Object} The current table state
   */
  getState() {
    if (!this.table) return null;
    
    return this.table.state();
  }

  /**
   * Set the table state
   * @param {Object} state - The state to set
   */
  setState(state) {
    if (!this.table) return;
    
    this.table.state.load(state);
    this.table.draw();
  }
}

// Create a singleton instance
const tableManager = new TableManager();

// For backward compatibility
window.tableManager = tableManager;

// Copy to clipboard function (for code blocks)
window.copyToClipboard = function(content) {
  const decodedContent = decodeURIComponent(content);
  navigator.clipboard
    .writeText(decodedContent)
    .then(() => {
      notificationSystem.success("Copied to clipboard!", 2000);
    })
    .catch((err) => {
      console.error("Copy failed:", err);
      notificationSystem.error("Failed to copy: " + err.message);
    });
};

export default tableManager;