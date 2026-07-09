const firebaseURL =
    "https://garmin-live-track-47fa9-default-rtdb.europe-west1.firebasedatabase.app/livetrack/points.json";


// ----------------
// MAPPA
// ----------------

const map = L.map("map", {
    zoomControl: false
})
.setView([46.0, 8.9], 13);


L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        attribution: "© OpenStreetMap"
    }
)
.addTo(map);


// ----------------
// VARIABILI
// ----------------

let garminLine = null;
let startMarker = null;
let liveMarker = null;

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


    document.getElementById("distance").innerHTML =
        lastPoint.distanza.km.toFixed(2)
        + " / "
        + (northLineDistance ? northLineDistance.toFixed(1) : "-")
        + " km";


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


        map.fitBounds(
            garminLine.getBounds()
        );


        firstLoad = false;

    }




    createCharts(points);

}



// ----------------
// GPX NORTH LINE
// ----------------

function loadGPX() {


    new L.GPX(
        "NorthLine_3.gpx",
        {

            async: true,


            marker_options: {

                startIcon: new L.Icon.Default(),

                endIcon: L.icon({

                    iconUrl:"finish-flag.gif",

                    iconSize:[45,45],

                    iconAnchor:[22,45]

                }),
                shadow: null

            },


            polyline_options: {

                color: "red",

                weight: 4,

                opacity: 0.8

            }

        }

    )
    .on("loaded", function(e){

        const gpx = e.target;


        // Distanza totale North Line

        northLineDistance =
            gpx._info.length / 1000;



        // Dislivello positivo totale North Line

        northLineElevation =
            gpx._info.elevation.gain;


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