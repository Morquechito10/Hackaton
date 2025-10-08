document.addEventListener("DOMContentLoaded", () => {
  // --- Element Selectors ---
  const resultsContent = document.getElementById("results-content");
  const chartsSection = document.getElementById("charts-section");
  const actionsSection = document.getElementById("actions-section");
  const modalContainer = document.getElementById("settings-modal-container");

  // --- Definition of all available metrics ---
  const ALL_METRICS = {
    main: [
      {
        key: "temperatura_media",
  label: "Temperatura",
        icon: "🌡️",
        theme: "card-temp",
      },
      {
        key: "prob_lluvia",
  label: "Probabilidad de lluvia",
        icon: "💧",
        theme: "card-rain",
      },
  { key: "indice_uv", label: "Índice UV", icon: "☀️", theme: "card-uv" },
      {
        key: "viento_velocidad_media",
  label: "Viento",
        icon: "💨",
        theme: "card-wind",
      },
    ],
    other: [
      {
        key: "humedad_relativa_media",
  label: "Humedad",
        icon: "💧",
        theme: "card-humidity",
      },
      {
        key: "cobertura_nubosa",
  label: "Nubosidad",
        icon: "☁️",
        theme: "card-clouds",
      },
      {
        key: "calidad_aire",
  label: "Calidad del aire",
        icon: "🍃",
        theme: "card-air",
      },
      {
        key: "concentracion_polvo",
  label: "Polvo",
        icon: "🏜️",
        theme: "card-dust",
      },
      {
        key: "prob_calor_extremo",
  label: "Calor extremo",
        icon: "🔥",
        theme: "card-heat",
      },
      {
        key: "prob_frio_extremo",
  label: "Frío extremo",
        icon: "🥶",
        theme: "card-cold",
      },
  { key: "prob_nieve", label: "Nieve", icon: "❄️", theme: "card-snow" },
    ],
  };

  // --- Lógica Principal ---
  const resultsDataString = sessionStorage.getItem("weatherData");
  if (!resultsDataString) {
  resultsContent.innerHTML = `<p style="color: red;">No se encontraron datos para mostrar. Por favor <a href="/">regresa</a> y realiza un nuevo análisis.</p>`;
    return;
  }
  const result = JSON.parse(resultsDataString);
  displayResults(result);
  setupSettingsModal(result.datos_nasa);

  // --- Funciones Helper ---
  function getWeatherImagePath(weatherFeeling) {
    if (typeof weatherFeeling !== "string" || weatherFeeling.trim() === "") {
      return "../static/images/agradable.png";
    }
    const imageMap = {
  "muy caluroso": "../static/images/caluroso.jpg",
  "muy incómodo": "../static/images/incomodo.png",
  "muy frío": "../static/images/frio.png",
  "muy húmedo": "../static/images/humedo.png",
  "ventoso": "../static/images/ventoso.jpg",
  "agradable": "../static/images/agradable.png",
    };
    const normalizedFeeling = weatherFeeling.toLowerCase();
    return imageMap[normalizedFeeling] || "../static/images/agradable.png";
  }
  function getWeatherIcon(data) {
    if (data.prob_lluvia > 40 || data.precipitacion_media > 1.5) return "🌧️";
    if (data.prob_nieve > 10) return "❄️";
    if (data.cobertura_nubosa > 60) return "☁️";
    if (data.viento_velocidad_media > 8) return "💨";
    if (data.temperatura_media > 28) return "🥵";
    if (data.temperatura_media < 10) return "🥶";
    return "☀️";
  }
  function generateHourlyTemperatures(minTemp, maxTemp) {
    const avgTemp = (minTemp + maxTemp) / 2;
    const amplitude = (maxTemp - minTemp) / 2;
    const hourlyTemps = [];
    for (let hour = 0; hour < 24; hour++) {
      const temp =
        avgTemp - amplitude * Math.cos((2 * Math.PI * (hour - 5)) / 24);
      hourlyTemps.push(parseFloat(temp.toFixed(2)));
    }
    return hourlyTemps;
  }

  // --- Lógica de Preferencias del Usuario ---
  function getMetricPreferences() {
    let prefs = localStorage.getItem("metricPreferences");
    if (!prefs) {
      prefs = {};
      [...ALL_METRICS.main, ...ALL_METRICS.other].forEach((metric) => {
        prefs[metric.key] = true;
      });
      localStorage.setItem("metricPreferences", JSON.stringify(prefs));
      return prefs;
    }
    return JSON.parse(prefs);
  }

  function saveMetricPreferences(newPrefs) {
    localStorage.setItem("metricPreferences", JSON.stringify(newPrefs));
  }

  // --- Lógica de Renderizado de Tarjetas ---
  function createMetricCardHTML(metric, data) {
    const value = data[metric.key];
    let details = "";
    if (metric.key === "temperatura_media")
  details = `<small>Mín: ${data.temperatura_minima}°C / Máx: ${data.temperatura_maxima}°C</small>`;
    if (metric.key === "prob_lluvia")
  details = `<small>Precipitación: ${data.precipitacion_media} mm</small>`;
    if (metric.key === "viento_velocidad_media")
  details = `<small>Prob. de vientos fuertes: ${data.prob_vientos_fuertes}%</small>`;

    return `
            <div class="metric-card ${metric.theme}">
                <div class="icon-wrapper">${metric.icon}</div>
                <p class="metric-label">${metric.label}</p>
                <p class="metric-value">${value}</p>
                ${details}
            </div>
        `;
  }

  function renderMetricCards(data) {
    const preferences = getMetricPreferences();
    const mainMetricsContainer = document.getElementById("main-metrics-grid");
    const otherMetricsContainer = document.getElementById("other-metrics-grid");

    mainMetricsContainer.innerHTML = "";
    otherMetricsContainer.innerHTML = "";

    ALL_METRICS.main.forEach((metric) => {
      if (preferences[metric.key]) {
        mainMetricsContainer.innerHTML += createMetricCardHTML(metric, data);
      }
    });

    ALL_METRICS.other.forEach((metric) => {
      if (preferences[metric.key]) {
        otherMetricsContainer.innerHTML += createMetricCardHTML(metric, data);
      }
    });
  }

  // --- Lógica de Visualización Principal ---
  function displayResults(result) {
    const data = result.datos_nasa;
    const recommendation = result.recomendaciones_ai;
    const locationName = result.locationName;
    const selectedDate = result.date;
    const displayDate = new Date(selectedDate + "T12:00:00Z");
    const dateOptions = { year: "numeric", month: "long", day: "numeric" };
    const formattedDate = displayDate.toLocaleString("en-US", dateOptions);
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
                <img src="${weatherImagePath}" alt="Weather Illustration" class="summary-illustration-img">
            </div>
            <hr class="divider">
            <div class="settings-container">
                <h4>Métricas principales</h4>
                <button id="open-settings-btn" class="settings-button"><i class="fa-solid fa-gear"></i> Personalizar métricas</button>
            </div>
            <div class="results-grid" id="main-metrics-grid"></div>
            <hr class="divider">
            <h4>Otras métricas</h4>
            <div class="results-grid" id="other-metrics-grid"></div>
            <hr class="divider">
            <h4>Recomendación de IA 💡</h4>
            <p class="recommendation">${recommendation}</p>
        `;

    renderMetricCards(data);

  chartsSection.innerHTML = `<hr class="divider"><h4>Visualización gráfica</h4><div class="charts-container"><div class="chart-wrapper"><canvas id="temperatureChart"></canvas></div><div class="chart-wrapper"><canvas id="conditionsChart"></canvas></div></div>`;

  actionsSection.innerHTML = `<hr class="divider"><div class="action-buttons-container"><a href="/" class="back-button">Analizar otra ubicación</a><div class="download-buttons"><button id="download-pdf" class="download-button"><i class="fa-solid fa-file-pdf"></i> PDF</button><button id="download-csv" class="download-button"><i class="fa-solid fa-file-csv"></i> CSV</button><button id="download-json" class="download-button"><i class="fa-solid fa-file-code"></i> JSON</button></div></div>`;

    createCharts(data);
    addDownloadListeners(result);
  }

  // --- Lógica del Modal de Configuración ---
  function setupSettingsModal(data) {
    const preferences = getMetricPreferences();
    let checkboxesHTML = "";
    [...ALL_METRICS.main, ...ALL_METRICS.other].forEach((metric) => {
      const isChecked = preferences[metric.key] ? "checked" : "";
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
                    <div class="modal-header"><h3>Personalizar métricas</h3></div>
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

    const modal = document.getElementById("settings-modal");
    document
      .getElementById("open-settings-btn")
      .addEventListener("click", () => modal.classList.add("visible"));
    document
      .getElementById("modal-close")
      .addEventListener("click", () => modal.classList.remove("visible"));
    document.getElementById("modal-save").addEventListener("click", () => {
      const newPrefs = {};
      document
        .querySelectorAll(".metric-toggle-item input")
        .forEach((input) => {
          newPrefs[input.dataset.key] = input.checked;
        });
      saveMetricPreferences(newPrefs);
      renderMetricCards(data);
      modal.classList.remove("visible");
    });
  }

  // --- Funciones de Gráficas y Descarga ---
  function createCharts(data) {
    if (typeof ChartDataLabels !== "undefined") {
      Chart.register(ChartDataLabels);
    }

    const tempCtx = document
      .getElementById("temperatureChart")
      .getContext("2d");
    const hourlyTemps = generateHourlyTemperatures(
      data.temperatura_minima,
      data.temperatura_maxima
    );
    const hoursLabels = Array.from({ length: 24 }, (_, i) => `${i}:00`);

    new Chart(tempCtx, {
      type: "bar",
      data: {
        labels: hoursLabels,
        datasets: [
          {
            label: "Temperature (°C)",
            data: hourlyTemps,
            backgroundColor: "rgba(67, 105, 215, 0.7)",
            borderColor: "rgba(67, 105, 215, 1)",
            borderWidth: 1,
          },
        ],
      },
      options: {
        maintainAspectRatio: false,
        responsive: true,
        scales: {
          y: { title: { display: true, text: "Temperature (°C)" } },
          x: {
            title: { display: true, text: "Hour of Day" },
            ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 8 },
          },
        },
        plugins: {
          title: {
            display: true,
            text: "📈 Daily Temperature Estimate",
            font: { size: 18 },
            padding: { bottom: 25 },
          },
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => ` Temperature: ${context.parsed.y}°C`,
            },
          },
          datalabels: { display: false },
        },
      },
    });

    const condCtx = document.getElementById("conditionsChart").getContext("2d");
    new Chart(condCtx, {
      type: "doughnut",
      data: {
        labels: ["💧 Humidity", "☁️ Clouds", "☀️ UV Index", "💨 Wind"],
        datasets: [
          {
            label: "Conditions",
            data: [
              data.humedad_relativa_media,
              data.cobertura_nubosa,
              data.indice_uv * 10,
              data.viento_velocidad_media * 5,
            ],
            backgroundColor: ["#4ecdc4", "#95a5a6", "#f39c12", "#3498db"],
            borderWidth: 3,
            borderColor: "#fff",
            hoverOffset: 15,
          },
        ],
      },
      options: {
        maintainAspectRatio: false,
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: "🌍 Atmospheric Profile",
            font: { size: 16, weight: "bold" },
            color: "#212930",
            padding: { bottom: 20 },
          },
          legend: {
            display: true,
            position: "bottom",
            labels: {
              padding: 15,
              font: { size: 11 },
              color: "#495057",
              usePointStyle: true,
              pointStyle: "circle",
            },
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.label || "";
                let realValue = "";
                if (label.includes("Humidity"))
                  realValue = `${data.humedad_relativa_media}%`;
                else if (label.includes("Clouds"))
                  realValue = `${data.cobertura_nubosa}%`;
                else if (label.includes("UV")) realValue = `${data.indice_uv}`;
                else if (label.includes("Wind"))
                  realValue = `${data.viento_velocidad_media} m/s`;
                return ` ${label}: ${realValue}`;
              },
            },
          },
          datalabels: {
            color: "#fff",
            font: { weight: "bold", size: 13 },
            formatter: (value, context) => {
              const label = context.chart.data.labels[context.dataIndex];
              if (label.includes("Humidity"))
                return data.humedad_relativa_media + "%";
              else if (label.includes("Clouds"))
                return data.cobertura_nubosa + "%";
              else if (label.includes("UV")) return data.indice_uv;
              else if (label.includes("Wind"))
                return data.viento_velocidad_media + " m/s";
            },
          },
        },
      },
    });
  }

  // =========================================================================
  // --- SECCIÓN DE DESCARGA (MODIFICADA PARA INGLÉS) ---
  // =========================================================================

  // Mapa para traducir claves de la API de español a inglés.
  const SPANISH_TO_ENGLISH_KEYS = {
    temperatura_media: "average_temperature",
    prob_lluvia: "rain_probability",
    indice_uv: "uv_index",
    viento_velocidad_media: "average_wind_speed",
    humedad_relativa_media: "average_relative_humidity",
    cobertura_nubosa: "cloud_coverage",
    calidad_aire: "air_quality",
    concentracion_polvo: "dust_concentration",
    prob_calor_extremo: "extreme_heat_probability",
    prob_frio_extremo: "extreme_cold_probability",
    prob_nieve: "snow_probability",
    temperatura_minima: "minimum_temperature",
    temperatura_maxima: "maximum_temperature",
    precipitacion_media: "average_precipitation",
    prob_vientos_fuertes: "strong_wind_probability",
    sensacion_climatica: "weather_feel",
    datos_nasa: "nasa_data",
    recomendaciones_ai: "ai_recommendation",
  };

  function addDownloadListeners(result) {
    document
      .getElementById("download-pdf")
      .addEventListener("click", () => handlePdfDownload(result));
    document
      .getElementById("download-csv")
      .addEventListener("click", () => handleCsvDownload(result));
    document
      .getElementById("download-json")
      .addEventListener("click", () => handleJsonDownload(result));
  }

  function triggerDownload(content, fileName, contentType) {
    const a = document.createElement("a");
    const file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  }

  // --- Descarga de JSON en inglés ---
  function handleJsonDownload(result) {
    const englishResult = {
      locationName: result.locationName,
      date: result.date,
      [SPANISH_TO_ENGLISH_KEYS.ai_recommendation]: result.recomendaciones_ai,
      [SPANISH_TO_ENGLISH_KEYS.datos_nasa]: {},
    };

    for (const spanishKey in result.datos_nasa) {
      const englishKey = SPANISH_TO_ENGLISH_KEYS[spanishKey] || spanishKey;
      englishResult[SPANISH_TO_ENGLISH_KEYS.datos_nasa][englishKey] =
        result.datos_nasa[spanishKey];
    }

    const jsonData = JSON.stringify(englishResult, null, 2);
    triggerDownload(jsonData, "weather_report.json", "application/json");
  }

  // --- Descarga de CSV en inglés ---
  function handleCsvDownload(result) {
    let csvContent = "Metric,Value\n";
    const dataToExport = result.datos_nasa;

    const formatToTitleCase = (key) =>
      key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

    for (const spanishKey in dataToExport) {
      const englishKey = SPANISH_TO_ENGLISH_KEYS[spanishKey] || spanishKey;
      const formattedKey = formatToTitleCase(englishKey);
      csvContent += `"${formattedKey}","${dataToExport[spanishKey]}"\n`;
    }

    const recommendationKey = formatToTitleCase(
      SPANISH_TO_ENGLISH_KEYS["recomendaciones_ai"]
    );
    csvContent += `"${recommendationKey}","${result.recomendaciones_ai}"\n`;

    triggerDownload(
      csvContent,
      "weather_report.csv",
      "text/csv;charset=utf-8;"
    );
  }

  // --- Descarga de PDF en inglés ---
  function handlePdfDownload(result) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const data = result.datos_nasa;
    const locationName = result.locationName;
    const selectedDate = new Date(
      result.date + "T12:00:00Z"
    ).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Climate Analysis Report", 105, 20, { align: "center" });
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    const locationString = `Location: ${locationName}`;
    const locationLines = doc.splitTextToSize(locationString, 170);
    doc.text(locationLines, 105, 30, { align: "center" });
    const dateY = 30 + locationLines.length * 5;
    doc.text(`Analysis Date: ${selectedDate}`, 105, dateY, { align: "center" });
    const lineY = dateY + 8;
    doc.setLineWidth(0.5);
    doc.line(20, lineY, 190, lineY);

    const recommendationY = lineY + 13;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("AI Recommendation", 20, recommendationY);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    const recommendationLines = doc.splitTextToSize(
      result.recomendaciones_ai,
      170
    );
    doc.text(recommendationLines, 20, recommendationY + 7);

    const tableBody = [];
    const formatToTitleCase = (key) =>
      key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

    for (const spanishKey in data) {
      const englishKey = SPANISH_TO_ENGLISH_KEYS[spanishKey] || spanishKey;
      const formattedKey = formatToTitleCase(englishKey);
      tableBody.push([formattedKey, data[spanishKey]]);
    }

    const tableStartY =
      recommendationY + 7 + recommendationLines.length * 5 + 5;
    doc.autoTable({
      startY: tableStartY,
      head: [["NASA POWER Metric", "Recorded Value"]],
      body: tableBody,
      theme: "striped",
      headStyles: { fillColor: [67, 105, 215] },
    });

    doc.save("weather_report.pdf");
  }
});