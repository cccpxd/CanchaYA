// login.js

const API_BASE = "/"; // Ajusta si tu backend está en otra ruta

// --- REGISTRO ---
const registerForm = document.getElementById("registerForm");
registerForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("nameRegister").value;
    const email = document.getElementById("emailRegister").value;
    const password = document.getElementById("passwordRegister").value;

    try {
        const res = await fetch(`${API_BASE}register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password })
        });
        const data = await res.json();
        if (res.ok) {
            alert("Registro exitoso. Ahora inicia sesión.");
            registerForm.reset();
        } else {
            alert(data.error || "Error en el registro");
        }
    } catch (err) {
        console.error(err);
        alert("Error al conectarse al servidor");
    }
});

// --- LOGIN ---
const loginForm = document.getElementById("loginForm");
loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("emailLogin").value;
    const password = document.getElementById("passwordLogin").value;

    try {
        const res = await fetch(`${API_BASE}login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (res.ok) {
            // Guardar token y mostrar contenido protegido
            localStorage.setItem("token", data.token);
            document.getElementById("userName").textContent = data.name;
            document.getElementById("welcome").style.display = "block";
            document.getElementById("protectedContent").style.display = "block";
            loginForm.reset();
            cargarReservas();
        } else {
            alert(data.error || "Usuario o contraseña incorrecta");
        }
    } catch (err) {
        console.error(err);
        alert("Error al conectarse al servidor");
    }
});

// --- LOGOUT ---
function logout() {
    localStorage.removeItem("token");
    document.getElementById("welcome").style.display = "none";
    document.getElementById("protectedContent").style.display = "none";
}
window.logout = logout; // para que funcione onclick en HTML

// --- RESERVAS ---
async function cargarReservas() {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
        const res = await fetch(`${API_BASE}reservas`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("No autorizado");
        const reservas = await res.json();
        const lista = document.getElementById("reservasList");
        if (reservas.length === 0) {
            lista.innerHTML = '<p style="color: #999; text-align: center;">No hay reservas aún. ¡Haz tu primera reserva!</p>';
            return;
        }
        lista.innerHTML = reservas.map(r => `
            <div class="reserva-card">
                <strong>${r.nombre}</strong> - ${r.cancha} <br>
                📅 ${r.fecha} ⏰ ${r.hora}
            </div>
        `).join("");
    } catch (err) {
        console.error(err);
        document.getElementById("reservasList").innerHTML = '<p style="color: red;">Error al cargar reservas</p>';
    }
}

// --- CREAR RESERVA ---
const bookingForm = document.getElementById("bookingForm");
bookingForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token) return alert("Debes iniciar sesión primero");

    const reserva = {
        nombre: document.getElementById("nombreReserva").value,
        email: document.getElementById("emailReserva").value,
        telefono: document.getElementById("telefonoReserva").value,
        cancha: document.getElementById("cancha").value,
        fecha: document.getElementById("fecha").value,
        hora: document.getElementById("hora").value,
    };

    try {
        const res = await fetch(`${API_BASE}reservas`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(reserva)
        });
        const data = await res.json();
        if (res.ok) {
            bookingForm.reset();
            cargarReservas();
        } else {
            alert(data.error || "Error al guardar reserva");
        }
    } catch (err) {
        console.error(err);
        alert("Error al conectarse al servidor");
    }
});

// --- Inicialización ---
document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("token");
    if (token) {
        document.getElementById("welcome").style.display = "block";
        document.getElementById("protectedContent").style.display = "block";
        cargarReservas();
    }
});

function mostrarContenido(usuario) {
  document.getElementById("authForms").style.display = "none";
  document.getElementById("welcome").style.display = "block";
  document.getElementById("userName").textContent = usuario;
  document.getElementById("protectedContent").style.display = "block";
  document.getElementById("navLinks").style.display = "flex";
}

function logout() {
  localStorage.removeItem("usuario");
  document.getElementById("authForms").style.display = "flex";
  document.getElementById("welcome").style.display = "none";
  document.getElementById("protectedContent").style.display = "none";
  document.getElementById("navLinks").style.display = "none";
}

document.addEventListener("DOMContentLoaded", () => {
  const usuario = localStorage.getItem("usuario");
  if (usuario) mostrarContenido(usuario);
  
  document.getElementById("loginForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("emailLogin").value;
    localStorage.setItem("usuario", email);
    mostrarContenido(email);
  });

  document.getElementById("registerForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const nombre = document.getElementById("nameRegister").value;
    localStorage.setItem("usuario", nombre);
    mostrarContenido(nombre);
  });
});

