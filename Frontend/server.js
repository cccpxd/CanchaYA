const express = require("express");
const fs = require("fs");
const path = require("path");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public"))); // sirve tu frontend

const filePath = path.join(__dirname, "reservas.json");

// Leer reservas
app.get("/reservas", (req, res) => {
    if (!fs.existsSync(filePath)) return res.json([]);
    const data = fs.readFileSync(filePath, "utf8");
    res.json(data ? JSON.parse(data) : []);
});

// Crear reserva
app.post("/reservas", (req, res) => {
    let reservas = [];
    if (fs.existsSync(filePath)) {
        reservas = JSON.parse(fs.readFileSync(filePath, "utf8") || "[]");
    }

    reservas.push(req.body);

    fs.writeFileSync(filePath, JSON.stringify(reservas, null, 2));
    res.json({ mensaje: "Reserva guardada", reserva: req.body });
});

app.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));
