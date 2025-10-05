document.addEventListener('DOMContentLoaded', () => {
    // --- Selectores de Elementos ---
    const resultsContent = document.getElementById('results-content');
    const chartsSection = document.getElementById('charts-section');
    const actionsSection = document.getElementById('actions-section');
    const modalContainer = document.getElementById('settings-modal-container');

    // --- Definición de todas las métricas disponibles ---
    // Esto nos ayudará a generar las tarjetas y el modal de configuración dinámicamente.
    const ALL_METRICS = {
        main: [
            { key: 'temperatura_media', label: 'Temperatura', icon: '🌡️', theme: 'card-temp' },
            { key: 'prob_lluvia', label: 'Prob. Lluvia', icon: '💧', theme: 'card-rain' },
            { key: 'indice_uv', label: 'Índice UV', icon: '☀️', theme: 'card-uv' },
            { key: 'viento_velocidad_media', label: 'Viento', icon: '💨', theme: 'card-wind' },
        ],
        other: [
            { key: 'humedad_relativa_media', label: 'Humedad', icon: '💧', theme: 'card-humidity' },
            { key: 'cobertura_nubosa', label: 'Nubes', icon: '☁️', theme: 'card-clouds' },
            { key: 'calidad_aire', label: 'Calidad del Aire', icon: '🍃', theme: 'card-air' },
            { key: 'concentracion_polvo', label: 'Polvo', icon: '🏜️', theme: 'card-dust' },
            { key: 'prob_calor_extremo', label: 'Calor Extremo', icon: '🔥', theme: 'card-heat' },
            { key: 'prob_frio_extremo', label: 'Frío Extremo', icon: '🥶', theme: 'card-cold' },
            { key: 'prob_nieve', label: 'Nieve', icon: '❄️', theme: 'card-snow' },
        ]
    };

    // --- Lógica Principal ---
    const resultsDataString = sessionStorage.getItem('weatherData');
    if (!resultsDataString) {
        resultsContent.innerHTML = `<p style="color: red;">No se encontraron datos para mostrar. Por favor, <a href="/">regresa</a> y realiza un nuevo análisis.</p>`;
        return;
    }
    const result = JSON.parse(resultsDataString);
    displayResults(result);
    setupSettingsModal(result.datos_nasa); // Nueva función para inicializar el modal

    // --- Funciones Helper ---
    function getWeatherImagePath(sensacionClimatica) {
        if (typeof sensacionClimatica !== 'string' || sensacionClimatica.trim() === '') return '../static/images/agradable.png';
        const imageMap = {
            'muy caluroso': '../static/images/caluroso.png',
            'muy incómodo': '../static/images/incomodo.png',
            'muy frío': '../static/images/frio.png',
            'muy húmedo': '../static/images/humedo.png',
            'ventoso': '../static/images/ventoso.png',
            'agradable': '../static/images/agradable.png'
        };
        return imageMap[sensacionClimatica.toLowerCase()] || '../static/images/agradable.png';
    }
    function getWeatherIcon(data) {
        if (data.prob_lluvia > 40 || data.precipitacion_media > 1.5) return '🌧️';
        if (data.prob_nieve > 10) return '❄️';
        if (data.cobertura_nubosa > 60) return '☁️';
        if (data.viento_velocidad_media > 8) return '💨';
        if (data.temperatura_media > 28) return '🥵';
        if (data.temperatura_media < 10) return '🥶';
        return '☀️';
    }
    function generateHourlyTemperatures(minTemp, maxTemp) {
        const avgTemp = (minTemp + maxTemp) / 2;
        const amplitude = (maxTemp - minTemp) / 2;
        const hourlyTemps = [];
        for (let hour = 0; hour < 24; hour++) {
            const temp = avgTemp - amplitude * Math.cos(2 * Math.PI * (hour - 5) / 24);
            hourlyTemps.push(parseFloat(temp.toFixed(2))); 
        }
        return hourlyTemps;
    }

    // --- Lógica de Preferencias del Usuario ---
    /**
     * Obtiene las preferencias de visibilidad de métricas desde localStorage.
     * Si no existen, las crea mostrando todas por defecto.
     */
    function getMetricPreferences() {
        let prefs = localStorage.getItem('metricPreferences');
        if (!prefs) {
            prefs = {};
            [...ALL_METRICS.main, ...ALL_METRICS.other].forEach(metric => {
                prefs[metric.key] = true; // Por defecto, todas son visibles
            });
            localStorage.setItem('metricPreferences', JSON.stringify(prefs));
            return prefs;
        }
        return JSON.parse(prefs);
    }

    /**
     * Guarda las nuevas preferencias en localStorage.
     * @param {object} newPrefs - El nuevo objeto de preferencias.
     */
    function saveMetricPreferences(newPrefs) {
        localStorage.setItem('metricPreferences', JSON.stringify(newPrefs));
    }

    // --- Lógica de Renderizado de Tarjetas ---
    /**
     * Crea el HTML para una tarjeta de métrica individual.
     * @param {object} metric - El objeto de la métrica de ALL_METRICS.
     * @param {object} data - Los datos de la API de NASA.
     */
    function createMetricCardHTML(metric, data) {
        const value = data[metric.key];
        let details = '';
        // Añadir detalles específicos para ciertas tarjetas
        if (metric.key === 'temperatura_media') details = `<small>Min: ${data.temperatura_minima}°C / Máx: ${data.temperatura_maxima}°C</small>`;
        if (metric.key === 'prob_lluvia') details = `<small>Precipitación: ${data.precipitacion_media} mm</small>`;
        if (metric.key === 'viento_velocidad_media') details = `<small>Prob. Fuertes: ${data.prob_vientos_fuertes}%</small>`;

        return `
            <div class="metric-card ${metric.theme}">
                <div class="icon-wrapper">${metric.icon}</div>
                <p class="metric-label">${metric.label}</p>
                <p class="metric-value">${value}</p>
                ${details}
            </div>
        `;
    }

    /**
     * Renderiza las tarjetas de métricas en el DOM basándose en las preferencias del usuario.
     * @param {object} data - Los datos de la API de NASA.
     */
    function renderMetricCards(data) {
        const preferences = getMetricPreferences();
        const mainMetricsContainer = document.getElementById('main-metrics-grid');
        const otherMetricsContainer = document.getElementById('other-metrics-grid');
        
        mainMetricsContainer.innerHTML = '';
        otherMetricsContainer.innerHTML = '';

        ALL_METRICS.main.forEach(metric => {
            if (preferences[metric.key]) {
                mainMetricsContainer.innerHTML += createMetricCardHTML(metric, data);
            }
        });

        ALL_METRICS.other.forEach(metric => {
            if (preferences[metric.key]) {
                otherMetricsContainer.innerHTML += createMetricCardHTML(metric, data);
            }
        });
    }

    // --- Lógica de Visualización Principal (Refactorizada) ---
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
        
        // El HTML ahora tiene contenedores vacíos para las tarjetas y un botón de configuración.
        resultsContent.innerHTML = `
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
            <h4>Otras Métricas</h4>
            <div class="results-grid" id="other-metrics-grid"></div>
            <hr class="divider">
            <h4>Recomendación con IA 💡</h4>
            <p class="recommendation">${recommendation}</p>
        `;

        // Llamamos a la nueva función para que llene los contenedores de tarjetas.
        renderMetricCards(data);

        chartsSection.innerHTML = `<hr class="divider"><h4>Visualización Gráfica</h4><div class="charts-container"><div class="chart-wrapper"><canvas id="temperatureChart"></canvas></div><div class="chart-wrapper"><canvas id="conditionsChart"></canvas></div></div>`;
        
        actionsSection.innerHTML = `<hr class="divider"><div class="action-buttons-container"><a href="/" class="back-button">Analizar Otra Ubicación</a><div class="download-buttons"><button id="download-pdf" class="download-button"><i class="fa-solid fa-file-pdf"></i> PDF</button><button id="download-csv" class="download-button"><i class="fa-solid fa-file-csv"></i> CSV</button><button id="download-json" class="download-button"><i class="fa-solid fa-file-code"></i> JSON</button></div></div>`;
        
        createCharts(data);
        addDownloadListeners(result);
    }
    
    // --- Lógica del Modal de Configuración ---
    function setupSettingsModal(data) {
        const preferences = getMetricPreferences();
        // Crear el HTML del modal dinámicamente
        let checkboxesHTML = '';
        [...ALL_METRICS.main, ...ALL_METRICS.other].forEach(metric => {
            const isChecked = preferences[metric.key] ? 'checked' : '';
            checkboxesHTML += `
                <li class="metric-toggle-item">
                    <label>
                        <input type="checkbox" data-key="${metric.key}" ${isChecked}>
                        ${metric.label}
                    </label>
                </li>
            `;
        });

        modalContainer.innerHTML = `
            <div class="modal-overlay" id="settings-modal">
                <div class="modal-content">
                    <div class="modal-header"><h3>Personalizar Métricas</h3></div>
                    <div class="modal-body">
                        <ul class="metric-toggle-list">${checkboxesHTML}</ul>
                    </div>
                    <div class="modal-footer">
                        <button id="modal-close" class="download-button modal-button">Cancelar</button>
                        <button id="modal-save" class="download-button modal-button">Guardar</button>
                    </div>
                </div>
            </div>
        `;

        // Añadir Event Listeners
        const modal = document.getElementById('settings-modal');
        document.getElementById('open-settings-btn').addEventListener('click', () => modal.classList.add('visible'));
        document.getElementById('modal-close').addEventListener('click', () => modal.classList.remove('visible'));
        document.getElementById('modal-save').addEventListener('click', () => {
            const newPrefs = {};
            document.querySelectorAll('.metric-toggle-item input').forEach(input => {
                newPrefs[input.dataset.key] = input.checked;
            });
            saveMetricPreferences(newPrefs);
            renderMetricCards(data); // Re-renderizar las tarjetas con las nuevas preferencias
            modal.classList.remove('visible');
        });
    }

    // --- Funciones de Gráficas y Descarga ---
    function createCharts(data) {
        if (typeof ChartDataLabels !== 'undefined') {
            Chart.register(ChartDataLabels);
        }
        
        const tempCtx = document.getElementById('temperatureChart').getContext('2d');
        const hourlyTemps = generateHourlyTemperatures(data.temperatura_minima, data.temperatura_maxima);
        const hoursLabels = Array.from({ length: 24 }, (_, i) => `${i}:00`);
        
        new Chart(tempCtx, {
            type: 'bar',
            data: {
                labels: hoursLabels,
                datasets: [{
                    label: 'Temperatura (°C)',
                    data: hourlyTemps,
                    backgroundColor: 'rgba(67, 105, 215, 0.7)',
                    borderColor: 'rgba(67, 105, 215, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                maintainAspectRatio: false,
                responsive: true,
                scales: {
                    y: { title: { display: true, text: 'Temperatura (°C)' } },
                    x: {
                        title: { display: true, text: 'Hora del Día' },
                        ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 8 }
                    }
                },
                plugins: {
                    title: { display: true, text: '📈 Estimación de Temperatura Diaria', font: { size: 18 }, padding: { bottom: 25 } },
                    legend: { display: false },
                    tooltip: { callbacks: { label: (context) => ` Temperatura: ${context.parsed.y}°C` } },
                    datalabels: {
                        display: false
                    }
                }
            }
        });

        const condCtx = document.getElementById('conditionsChart').getContext('2d');
        new Chart(condCtx, {
            type: 'doughnut',
            data: {
                labels: ['💧 Humedad', '☁️ Nubes', '☀️ Índice UV', '💨 Viento'],
                datasets: [{
                    label: 'Condiciones',
                    data: [data.humedad_relativa_media, data.cobertura_nubosa, data.indice_uv * 10, data.viento_velocidad_media * 5],
                    backgroundColor: ['#4ecdc4', '#95a5a6', '#f39c12', '#3498db'],
                    borderWidth: 3,
                    borderColor: '#fff',
                    hoverOffset: 15
                }]
            },
            options: {
                maintainAspectRatio: false,
                responsive: true,
                plugins: {
                    title: { display: true, text: '🌍 Perfil Atmosférico', font: { size: 16, weight: 'bold' }, color: '#212930', padding: { bottom: 20 } },
                    legend: { display: true, position: 'bottom', labels: { padding: 15, font: { size: 11 }, color: '#495057', usePointStyle: true, pointStyle: 'circle' } },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const label = context.label || ''; let realValue = '';
                                if (label.includes('Humedad')) realValue = `${data.humedad_relativa_media}%`;
                                else if (label.includes('Nubes')) realValue = `${data.cobertura_nubosa}%`;
                                else if (label.includes('UV')) realValue = `${data.indice_uv}`;
                                else if (label.includes('Viento')) realValue = `${data.viento_velocidad_media} m/s`;
                                return ` ${label}: ${realValue}`;
                            }
                        }
                    },
                    datalabels: {
                        color: '#fff', font: { weight: 'bold', size: 13 },
                        formatter: (value, context) => {
                            const label = context.chart.data.labels[context.dataIndex];
                            if (label.includes('Humedad')) return data.humedad_relativa_media + '%';
                            else if (label.includes('Nubes')) return data.cobertura_nubosa + '%';
                            else if (label.includes('UV')) return data.indice_uv;
                            else if (label.includes('Viento')) return data.viento_velocidad_media + ' m/s';
                        }
                    }
                }
            }
        });
    }

    function addDownloadListeners(result) {
        document.getElementById('download-pdf').addEventListener('click', () => handlePdfDownload(result));
        document.getElementById('download-csv').addEventListener('click', () => handleCsvDownload(result));
        document.getElementById('download-json').addEventListener('click', () => handleJsonDownload(result));
    }
    function triggerDownload(content, fileName, contentType) {
        const a = document.createElement("a");
        const file = new Blob([content], { type: contentType });
        a.href = URL.createObjectURL(file); a.download = fileName;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
    }
    function handleJsonDownload(result) {
        const jsonData = JSON.stringify(result, null, 2);
        triggerDownload(jsonData, 'reporte_climatico.json', 'application/json');
    }
    function handleCsvDownload(result) {
        let csvContent = "Metrica,Valor\n";
        const dataToExport = result.datos_nasa;
        for (const key in dataToExport) {
            csvContent += `${key},"${dataToExport[key]}"\n`;
        }
        csvContent += `recomendaciones_ai,"${result.recomendaciones_ai}"\n`;
        triggerDownload(csvContent, 'reporte_climatico.csv', 'text/csv;charset=utf-8;');
    }
    // PDF usando jsPDF y jsPDF-AutoTable
    function handlePdfDownload(result) {
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
        doc.setFontSize(11); doc.setFont('helvetica', 'normal');
        const recommendationLines = doc.splitTextToSize(result.recomendaciones_ai, 170);
        doc.text(recommendationLines, 20, 65);
        const tableBody = [];
        const formatKey = (key) => key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        for (const key in data) {
            tableBody.push([formatKey(key), data[key]]);
        }
        const tableStartY = recommendationLines.length * 5 + 75;
        doc.autoTable({
            startY: tableStartY,
            head: [['Métrica de NASA POWER', 'Valor Registrado']],
            body: tableBody,
            theme: 'striped',
            headStyles: { fillColor: [67, 105, 215] }
        });
        doc.save('reporte_climatico_completo.pdf');
    }
});