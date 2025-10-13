require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("./user");

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
    userId: { type: String, required: true }
}, { timestamps: true });

const Reserva = mongoose.model("Reserva", reservaSchema);

// 🔹 Middleware de autenticación
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "No autorizado - Token no proporcionado" });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // contiene id y name
        next();
    } catch (err) {
        console.error("Error al verificar token:", err.message);
        return res.status(401).json({ error: "Token inválido o expirado" });
    }
};

// =====================================================
// ✅ RUTAS
// =====================================================

// 🔸 Verificar token (devuelve el nombre del usuario)
app.get("/verify", authMiddleware, (req, res) => {
    res.json({
        ok: true,
        name: req.user.name,
        id: req.user.id
    });
});

// 🔸 Crear reserva (solo usuarios autenticados)
app.post("/reservas", authMiddleware, async (req, res) => {
    try {
        const { nombre, email, telefono, cancha, fecha, hora } = req.body;

        // Validación de campos obligatorios
        if (!nombre || !email || !cancha || !fecha || !hora) {
            return res.status(400).json({
                error: "Faltan campos obligatorios: nombre, email, cancha, fecha y hora"
            });
        }

        // Verificar si ya existe una reserva para esa cancha en esa fecha/hora
        const reservaExistente = await Reserva.findOne({ cancha, fecha, hora });
        if (reservaExistente) {
            return res.status(400).json({
                error: "Ya existe una reserva para esa cancha, fecha y hora."
            });
        }

        // Crear nueva reserva
        const reserva = new Reserva({
            nombre,
            email,
            telefono: telefono || "",
            cancha,
            fecha,
            hora,
            userId: req.user.id
        });

        await reserva.save();

        res.status(201).json({
            mensaje: "Reserva guardada exitosamente",
            reserva
        });
    } catch (err) {
        console.error("Error al guardar reserva:", err);
        res.status(500).json({ error: "Error al guardar la reserva" });
    }
});

// 🔸 Obtener reservas del usuario logueado
app.get("/reservas", authMiddleware, async (req, res) => {
    try {
        const reservas = await Reserva.find({ userId: req.user.id })
            .sort({ createdAt: -1 })
            .lean();

        console.log(`📋 Usuario ${req.user.name} tiene ${reservas.length} reservas`);

        res.json(reservas);
    } catch (err) {
        console.error("Error al obtener reservas:", err);
        res.status(500).json({ error: "Error al obtener reservas" });
    }
});

// 🔸 Eliminar reserva (opcional, por si lo necesitas)
app.delete("/reservas/:id", authMiddleware, async (req, res) => {
    try {
        const reserva = await Reserva.findOne({
            _id: req.params.id,
            userId: req.user.id
        });

        if (!reserva) {
            return res.status(404).json({ error: "Reserva no encontrada" });
        }

        await Reserva.deleteOne({ _id: req.params.id });
        res.json({ mensaje: "Reserva eliminada" });
    } catch (err) {
        console.error("Error al eliminar reserva:", err);
        res.status(500).json({ error: "Error al eliminar reserva" });
    }
});

// 🔸 Registro de usuario
app.post("/register", async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: "Todos los campos son obligatorios" });
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Email inválido" });
    }

    // Validar contraseña
    if (password.length < 6) {
        return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres" });
    }

    try {
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ error: "El usuario ya existe" });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const newUser = new User({
            name: name.trim(),
            email: email.toLowerCase(),
            passwordHash
        });
        await newUser.save();

        console.log(`✅ Usuario registrado: ${email}`);
        res.status(201).json({ mensaje: "Usuario registrado correctamente" });
    } catch (err) {
        console.error("Error al registrar usuario:", err);
        res.status(500).json({ error: "Error al registrar usuario" });
    }
});

// 🔸 Login
app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Email y contraseña son obligatorios" });
    }

    try {
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(400).json({ error: "Usuario no encontrado" });
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
            return res.status(400).json({ error: "Contraseña incorrecta" });
        }

        const token = jwt.sign(
            { id: user._id.toString(), name: user.name },
            JWT_SECRET,
            { expiresIn: "24h" } // Extendido a 24 horas
        );

        console.log(`✅ Login exitoso: ${user.email}`);
        res.json({
            token,
            name: user.name,
            id: user._id
        });
    } catch (err) {
        console.error("Error en login:", err);
        res.status(500).json({ error: "Error en el servidor" });
    }
});

// 🔸 Ruta raíz (opcional)
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public.html"));
});

// Manejo de rutas no encontradas
app.use((req, res) => {
    res.status(404).json({ error: "Ruta no encontrada" });
});

// =====================================================
// ✅ Servidor
// =====================================================


// =======================
// GESTIÓN DE RESERVAS
// =======================

let reservas = [];

// Crear una reserva
app.post("/api/reservas", (req, res) => {
    const reserva = {
        id: Date.now().toString(),
        ...req.body,
    };
    reservas.push(reserva);
    res.status(201).json(reserva);
});

// Obtener reservas por usuario
app.get("/api/reservas", (req, res) => {
    const { email } = req.query;
    const userReservas = reservas.filter(r => r.email === email);
    res.json(userReservas);
});

// Eliminar reserva específica
app.delete("/api/reservas/:id", (req, res) => {
    const { id } = req.params;
    const originalLength = reservas.length;
    reservas = reservas.filter(r => r.id !== id);
    if (reservas.length < originalLength) {
        res.json({ message: "Reserva eliminada correctamente" });
    } else {
        res.status(404).json({ error: "Reserva no encontrada" });
    }
});

// Eliminar reservas vencidas
app.delete("/api/reservas/expired", (req, res) => {
    const hoy = new Date();
    const antes = reservas.length;
    reservas = reservas.filter(r => new Date(r.fecha) >= hoy);
    const eliminadas = antes - reservas.length;
    res.json({ eliminadas });
});


app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📁 Sirviendo archivos desde: ${__dirname}`);
});