require("dotenv").config();

const { initializeApp, cert } = require("firebase-admin/app");
const { getDatabase } = require("firebase-admin/database");

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

const app = initializeApp({
    credential: cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL
});

const db = getDatabase(app);

console.log("Firebase collegato");

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


        const punti = data.trackPoints.map(p => ({

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
                metri: p.altitude
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

        }));


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