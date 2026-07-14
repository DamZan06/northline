const firebaseURL = "https://northline-a4eaa-default-rtdb.europe-west1.firebasedatabase.app/livetrack/points.json";
const defaultCenter = [46.0, 8.9];
const defaultZoom = 12;
let mapInstance = null;
let routeLine = null;
let startMarker = null;
let finishMarker = null;
let liveMarker = null;
let visitorMarker = null;
let chartInstances = {};
let activeLayer = null;
function getTileProviders() {
    if (typeof L === 'undefined') return {};
    return {
        osm: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }),
        satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution: '© Esri' }),
        topo: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', { attribution: '© OpenTopoMap', maxZoom: 17, maxNativeZoom: 17 })
    };
}
function formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
}
function formatRelativeDate(timestamp) {
    const date = new Date(timestamp);
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return `${diff}s fa`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m fa`;
    return `${Math.floor(diff / 3600)}h fa`;
}
function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('northline-theme', theme);
}
function initializeTheme() {
    const saved = localStorage.getItem('northline-theme');
    setTheme(saved === 'light' ? 'light' : 'dark');
    document.getElementById('themeToggle')?.addEventListener('click', () => {
        setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
    });
}
function buildNav() {
    const tileProviders = getTileProviders();
    document.querySelectorAll('[data-layer]').forEach(button => button.addEventListener('click', () => {
        const key = button.dataset.layer;
        if (!tileProviders[key] || !mapInstance) return;
        activeLayer?.remove();
        activeLayer = tileProviders[key].addTo(mapInstance);
    }));
}
async function fetchPoints() {
    try {
        const response = await fetch(firebaseURL);
        const data = await response.json();
        if (!data) return [];
        return Object.values(data).sort((a, b) => a.id - b.id);
    } catch (error) {
        console.warn('Impossibile leggere i dati live:', error);
        return [];
    }
}
function buildSummary(points) {
    if (!points.length) return null;
    const lastPoint = points[points.length - 1];
    const totalDistance = lastPoint.distanza.km ?? 0;
    const duration = lastPoint.tempo_trascorso?.secondi ?? 0;
    const speed = duration > 0 ? (lastPoint.distanza.metri / duration) * 3.6 : 0;
    const elevationGain = points.reduce((acc, point, index) => {
        if (index === 0) return 0;
        const diff = point.altitudine.metri - points[index - 1].altitudine.metri;
        return acc + Math.max(diff, 0);
    }, 0);
    return {
        points,
        lastPoint,
        totalDistance,
        duration,
        speed,
        elevationGain,
        progress: Math.min(totalDistance / 290 * 100, 100),
        status: speed > 0.5 ? 'In movimento' : 'In pausa'
    };
}
function updateHomeSummary(summary) {
    if (!summary) return;
    document.getElementById('homeDistance').textContent = summary.totalDistance.toFixed(1);
    document.getElementById('homeRemaining').textContent = Math.max(0, 290 - summary.totalDistance).toFixed(1);
    document.getElementById('homeCompletion').textContent = `${summary.progress.toFixed(1)}%`;
    document.getElementById('homeTime').textContent = formatTime(summary.duration);
    document.getElementById('homeGain').textContent = Math.round(summary.elevationGain);
    document.getElementById('homeSteps').textContent = Math.round(summary.totalDistance * 1420).toLocaleString();
    document.getElementById('homeStatusLabel').textContent = summary.status;
    document.getElementById('homeStatusText').textContent = summary.status === 'In movimento' ? 'Tracker attivo e aggiornato.' : 'Dati disponibili, attesa prossima posizione.';
}
function createChart(canvasId, label, labels, data, color) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return null;
    if (chartInstances[canvasId]) chartInstances[canvasId].destroy();
    chartInstances[canvasId] = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets: [{ label, data, borderColor: color, backgroundColor: `${color}33`, tension: 0.3, fill: true, pointRadius: 0 }] },
        options: { responsive: true, plugins: { legend: { display: false } }, scales: { x: { display: true, title: { display: true, text: 'Punti' } }, y: { display: true } } }
    });
    return chartInstances[canvasId];
}
function ensureLeafletAssets() {
    if (typeof L === 'undefined' || !L.Icon || !L.Icon.Default) return;
    L.Icon.Default.imagePath = 'https://unpkg.com/leaflet/dist/images/';
}
function addMapControl() {
    if (typeof L === 'undefined' || !mapInstance) return;
    const tileProviders = getTileProviders();
    const styleOptions = [
        { key: 'osm', title: 'Mappa standard' },
        { key: 'satellite', title: 'Vista satellitare' },
        { key: 'topo', title: 'Mappa topografica' }
    ];
    const MapControl = L.Control.extend({
        onAdd: function() {
            const wrapper = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom map-control');
            const toggleButton = L.DomUtil.create('button', 'map-toggle-btn', wrapper);
            toggleButton.type = 'button';
            toggleButton.title = 'Scegli stile mappa';
            toggleButton.innerHTML = '🗺️';
            L.DomEvent.disableClickPropagation(toggleButton);
            const stylePanel = L.DomUtil.create('div', 'style-panel', wrapper);
            stylePanel.setAttribute('aria-label', 'Selezione stile mappa');
            styleOptions.forEach(({ key, title }) => {
                const card = L.DomUtil.create('button', 'style-card', stylePanel);
                card.type = 'button';
                card.title = title;
                card.dataset.key = key;
                card.setAttribute('aria-label', title);
                const preview = L.DomUtil.create('span', `style-preview ${key}`, card);
                const label = L.DomUtil.create('span', 'style-label', card);
                label.textContent = key === 'osm' ? 'Mappa' : key === 'satellite' ? 'Sat' : 'Topo';
                L.DomEvent.disableClickPropagation(card);
                card.addEventListener('click', event => {
                    event.stopPropagation();
                    if (!tileProviders[key]) return;
                    activeLayer?.remove();
                    activeLayer = tileProviders[key].addTo(mapInstance);
                    if (key === 'topo' && mapInstance.getZoom() > 17) {
                        mapInstance.setZoom(17);
                    }
                    stylePanel.querySelectorAll('.style-card').forEach(el => el.classList.toggle('active', el.dataset.key === key));
                });
                if (key === 'osm') card.classList.add('active');
            });
            toggleButton.addEventListener('click', event => {
                L.DomEvent.stopPropagation(event);
                stylePanel.classList.toggle('open');
            });
            mapInstance.on('click', () => {
                stylePanel.classList.remove('open');
            });
            return wrapper;
        }
    });
    mapInstance.addControl(new MapControl({ position: 'topright' }));
}
function initMap() {
    if (mapInstance) return;
    if (typeof L === 'undefined') return;
    ensureLeafletAssets();
    const tileProviders = getTileProviders();
    mapInstance = L.map('map', { zoomControl: false }).setView(defaultCenter, defaultZoom);
    activeLayer = tileProviders.osm.addTo(mapInstance);
    L.control.zoom({ position: 'topright' }).addTo(mapInstance);
    addMapControl();
    const gpxUrl = 'data/NorthLine_3.gpx';
    try {
        new L.GPX(gpxUrl, {
            async: true,
            marker_options: { startIconUrl: null, endIconUrl: null, shadowUrl: null },
            polyline_options: { color: '#ff9f1c', weight: 7, opacity: 0.95 }
        }).on('loaded', e => {
            const track = e.target;
            if (track && typeof track.getBounds === 'function') {
                mapInstance.fitBounds(track.getBounds(), { padding: [40, 40] });
            }
        }).on('error', e => {
            console.warn('Impossibile caricare GPX:', e);
        }).addTo(mapInstance);
    } catch (err) {
        console.warn('GPX initialization fallita:', err);
    }
}
function refreshMapRoute(points) {
    if (!mapInstance || !points.length) return;
    const coords = points.map(p => [p.coordinate.lat, p.coordinate.lon]);
    const shouldFitToBounds = !routeLine;
    if (routeLine) routeLine.setLatLngs(coords);
    else routeLine = L.polyline(coords, { color: '#4fc3ff', weight: 5, opacity: 0.8 }).addTo(mapInstance);
    if (!startMarker) startMarker = L.marker(coords[0]).addTo(mapInstance).bindPopup('Partenza');
    if (!finishMarker) finishMarker = L.marker(coords[coords.length - 1]).addTo(mapInstance).bindPopup('Posizione attuale');
    else finishMarker.setLatLng(coords[coords.length - 1]);
    if (!liveMarker) liveMarker = L.circleMarker(coords[coords.length - 1], { radius: 10, fillColor: '#49a8ff', color: '#fff', weight: 2, fillOpacity: 0.95 }).addTo(mapInstance);
    else liveMarker.setLatLng(coords[coords.length - 1]);
    if (shouldFitToBounds) {
        mapInstance.fitBounds(routeLine.getBounds(), { padding: [40, 40] });
    }
}
function updateLiveUI(summary) {
    if (!summary) return;
    document.getElementById('distance').textContent = `${summary.totalDistance.toFixed(1)} km`;
    document.getElementById('remaining').textContent = `${Math.max(0, 290 - summary.totalDistance).toFixed(1)} km`;
    document.getElementById('completion').textContent = `${summary.progress.toFixed(1)}%`;
    document.getElementById('completionText').textContent = `${summary.progress.toFixed(1)}%`;
    document.getElementById('speed').textContent = `${summary.speed.toFixed(1)} km/h`;
    document.getElementById('altitude').textContent = `${summary.lastPoint.altitudine.metri.toFixed(0)} m`;
    document.getElementById('lastUpdate').textContent = formatRelativeDate(summary.lastPoint.orario);
    document.getElementById('time').textContent = formatTime(summary.duration);
    document.getElementById('elevation').textContent = `${Math.round(summary.elevationGain)} m`;
    document.getElementById('steps').textContent = Math.round(summary.totalDistance * 1420).toLocaleString();
    document.getElementById('progressBar').style.width = `${summary.progress.toFixed(1)}%`;
}
function updateVisitorDistance(lastPoint) {
    if (!navigator.geolocation) {
        document.getElementById('visitorDistance').textContent = 'Non supportato';
        return;
    }
    navigator.geolocation.getCurrentPosition(position => {
        const R = 6371e3;
        const toRad = deg => deg * Math.PI / 180;
        const lat1 = toRad(position.coords.latitude);
        const lat2 = toRad(lastPoint.coordinate.lat);
        const dLat = toRad(lastPoint.coordinate.lat - position.coords.latitude);
        const dLon = toRad(lastPoint.coordinate.lon - position.coords.longitude);
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;
        document.getElementById('visitorDistance').textContent = `${(distance / 1000).toFixed(1)} km`;
    }, () => {
        document.getElementById('visitorDistance').textContent = 'Permesso negato';
    });
}
async function initLivePage() {
    initializeTheme();
    initMap();
    buildNav();
    document.getElementById('panelToggle')?.addEventListener('click', () => document.getElementById('statsContent')?.classList.toggle('open'));
    const points = await fetchPoints();
    const summary = buildSummary(points);
    updateLiveUI(summary);
    if (summary) {
        refreshMapRoute(summary.points);
        updateVisitorDistance(summary.lastPoint);
    }
    setInterval(async () => {
        const points = await fetchPoints();
        const summary = buildSummary(points);
        updateLiveUI(summary);
        if (summary) refreshMapRoute(summary.points);
    }, 8000);
}
async function initHomePage() {
    initializeTheme();
    const points = await fetchPoints();
    const summary = buildSummary(points);
    if (summary) updateHomeSummary(summary);
}
function buildChartData(points) {
    const labels = points.map((_, index) => `${index + 1}`);
    return {
        labels,
        speedData: points.map(p => p.velocita.km_h),
        altitudeData: points.map(p => p.altitudine.metri),
        dailyLabels: [...new Set(points.map(p => new Date(p.orario).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })))] ,
        kmDaily: points.reduce((acc, point) => {
            const day = new Date(point.orario).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
            acc[day] = Math.max(acc[day] ?? 0, point.distanza.km);
            return acc;
        }, {})
    };
}
async function initDashboardPage() {
    initializeTheme();
    const points = await fetchPoints();
    const summary = buildSummary(points) || { totalDistance: 0, speed: 0, elevationGain: 0, duration: 0, progress: 0, lastPoint: { altitudine: { metri: 0 } } };
    const metricDistance = document.getElementById('metricDistance');
    const metricRemaining = document.getElementById('metricRemaining');
    const metricCompletion = document.getElementById('metricCompletion');
    const metricSpeed = document.getElementById('metricSpeed');
    const metricAltitude = document.getElementById('metricAltitude');
    const metricElevation = document.getElementById('metricElevation');
    const metricTime = document.getElementById('metricTime');
    if (metricDistance) metricDistance.textContent = `${summary.totalDistance.toFixed(1)} km`;
    if (metricRemaining) metricRemaining.textContent = `${Math.max(0, 290 - summary.totalDistance).toFixed(1)} km`;
    if (metricCompletion) metricCompletion.textContent = `${summary.progress.toFixed(1)}%`;
    if (metricSpeed) metricSpeed.textContent = `${summary.speed.toFixed(1)} km/h`;
    if (metricAltitude) metricAltitude.textContent = `${summary.lastPoint.altitudine.metri.toFixed(0)} m`;
    if (metricElevation) metricElevation.textContent = `${Math.round(summary.elevationGain)} m`;
    if (metricTime) metricTime.textContent = formatTime(summary.duration);
    const chartData = buildChartData(points.length ? points : [{ velocita: { km_h: 0 }, altitudine: { metri: 0 }, orario: new Date().toISOString() }]);
    createChart('chartSpeed', 'Velocità', chartData.labels, chartData.speedData, '#49a8ff');
    createChart('chartAltitude', 'Altitudine', chartData.labels, chartData.altitudeData, '#7f7dff');
    createChart('chartKm', 'Km giornalieri', Object.keys(chartData.kmDaily), Object.values(chartData.kmDaily), '#5dd97d');
    createChart('chartElevation', 'Dislivello', chartData.labels, chartData.altitudeData.map((value, index) => (index % 5) * 80), '#f3c03d');
}
async function initGalleryPage() {
    initializeTheme();
    const items = [
        { title: 'Punto panoramico', location: 'Monte Generoso', tag: 'montagna', description: 'Vista sul Lago di Lugano al tramonto.', image: 'assets/preview.png' },
        { title: 'Checkpoint', location: 'Passo del San Gottardo', tag: 'checkpoint', description: 'Bivacco e ristoro lungo il percorso.', image: 'assets/preview.png' },
        { title: 'Campo notte', location: 'Valle Alpina', tag: 'bivacco', description: 'Tenda montata a quota 2100 m.', image: 'assets/preview.png' },
        { title: 'City stop', location: 'Mendrisio', tag: 'città', description: 'Pausa tecnica prima del tratto alpino.', image: 'assets/preview.png' }
    ];
    const grid = document.querySelector('.gallery-grid');
    const modal = document.querySelector('.modal-backdrop');
    const modalTitle = document.getElementById('modalTitle');
    const modalLocation = document.getElementById('modalLocation');
    const modalDescription = document.getElementById('modalDescription');
    const modalImage = document.getElementById('modalImage');
    items.forEach(item => {
        const card = document.createElement('article');
        card.className = 'gallery-item';
        card.dataset.filter = item.tag;
        card.innerHTML = `<img src="${item.image}" alt="${item.title}"><div class="gallery-meta"><h3>${item.title}</h3><p>${item.location}</p></div>`;
        card.addEventListener('click', () => {
            modalTitle.textContent = item.title;
            modalLocation.textContent = item.location;
            modalDescription.textContent = item.description;
            modalImage.src = item.image;
            modal.classList.add('active');
        });
        grid.appendChild(card);
    });
    document.querySelectorAll('.gallery-filter button').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.gallery-item').forEach(card => {
                card.style.display = button.dataset.filter === 'all' || card.dataset.filter === button.dataset.filter ? 'grid' : 'none';
            });
        });
    });
    document.querySelector('.modal-close')?.addEventListener('click', () => modal.classList.remove('active'));
    modal.addEventListener('click', event => { if (event.target === modal) modal.classList.remove('active'); });
}
async function initDiaryPage() {
    initializeTheme();
    const entries = [
        { title: 'Giorno 1 – Partenza', date: '07/07/2026', km: '18', text: 'Partenza da Mendrisio, clima fresco e arrivo al primo bivacco.', image: 'assets/preview.png' },
        { title: 'Giorno 3 – Passo del San Gottardo', date: '09/07/2026', km: '36', text: 'Attraversamento del passo con panorami spettacolari.', image: 'assets/preview.png' },
        { title: 'Giorno 5 – Valle alpina', date: '11/07/2026', km: '45', text: 'Sentieri tecnici e momenti di avventura pura.', image: 'assets/preview.png' }
    ];
    const container = document.querySelector('.diary-list');
    entries.forEach(entry => {
        const article = document.createElement('article');
        article.className = 'diary-entry';
        article.innerHTML = `<img src="${entry.image}" alt="${entry.title}"><div><time>${entry.date}</time><h3>${entry.title}</h3><p><strong>${entry.km} km</strong> · ${entry.text}</p></div>`;
        container.appendChild(article);
    });
}
async function initTimelinePage() {
    initializeTheme();
    const events = [
        { time: '07:30', title: 'Partenza', description: 'Inizio del percorso con entusiasmo.' },
        { time: '09:10', title: 'Mendrisio', description: 'Primo checkpoint e colazione veloce.' },
        { time: '11:45', title: 'Panorama', description: 'Sosta per ammirare le vette.' },
        { time: '14:00', title: 'Monte Generoso', description: 'Salita al crinale e vista sul lago.' },
        { time: '18:20', title: 'Tramonto', description: 'Fine giornata con colori mozzafiato.' },
        { time: '20:30', title: 'Campo notte', description: 'Arrivo al bivacco e riposo.' }
    ];
    const list = document.querySelector('.timeline-list');
    events.forEach(event => {
        const article = document.createElement('article');
        article.className = 'timeline-event';
        article.innerHTML = `<time>${event.time}</time><h3>${event.title}</h3><p>${event.description}</p>`;
        article.addEventListener('click', () => alert(`Sposta la mappa su: ${event.title}`));
        list.appendChild(article);
    });
}
async function initReplayPage() {
    initializeTheme();
    initMap();
    buildNav();
    const points = await fetchPoints();
    const coords = points.length ? points.map(p => [p.coordinate.lat, p.coordinate.lon]) : [defaultCenter];
    const route = L.polyline(coords, { color: '#7f7ff', weight: 5 }).addTo(mapInstance);
    mapInstance.fitBounds(route.getBounds() || L.latLngBounds(coords), { padding: [40, 40] });
    let index = 0;
    const marker = L.circleMarker(coords[0], { radius: 12, color: '#ffb347', fillColor: '#ffd382', fillOpacity: 1 }).addTo(mapInstance);
    const statusLabel = document.getElementById('replayStatus');
    let interval = null;
    function updateMarker() {
        if (index >= coords.length) {
            clearInterval(interval);
            statusLabel.textContent = 'Replay completato';
            return;
        }
        marker.setLatLng(coords[index]);
        statusLabel.textContent = `Replay ${index + 1}/${coords.length}`;
        mapInstance.panTo(coords[index], { animate: true, duration: 0.45 });
        index += 1;
    }
    document.getElementById('replayPlay')?.addEventListener('click', () => { clearInterval(interval); interval = setInterval(updateMarker, Number(document.getElementById('replaySpeed')?.value || 500)); });
    document.getElementById('replayPause')?.addEventListener('click', () => clearInterval(interval));
    document.getElementById('replayReset')?.addEventListener('click', () => { clearInterval(interval); index = 0; marker.setLatLng(coords[0]); if (statusLabel) statusLabel.textContent = 'Replay pronto'; });
    document.getElementById('replaySpeed')?.addEventListener('input', event => { document.getElementById('replaySpeedLabel').textContent = `${event.target.value} ms`; });
}
async function initProgressPage() {
    initializeTheme();
    const points = await fetchPoints();
    const summary = buildSummary(points) || { totalDistance: 0, progress: 0 };
    const badges = [
        { title: '100 km', value: 100 },
        { title: '200 km', value: 200 },
        { title: '500 km', value: 500 },
        { title: '50%', value: 50 },
        { title: '75%', value: 75 },
        { title: '100%', value: 100 },
        { title: 'Primo bivacco', value: 10 },
        { title: 'Passo del San Gottardo', value: 30 },
        { title: 'Quota massima raggiunta', value: 42 }
    ];
    const grid = document.querySelector('.badge-grid');
    badges.forEach(badge => {
        const article = document.createElement('article');
        article.className = 'badge-card';
        const unlocked = badge.value <= summary.totalDistance || badge.value <= summary.progress;
        if (unlocked) article.classList.add('unlocked');
        article.innerHTML = `<h3>${badge.title}</h3><p>${unlocked ? 'Sbloccato' : 'In attesa'}</p>`;
        grid.appendChild(article);
    });
}
function showVisitorMarker(position) {
    if (!mapInstance || !position) return;
    const coords = [position.coords.latitude, position.coords.longitude];
    if (visitorMarker) visitorMarker.setLatLng(coords);
    else visitorMarker = L.marker(coords, { icon: L.divIcon({ className: 'visitor-icon', html: '<span>📍</span>', iconSize: [32, 32] }) }).addTo(mapInstance).bindPopup('La tua posizione');
    mapInstance.panTo(coords);
}
function initPage() {
    const page = document.body.dataset.page;
    if (!page) return;
    switch (page) {
        case 'home': initHomePage(); break;
        case 'live': initLivePage(); break;
        case 'dashboard': initDashboardPage(); break;
        case 'gallery': initGalleryPage(); break;
        case 'diary': initDiaryPage(); break;
        case 'timeline': initTimelinePage(); break;
        case 'replay': initReplayPage(); break;
        case 'progress': initProgressPage(); break;
        default: initializeTheme(); break;
    }
}
document.addEventListener('DOMContentLoaded', initPage);
