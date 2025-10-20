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
// 🔸 Ruta raíz (opcional)
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public.html"));
});
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


const nodemailer = require("nodemailer");

// Ruta para recibir y reenviar mensajes del formulario de contacto
app.post("/api/enviar-correo", async (req, res) => {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
        return res.status(400).json({ error: "Faltan datos obligatorios." });
    }

    try {
        const transporter = nodemailer.createTransport({
            service: "gmail", // o usa smtp si es otro proveedor
            auth: {
                user: process.env.CORREO, // tu correo
                pass: process.env.PASS    // contraseña o app password
            }
        });

        const mailOptions = {
            from: `"Cancha Ya Soporte" <${process.env.CORREO}>`,
            to: process.env.CORREO, // correo donde recibes las reseñas
            subject: `Nuevo mensaje de soporte - ${name}`,
            text: `
      📩 Nuevo mensaje de soporte:

      👤 Nombre: ${name}
      📧 Correo: ${email}

      📝 Mensaje:
      ${message}
      `
        };

        await transporter.sendMail(mailOptions);

        res.json({ ok: true, mensaje: "Correo enviado correctamente" });
    } catch (error) {
        console.error("Error al enviar correo:", error);
        res.status(500).json({ error: "Error al enviar el correo" });
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
async function crearNotificacion(userId, tipo, titulo, mensaje, reservaId = null, icono = '🔔', prioridad = 'media') {
    try {
        const notificacion = new Notification({
            userId,
            tipo,
            titulo,
            mensaje,
            reservaId,
            icono,
            prioridad
        });
        await notificacion.save();
        console.log(`✅ Notificación creada para usuario ${userId}`);
        return notificacion;
    } catch (err) {
        console.error("❌ Error al crear notificación:", err);
        return null;
    }
}

// ============================================
// ENDPOINTS DE NOTIFICACIONES
// ============================================

// 📌 Obtener todas las notificaciones del usuario
app.get("/notificaciones", authMiddleware, async (req, res) => {
    try {
        const { limit = 50, skip = 0, solo_no_leidas } = req.query;
        
        const filtro = { userId: req.user.id };
        if (solo_no_leidas === 'true') {
            filtro.leida = false;
        }

        const notificaciones = await Notification.find(filtro)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip(parseInt(skip))
            .lean();

        const total = await Notification.countDocuments(filtro);
        const noLeidas = await Notification.countDocuments({ 
            userId: req.user.id, 
            leida: false 
        });

        res.json({
            notificaciones,
            total,
            noLeidas,
            mostradas: notificaciones.length
        });
    } catch (err) {
        console.error("❌ Error al obtener notificaciones:", err);
        res.status(500).json({ error: "Error al cargar notificaciones" });
    }
});

// 📌 Marcar notificación como leída
app.patch("/notificaciones/:id/leer", authMiddleware, async (req, res) => {
    try {
        const notificacion = await Notification.findOneAndUpdate(
            { _id: req.params.id, userId: req.user.id },
            { leida: true },
            { new: true }
        );

        if (!notificacion) {
            return res.status(404).json({ error: "Notificación no encontrada" });
        }

        res.json({ mensaje: "Notificación marcada como leída", notificacion });
    } catch (err) {
        console.error("❌ Error al marcar notificación:", err);
        res.status(500).json({ error: "Error al actualizar notificación" });
    }
});

// 📌 Marcar todas como leídas
app.patch("/notificaciones/leer-todas", authMiddleware, async (req, res) => {
    try {
        const resultado = await Notification.updateMany(
            { userId: req.user.id, leida: false },
            { leida: true }
        );

        res.json({ 
            mensaje: "Todas las notificaciones marcadas como leídas",
            actualizadas: resultado.modifiedCount
        });
    } catch (err) {
        console.error("❌ Error al marcar todas:", err);
        res.status(500).json({ error: "Error al actualizar notificaciones" });
    }
});

// 📌 Eliminar notificación
app.delete("/notificaciones/:id", authMiddleware, async (req, res) => {
    try {
        const notificacion = await Notification.findOneAndDelete({
            _id: req.params.id,
            userId: req.user.id
        });

        if (!notificacion) {
            return res.status(404).json({ error: "Notificación no encontrada" });
        }

        res.json({ mensaje: "Notificación eliminada" });
    } catch (err) {
        console.error("❌ Error al eliminar notificación:", err);
        res.status(500).json({ error: "Error al eliminar notificación" });
    }
});

// 📌 Eliminar todas las notificaciones leídas
app.delete("/notificaciones/limpiar-leidas", authMiddleware, async (req, res) => {
    try {
        const resultado = await Notification.deleteMany({
            userId: req.user.id,
            leida: true
        });

        res.json({ 
            mensaje: "Notificaciones leídas eliminadas",
            eliminadas: resultado.deletedCount
        });
    } catch (err) {
        console.error("❌ Error al limpiar notificaciones:", err);
        res.status(500).json({ error: "Error al limpiar notificaciones" });
    }
});

// 📌 Obtener contador de no leídas
app.get("/notificaciones/contador", authMiddleware, async (req, res) => {
    try {
        const noLeidas = await Notification.countDocuments({
            userId: req.user.id,
            leida: false
        });

        res.json({ noLeidas });
    } catch (err) {
        console.error("❌ Error al contar notificaciones:", err);
        res.status(500).json({ error: "Error al obtener contador" });
    }
});

// ============================================
// MODIFICAR RUTA DE CREAR RESERVA
// ============================================

// Reemplazar la ruta POST /reservas existente con esta versión mejorada:
app.post("/reservas", authMiddleware, async (req, res) => {
    try {
        const { nombre, email, telefono, cancha, fecha, hora } = req.body;

        if (!nombre || !email || !cancha || !fecha || !hora) {
            return res.status(400).json({
                error: "Faltan campos obligatorios: nombre, email, cancha, fecha y hora"
            });
        }

        const reservaExistente = await Reserva.findOne({ cancha, fecha, hora });
        if (reservaExistente) {
            return res.status(400).json({
                error: "Ya existe una reserva para esa cancha, fecha y hora."
            });
        }

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

        // 🔔 CREAR NOTIFICACIÓN DE RESERVA EXITOSA
        await crearNotificacion(
            req.user.id,
            'reserva',
            '✅ Reserva Confirmada',
            `Tu reserva para ${cancha} el ${fecha} a las ${hora} ha sido confirmada exitosamente.`,
            reserva._id.toString(),
            '⚽',
            'alta'
        );

        // 🔔 CREAR RECORDATORIO (24h antes)
        const fechaReserva = new Date(`${fecha}T${hora}`);
        const ahora = new Date();
        const horasHastaReserva = (fechaReserva - ahora) / (1000 * 60 * 60);

        if (horasHastaReserva > 24) {
            await crearNotificacion(
                req.user.id,
                'recordatorio',
                '⏰ Recordatorio de Reserva',
                `No olvides tu reserva para ${cancha} mañana a las ${hora}.`,
                reserva._id.toString(),
                '⏰',
                'media'
            );
        }

        res.status(201).json({
            mensaje: "Reserva guardada exitosamente",
            reserva
        });
    } catch (err) {
        console.error("Error al guardar reserva:", err);
        res.status(500).json({ error: "Error al guardar la reserva" });
    }
});

// ============================================
// MODIFICAR RUTA DE CANCELAR RESERVA
// ============================================

// Reemplazar la ruta DELETE /reservas/:id existente:
app.delete("/reservas/:id", authMiddleware, async (req, res) => {
    try {
        const reserva = await Reserva.findOne({
            _id: req.params.id,
            userId: req.user.id
        });

        if (!reserva) {
            return res.status(404).json({ error: "Reserva no encontrada" });
        }

        // Guardar datos antes de eliminar
        const datosReserva = {
            cancha: reserva.cancha,
            fecha: reserva.fecha,
            hora: reserva.hora
        };

        await Reserva.deleteOne({ _id: req.params.id });

        // 🔔 CREAR NOTIFICACIÓN DE CANCELACIÓN
        await crearNotificacion(
            req.user.id,
            'cancelacion',
            '🗑️ Reserva Cancelada',
            `Tu reserva para ${datosReserva.cancha} el ${datosReserva.fecha} a las ${datosReserva.hora} ha sido cancelada.`,
            null,
            '🗑️',
            'media'
        );

        res.json({ mensaje: "Reserva eliminada" });
    } catch (err) {
        console.error("Error al eliminar reserva:", err);
        res.status(500).json({ error: "Error al eliminar reserva" });
    }
});

// ============================================
// NOTIFICACIONES DE BIENVENIDA
// ============================================

// Modificar la ruta de registro para incluir notificación de bienvenida:
app.post("/register", async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: "Todos los campos son obligatorios" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Email inválido" });
    }

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

        // 🔔 NOTIFICACIÓN DE BIENVENIDA
        await crearNotificacion(
            newUser._id.toString(),
            'sistema',
            '🎉 ¡Bienvenido a CanchaYa!',
            `Hola ${name}, gracias por registrarte. Ahora puedes reservar canchas de fútbol de manera fácil y rápida.`,
            null,
            '🎉',
            'alta'
        );

        console.log(`✅ Usuario registrado: ${email}`);
        res.status(201).json({ mensaje: "Usuario registrado correctamente" });
    } catch (err) {
        console.error("Error al registrar usuario:", err);
        res.status(500).json({ error: "Error al registrar usuario" });
    }
});
