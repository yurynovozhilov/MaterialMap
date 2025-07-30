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

// Enhanced loading state management
function showEnhancedLoading() {
  const loadingContainer = document.getElementById("loading-container");
  const legacyLoading = document.getElementById("loading");
  const errorContainer = document.getElementById("error-container");
  
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
    loadingDetails.textContent = details;
  }
}

function showEnhancedError(message, details) {
  const errorContainer = document.getElementById("error-container");
  const errorDescription = document.getElementById("error-description");
  const legacyError = document.getElementById("error-message");
  
  hideEnhancedLoading();
  
  if (errorContainer && errorDescription) {
    errorDescription.textContent = details || message;
    errorContainer.style.display = "flex";
  } else {
    legacyError.textContent = message;
    legacyError.classList.add("visible-error");
  }
}

// Load materials from specified files
async function loadMaterials() {
  try {
    // Show enhanced loading indicator
    showEnhancedLoading();
    updateLoadingProgress(0, 100, "Loading file list...");

    // Load file list
    const fileListResponse = await fetch(`${basePath}/dist/file-list.json`);
    if (!fileListResponse.ok) {
      throw new Error(`Failed to fetch file list. Status: ${fileListResponse.status} ${fileListResponse.statusText}`);
    }

    const fileList = await fileListResponse.json();
    if (!Array.isArray(fileList) || fileList.length === 0) {
      throw new Error("File list is empty or not valid.");
    }

    let allMaterials = [];
    updateLoadingProgress(10, 100, `Found ${fileList.length} files to process...`);

    // Sequentially load files from the list
    for (let i = 0; i < fileList.length; i++) {
      const fileName = fileList[i];
      const progress = 10 + (i / fileList.length) * 80; // 10-90% for file processing
      updateLoadingProgress(progress, 100, `Processing ${fileName}...`);
      
      try {
        const fileResponse = await fetch(`${basePath}/data/${fileName}`);
        if (!fileResponse.ok) {
          console.warn(`Failed to fetch file ${fileName}. Status: ${fileResponse.status}`);
          continue;
        }

        const yamlText = await fileResponse.text();

        // Parse YAML
        let materialsInFile;
        try {
          materialsInFile = jsyaml.load(yamlText);
        } catch (yamlError) {
          console.warn(`YAML parsing error in file ${fileName}: ${yamlError.message}`);
          continue;
        }

        if (Array.isArray(materialsInFile)) {
          allMaterials = allMaterials.concat(materialsInFile);
        } else {
          console.warn(`File ${fileName} does not contain a valid array of materials.`);
        }
      } catch (fileError) {
        console.error(`Error processing file ${fileName}:`, fileError);
      }
    }

    if (allMaterials.length === 0) {
      throw new Error("No materials were successfully loaded.");
    }

    // Prepare table data
    const tableData = allMaterials.map(({ material }) => {
      if (!material || typeof material !== "object") {
        console.warn("Invalid material format", material);
        return ["Invalid data", "-", "-", "-", null];
      }

      // Create markup for the first column
      let materialModelHTML = `<div>${material.id || "-"}/${material.mat || "-"}</div>`;
      if (material.mat_add)     {materialModelHTML += `<div>${material.mat_add}</div>`}
      if (material.mat_thermal) {materialModelHTML += `<div>${material.mat_thermal}</div>`}

      // Возвращаем строки таблицы
      return [
        materialModelHTML,
        material.eos || "-",
        `<ul>${(material.app || [])
          .map((app) => `<li>${app}</li>`)
          .join("")}</ul>`,
        formatDate(material.add),
        material,
      ];
    });

    updateLoadingProgress(90, 100, "Initializing table...");
    
    // Инициализация DataTable
    const table = $("#materials-table").DataTable({
      data: tableData,
      columns: [
        { title: "Material Model" },
        { title: "EOS" },
        { title: "Applications" },
        { title: "Added" },
        { visible: false },
      ],
      order: [[0, "asc"]], // Сортировка по первой колонке (индекс 0) в порядке возрастания (asc)
      pageLength: 20,
    });
    
    updateLoadingProgress(100, 100, "Complete!");

    // Обработка кликов для разворачивания строк
    $("#materials-table tbody").on("click", "tr", function () 
    {
      const tr = $(this);
      const row = table.row(tr);
      const material = row.data()[4];

      if (!material) 
      {
        console.warn("No material data available for row:", row.data());
        return;
      }

      if (row.child.isShown()) 
      {
        row.child.hide();
        tr.removeClass("shown");
      } 

      else 
      {      
        const matDataHtml = material.mat_data
          ? createCodeBlock("*MAT", material.mat_data)
          : ""; // Если mat_data нет, блок не создается
        const eosDataHtml = material.eos_data
          ? createCodeBlock("*EOS", material.eos_data)
          : ""; // Если eos_data нет, блок не создается
        const matAddDataHtml = material.mat_add_data
          ? createCodeBlock("*MAT_ADD", material.mat_add_data)
          : ""; // Если mat_add_data нет, блок не создается
        const matThermalDataHtml = material.mat_thermal_data
          ? createCodeBlock("*MAT_THERMAL", material.mat_thermal_data)
          : ""; // Если mat_thermal_data нет, блок не создается
        const referenceHtml = material.ref
          ? `<div class="reference-block"><strong>Reference: </strong><a href="${material.url}" target="_blank">${material.ref}</a></div>`
          :  `<div class="reference-block"><strong>Reference: </strong><a href="${material.url}" target="_blank">${material.url}</a></div>`;

        row.child(
          `${referenceHtml}${matDataHtml}${eosDataHtml}${matAddDataHtml}${matThermalDataHtml}`
        ).show();
        tr.addClass("shown");
      }
    });

    console.log("Materials successfully loaded:", allMaterials);
    
    // Hide loading after a brief delay to show completion
    setTimeout(() => {
      hideEnhancedLoading();
    }, 500);
  } 
  catch (error) 
  {
    console.error("Error details:", error);
    showEnhancedError("Unable to load material data", error.message);
  }
}

// Create a code block with title and copy button
function createCodeBlock(title, content) {
  const escapedContent = escapeHtml(content); // Escape HTML for safe display
  return `
    <div class="code-container">
      <div class="code-header">
        <span class="code-title">${title}</span>
        <button class="copy-button" onclick="copyToClipboard('${encodeURIComponent(content)}')">Copy</button>
      </div>
      <pre><code>${escapedContent}</code></pre>
    </div>`;
}

// Escape HTML special characters
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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

// Load materials when the page opens
window.addEventListener("load", () => {
  // Initialize theme
  initializeTheme();
  
  // Set up theme toggle
  const themeToggle = document.getElementById("theme-toggle");
  if (themeToggle) {
    themeToggle.addEventListener("click", toggleTheme);
  }
  
  // Set up retry button
  const retryButton = document.getElementById("retry-button");
  if (retryButton) {
    retryButton.addEventListener("click", () => {
      loadMaterials();
    });
  }
  
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
