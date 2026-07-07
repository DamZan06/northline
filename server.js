const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.static("public"));


const GARMIN_URL = "INCOLLA QUI IL TUO URL COMPLETO";


app.get("/garmin", async (req, res) => {

    try {

        const response = await axios.get(GARMIN_URL);

        res.json(response.data);

    } catch(error) {

        console.log(error.message);
        res.status(500).json({
            error: "Garmin request failed"
        });

    }

});


app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});