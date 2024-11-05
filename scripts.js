/**
 * Форматирует дату в формат DD/MM/YYYY
 * @param {string} dateString - строка с датой в ISO формате
 * @return {string} отформатированная дата
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

/**
 * Формирует HTML для отображения данных из объекта (например, mat_data или eos_data)
 * @param {object} dataObj - объект с данными для отображения
 * @param {string} sectionName - имя секции для заголовка
 * @return {string} HTML с произвольными полями объекта
 */
function formatDataSection(dataObj, sectionName) {
    if (!dataObj || Object.keys(dataObj).length === 0) return ''; // Если объект пустой, вернуть пустую строку

    let detailsHtml = `<div style="padding: 10px; border-top: 1px solid #e2e8f0;"><strong>${sectionName}:</strong><br>`;
    for (const [key, value] of Object.entries(dataObj)) {
        detailsHtml += `<strong>${key}:</strong> ${value} <br>`;
    }
    detailsHtml += '</div>';
    return detailsHtml;
}

/**
 * Загружает и отображает данные о материалах
 * Получает данные в YAML формате и инициализирует DataTable
 */
async function loadMaterials() {
    try {
        document.getElementById('loading').style.display = 'block';
        
        const response = await fetch('materials.yaml');
        const yamlText = await response.text();
        const materials = jsyaml.load(yamlText);

        // Подготовка данных для таблицы
        const tableData = materials.map(material => [
            '<span class="expand-icon">▶</span>',  // Иконка для раскрытия
            material.mat_id,
            material.mat_name,
            material.eos || '-',
            material.app.join(', '),
            formatDate(material.add),
            material // добавляем весь объект как скрытое значение для строки
        ]);

        // Инициализация DataTable с фиксированной шириной таблицы
        const table = $('#materials-table').DataTable({
            data: tableData,
            columns: [
                { title: "" },  // Колонка для иконки раскрытия
                { title: "Material ID" },
                { title: "Material" },
                { title: "EOS" },
                { title: "Applications" },
                { title: "Added" },
                { visible: false } // Скрытая колонка для хранения объекта материала
            ],
            autoWidth: false, // Отключаем автоматическое вычисление ширины DataTables
            responsive: true,
            language: {
                search: "Search:",
                lengthMenu: "Show _MENU_ entries",
                info: "Showing _START_ to _END_ of _TOTAL_ entries",
                infoEmpty: "Showing 0 to 0 of 0 entries",
                infoFiltered: "(filtered from _MAX_ total entries)",
                paginate: { first: "First", last: "Last", next: "Next", previous: "Previous" }
            }
        });

        // Обработчик клика по строке для развертывания дополнительных данных
        $('#materials-table tbody').on('click', 'tr', function (event) {
            if ($(event.target).hasClass('expand-icon')) {
                const tr = $(this);
                const row = table.row(tr);

                if (row.child.isShown())
