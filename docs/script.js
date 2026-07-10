const firebaseURL =
    "https://northline-a4eaa-default-rtdb.europe-west1.firebasedatabase.app/livetrack/points.json";


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

let lastChartUpdate = 0;


// ----------------
// GRAFICI
// ----------------

function createCharts(points) {


    const speedData = points.map(
        p => ({
            x: p.distanza.km,
            y: p.velocita.km_h
        })
    );


    const elevationData = points.map(
        p => ({
            x: p.distanza.km,
            y: p.altitudine.metri
        })
    );



    // ----------------
    // GRAFICO VELOCITÀ
    // ----------------


    if (speedChart) {
        speedChart.destroy();
    }


    speedChart = new Chart(
        document.getElementById("speedChart"),
        {

            type: "line",

            data: {

                datasets: [
                    {
                        label: "Velocità",
                        data: speedData,
                        tension: 0.3,
                        pointRadius: 0
                    }
                ]

            },


            options: {

                responsive: true,

                maintainAspectRatio: false,


                plugins: {

                    legend: {
                        display:false
                    }

                },


                scales: {

                    x: {

                        type:"linear",

                        title:{
                            display:true,
                            text:"Distanza (km)"
                        }

                    },


                    y: {

                        title:{
                            display:true,
                            text:"Velocità (km/h)"
                        }

                    }

                }

            }

        }
    );





    // ----------------
    // GRAFICO ALTIMETRIA
    // ----------------


    if (elevationChart) {
        elevationChart.destroy();
    }


    elevationChart = new Chart(
        document.getElementById("elevationChart"),
        {

            type:"line",


            data: {

                datasets:[

                    {
                        label:"Altitudine",
                        data:elevationData,
                        tension:0.3,
                        pointRadius:0
                    }

                ]

            },


            options: {

                responsive:true,

                maintainAspectRatio:false,


                plugins: {

                    legend:{
                        display:false
                    }

                },


                scales:{


                    x: {

                        type:"linear",

                        title:{
                            display:true,
                            text:"Distanza (km)"
                        }

                    },


                    y: {

                        title:{
                            display:true,
                            text:"Altitudine (m)"
                        }

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
    // ULTIMO AGGIORNAMENTO
    // ----------------

    const updateDate = new Date(lastPoint.orario);


    const updateHours =
        updateDate.getHours()
        .toString()
        .padStart(2,"0");


    const updateMinutes =
        updateDate.getMinutes()
        .toString()
        .padStart(2,"0");


    const updateSeconds =
        updateDate.getSeconds()
        .toString()
        .padStart(2,"0");


    const secondsAgo =
        Math.floor(
            (Date.now() - updateDate.getTime()) / 1000
        );


    document.getElementById("lastUpdate").innerHTML =
        "Aggiornato: "
        + updateHours
        + ":"
        + updateMinutes
        + ":"
        + updateSeconds
        + "<br>("
        + secondsAgo
        + "s fa)";

    // ----------------
    // STATISTICHE
    // ----------------


    document.getElementById("distance").innerHTML =
        lastPoint.distanza.km.toFixed(2)
        + " / "
        + (northLineDistance ? northLineDistance.toFixed(1) : "-")
        + " km";

    // ----------------
    // COMPLETAMENTO
    // ----------------

    if (northLineDistance) {

        const progress =
            (lastPoint.distanza.km / northLineDistance) * 100;


        document.getElementById("progressText").innerHTML =
            "Completamento: "
            + progress.toFixed(1)
            + "%";


        document.getElementById("progressBar").style.width =
            Math.min(progress,100)
            + "%";

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
    // ETA ARRIVO
    // ----------------

    if (northLineDistance) {


        const currentDistance =
            lastPoint.distanza.km;


        const remainingDistance =
            northLineDistance - currentDistance;


        const currentSpeed =
            lastPoint.distanza.metri /
            seconds *
            3.6;


        if (currentSpeed > 0) {


            const remainingHours =
                remainingDistance / currentSpeed;


            const arrivalTime =
                new Date(
                    Date.now()
                    +
                    remainingHours * 3600000
                );


            const day =
                arrivalTime.getDate()
                .toString()
                .padStart(2,"0");


            const month =
                (arrivalTime.getMonth() + 1)
                .toString()
                .padStart(2,"0");


            const hours =
                arrivalTime.getHours()
                .toString()
                .padStart(2,"0");


            const minutes =
                arrivalTime.getMinutes()
                .toString()
                .padStart(2,"0");


            document.getElementById("eta").innerHTML =
                "Arrivo: "
                + day
                + "/"
                + month
                + " "
                + hours
                + ":"
                + minutes;


        }

    }



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

    const currentPosition = coordinates[coordinates.length - 1];



    if (!startMarker) {

        startMarker = L.marker(
            coordinates[0]
        )
        .addTo(map)
        .bindPopup("Partenza tracker");

    }

    if (garminLine) {

        garminLine.setLatLngs(coordinates);

    } else {

        garminLine = L.polyline(
            coordinates,
            {
                color:"blue",
                weight:5
            }
        ).addTo(map);

    }

    if (liveMarker) {

        liveMarker.setLatLng(currentPosition);

    } else {

        liveMarker = L.circleMarker(
            currentPosition,
            {
                radius: 10,
                color: "white",
                weight: 3,
                fillColor: "blue",
                fillOpacity: 1
            }
        ).addTo(map);

        liveMarker.bindPopup("");

    }



    const googleMapsURL =
        "https://www.google.com/maps/dir/?api=1&destination="
        + currentPosition[0]
        + ","
        + currentPosition[1];


    liveMarker.setPopupContent(`
        <b>Posizione attuale</b>
        <br><br>

        <button onclick="window.open('${googleMapsURL}', '_blank')">
            Indicazioni Google Maps
        </button>
    `);


    liveMarker.bringToFront();






    if (firstLoad) {


        map.fitBounds(
            garminLine.getBounds()
        );


        firstLoad = false;

    }


    const now = Date.now();

    if (now - lastChartUpdate >= 60000) {

        createCharts(points);

        lastChartUpdate = now;

    }

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


        northLineDistance =
            gpx._info.length / 1000;


        northLineElevation =
            gpx._info.elevation.gain;



        // PROFILO ALTIMETRICO NORTH LINE

        const points =
            gpx._info.elevation._points;


        northLineDistanceProfile =
            points.map(
                p => p.dist / 1000
            );


        northLineElevationProfile =
            points.map(
                p => p.ele
            );


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
    1000
);

const panel = document.getElementById("statsPanel");

panel.addEventListener("click", function (e) {

    panel.classList.toggle("expanded");

    // Evita che il click sui grafici richiuda il pannello
    e.stopPropagation();

});