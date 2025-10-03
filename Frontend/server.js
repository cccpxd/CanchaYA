// Frontend/server.js
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 8080;

// Conexión a MongoDB (usa tu string de conexión en MONGODB_URI)
mongoose.connect(process.env.MONGO_URL)
    .then(() => console.log("✅ Conectado a MongoDB"))
    .catch(err => console.error("❌ Error al conectar a MongoDB:", err));


//
// Modelo de reserva
const reservaSchema = new mongoose.Schema({
    nombre: String,
    email: String,
    telefono: String,
    cancha: String,
    fecha: String,
    hora: String,
});
const Reserva = mongoose.model("Reserva", reservaSchema);

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

// Obtener reservas
app.get("/reservas", async (req, res) => {
    try {
        const reservas = await Reserva.find().sort({ _id: -1 });
        res.json(reservas);
    } catch (err) {
        res.status(500).json({ error: "Error al obtener reservas" });
    }
});

// Crear reserva
app.post("/reservas", async (req, res) => {
    try {
        const reserva = new Reserva(req.body);
        await reserva.save();
        res.json({ mensaje: "Reserva guardada", reserva });
    } catch (err) {
        res.status(500).json({ error: "Error al guardar la reserva" });
    }
});

app.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));
