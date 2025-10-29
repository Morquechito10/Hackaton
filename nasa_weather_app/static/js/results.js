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
        label: "Frio extremo",
        icon: "🥶",
        theme: "card-cold",
      },
      { key: "prob_nieve", label: "Nieve", icon: "❄️", theme: "card-snow" },
    ],
  };
    // Helper para obtener la etiqueta en español de una métrica
  const allMetricsMap = [...ALL_METRICS.main, ...ALL_METRICS.other].reduce(
    (map, metric) => {
      map[metric.key] = metric.label;
      return map;
    },
    {}
  );

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
      "muy incomodo": "../static/images/incomodo.png",
      "muy frio": "../static/images/frio.png",
      "muy humedo": "../static/images/humedo.png",
      ventoso: "../static/images/ventoso.jpg",
      agradable: "../static/images/agradable.png",
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

  function loadMarkedLibrary() {
    return new Promise((resolve, reject) => {
      if (window.marked) {
        resolve();
        return;
      }

      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/marked/marked.min.js";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load Marked.js"));
      document.head.appendChild(script);
    });
  }
  function formatBasicMarkdown(text) {
    // Una función de respaldo simple si Marked.js falla
    // Reemplaza saltos de línea por <br> y **negrita** por <strong>
    if (typeof text !== "string") return "";
    return text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\n/g, "<br>");
  }

  // --- Lógica de Visualización Principal ---
  async function displayResults(result) {
    const data = result.datos_nasa;
    const recommendation = result.recomendaciones_ai;
    const locationName = result.locationName;
    const selectedDate = result.date;
    const displayDate = new Date(selectedDate + "T12:00:00Z");
    const dateOptions = { year: "numeric", month: "long", day: "numeric" };
    const formattedDate = displayDate.toLocaleString("es-ES", dateOptions); // Cambiado a español
    const mainWeatherIcon = getWeatherIcon(data);
    const weatherImagePath = getWeatherImagePath(data.sensacion_climatica);
    try {
      await loadMarkedLibrary();
    } catch (error) {
      console.warn("Could not load Marked.js, using basic formatter", error);
    }
    const formattedRecommendation = window.marked
      ? window.marked.parse(recommendation)
      : formatBasicMarkdown(recommendation);

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
                <div class="recommendation">${formattedRecommendation}</div>
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
    // Busca "modal-close" DENTRO del elemento "modal" que ya encontraste
    modal.querySelector("#modal-close")
      .addEventListener("click", () => modal.classList.remove("visible"));

    // Haz lo mismo para "modal-save"
    modal.querySelector("#modal-save").addEventListener("click", () => {
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
            label: "Temperatura (°C)", // Español
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
          y: { title: { display: true, text: "Temperatura (°C)" } }, // Español
          x: {
            title: { display: true, text: "Hora del Día" }, // Español
            ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 8 },
          },
        },
        plugins: {
          title: {
            display: true,
            text: "📈 Estimación de Temperatura Diaria", // Español
            font: { size: 18 },
            padding: { bottom: 25 },
          },
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => ` Temperatura: ${context.parsed.y}°C`, // Español
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
        labels: ["💧 Humedad", "☁️ Nubosidad", "☀️ Índice UV", "💨 Viento"], // Español
        datasets: [
          {
            label: "Condiciones", // Español
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
            text: "🌍 Perfil Atmosférico", // Español
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
                if (label.includes("Humedad"))
                  // Comprobación en español
                  realValue = `${data.humedad_relativa_media}%`;
                else if (label.includes("Nubosidad"))
                  // Comprobación en español
                  realValue = `${data.cobertura_nubosa}%`;
                else if (label.includes("Indice UV"))
                  // Comprobación en español
                  realValue = `${data.indice_uv}`;
                else if (label.includes("Viento"))
                  // Comprobación en español
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
              if (label.includes("Humedad"))
                // Comprobación en español
                return data.humedad_relativa_media + "%";
              else if (label.includes("Nubosidad"))
                // Comprobación en español
                return data.cobertura_nubosa + "%";
              else if (label.includes("Indice UV"))
                // Comprobación en español
                return data.indice_uv;
              else if (label.includes("Viento"))
                // Comprobación en español
                return data.viento_velocidad_media + " m/s";
            },
          },
        },
      },
    });
  }

  // =========================================================================
  // --- SECCIÓN DE DESCARGA (EN ESPAÑOL) ---
  // =========================================================================



  function getSpanishLabel(key) {
    if (allMetricsMap[key]) {
      return allMetricsMap[key];
    }
    // Fallback para claves que no están en ALL_METRICS (ej. temperatura_minima)
    return key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  }

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

  // --- Descarga de JSON en español ---
  function handleJsonDownload(result) {
    const jsonData = JSON.stringify(result, null, 2);
    triggerDownload(jsonData, "reporte_climatico.json", "application/json");
  }

  // --- Descarga de CSV en español ---
  function handleCsvDownload(result) {
    let csvContent = "Metrica,Valor\n";
    const dataToExport = result.datos_nasa;

    for (const key in dataToExport) {
      const label = getSpanishLabel(key);
      csvContent += `"${label}","${dataToExport[key]}"\n`;
    }

    csvContent += `"Recomendación de IA","${result.recomendaciones_ai}"\n`;

    triggerDownload(
      csvContent,
      "reporte_climatico.csv",
      "text/csv;charset=utf-8;"
    );
  }

  // --- Descarga de PDF en español ---
  function handlePdfDownload(result) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const data = result.datos_nasa;
    const locationName = result.locationName;
    const selectedDate = new Date(
      result.date + "T12:00:00Z"
    ).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Reporte de Análisis Climático", 105, 20, { align: "center" });
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    const locationString = `Ubicación: ${locationName}`;
    const locationLines = doc.splitTextToSize(locationString, 170);
    doc.text(locationLines, 105, 30, { align: "center" });
    const dateY = 30 + locationLines.length * 5;
    doc.text(`Fecha de Análisis: ${selectedDate}`, 105, dateY, {
      align: "center",
    });
    const lineY = dateY + 8;
    doc.setLineWidth(0.5);
    doc.line(20, lineY, 190, lineY);

    const recommendationY = lineY + 13;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Recomendación de IA", 20, recommendationY);

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");

    // --- INICIO DE LA CORRECCIÓN ---
    // Regex para eliminar la mayoría de emojis y caracteres gráficos
    const emojiRegex = /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/g;
    
    // Regex para eliminar caracteres de Markdown como ##, **, _, etc.
    const markdownRegex = /([*_#`~]{1,3})/g;
    
    // 1. Limpia el texto de emojis y markdown
    const cleanRecommendation = result.recomendaciones_ai
                                    .replace(emojiRegex, '')    // Elimina emojis
                                    .replace(markdownRegex, '') // Elimina ##, **, etc.
                                    .replace(/  +/g, ' ');     // Limpia espacios dobles que queden

    // 2. Usa el texto limpio para el PDF
    const recommendationLines = doc.splitTextToSize(
      cleanRecommendation, // Usamos la variable limpia
      170
    );
    doc.text(recommendationLines, 20, recommendationY + 7);
    // --- FIN DE LA CORRECCIÓN ---

    const tableBody = [];
    for (const key in data) {
      const label = getSpanishLabel(key);
      tableBody.push([label, data[key]]);
    }

    const tableStartY =
      recommendationY + 7 + recommendationLines.length * 5 + 5;
    doc.autoTable({
      startY: tableStartY,
      head: [["Métrica de NASA POWER", "Valor Registrado"]],
      body: tableBody,
      theme: "striped",
      headStyles: { fillColor: [67, 105, 215] },
    });

    doc.save("reporte_climatico.pdf");
  }
});
