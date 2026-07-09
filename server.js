require("dotenv").config();

const proj4 = require("proj4");


// definizione coordinate svizzere LV95

proj4.defs(
    "EPSG:2056",
    "+proj=somerc +lat_0=46.95240555555556 +lon_0=7.439583333333333 +k_0=1 +x_0=2600000 +y_0=1200000 +ellps=bessel +towgs84=674.374,15.056,405.346,0,0,0,0 +units=m +no_defs"
);

const { initializeApp, cert } = require("firebase-admin/app");
const { getDatabase } = require("firebase-admin/database");

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

const app = initializeApp({
    credential: cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL
});

const db = getDatabase(app);

console.log("Firebase collegato");

async function getSwissAltitude(lat, lon) {


    try {

        // WGS84 -> LV95

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


        const url =
        `https://api3.geo.admin.ch/rest/services/height?easting=${easting}&northing=${northing}&sr=2056`;


        const response = await fetch(url);


        const data = await response.json();


        return Number(data.height);


    } catch(error) {

        console.error("Errore altezza swisstopo:", error);

        return null;

    }

}

let firstRun = true;

async function getGarminData() {

    let begin;

    if (firstRun) {
        console.log("Prima esecuzione: scarico tutto lo storico...");
        begin = new Date(0).toISOString();
        firstRun = false;
    } else {
        begin = new Date(
            Date.now() - Number(process.env.LOOKBACK_SECONDS) * 1000
        ).toISOString();
    }


    const url =
        `https://livetrack.garmin.com/api/sessions/${process.env.GARMIN_SESSION_ID}/track-points/common?token=${process.env.GARMIN_TOKEN}&begin=${encodeURIComponent(begin)}`;


    try {

        const response = await fetch(url, {
            headers: {
                "accept": "*/*",
                "livetrack-csrf-token": process.env.GARMIN_CSRF_TOKEN,
                "cookie": process.env.GARMIN_COOKIE,
                "referer": process.env.GARMIN_REFERER,
                "user-agent": "Mozilla/5.0"
            }
        });


        const text = await response.text();


        if (!text) {
            console.log("Nessun nuovo punto ricevuto");
            return;
        }


        const data = JSON.parse(text);


        if (!data.trackPoints || data.trackPoints.length === 0) {
            console.log("Nessun punto disponibile");
            return;
        }


        const punti = [];


        for (const p of data.trackPoints) {


            const altezzaSwiss = await getSwissAltitude(
                p.position.lat,
                p.position.lon
            );


            punti.push({

                id: new Date(p.dateTime).getTime(),

                orario: p.dateTime,


                coordinate: {
                    lat: p.position.lat,
                    lon: p.position.lon
                },


                distanza: {
                    metri: p.totalDistanceMeters,
                    km: Number((p.totalDistanceMeters / 1000).toFixed(2))
                },


                altitudine: {
                    metri: altezzaSwiss
                },


                velocita: {
                    m_s: p.speedMetersPerSec,
                    km_h: Number((p.speedMetersPerSec * 3.6).toFixed(1))
                },


                tempo_trascorso: {
                    secondi: p.totalDurationSecs,
                    minuti: Number((p.totalDurationSecs / 60).toFixed(1))
                },


                stato: p.pointStatus

            });

        }


        console.table(punti);


        for (const punto of punti) {

            await db
                .ref("livetrack/points/" + punto.id)
                .set(punto);

        }


        console.log(`${punti.length} punti salvati su Firebase`);


    } catch (error) {

        console.error("Errore Garmin:", error);

    }

}


async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function start() {

    while (true) {

        console.log(`[${new Date().toLocaleString()}] Aggiornamento...`);

        try {
            await getGarminData();
        } catch (err) {
            console.error(err);
        }

        await sleep(Number(process.env.UPDATE_INTERVAL));
    }
}

start();