require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

const User = require("./user");
const Notification = require("./notification");

const app = express();
const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.MONGOTOKEN || "TOKENTOJEMONGODB";

// =====================================================
// 🔹 CONEXIÓN A MONGODB
// =====================================================
mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("✅ Conectado a MongoDB"))
  .catch(err => console.error("❌ Error al conectar a MongoDB:", err));

// =====================================================
// 🔹 MIDDLEWARE
// =====================================================
app.use(cors());
app.use(bodyParser.json());

// Página raíz
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public.html"));
});
app.use(express.static(path.join(__dirname)));

// =====================================================
// 🔹 MODELOS
// =====================================================
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



// =====================================================
// 🔹 AUTENTICACIÓN
// =====================================================
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No autorizado - Token no proporcionado" });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.error("Error al verificar token:", err.message);
    return res.status(401).json({ error: "Token inválido o expirado" });
  }
};

// =====================================================
// 🔹 FUNCIÓN: CREAR NOTIFICACIÓN
// =====================================================
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

// =====================================================
// 🔹 RUTAS DE USUARIO
// =====================================================

// Registro de usuario + notificación de bienvenida
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

    // 🔔 Notificación de bienvenida
    await crearNotificacion(
      newUser._id.toString(),
      'sistema',
      '🎉 ¡Bienvenido a CanchaYa!',
      `Hola ${name}, gracias por registrarte. Ahora puedes reservar canchas fácilmente.`,
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

// Login
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
      { expiresIn: "24h" }
    );

    console.log(`✅ Login exitoso: ${user.email}`);
    res.json({ token, name: user.name, id: user._id });
  } catch (err) {
    console.error("Error en login:", err);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

// =====================================================
// 🔹 RUTAS DE RESERVAS
// =====================================================

// Crear reserva + notificación
app.post("/reservas", authMiddleware, async (req, res) => {
  try {
    const { nombre, email, telefono, cancha, fecha, hora } = req.body;

    if (!nombre || !email || !cancha || !fecha || !hora) {
      return res.status(400).json({ error: "Faltan campos obligatorios" });
    }

    const reservaExistente = await Reserva.findOne({ cancha, fecha, hora });
    if (reservaExistente) {
      return res.status(400).json({ error: "Ya existe una reserva para esa cancha, fecha y hora." });
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

    await crearNotificacion(
      req.user.id,
      'reserva',
      '✅ Reserva Confirmada',
      `Tu reserva para ${cancha} el ${fecha} a las ${hora} ha sido confirmada.`,
      reserva._id.toString(),
      '⚽',
      'alta'
    );

    res.status(201).json({ mensaje: "Reserva guardada exitosamente", reserva });
  } catch (err) {
    console.error("Error al guardar reserva:", err);
    res.status(500).json({ error: "Error al guardar la reserva" });
  }
});

// Obtener reservas del usuario
app.get("/reservas", authMiddleware, async (req, res) => {
  try {
    const reservas = await Reserva.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .lean();
    res.json(reservas);
  } catch (err) {
    console.error("Error al obtener reservas:", err);
    res.status(500).json({ error: "Error al obtener reservas" });
  }
});

// Cancelar reserva + notificación
app.delete("/reservas/:id", authMiddleware, async (req, res) => {
  try {
    const reserva = await Reserva.findOne({ _id: req.params.id, userId: req.user.id });
    if (!reserva) return res.status(404).json({ error: "Reserva no encontrada" });

    const datos = { cancha: reserva.cancha, fecha: reserva.fecha, hora: reserva.hora };
    await Reserva.deleteOne({ _id: req.params.id });

    await crearNotificacion(
      req.user.id,
      'cancelacion',
      '🗑️ Reserva Cancelada',
      `Tu reserva para ${datos.cancha} el ${datos.fecha} a las ${datos.hora} ha sido cancelada.`,
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

// =====================================================
// 🔹 RUTAS DE TORNEOS
// =====================================================
// Schema de Torneo
const torneoSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  fechaInicio: { type: Date, required: true },
  fechaFin: { type: Date, required: true },
  numEquipos: { type: Number, required: true },
  costo: { type: Number, required: true },
  ubicacion: { type: String, required: true },
  descripcion: { type: String, default: "" },
  creadorId: { type: String, required: true }, // ID del usuario que creó el torneo
  creadorNombre: { type: String, required: true }, // Nombre del creador
  equiposInscritos: [
    {
      nombre: { type: String, required: true },
      capitan: { type: String, required: true },
      telefono: { type: String, required: true },
      email: { type: String, required: true },
      fechaInscripcion: { type: Date, default: Date.now },
    },
  ],
  createdAt: { type: Date, default: Date.now },
});

const Torneo = mongoose.model("Torneo", torneoSchema);

// ========== RUTAS API ==========

// Crear torneo (requiere autenticación)
app.post("/api/torneos", authMiddleware, async (req, res) => {
  try {
    const {
      nombre,
      fechaInicio,
      fechaFin,
      numEquipos,
      costo,
      ubicacion,
      descripcion,
    } = req.body;

    // Validación de fechas
    if (new Date(fechaFin) <= new Date(fechaInicio)) {
      return res.status(400).json({
        error: "La fecha de finalización debe ser posterior a la fecha de inicio",
      });
    }

    const torneo = new Torneo({
      nombre,
      fechaInicio,
      fechaFin,
      numEquipos,
      costo,
      ubicacion,
      descripcion,
      creadorId: req.user.id,
      creadorNombre: req.user.name,
      equiposInscritos: [],
    });

    await torneo.save();
    res.status(201).json({
      mensaje: `¡Torneo "${nombre}" creado exitosamente!`,
      torneo,
    });
  } catch (err) {
    console.error("Error al crear torneo:", err);
    res.status(500).json({ error: "Error al crear el torneo" });
  }
});

// Obtener todos los torneos
app.get("/api/torneos", async (req, res) => {
  try {
    const torneos = await Torneo.find().sort({ createdAt: -1 }).lean();
    res.json(torneos);
  } catch (err) {
    console.error("Error al obtener torneos:", err);
    res.status(500).json({ error: "Error al obtener torneos" });
  }
});

// Obtener un torneo específico
app.get("/api/torneos/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const torneo = await Torneo.findById(id);

    if (!torneo) {
      return res.status(404).json({ error: "Torneo no encontrado" });
    }

    res.json(torneo);
  } catch (err) {
    console.error("Error al obtener torneo:", err);
    res.status(500).json({ error: "Error al obtener el torneo" });
  }
});

// Inscribir equipo en un torneo
app.post("/api/torneos/:id/equipos", async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, capitan, telefono, email } = req.body;

    const torneo = await Torneo.findById(id);

    if (!torneo) {
      return res.status(404).json({ error: "Torneo no encontrado" });
    }

    // Verificar si hay cupos disponibles
    if (torneo.equiposInscritos.length >= torneo.numEquipos) {
      return res.status(400).json({ error: "No hay cupos disponibles" });
    }

    // Verificar si ya existe un equipo con ese nombre
    const equipoExiste = torneo.equiposInscritos.some(
        (e) => e.nombre.toLowerCase() === nombre.toLowerCase()
    );

    if (equipoExiste) {
      return res.status(400).json({
        error: "Ya existe un equipo con ese nombre en este torneo",
      });
    }

    // Agregar equipo
    const equipo = {
      nombre,
      capitan,
      telefono,
      email,
      fechaInscripcion: new Date(),
    };

    torneo.equiposInscritos.push(equipo);
    await torneo.save();

    res.status(201).json({
      mensaje: `¡Equipo "${nombre}" inscrito exitosamente!`,
      torneo,
    });
  } catch (err) {
    console.error("Error al inscribir equipo:", err);
    res.status(500).json({ error: "Error al inscribir el equipo" });
  }
});

// Obtener equipos de un torneo específico
app.get("/api/torneos/:id/equipos", async (req, res) => {
  try {
    const { id } = req.params;
    const torneo = await Torneo.findById(id);

    if (!torneo) {
      return res.status(404).json({ error: "Torneo no encontrado" });
    }

    res.json({
      torneo: torneo.nombre,
      equipos: torneo.equiposInscritos,
      cuposDisponibles: torneo.numEquipos - torneo.equiposInscritos.length,
    });
  } catch (err) {
    console.error("Error al obtener equipos:", err);
    res.status(500).json({ error: "Error al obtener equipos" });
  }
});

// Eliminar un torneo (solo el creador)
app.delete("/api/torneos/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const torneo = await Torneo.findById(id);

    if (!torneo) {
      return res.status(404).json({ error: "Torneo no encontrado" });
    }

    // Verificar que el usuario sea el creador
    if (torneo.creadorId !== req.user.id) {
      return res.status(403).json({
        error: "No tienes permiso para eliminar este torneo. Solo el creador puede hacerlo."
      });
    }

    await Torneo.findByIdAndDelete(id);
    res.json({ mensaje: "Torneo eliminado exitosamente" });
  } catch (err) {
    console.error("Error al eliminar torneo:", err);
    res.status(500).json({ error: "Error al eliminar el torneo" });
  }
});

// Actualizar un torneo (solo el creador)
app.put("/api/torneos/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nombre,
      fechaInicio,
      fechaFin,
      numEquipos,
      costo,
      ubicacion,
      descripcion,
    } = req.body;

    const torneo = await Torneo.findById(id);

    if (!torneo) {
      return res.status(404).json({ error: "Torneo no encontrado" });
    }

    // Verificar que el usuario sea el creador
    if (torneo.creadorId !== req.user.id) {
      return res.status(403).json({
        error: "No tienes permiso para editar este torneo. Solo el creador puede hacerlo."
      });
    }

    // Validación de fechas
    if (fechaFin && fechaInicio && new Date(fechaFin) <= new Date(fechaInicio)) {
      return res.status(400).json({
        error: "La fecha de finalización debe ser posterior a la fecha de inicio",
      });
    }

    // Actualizar campos
    if (nombre) torneo.nombre = nombre;
    if (fechaInicio) torneo.fechaInicio = fechaInicio;
    if (fechaFin) torneo.fechaFin = fechaFin;
    if (numEquipos) torneo.numEquipos = numEquipos;
    if (costo !== undefined) torneo.costo = costo;
    if (ubicacion) torneo.ubicacion = ubicacion;
    if (descripcion !== undefined) torneo.descripcion = descripcion;

    await torneo.save();

    res.json({
      mensaje: "Torneo actualizado exitosamente",
      torneo,
    });
  } catch (err) {
    console.error("Error al actualizar torneo:", err);
    res.status(500).json({ error: "Error al actualizar el torneo" });
  }
});

// =====================================================
// 🔹 RUTA DE CONTACTO (CORREO)
// =====================================================
app.post("/api/enviar-correo", async (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message)
    return res.status(400).json({ error: "Faltan datos obligatorios." });

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.CORREO,
        pass: process.env.PASS
      }
    });

    const mailOptions = {
      from: `"Cancha Ya Soporte" <${process.env.CORREO}>`,
      to: process.env.CORREO,
      subject: `Nuevo mensaje de soporte - ${name}`,
      text: `📩 Nombre: ${name}\n📧 Correo: ${email}\n📝 Mensaje:\n${message}`
    };

    await transporter.sendMail(mailOptions);
    res.json({ ok: true, mensaje: "Correo enviado correctamente" });
  } catch (err) {
    console.error("Error al enviar correo:", err);
    res.status(500).json({ error: "Error al enviar el correo" });
  }
});

// =====================================================
// 🔹 SERVIDOR
// =====================================================
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📁 Sirviendo archivos desde: ${__dirname}`);
});
