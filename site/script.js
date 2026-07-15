const firebaseURL =
    "https://northline-a4eaa-default-rtdb.europe-west1.firebasedatabase.app/livetrack/points.json";


// ----------------

// MAPPA
// ----------------

const map = L.map("map", {
    zoomControl: false
})
.setView([46.0, 8.9], 13);

let activeTileLayer = null;

function setMapStyle(style) {
    if (activeTileLayer) {
        map.removeLayer(activeTileLayer);
    }

    const tiles = {
        osm: {
            url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            attribution: "© OpenStreetMap"
        },
        sat: {
            url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            attribution: "© Esri, Maxar, Earthstar Geographics"
        },
        topo: {
            url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
            attribution: "© OpenTopoMap"
        }
    };

    const config = tiles[style] || tiles.osm;

    activeTileLayer = L.tileLayer(config.url, {
        attribution: config.attribution,
        maxZoom: 19
    }).addTo(map);
}

setMapStyle("osm");

document.querySelectorAll(".map-style-btn").forEach((button) => {
    button.addEventListener("click", () => {
        document.querySelectorAll(".map-style-btn").forEach((btn) => btn.classList.remove("active"));
        button.classList.add("active");
        setMapStyle(button.dataset.style);
    });
});


// ----------------
// VARIABILI
// ----------------

let garminLine = null;
let startMarker = null;
let liveMarker = null;
let gpxLayer = null;
let gpxRouteLine = null;
let finishMarker = null;
let gpxTrackPoints = [];
let gpxTrackLength = null;

let firstLoad = true;

let speedChart = null;
let elevationChart = null;

let northLineDistance = null;
let northLineElevation = null;


// ----------------
// GRAFICI
// ----------------

function createCharts(points) {

    const distance = points.map(
        p => p.distanza.km
    );

    const speed = points.map(
        p => p.velocita.km_h
    );

    const elevation = points.map(
        p => p.altitudine.metri
    );


    if (speedChart) {
        speedChart.destroy();
    }


    speedChart = new Chart(
        document.getElementById("speedChart"),
        {

            type: "line",

            data: {

                labels: distance,

                datasets: [
                    {
                        data: speed,
                        tension: 0.3
                    }
                ]

            },


            options: {

                responsive: true,

                plugins: {

                    legend: {
                        display: false
                    }

                }

            }

        }
    );



    if (elevationChart) {
        elevationChart.destroy();
    }


    elevationChart = new Chart(
        document.getElementById("elevationChart"),
        {

            type: "line",

            data: {

                labels: distance,

                datasets: [
                    {
                        data: elevation,
                        tension: 0.3
                    }
                ]

            },


            options: {

                responsive: true,

                plugins: {

                    legend: {
                        display: false
                    }

                }

            }

        }
    );

}


// ----------------
// DATI GARMIN
// ----------------

async function loadTrack() {


    const response = await fetch(firebaseURL);

    const data = await response.json();


    if (!data) {
        return;
    }


    const points = Object.values(data);


    points.sort(
        (a, b) => a.id - b.id
    );


    const lastPoint = points[points.length - 1];



    // ----------------
    // STATISTICHE
    // ----------------


    let completedDistance = lastPoint.distanza.km;
    let remainingDistance = null;

    if (northLineDistance && gpxTrackPoints.length) {
        const livePosition = [lastPoint.coordinate.lat, lastPoint.coordinate.lon];
        const routePoint = findClosestPointOnRoute(livePosition);

        if (routePoint) {
            const progressDistance = routePoint.distanceAlongRoute / 1000;
            const totalRouteDistance = northLineDistance;
            const remainingFromLive = Math.max(0, totalRouteDistance - progressDistance);
            const trackerRemaining = Math.max(0, totalRouteDistance - completedDistance);
            const progressRatio = Math.min(1, Math.max(0, completedDistance / totalRouteDistance));
            const trackerWeight = Math.max(0.2, 0.9 - progressRatio * 0.7);
            const liveWeight = 1 - trackerWeight;

            let mixedRemaining = trackerWeight * trackerRemaining + liveWeight * remainingFromLive;

            if (progressRatio < 0.6) {
                mixedRemaining += 1.5;
            } else {
                mixedRemaining -= Math.min(2.2, (progressRatio - 0.6) * 3.2);
            }

            remainingDistance = Math.max(0, mixedRemaining);
        }
    }

    document.getElementById("distance").innerHTML =
        completedDistance.toFixed(2)
        + " / "
        + (northLineDistance ? northLineDistance.toFixed(1) : "-")
        + " km";

    const remainingElement = document.getElementById("remaining");
    if (remainingElement) {
        remainingElement.innerHTML = remainingDistance !== null ? remainingDistance.toFixed(1) + " km" : "--";
    }


    const seconds =
        lastPoint.tempo_trascorso.secondi;


    const hours =
        Math.floor(seconds / 3600);


    const minutes =
        Math.floor((seconds % 3600) / 60);



    document.getElementById("time").innerHTML =
        `${hours}h ${minutes}min`;



    document.getElementById("speed").innerHTML =
        (
            lastPoint.distanza.metri /
            seconds *
            3.6
        ).toFixed(1) + " km/h";





    // ----------------
    // DISLIVELLO
    // ----------------


    let gain = 0;


    for (let i = 1; i < points.length; i++) {


        const diff =
            points[i].altitudine.metri -
            points[i - 1].altitudine.metri;


        if (diff > 0) {

            gain += diff;

        }

    }



    document.getElementById("elevation").innerHTML =
        Math.round(gain)
        + " / "
        + (northLineElevation ? Math.round(northLineElevation) : "-")
        + " m";




    // ----------------
    // COORDINATE
    // ----------------


    const coordinates = points.map(
        p => [
            p.coordinate.lat,
            p.coordinate.lon
        ]
    );

    if (gpxRouteLine) {
        map.removeLayer(gpxRouteLine);
    }

    if (gpxTrackPoints.length) {
        gpxRouteLine = L.polyline(
            gpxTrackPoints.map((point) => [point.lat, point.lng]),
            {
                color: "#d64545",
                weight: 4,
                opacity: 0.9
            }
        ).addTo(map);
    }





    if (garminLine) {

        map.removeLayer(garminLine);

    }

    if (!startMarker) {

        startMarker = L.marker(
            coordinates[0]
        )
        .addTo(map)
        .bindPopup("Partenza tracker");

    }

    garminLine = L.polyline(
        coordinates,
        {
            color: "blue",
            weight: 5
        }
    )
    .addTo(map);

    if (liveMarker) {
        map.removeLayer(liveMarker);
    }


    liveMarker = L.circleMarker(
        coordinates[coordinates.length - 1],
        {
            radius: 10,
            color: "white",
            weight: 3,
            fillColor: "blue",
            fillOpacity: 1
        }
    )
    .addTo(map)
    .bindPopup("Posizione attuale");


    liveMarker.bringToFront();






    if (firstLoad) {
        const initialBounds = gpxRouteLine && gpxRouteLine.getBounds
            ? gpxRouteLine.getBounds()
            : garminLine.getBounds();

        map.fitBounds(initialBounds);

        firstLoad = false;
    }




    createCharts(points);

}



function haversineDistance(a, b) {
    const toRad = (value) => value * Math.PI / 180;
    const dLat = toRad(b[0] - a[0]);
    const dLng = toRad(b[1] - a[1]);
    const lat1 = toRad(a[0]);
    const lat2 = toRad(b[0]);
    const sinLat = Math.sin(dLat / 2);
    const sinLng = Math.sin(dLng / 2);
    const h = sinLat * sinLat + sinLng * sinLng * Math.cos(lat1) * Math.cos(lat2);
    return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

function findClosestPointOnRoute(position) {
    if (!gpxTrackPoints.length) {
        return null;
    }

    let bestPoint = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (let i = 0; i < gpxTrackPoints.length; i += 1) {
        const point = gpxTrackPoints[i];
        const candidate = haversineDistance(position, [point.lat, point.lng]);
        if (candidate < bestDistance) {
            bestDistance = candidate;
            bestPoint = point;
        }
    }

    if (!bestPoint) {
        return null;
    }

    let accumulatedDistance = 0;
    let previous = null;

    for (let i = 0; i < gpxTrackPoints.length; i += 1) {
        const current = gpxTrackPoints[i];
        if (!previous) {
            previous = current;
            continue;
        }

        const segmentDistance = haversineDistance([previous.lat, previous.lng], [current.lat, current.lng]);
        if (current === bestPoint) {
            accumulatedDistance += segmentDistance;
            break;
        }

        accumulatedDistance += segmentDistance;
        previous = current;
    }

    return {
        distanceAlongRoute: accumulatedDistance,
        point: bestPoint
    };
}

// ----------------
// GPX NORTH LINE
// ----------------

function loadGPX() {
    const gpxLayerInstance = new L.GPX(
        "NorthLine_3.gpx",
        {
            async: true,
            marker_options: {
                startIcon: new L.Icon.Default(),
                endIcon: L.icon({
                    iconUrl: "finish-flag.gif",
                    iconSize: [45, 45],
                    iconAnchor: [22, 45]
                }),
                shadow: null
            },
            polyline_options: {
                color: "#d64545",
                weight: 4,
                opacity: 0.9
            }
        }
    )
    .on("loaded", function(e) {
        const gpx = e.target;
        gpxLayer = gpx;
        gpxTrackPoints = gpx._coords || [];
        gpxTrackLength = gpx._info.length || 0;
        northLineDistance = gpxTrackLength / 1000;
        northLineElevation = gpx._info.elevation.gain;

        if (finishMarker) {
            map.removeLayer(finishMarker);
        }

        finishMarker = L.marker([gpxTrackPoints[gpxTrackPoints.length - 1].lat, gpxTrackPoints[gpxTrackPoints.length - 1].lng], {
            icon: L.icon({
                iconUrl: "finish-flag.gif",
                iconSize: [45, 45],
                iconAnchor: [22, 45]
            })
        }).addTo(map).bindPopup("Arrivo GPX");

        gpxRouteLine = L.polyline(
            gpxTrackPoints.map((point) => [point.lat, point.lng]),
            {
                color: "#d64545",
                weight: 4,
                opacity: 0.9
            }
        ).addTo(map);

        if (firstLoad) {
            map.fitBounds(gpxRouteLine.getBounds());
        }
    })
    .addTo(map);
}



// ----------------
// AVVIO
// ----------------

loadGPX();

loadTrack();


setInterval(
    loadTrack,
    10000
);