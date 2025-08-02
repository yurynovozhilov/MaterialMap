/**
 * Main entry point for Material MAP application
 * Initializes the application and handles theme switching
 */

import dataLoader from './services/data-loader.js';
import tableManager from './components/table-manager.js';
import loadingManager from './components/loading-manager.js';
import notificationSystem from './components/notification-system.js';

/**
 * Initialize theme based on user preference or system setting
 */
function initializeTheme() {
  const savedTheme = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  
  if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
    document.documentElement.setAttribute("data-theme", "dark");
    updateThemeToggleIcon("dark");
  } else {
    document.documentElement.setAttribute("data-theme", "light");
    updateThemeToggleIcon("light");
  }
}

/**
 * Toggle between light and dark themes
 */
function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute("data-theme");
  const newTheme = currentTheme === "dark" ? "light" : "dark";
  
  document.documentElement.setAttribute("data-theme", newTheme);
  localStorage.setItem("theme", newTheme);
  updateThemeToggleIcon(newTheme);
}

/**
 * Update the theme toggle icon based on current theme
 * @param {string} theme - The current theme
 */
function updateThemeToggleIcon(theme) {
  const themeToggle = document.getElementById("theme-toggle");
  if (themeToggle) {
    themeToggle.textContent = theme === "dark" ? "🌙" : "☀️";
    themeToggle.setAttribute("aria-label", theme === "dark" ? "Switch to light theme" : "Switch to dark theme");
  }
}

/**
 * Set up network monitoring
 */
function setupNetworkMonitoring() {
  window.addEventListener('online', () => {
    console.log('Network connection restored');
    notificationSystem.success('Connection restored', 3000);
  });

  window.addEventListener('offline', () => {
    console.log('Network connection lost');
    notificationSystem.warning('You are now offline', 3000);
  });
}

/**
 * Load materials and initialize the table
 */
async function loadMaterials() {
  try {
    // Set up retry callback
    loadingManager.setRetryCallback(() => {
      loadMaterials();
    });
    
    // Load materials data
    const data = await dataLoader.loadMaterials({
      progressive: true,
      useCache: true
    });
    
    // Initialize table with materials
    tableManager.initialize(data.materials);
    
    // Show success message
    if (data.metadata) {
      notificationSystem.success(`Loaded ${data.materials.length} materials`, 3000);
    }
    
  } catch (error) {
    console.error("Error loading materials:", error);
    notificationSystem.error(`Failed to load materials: ${error.message}`);
  }
}

/**
 * Initialize the application
 */
function initializeApp() {
  // Initialize theme
  initializeTheme();
  
  // Set up theme toggle
  const themeToggle = document.getElementById("theme-toggle");
  if (themeToggle) {
    themeToggle.addEventListener("click", toggleTheme);
  }
  
  // Set up network monitoring
  setupNetworkMonitoring();
  
  // Load materials
  loadMaterials();
  
  // Set up table row hover effect
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
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);

// Export functions for global access
window.loadMaterials = loadMaterials;
window.toggleTheme = toggleTheme;