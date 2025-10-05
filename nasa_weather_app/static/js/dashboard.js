document.addEventListener('DOMContentLoaded', () => {
    // --- Selectores de elementos ---
    const searchForm = document.getElementById('location-form');
    const searchInput = document.getElementById('location-search');
    const locationDisplayInput = document.getElementById('location-display');
    const latInput = document.getElementById('latitude');
    const lonInput = document.getElementById('longitude');
    const dateInput = document.getElementById('date');
    // Establecer el mínimo al día siguiente
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yyyy = tomorrow.getFullYear();
    const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const dd = String(tomorrow.getDate()).padStart(2, '0');
    dateInput.min = `${yyyy}-${mm}-${dd}`;
    dateInput.value = ""; // <-- Deja el campo de fecha en blanco por defecto
    const analyzeButton = document.getElementById('analyze-button');
    const loadingOverlay = document.getElementById('loading-overlay'); // Para la pantalla de carga

    // --- Lógica del mapa y búsqueda (sin cambios) ---
    const map = L.map('map').setView([23.6345, -102.5528], 5);
    let marker;
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(map);
    dateInput.value = getTodayDateString();
    map.on('click', (e) => updateLocationFields(e.latlng.lat, e.latlng.lng));
    searchForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const locationName = searchInput.value;
        if (!locationName) return;
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationName)}&format=json&limit=1`);
            const locations = await response.json();
            if (locations.length > 0) {
                const bestResult = locations[0];
                updateLocationFields(bestResult.lat, bestResult.lon, bestResult.display_name);
                map.setView([bestResult.lat, bestResult.lon], 13);
            } else { throw new Error('No se encontraron resultados.'); }
        } catch (error) { alert(error.message); }
    });
    async function updateLocationFields(lat, lon, displayName = null) {
        latInput.value = parseFloat(lat).toFixed(6);
        lonInput.value = parseFloat(lon).toFixed(6);
        if (marker) { marker.setLatLng([lat, lon]); } 
        else { marker = L.marker([lat, lon]).addTo(map); }
        if (!displayName) {
            try {
                const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
                const data = await response.json();
                locationDisplayInput.value = data.display_name || "Ubicación desconocida";
            } catch (e) { locationDisplayInput.value = "Ubicación desconocida"; }
        } else { locationDisplayInput.value = displayName; }
    }

    // =================================================================
    //  MODIFICACIÓN PRINCIPAL: Evento del botón "Analizar"
    // =================================================================
    analyzeButton.addEventListener('click', async () => {
        const lat = latInput.value;
        const lon = lonInput.value;
        const date = dateInput.value;
        if (!lat || !lon || !date) {
            alert("Por favor, selecciona una ubicación y una fecha.");
            return;
        }

        // 1. Mostrar pantalla de carga
        loadingOverlay.style.display = 'flex';
        analyzeButton.disabled = true;

        try {
            const apiUrl = 'https://wirop-api-production.up.railway.app/clima'; // URL de la API
            const requestData = { latitud: parseFloat(lat), longitud: parseFloat(lon), fecha: date };

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Ocurrió un error al consultar la API.');
            }

            const result = await response.json();

            console.log('Respuesta de la API:', result); // <-- Imprime la respuesta en la consola
            
            // 2. Añadir datos extra al resultado para pasarlos a la siguiente página
            result.locationName = locationDisplayInput.value || "la ubicación seleccionada";
            result.date = date;

            // 3. Guardar los datos en sessionStorage
            sessionStorage.setItem('weatherData', JSON.stringify(result));

            // 4. Redirigir a la página de resultados
            window.location.href = "nasa_weather_app/templates/results.html";

        } catch (error) {
            alert(`Error: ${error.message}`);
            // Ocultar la pantalla de carga si hay un error
            loadingOverlay.style.display = 'none';
        } finally {
            analyzeButton.disabled = false;
        }
    });

    // --- Geolocalización automática ---
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                updateLocationFields(lat, lon);
                map.setView([lat, lon], 13);
            },
            (error) => {
                // Si el usuario rechaza, se mantiene la vista por defecto
                console.warn("No se pudo obtener la ubicación:", error.message);
            }
        );
    }

    // La función displayResults ya no se necesita en este archivo.
    
    function getTodayDateString() {
        const today = new Date();
        const offset = today.getTimezoneOffset();
        return new Date(today.getTime() - (offset * 60 * 1000)).toISOString().split('T')[0];
    }
});