require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("./user"); // tu modelo de usuario

const app = express();
const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.MONGOTOKEN || "supersecreto123";

// 🔹 Conexión a MongoDB
mongoose.connect(process.env.MONGO_URL)
    .then(() => console.log("✅ Conectado a MongoDB"))
    .catch(err => console.error("❌ Error al conectar a MongoDB:", err));

// 🔹 Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

// 🔹 Modelo de reserva
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

// 🔹 Middleware de autenticación
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization; // se espera "Bearer <token>"
    if (!authHeader) return res.status(401).json({ error: "No autorizado" });

    const token = authHeader.split(" ")[1];
    try {
        req.user = jwt.verify(token, JWT_SECRET); // contiene id y name
        next();
    } catch {
        res.status(401).json({ error: "Token inválido" });
    }
};

// =====================================================
// ✅ RUTAS
// =====================================================

// 🔸 Verificar token (para mantener la sesión activa)
app.get("/verify", authMiddleware, (req, res) => {
    res.json({ ok: true, user: req.user });
});

// 🔸 Crear reserva (solo usuarios autenticados)
app.post("/reservas", authMiddleware, async (req, res) => {
    try {
        const { cancha, fecha, hora } = req.body;

        // Verificar si ya existe una reserva igual
        const reservaExistente = await Reserva.findOne({ cancha, fecha, hora });
        if (reservaExistente) {
            return res.status(400).json({
                error: "Ya existe una reserva para esa cancha, fecha y hora.",
            });
        }

        // Crear nueva reserva
        const reserva = new Reserva({ ...req.body, userId: req.user.id });
        await reserva.save();

        res.json({ mensaje: "Reserva guardada", reserva });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al guardar la reserva" });
    }
});

// 🔸 Obtener reservas del usuario logueado
app.get("/reservas", authMiddleware, async (req, res) => {
    try {
        const reservas = await Reserva.find({ userId: req.user.id }).sort({ _id: -1 });
        res.json(reservas);
    } catch (err) {
        res.status(500).json({ error: "Error al obtener reservas" });
    }
});

// 🔸 Registro de usuario
app.post("/register", async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password)
        return res.status(400).json({ error: "Todos los campos son obligatorios" });

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser)
            return res.status(400).json({ error: "El usuario ya existe" });

        const passwordHash = await bcrypt.hash(password, 10);
        const newUser = new User({ name, email, passwordHash });
        await newUser.save();

        res.json({ mensaje: "Usuario registrado correctamente" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al registrar usuario" });
    }
});

// 🔸 Login
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

// =====================================================
// ✅ Servidor
// =====================================================
app.listen(PORT, () => console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`));
