const firebaseURL = 
"https://garmin-live-track-47fa9-default-rtdb.europe-west1.firebasedatabase.app/livetrack/points.json";


// crea mappa

const map = L.map("map").setView([46.0, 8.9], 13);


// carica OpenStreetMap

L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        attribution: "© OpenStreetMap"
    }
).addTo(map);



async function loadTrack() {

    console.log("Caricamento dati...");


    const response = await fetch(firebaseURL);

    const data = await response.json();


    console.log(data);


    if (!data) {
        console.log("Nessun dato trovato");
        return;
    }


    // Firebase restituisce un oggetto:
    // { timestamp1:{...}, timestamp2:{...} }

    const points = Object.values(data);


    // ordina dal più vecchio al più recente

    points.sort((a,b) => a.id - b.id);



    const coordinates = points.map(point => [

        point.coordinate.lat,

        point.coordinate.lon

    ]);



    console.log(coordinates);



    // disegna linea

    const line = L.polyline(
        coordinates,
        {
            weight: 5
        }
    ).addTo(map);



    // centra la mappa sul percorso

    map.fitBounds(line.getBounds());

}

function loadGPX(){

    new L.GPX("NorthLine.gpx", {

        async: true,

        polyline_options: {
            color: "red",
            weight: 4,
            opacity: 0.8
        }

    })
    .on("loaded", function(e){

        map.fitBounds(e.target.getBounds());

    })
    .addTo(map);

}

loadTrack();

loadGPX();

