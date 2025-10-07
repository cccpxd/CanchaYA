const API_BASE = "/";

// Estado global para evitar múltiples cargas
let isLoadingReservas = false;

// --- UTILIDADES ---
function showLoading(elementId) {
    const el = document.getElementById(elementId);
    if (el) el.innerHTML = '<p style="text-align:center;color:#666;">⏳ Cargando...</p>';
}

function mostrarLogin() {
    document.getElementById("authForms").style.display = "block";
    document.getElementById("welcome").style.display = "none";
    document.getElementById("protectedContent").style.display = "none";
    document.getElementById("container").style.display = "none";
    document.getElementById("navLinks").style.display = "none";
}

function mostrarApp(userName) {
    document.getElementById("welcome").style.display = "block";
    document.getElementById("protectedContent").style.display = "block";
    document.getElementById("container").style.display = "block";
    document.getElementById("authForms").style.display = "none";
    document.getElementById("navLinks").style.display = "flex";

    if (userName) {
        const userNameEl = document.getElementById("userName");
        if (userNameEl) userNameEl.textContent = userName;
    }
}

// --- REGISTRO ---
const registerForm = document.getElementById("registerForm");
registerForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("nameRegister").value.trim();
    const email = document.getElementById("emailRegister").value.trim();
    const password = document.getElementById("passwordRegister").value;

    if (!name || !email || !password) {
        return alert("⚠️ Todos los campos son obligatorios");
    }

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
            // Opcional: cambiar a pestaña de login
        } else {
            alert(data.error || "❌ Error en el registro");
        }
    } catch (err) {
        console.error("Error en registro:", err);
        alert("❌ Error de conexión. Verifica que el servidor esté activo.");
    }
});

// --- LOGIN ---
const loginForm = document.getElementById("loginForm");

loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("emailLogin").value.trim();
    const password = document.getElementById("passwordLogin").value.trim();

    if (!email || !password) {
        return alert("⚠️ Email y contraseña son obligatorios");
    }

    try {
        const res = await fetch(`${API_BASE}login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (res.ok && data.token) {
            // Guardar token y nombre
            localStorage.setItem("token", data.token);
            if (data.name) {
                localStorage.setItem("userName", data.name);
            }

            // Mostrar interfaz
            mostrarApp(data.name);
            loginForm.reset();

            // Cargar reservas después de mostrar la interfaz
            await cargarReservas();
        } else {
            localStorage.removeItem("token");
            localStorage.removeItem("userName");
            alert(data.error || "❌ Usuario o contraseña incorrecta");
        }

    } catch (err) {
        console.error("Error en login:", err);
        alert("❌ Error de conexión. Verifica que el servidor esté activo.");
    }
});

// --- LOGOUT ---
function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("userName");
    location.reload();
}
window.logout = logout;

// --- CARGAR RESERVAS ---
async function cargarReservas() {
    // Evitar múltiples cargas simultáneas
    if (isLoadingReservas) return;

    const token = localStorage.getItem("token");
    if (!token) {
        mostrarLogin();
        return;
    }

    isLoadingReservas = true;
    const lista = document.getElementById("reservasList");
    showLoading("reservasList");

    try {
        const res = await fetch(`${API_BASE}reservas`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!res.ok) {
            if (res.status === 401 || res.status === 403) {
                // Token inválido o expirado
                localStorage.removeItem("token");
                localStorage.removeItem("userName");
                mostrarLogin();
                alert("⚠️ Sesión expirada. Por favor, inicia sesión nuevamente.");
            } else {
                throw new Error("Error al obtener reservas");
            }
            return;
        }

        const reservas = await res.json();

        if (!Array.isArray(reservas)) {
            throw new Error("Formato de respuesta inválido");
        }

        if (reservas.length === 0) {
            lista.innerHTML = `
                <p style="color: #999; text-align: center; padding: 20px;">
                    📅 No hay reservas aún. ¡Haz tu primera reserva!
                </p>`;
        } else {
            lista.innerHTML = reservas.map(r => `
                <div class="reserva-card">
                    <strong>${r.nombre || 'Sin nombre'}</strong> - ${r.cancha || 'Sin cancha'}<br>
                    📅 ${r.fecha || 'Sin fecha'} ⏰ ${r.hora || 'Sin hora'}
                </div>
            `).join("");
        }

    } catch (err) {
        console.error("Error al cargar reservas:", err);
        lista.innerHTML = `
            <p style="color: #e74c3c; text-align: center; padding: 20px;">
                ❌ Error al cargar reservas. Intenta recargar la página.
            </p>`;
    } finally {
        isLoadingReservas = false;
    }
}

// --- CREAR RESERVA ---
const bookingForm = document.getElementById("bookingForm");
bookingForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const token = localStorage.getItem("token");
    if (!token) {
        alert("⚠️ Debes iniciar sesión primero");
        mostrarLogin();
        return;
    }

    const reserva = {
        nombre: document.getElementById("nombreReserva").value.trim(),
        email: document.getElementById("emailReserva").value.trim(),
        telefono: document.getElementById("telefonoReserva").value.trim(),
        cancha: document.getElementById("cancha").value,
        fecha: document.getElementById("fecha").value,
        hora: document.getElementById("hora").value,
    };

    // Validación básica
    if (!reserva.nombre || !reserva.email || !reserva.cancha || !reserva.fecha || !reserva.hora) {
        return alert("⚠️ Por favor completa todos los campos obligatorios");
    }

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
            await cargarReservas();
        } else if (res.status === 401 || res.status === 403) {
            localStorage.removeItem("token");
            localStorage.removeItem("userName");
            mostrarLogin();
            alert("⚠️ Sesión expirada. Por favor, inicia sesión nuevamente.");
        } else {
            alert(data.error || "❌ Error al guardar reserva");
        }

    } catch (err) {
        console.error("Error al crear reserva:", err);
        alert("❌ Error de conexión al guardar la reserva");
    }
});

// --- VALIDAR TOKEN AL INICIAR ---
document.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem("token");

    if (!token) {
        mostrarLogin();
        return;
    }

    // Mostrar indicador de carga
    const authForms = document.getElementById("authForms");
    if (authForms) {
        authForms.innerHTML = '<p style="text-align:center;padding:50px;color:#666;">⏳ Validando sesión...</p>';
        authForms.style.display = "block";
    }

    try {
        const res = await fetch(`${API_BASE}verify`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (res.ok) {
            const data = await res.json();
            const userName = data.name || localStorage.getItem("userName");

            mostrarApp(userName);
            await cargarReservas();
        } else {
            // Token inválido
            localStorage.removeItem("token");
            localStorage.removeItem("userName");
            mostrarLogin();
        }
    } catch (err) {
        console.error("Error al validar token:", err);
        // En caso de error de red, intentar usar la sesión localmente
        // pero informar al usuario
        const userName = localStorage.getItem("userName");
        if (userName) {
            mostrarApp(userName);
            // Intentar cargar reservas (puede fallar pero no bloqueará la UI)
            cargarReservas().catch(() => {
                document.getElementById("reservasList").innerHTML = `
                    <p style="color: #e67e22; text-align: center; padding: 20px;">
                         No se pudo conectar con el servidor. Verifica tu conexión.
                    </p>`;
            });
        } else {
            localStorage.removeItem("token");
            mostrarLogin();
        }
    }
});




