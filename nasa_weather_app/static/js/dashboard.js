document.addEventListener("DOMContentLoaded", () => {
  // --- Element selectors ---
  const searchForm = document.getElementById("location-form");
  const searchInput = document.getElementById("location-search");
  const locationDisplayInput = document.getElementById("location-display");
  const latInput = document.getElementById("latitude");
  const lonInput = document.getElementById("longitude");
  const dateInput = document.getElementById("date");
  const analyzeButton = document.getElementById("analyze-button");
  const loadingOverlay = document.getElementById("loading-overlay");

  // --- DATE CONFIGURATION ---
  // Allow any date to be selected in the calendar.
  dateInput.value = "";

  // --- Map and search logic ---
  // --- Current location button logic ---
  const currentLocationButton = document.getElementById("current-location-button");
  if (currentLocationButton) {
    currentLocationButton.addEventListener("click", () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            updateLocationFields(lat, lon);
            map.setView([lat, lon], 13);
          },
          (error) => {
            alert("Could not get your location.");
          }
        );
      } else {
        alert("Geolocation is not supported by your browser.");
      }
    });
  }
  const map = L.map("map").setView([23.6345, -102.5528], 5);
  let marker;
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap",
  }).addTo(map);

  map.on("click", (e) => updateLocationFields(e.latlng.lat, e.latlng.lng));

  searchForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const locationName = searchInput.value;
    if (!locationName) return;
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          locationName
        )}&format=json&limit=1`
      );
      const locations = await response.json();
      if (locations.length > 0) {
        const bestResult = locations[0];
        updateLocationFields(
          bestResult.lat,
          bestResult.lon,
          bestResult.display_name
        );
        map.setView([bestResult.lat, bestResult.lon], 13);
      } else {
        throw new Error("No results found.");
      }
    } catch (error) {
      alert(error.message);
    }
  });

  async function updateLocationFields(lat, lon, displayName = null) {
    latInput.value = parseFloat(lat).toFixed(6);
    lonInput.value = parseFloat(lon).toFixed(6);
    if (marker) {
      marker.setLatLng([lat, lon]);
    } else {
      marker = L.marker([lat, lon]).addTo(map);
    }
    if (!displayName) {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
        );
        const data = await response.json();
        locationDisplayInput.value = data.display_name || "Unknown location";
      } catch (e) {
        locationDisplayInput.value = "Unknown location";
      }
    } else {
      locationDisplayInput.value = displayName;
    }
  }

  // --- "Analyze" button event ---
  analyzeButton.addEventListener("click", async () => {
    const lat = latInput.value;
    const lon = lonInput.value;
    const date = dateInput.value;

    // --- INICIO DE LA NUEVA VALIDACIÓN ---
    // 1. Validar que los campos no estén vacíos
    if (!lat || !lon || !date) {
      alert("Please select a location and a date.");
      return; // Detiene la ejecución si falta algo
    }

    // 2. Doble verificación de la fecha para TODOS los dispositivos
    const minDate = dateInput.min; // Obtiene la fecha mínima permitida (mañana)
    if (date < minDate) {
      alert(`Invalid date. Please select a date on or after ${minDate}.`);
      return; // Detiene la ejecución si la fecha es pasada
    }
    // --- FIN DE LA NUEVA VALIDACIÓN ---

    loadingOverlay.style.display = "flex";
    analyzeButton.disabled = true;

    try {
      const apiUrl = "https://wirop-api-production.up.railway.app/clima";
      const requestData = {
        latitud: parseFloat(lat),
        longitud: parseFloat(lon),
        fecha: date,
      };

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.detail || "An error occurred while querying the API."
        );
      }

      const result = await response.json();

      result.locationName = locationDisplayInput.value || "selected location";
      result.date = date;

      sessionStorage.setItem("weatherData", JSON.stringify(result));

      window.location.href = "nasa_weather_app/templates/results.html";
    } catch (error) {
      alert(`Error: ${error.message}`);
      loadingOverlay.style.display = "none";
    } finally {
      analyzeButton.disabled = false;
    }
  });

  // --- Automatic geolocation ---
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        updateLocationFields(lat, lon);
        map.setView([lat, lon], 13);
      },
      (error) => {
        console.warn("Could not get location:", error.message);
      }
    );
  }
});
