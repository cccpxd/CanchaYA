require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("./user"); // Asegúrate de tener User.js en la misma carpeta

const app = express();
const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.MONGOTOKEN || "supersecreto123";

// Conexión a MongoDB
mongoose.connect(process.env.MONGO_URL)
    .then(() => console.log("✅ Conectado a MongoDB"))
    .catch(err => console.error("❌ Error al conectar a MongoDB:", err));

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

// Modelo de reserva
const reservaSchema = new mongoose.Schema({
    nombre: String,
    email: String,
    telefono: String,
    cancha: String,
    fecha: String,
    hora: String,
    userId: { type: String, required: true } // Usuario que creó la reserva
});
const Reserva = mongoose.model("Reserva", reservaSchema);

// Middleware de autenticación
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization; // Se espera "Bearer <token>"
    if (!authHeader) return res.status(401).json({ error: "No autorizado" });

    const token = authHeader.split(" ")[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // contiene id y name
        next();
    } catch {
        res.status(401).json({ error: "Token inválido" });
    }
};

// Rutas reservas

// Crear reserva (solo usuarios autenticados)
app.post("/reservas", authMiddleware, async (req, res) => {
    try {
        const reserva = new Reserva({ ...req.body, userId: req.user.id });
        await reserva.save();
        res.json({ mensaje: "Reserva guardada", reserva });
    } catch (err) {
        res.status(500).json({ error: "Error al guardar la reserva" });
    }
});

// Obtener reservas del usuario logueado
app.get("/reservas", authMiddleware, async (req, res) => {
    try {
        const reservas = await Reserva.find({ userId: req.user.id }).sort({ _id: -1 });
        res.json(reservas);
    } catch (err) {
        res.status(500).json({ error: "Error al obtener reservas" });
    }
});

// Login
app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ error: "Usuario no encontrado" });

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return res.status(400).json({ error: "Contraseña incorrecta" });

        const token = jwt.sign({ id: user._id, name: user.name }, JWT_SECRET, { expiresIn: "1h" });

        res.json({ token, name: user.name });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error en el servidor" });
    }
});

app.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));

