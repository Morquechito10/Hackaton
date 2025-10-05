document.addEventListener('DOMContentLoaded', () => {
    // --- Selectores de Elementos ---
    const resultsContent = document.getElementById('results-content');
    const chartsSection = document.getElementById('charts-section');
    const actionsSection = document.getElementById('actions-section');

    // =================================================================
    // LÓGICA PARA TARJETAS PERSONALIZABLES (CON TEMAS Y EMOJIS CORREGIDOS)
    // =================================================================

    const ALL_METRICS = {
        main: {
            temperatura: (data) => `<div class="metric-card card-temp"><div class="icon-wrapper">🌡️</div><p class="metric-label">Temperatura</p><p class="metric-value">${data.temperatura_media}°C</p><small>Min: ${data.temperatura_minima}°C / Máx: ${data.temperatura_maxima}°C</small></div>`,
            lluvia: (data) => `<div class="metric-card card-rain"><div class="icon-wrapper">💧</div><p class="metric-label">Prob. Lluvia</p><p class="metric-value">${data.prob_lluvia}%</p><small>Precipitación: ${data.precipitacion_media} mm</small></div>`,
            uv: (data) => `<div class="metric-card card-uv"><div class="icon-wrapper">☀️</div><p class="metric-label">Índice UV</p><p class="metric-value">${data.indice_uv}</p><small>Radiación Solar</small></div>`,
            viento: (data) => `<div class="metric-card card-wind"><div class="icon-wrapper">💨</div><p class="metric-label">Viento</p><p class="metric-value">${data.viento_velocidad_media} m/s</p><small>Prob. Fuertes: ${data.prob_vientos_fuertes}%</small></div>`,
        },
        other: {
            humedad: (data) => `<div class="metric-card card-humidity"><div class="icon-wrapper">💧</div><p class="metric-label">Humedad</p><p class="metric-value">${data.humedad_relativa_media}%</p><small>Relativa promedio</small></div>`,
            nubes: (data) => `<div class="metric-card card-clouds"><div class="icon-wrapper">☁️</div><p class="metric-label">Nubes</p><p class="metric-value">${data.cobertura_nubosa}%</p><small>Cobertura Nubosa</small></div>`,
            calidad_aire: (data) => `<div class="metric-card card-air"><div class="icon-wrapper">🍃</div><p class="metric-label">Calidad del Aire</p><p class="metric-value">${data.calidad_aire}</p><small>Índice de calidad</small></div>`,
            polvo: (data) => `<div class="metric-card card-dust"><div class="icon-wrapper">🏜️</div><p class="metric-label">Polvo</p><p class="metric-value">${data.concentracion_polvo}</p><small>Concentración</small></div>`,
            calor_extremo: (data) => `<div class="metric-card card-heat"><div class="icon-wrapper">🔥</div><p class="metric-label">Calor Extremo</p><p class="metric-value">${data.prob_calor_extremo}%</p><small>Probabilidad</small></div>`,
            frio_extremo: (data) => `<div class="metric-card card-cold"><div class="icon-wrapper">🥶</div><p class="metric-label">Frío Extremo</p><p class="metric-value">${data.prob_frio_extremo}%</p><small>Probabilidad</small></div>`,
            nieve: (data) => `<div class="metric-card card-snow"><div class="icon-wrapper">❄️</div><p class="metric-label">Nieve</p><p class="metric-value">${data.prob_nieve}%</p><small>Probabilidad</small></div>`,
        }
    };

    function getMetricPreferences() {
        let prefs = localStorage.getItem('metricPreferences');
        if (!prefs) {
            prefs = {};
            [...Object.keys(ALL_METRICS.main), ...Object.keys(ALL_METRICS.other)].forEach(key => {
                prefs[key] = true; // Todas activas por defecto
            });
            localStorage.setItem('metricPreferences', JSON.stringify(prefs));
            return prefs;
        }
        return JSON.parse(prefs);
    }

    function saveMetricPreferences(newPrefs) {
        localStorage.setItem('metricPreferences', JSON.stringify(newPrefs));
    }

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

    function setupSettingsModal(resultData) {
        const modalContainer = document.getElementById('settings-modal-container');
        const prefs = getMetricPreferences();
        let modalHtml = `
            <div id="settings-modal" class="modal">
                <div class="modal-content">
                    <h3>Configura tus métricas</h3>
                    <div class="metrics-list">
        `;
        Object.entries({...ALL_METRICS.main, ...ALL_METRICS.other}).forEach(([key, _]) => {
            modalHtml += `
                <label>
                    <input type="checkbox" class="metric-checkbox" data-metric="${key}" ${prefs[key] ? 'checked' : ''}>
                    ${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </label>
            `;
        });
        modalHtml += `
                    </div>
                    <button id="show-all-metrics">Mostrar todas</button>
                    <button id="hide-all-metrics">Ocultar todas</button>
                    <button id="close-settings">Cerrar</button>
                </div>
            </div>
        `;
        modalContainer.innerHTML = modalHtml;

        // Mostrar/Ocultar todas
        document.getElementById('show-all-metrics').onclick = () => {
            document.querySelectorAll('.metric-checkbox').forEach(cb => cb.checked = true);
        };
        document.getElementById('hide-all-metrics').onclick = () => {
            document.querySelectorAll('.metric-checkbox').forEach(cb => cb.checked = false);
        };

        // Guardar preferencias al cerrar
        document.getElementById('close-settings').onclick = () => {
            const newPrefs = {};
            document.querySelectorAll('.metric-checkbox').forEach(cb => {
                newPrefs[cb.dataset.metric] = cb.checked;
            });
            localStorage.setItem('metricPreferences', JSON.stringify(newPrefs));
            modalContainer.innerHTML = '';
            displayResults(result); // Vuelve a renderizar las cards según preferencias
        };
    }

    // --- Lógica Principal ---
    const resultsDataString = sessionStorage.getItem('weatherData');
    if (!resultsDataString) {
        resultsContent.innerHTML = `<p style="color: red;">No se encontraron datos para mostrar. Por favor, <a href="/">regresa</a> y realiza un nuevo análisis.</p>`;
        return;
    }
    const result = JSON.parse(resultsDataString);
    
    // 1. Dibuja la estructura principal
    displayResults(result); 
    
    // 2. Prepara el modal de configuración
    setupSettingsModal(result);
    
    // 3. Dibuja las gráficas y prepara los botones de descarga
    createCharts(result.datos_nasa);
    addDownloadListeners(result);

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

    // --- Lógica de Visualización ---
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
            <div class="settings-container">
                 <h4>Otras Métricas</h4>
            </div>
            <div class="results-grid" id="other-metrics-grid"></div>
            <hr class="divider">
            <h4>Recomendación con IA 💡</h4>
            <p class="recommendation">${recommendation}</p>
        `;
        
        renderMetricCards(data);
    }
    
    // --- Lógica de Gráficas y Descargas ---
    function createCharts(data) {
        chartsSection.innerHTML = `<hr class="divider"><h4>Visualización Gráfica</h4><div class="charts-container"><div class="chart-wrapper"><canvas id="temperatureChart"></canvas></div><div class="chart-wrapper"><canvas id="conditionsChart"></canvas></div></div>`;
        if (typeof ChartDataLabels !== 'undefined') {
            Chart.register(ChartDataLabels);
        }
        
        const tempCtx = document.getElementById('temperatureChart').getContext('2d');
        const hourlyTemps = generateHourlyTemperatures(data.temperatura_minima, data.temperatura_maxima);
        const hoursLabels = Array.from({ length: 24 }, (_, i) => `${i}:00`);
        new Chart(tempCtx, { type: 'bar', data: { labels: hoursLabels, datasets: [{ label: 'Temperatura (°C)', data: hourlyTemps, backgroundColor: 'rgba(67, 105, 215, 0.7)', borderColor: 'rgba(67, 105, 215, 1)', borderWidth: 1 }] }, options: { maintainAspectRatio: false, responsive: true, scales: { y: { title: { display: true, text: 'Temperatura (°C)' } }, x: { title: { display: true, text: 'Hora del Día' }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 8 } } }, plugins: { title: { display: true, text: '📈 Estimación de Temperatura Diaria', font: { size: 18 }, padding: { bottom: 25 } }, legend: { display: false }, tooltip: { callbacks: { label: (context) => ` Temperatura: ${context.parsed.y}°C` } }, datalabels: { display: false } } } });

        const condCtx = document.getElementById('conditionsChart').getContext('2d');
        new Chart(condCtx, { type: 'doughnut', data: { labels: ['💧 Humedad', '☁️ Nubes', '☀️ Índice UV', '💨 Viento'], datasets: [{ label: 'Condiciones', data: [data.humedad_relativa_media, data.cobertura_nubosa, data.indice_uv * 10, data.viento_velocidad_media * 5], backgroundColor: ['#4ecdc4', '#95a5a6', '#f39c12', '#3498db'], borderWidth: 3, borderColor: '#fff', hoverOffset: 15 }] }, options: { maintainAspectRatio: false, responsive: true, plugins: { title: { display: true, text: '🌍 Perfil Atmosférico', font: { size: 16, weight: 'bold' }, color: '#212930', padding: { bottom: 20 } }, legend: { display: true, position: 'bottom', labels: { padding: 15, font: { size: 11 }, color: '#495057', usePointStyle: true, pointStyle: 'circle' } }, tooltip: { callbacks: { label: (context) => { const label = context.label || ''; let realValue = ''; if (label.includes('Humedad')) realValue = `${data.humedad_relativa_media}%`; else if (label.includes('Nubes')) realValue = `${data.cobertura_nubosa}%`; else if (label.includes('UV')) realValue = `${data.indice_uv}`; else if (label.includes('Viento')) realValue = `${data.viento_velocidad_media} m/s`; return ` ${label}: ${realValue}`; } } }, datalabels: { color: '#fff', font: { weight: 'bold', size: 13 }, formatter: (value, context) => { const label = context.chart.data.labels[context.dataIndex]; if (label.includes('Humedad')) return data.humedad_relativa_media + '%'; else if (label.includes('Nubes')) return data.cobertura_nubosa + '%'; else if (label.includes('UV')) return data.indice_uv; else if (label.includes('Viento')) return data.viento_velocidad_media + ' m/s'; } } } } });
    }
    //hola

    function addDownloadListeners(result) {
        actionsSection.innerHTML = `<hr class="divider"><div class="action-buttons-container"><a href="/" class="back-button">Analizar Otra Ubicación</a><div class="download-buttons"><button id="download-pdf" class="download-button"><i class="fa-solid fa-file-pdf"></i> PDF</button><button id="download-csv" class="download-button"><i class="fa-solid fa-file-csv"></i> CSV</button><button id="download-json" class="download-button"><i class="fa-solid fa-file-code"></i> JSON</button></div></div>`;
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
        doc.autoTable({ startY: tableStartY, head: [['Métrica de NASA POWER', 'Valor Registrado']], body: tableBody, theme: 'striped', headStyles: { fillColor: [67, 105, 215] } });
        doc.save('reporte_climatico_completo.pdf');
    }
});