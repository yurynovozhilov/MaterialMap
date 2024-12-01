// Универсальный вичислитель базового пути
function getBasePath() {
  const { origin, pathname, port } = window.location;

  // Проверяем, запущен ли сайт через file://
  if (origin.startsWith("file://")) {
    const pathParts = pathname.split("/");
    pathParts.pop(); // Убираем 'index.html' или последний сегмент
    return pathParts.join("/");
  }

  // Проверяем, запущен ли сайт на localhost с непривилегированным портом
  if (origin.includes("localhost") || origin.includes("127.0.0.1") || (port && parseInt(port) > 1024)) {
    return "./";
  }

  // Для GitHub Pages
  const repoName = pathname.split("/")[1];
  return repoName ? `/${repoName}` : "/";
}
const basePath = getBasePath();
// Загружаем материалы из указанных файлов
async function loadMaterials() {
  try {
    document.getElementById("loading").style.display = "block";

    // Загружаем список файлов
    const fileListResponse = await fetch(`${basePath}/dist/file-list.json`);
    if (!fileListResponse.ok) {
      throw new Error(`Failed to fetch file list. Status: ${fileListResponse.status} ${fileListResponse.statusText}`);
    }

    const fileList = await fileListResponse.json();
    if (!Array.isArray(fileList) || fileList.length === 0) {
      throw new Error("File list is empty or not valid.");
    }

    let allMaterials = [];

    // Последовательно загружаем файлы из списка
    for (const fileName of fileList) {
      try {
        const fileResponse = await fetch(`${basePath}/data/${fileName}`);
        if (!fileResponse.ok) {
          console.warn(`Failed to fetch file ${fileName}. Status: ${fileResponse.status}`);
          continue;
        }

        const yamlText = await fileResponse.text();

        // Парсим YAML
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

    // Формируем данные таблицы
    const tableData = allMaterials.map(({ material }) => {
      if (!material || typeof material !== "object") {
        console.warn("Invalid material format", material);
        return ["Invalid data", "-", "-", "-", null];
      }

      // Формируем разметку для первой колонки
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
  } 
  catch (error) 
  {
    document.getElementById("error-message").textContent = `An error occurred: ${error.message}`;
    console.error("Error details:", error);
  } 
  finally 
  {
    document.getElementById("loading").style.display = "none";
  }
}

// Создание блока кода с заголовком и кнопкой копирования
function createCodeBlock(title, content) {
  const escapedContent = escapeHtml(content); // Экранируем HTML для безопасного отображения
  return `
    <div class="code-container">
      <div class="code-header">
        <span class="code-title">${title}</span>
        <button class="copy-button" onclick="copyToClipboard('${encodeURIComponent(content)}')">Copy</button>
      </div>
      <pre><code>${escapedContent}</code></pre>
    </div>`;
}

// Экранирование HTML
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Копирование текста в буфер обмена
function copyToClipboard(content) {
  const decodedContent = decodeURIComponent(content);
  navigator.clipboard
    .writeText(decodedContent)
    .then(() => alert("Copied to clipboard!"))
    .catch((err) => alert("Failed to copy: " + err));
}

// Форматирование даты в формате DD.MM.YYYY
function formatDate(dateString) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

// Загрузка материалов при открытии страницы
window.addEventListener("load", () => {
  loadMaterials();

  // Меняем вид курсора при наведении на строки таблицы
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
