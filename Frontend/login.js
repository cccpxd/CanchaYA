const API_BASE = "/";

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
            alert("✅ Registro exitoso. Ahora inicia sesión.");
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

    const email = document.getElementById("emailLogin").value.trim();
    const password = document.getElementById("passwordLogin").value.trim();

    try {
        const res = await fetch(`${API_BASE}login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (res.ok && data.token) {
            // Guardar token
            localStorage.setItem("token", data.token);

            // Mostrar interfaz de usuario logeado
            if (data.name) {
                const userNameEl = document.getElementById("userName");
                if (userNameEl) userNameEl.textContent = data.name;
            }

            document.getElementById("welcome").style.display = "block";
            document.getElementById("protectedContent").style.display = "block";
            document.getElementById("container").style.display = "block";
            document.getElementById("authForms").style.display = "none";
            document.getElementById("navLinks").style.display = "flex";

            loginForm.reset();
            await cargarReservas();
        } else {
            localStorage.removeItem("token");
            alert(data.error || "Usuario o contraseña incorrecta");
            mostrarLogin();
        }

    } catch (err) {
        console.error("Error en la conexión:", err);
        alert("Error al conectarse al servidor");
    }
});

// --- LOGOUT ---
function logout() {
    localStorage.removeItem("token");
    location.reload(); // Refresca para limpiar
}
window.logout = logout;

// --- FUNCIONES DE INTERFAZ ---
function mostrarLogin() {
    document.getElementById("authForms").style.display = "block";
    document.getElementById("welcome").style.display = "none";
    document.getElementById("protectedContent").style.display = "none";
    document.getElementById("container").style.display = "none";
    document.getElementById("navLinks").style.display = "none";
}

// --- CARGAR RESERVAS ---
async function cargarReservas() {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
        const res = await fetch(`${API_BASE}reservas`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!res.ok) {
            console.warn("Usuario no autorizado o token inválido");
            return mostrarLogin();
        }
        const reservas = await res.json();
        const lista = document.getElementById("reservasList");

        if (reservas.length === 0) {
            lista.innerHTML = `
                <p style="color: #999; text-align: center;">
                    No hay reservas aún. ¡Haz tu primera reserva!
                </p>`;
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
        document.getElementById("reservasList").innerHTML = `
            <p style="color: red;">Error al cargar reservas</p>`;
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
            alert("✅ Reserva guardada con éxito.");
            cargarReservas();
        } else {
            alert(data.error || "Error al guardar reserva");
        }

    } catch (err) {
        console.error(err);
        alert("Error al conectarse al servidor");
    }
});

// --- VALIDAR TOKEN AL INICIAR ---
document.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem("token");
    if (!token) {
        mostrarLogin();
        return;
    }

    try {
        // Intentar validar el token en el backend
        const res = await fetch(`${API_BASE}verify`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (res.ok) {
            document.getElementById("welcome").style.display = "block";
            document.getElementById("protectedContent").style.display = "block";
            document.getElementById("navLinks").style.display = "flex";
            document.getElementById("authForms").style.display = "none";
            document.getElementById("container").style.display = "block";
            await cargarReservas();
        } else {
            localStorage.removeItem("token");
            mostrarLogin();
        }
    } catch (err) {
        console.error("Error al validar token:", err);
        localStorage.removeItem("token");
        mostrarLogin();
    }
});





