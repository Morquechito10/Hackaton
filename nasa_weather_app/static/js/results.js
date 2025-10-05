document.addEventListener('DOMContentLoaded', () => {
    // --- Selectores de Elementos ---
    const resultsContent = document.getElementById('results-content');
    const downloadPdfBtn = document.getElementById('download-pdf');
    const downloadCsvBtn = document.getElementById('download-csv');
    const downloadJsonBtn = document.getElementById('download-json');

    // =================================================================
    // NUEVA LÓGICA: DEFINICIÓN DE TARJETAS Y MANEJO DE PREFERENCIAS
    // =================================================================

    // Objeto central que define todas las tarjetas disponibles
    const ALL_METRICS = {
        main: {
            temperatura: (data) => `<div class="metric-card"><div class="icon-wrapper">🌡️</div><p class="metric-label">Temperatura</p><p class="metric-value">${data.temperatura_media}°C</p><small>Min: ${data.temperatura_minima}°C / Máx: ${data.temperatura_maxima}°C</small></div>`,
            lluvia: (data) => `<div class="metric-card"><div class="icon-wrapper">💧</div><p class="metric-label">Prob. Lluvia</p><p class="metric-value">${data.prob_lluvia}%</p><small>Precipitación: ${data.precipitacion_media} mm</small></div>`,
            uv: (data) => `<div class="metric-card"><div class="icon-wrapper">☀️</div><p class="metric-label">Índice UV</p><p class="metric-value">${data.indice_uv}</p><small>Radiación Solar</small></div>`,
            viento: (data) => `<div class="metric-card"><div class="icon-wrapper">💨</div><p class="metric-label">Viento</p><p class="metric-value">${data.viento_velocidad_media} m/s</p><small>Prob. Fuertes: ${data.prob_vientos_fuertes}%</small></div>`,
        },
        other: {
            humedad: (data) => `<div class="metric-card"><div class="icon-wrapper">💧</div><p class="metric-label">Humedad</p><p class="metric-value">${data.humedad_relativa_media}%</p><small>Relativa promedio</small></div>`,
            nubes: (data) => `<div class="metric-card"><div class="icon-wrapper">☁️</div><p class="metric-label">Nubes</p><p class="metric-value">${data.cobertura_nubosa}%</p><small>Cobertura Nubosa</small></div>`,
            calidad_aire: (data) => `<div class="metric-card"><div class="icon-wrapper">🍃</div><p class="metric-label">Calidad del Aire</p><p class="metric-value">${data.calidad_aire}</p><small>Índice de calidad</small></div>`,
            polvo: (data) => `<div class="metric-card"><div class="icon-wrapper">🏜️</div><p class="metric-label">Polvo</p><p class="metric-value">${data.concentracion_polvo}</p><small>Concentración</small></div>`,
            calor_extremo: (data) => `<div class="metric-card"><div class="icon-wrapper">🔥</div><p class="metric-label">Calor Extremo</p><p class="metric-value">${data.prob_calor_extremo}%</p><small>Probabilidad</small></div>`,
            frio_extremo: (data) => `<div class="metric-card"><div class="icon-wrapper">🥶</div><p class="metric-label">Frío Extremo</p><p class="metric-value">${data.prob_frio_extremo}%</p><small>Probabilidad</small></div>`,
            nieve: (data) => `<div class="metric-card"><div class="icon-wrapper">❄️</div><p class="metric-label">Nieve</p><p class="metric-value">${data.prob_nieve}%</p><small>Probabilidad</small></div>`,
        }
    };

    // Obtiene las preferencias del usuario del localStorage o crea unas por defecto
    function getMetricPreferences() {
        let prefs = localStorage.getItem('metricPreferences');
        if (!prefs) {
            prefs = {};
            [...Object.keys(ALL_METRICS.main), ...Object.keys(ALL_METRICS.other)].forEach(key => {
                prefs[key] = true; // Por defecto, todas son visibles
            });
            localStorage.setItem('metricPreferences', JSON.stringify(prefs));
            return prefs;
        }
        return JSON.parse(prefs);
    }

    // Guarda las nuevas preferencias
    function saveMetricPreferences(newPrefs) {
        localStorage.setItem('metricPreferences', JSON.stringify(newPrefs));
    }

    // Dibuja las tarjetas en el DOM según las preferencias
    function renderMetricCards(data) {
        const preferences = getMetricPreferences();
        const mainMetricsContainer = document.getElementById('main-metrics-grid');
        const otherMetricsContainer = document.getElementById('other-metrics-grid');
        
        mainMetricsContainer.innerHTML = '';
        otherMetricsContainer.innerHTML = '';

        for (const key in ALL_METRICS.main) {
            if (preferences[key]) {
                mainMetricsContainer.innerHTML += ALL_METRICS.main[key](data);
            }
        }

        for (const key in ALL_METRICS.other) {
            if (preferences[key]) {
                otherMetricsContainer.innerHTML += ALL_METRICS.other[key](data);
            }
        }
    }

    // Crea y maneja el modal de configuración
    function setupSettingsModal(resultData) {
        const preferences = getMetricPreferences();
        const modalContainer = document.createElement('div');
        
        const createCheckbox = (key, label) => `
            <li class="metric-toggle-item">
                <label>
                    <input type="checkbox" data-key="${key}" ${preferences[key] ? 'checked' : ''}>
                    ${label}
                </label>
            </li>`;

        let checkboxesHTML = '';
        const formatLabel = (key) => key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        [...Object.keys(ALL_METRICS.main), ...Object.keys(ALL_METRICS.other)].forEach(key => {
            checkboxesHTML += createCheckbox(key, formatLabel(key));
        });

        modalContainer.innerHTML = `
            <div class="modal-overlay" id="settings-modal">
                <div class="modal-content">
                    <div class="modal-header"><h3>Personalizar Métricas</h3></div>
                    <div class="modal-body"><ul class="metric-toggle-list">${checkboxesHTML}</ul></div>
                    <div class="modal-footer">
                        <button id="modal-close" class="modal-button">Cancelar</button>
                        <button id="modal-save" class="modal-button">Guardar</button>
                    </div>
                </div>
            </div>`;
        document.body.appendChild(modalContainer);

        const modal = document.getElementById('settings-modal');
        document.getElementById('open-settings-btn').addEventListener('click', () => modal.classList.add('visible'));
        document.getElementById('modal-close').addEventListener('click', () => modal.classList.remove('visible'));
        document.getElementById('modal-save').addEventListener('click', () => {
            const newPrefs = {};
            document.querySelectorAll('.metric-toggle-item input').forEach(input => {
                newPrefs[input.dataset.key] = input.checked;
            });
            saveMetricPreferences(newPrefs);
            renderMetricCards(resultData.datos_nasa);
            modal.classList.remove('visible');
        });
    }

    // =================================================================
    // LÓGICA ESTABLE EXISTENTE (CON LIGERAS MODIFICACIONES)
    // =================================================================

    // --- Lógica Principal ---
    const resultsDataString = sessionStorage.getItem('weatherData');
    if (!resultsDataString) {
        resultsContent.innerHTML = `<p style="color: red;">No se encontraron datos para mostrar. Por favor, <a href="/">regresa</a> y realiza un nuevo análisis.</p>`;
        if (downloadPdfBtn) document.querySelector('.action-buttons-container').style.display = 'none';
        return;
    }
    const result = JSON.parse(resultsDataString);
    displayResults(result); // Dibuja la estructura y las tarjetas iniciales
    setupSettingsModal(result); // Prepara el modal

    // --- Funciones Helper (SIN CAMBIOS) ---
    function getWeatherImagePath(sensacionClimatica) { /* ...código original sin cambios... */ 
        if (typeof sensacionClimatica !== 'string' || sensacionClimatica.trim() === '') return 'static/images/agradable.png';
        const imageMap = {
            'muy caluroso': 'static/images/caluroso.png','muy incómodo': 'static/images/incomodo.png',
            'muy frío': 'static/images/frio.png','muy húmedo': 'static/images/humedo.png',
            'ventoso': 'static/images/ventoso.png','agradable': 'static/images/agradable.png'
        };
        return imageMap[sensacionClimatica.toLowerCase()] || 'static/images/agradable.png';
    }
    function getWeatherIcon(data) { /* ...código original sin cambios... */ 
        if (data.prob_lluvia > 40 || data.precipitacion_media > 1.5) return '🌧️';
        if (data.prob_nieve > 10) return '❄️';
        if (data.cobertura_nubosa > 60) return '☁️';
        if (data.viento_velocidad_media > 8) return '💨';
        if (data.temperatura_media > 28) return '🥵';
        if (data.temperatura_media < 10) return '🥶';
        return '☀️';
    }

    // --- Lógica de Visualización (MODIFICADA para ser un "template") ---
    function displayResults(result) {
        const data = result.datos_nasa;
        const recommendation = result.recomendaciones_ai;
        const locationName = result.locationName;
        const selectedDate = result.date;
        const displayDate = new Date(selectedDate + 'T12:00:00Z');
        const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };
        const formattedDate = displayDate.toLocaleString('es-ES', dateOptions);
        const mainWeatherIcon = getWeatherIcon(data);
        const weatherImagePath = getWeatherImagePath(data.sensacion_climatica);
        
        // El HTML ahora solo contiene la estructura y los contenedores para las tarjetas
        let htmlContent = `
            <div class="summary-card">
                <div class="summary-icon">${mainWeatherIcon}</div>
                <div class="summary-details">
                    <p class="summary-location">${locationName}</p>
                    <p class="summary-date">${formattedDate}</p>
                    <p class="summary-temp">${data.temperatura_media}°C</p>
                    <p class="summary-feel">Sensación: <strong>${data.sensacion_climatica}</strong></p>
                </div>
                <img src="${weatherImagePath}" alt="Ilustración del Clima" class="summary-illustration-img">
            </div>
            <hr class="divider">
            <div class="settings-container">
                <h4>Métricas Clave</h4>
                <button id="open-settings-btn" class="settings-button"><i class="fa-solid fa-gear"></i> Configurar</button>
            </div>
            <div class="results-grid" id="main-metrics-grid"></div>
            <hr class="divider">
            <div class="settings-container">
                 <h4>Otras Métricas</h4>
            </div>
            <div class="results-grid" id="other-metrics-grid"></div>
            <hr class="divider">
            <h4>Recomendación con IA 💡</h4>
            <p class="recommendation">${recommendation}</p>
        `;
        resultsContent.innerHTML = htmlContent;
        
        // Llamamos a la función que dibuja las tarjetas por primera vez
        renderMetricCards(data);
    }
    
    // =================================================================
    //  LÓGICA PARA LA DESCARGA DE ARCHIVOS 
    // =================================================================

    function triggerDownload(content, fileName, contentType) { /* ...código original sin cambios... */ 
        const a = document.createElement("a");
        const file = new Blob([content], { type: contentType });
        a.href = URL.createObjectURL(file);
        a.download = fileName;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
    }

    downloadJsonBtn.addEventListener('click', () => { /* ...código original sin cambios... */ 
        const jsonData = JSON.stringify(result, null, 2);
        triggerDownload(jsonData, 'reporte_climatico.json', 'application/json');
    });

    downloadCsvBtn.addEventListener('click', () => { /* ...código original sin cambios... */ 
        let csvContent = "Metrica,Valor\n";
        const dataToExport = result.datos_nasa;
        for (const key in dataToExport) {
            const value = `"${dataToExport[key]}"`;
            csvContent += `${key},${value}\n`;
        }
        csvContent += `recomendaciones_ai,"${result.recomendaciones_ai}"\n`;
        triggerDownload(csvContent, 'reporte_climatico.csv', 'text/csv;charset=utf-8;');
    });

    downloadPdfBtn.addEventListener('click', () => { /* ...código original sin cambios... */ 
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const data = result.datos_nasa;
        const locationName = result.locationName;
        const selectedDate = new Date(result.date + 'T12:00:00Z').toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
        doc.setFontSize(20); doc.setFont('helvetica', 'bold');
        doc.text("Reporte de Análisis Climático", 105, 20, { align: 'center' });
        doc.setFontSize(12); doc.setFont('helvetica', 'normal');
        doc.text(`Ubicación: ${locationName}`, 105, 30, { align: 'center' });
        doc.text(`Fecha del Análisis: ${selectedDate}`, 105, 38, { align: 'center' });
        doc.setLineWidth(0.5); doc.line(20, 45, 190, 45);
        doc.setFontSize(14); doc.setFont('helvetica', 'bold');
        doc.text("Recomendación del Día", 20, 58);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
        const recommendationLines = doc.splitTextToSize(result.recomendaciones_ai, 170);
        doc.text(recommendationLines, 20, 65);
        const tableBody = [];
        const formatKey = (key) => key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        for (const key in data) {
            tableBody.push([formatKey(key), data[key]]);
        }
        doc.autoTable({
            startY: doc.autoTable.previous ? doc.autoTable.previous.finalY + 15 : 90,
            head: [['Métrica de NASA POWER', 'Valor Registrado']],
            body: tableBody,
            theme: 'striped',
            headStyles: { fillColor: [67, 105, 215] }
        });
        doc.save('reporte_climatico_completo.pdf');
    });
});