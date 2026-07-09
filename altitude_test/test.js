const proj4 = require("proj4");


// definizione sistema svizzero LV95
proj4.defs(
    "EPSG:2056",
    "+proj=somerc +lat_0=46.95240555555556 +lon_0=7.439583333333333 +k_0=1 +x_0=2600000 +y_0=1200000 +ellps=bessel +towgs84=674.374,15.056,405.346,0,0,0,0 +units=m +no_defs"
);


// punto di prova (Lugano)

const lat = 46.0037;
const lon = 8.9511;



// conversione WGS84 -> LV95

const lv95 = proj4(
    "EPSG:4326",
    "EPSG:2056",
    [
        lon,
        lat
    ]
);


const easting = Math.round(lv95[0]);
const northing = Math.round(lv95[1]);


console.log("Coordinate LV95:");
console.log("Easting:", easting);
console.log("Northing:", northing);



async function getHeight(){

    const url =
    `https://api3.geo.admin.ch/rest/services/height?easting=${easting}&northing=${northing}&sr=2056`;


    const response = await fetch(url);


    const data = await response.json();


    console.log(data);


    console.log(
        "Altitudine:",
        data.height,
        "m"
    );

}


getHeight();