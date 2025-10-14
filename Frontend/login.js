const API_BASE = "/";

// Estado global
let isLoadingReservas = false;
let isInitialized = false;

// --- UTILIDADES ---
function showLoading(elementId) {
    const el = document.getElementById(elementId);
    if (el) el.innerHTML = '<p style="text-align:center;color:#666;padding:20px;">⏳ Cargando...</p>';
}

function mostrarLogin() {
    console.log("🔒 Mostrando formulario de login");

    const authForms = document.getElementById("authForms");
    const welcome = document.getElementById("welcome");
    const protectedContent = document.getElementById("protectedContent");
    const navLinks = document.getElementById("navLinks");

    if (authForms) authForms.style.display = "flex";
    if (welcome) welcome.style.display = "none";
    if (protectedContent) protectedContent.style.display = "none";
    if (navLinks) navLinks.style.display = "none";
}

function mostrarApp(userName) {
    console.log("🔓 Mostrando app para:", userName);

    const authForms = document.getElementById("authForms");
    const welcome = document.getElementById("welcome");
    const protectedContent = document.getElementById("protectedContent");
    const navLinks = document.getElementById("navLinks");
    const userNameEl = document.getElementById("userName");

    // Ocultar formularios de auth
    if (authForms) authForms.style.display = "none";

    // Mostrar contenido protegido
    if (welcome) welcome.style.display = "block";
    if (protectedContent) protectedContent.style.display = "block";
    if (navLinks) navLinks.style.display = "flex";

    // Actualizar nombre de usuario
    if (userNameEl && userName) {
        userNameEl.textContent = userName;
        console.log("✅ Nombre actualizado en UI:", userName);
    } else {
        console.warn("⚠️ No se pudo actualizar el nombre. userName element:", userNameEl, "userName:", userName);
    }
}

// --- CANCELAR RESERVA ---
async function cancelarReserva(reservaId, nombreCancha) {
    // Confirmación del usuario
    const confirmar = confirm(`¿Estás seguro de cancelar la reserva de "${nombreCancha}"?\n\nEsta acción no se puede deshacer.`);
    
    if (!confirmar) {
        console.log("❌ Cancelación abortada por el usuario");
        return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
        alert("⚠️ Debes iniciar sesión para cancelar reservas");
        mostrarLogin();
        return;
    }

    console.log("🗑️ Cancelando reserva:", reservaId);

    try {
        const res = await fetch(`${API_BASE}reservas/${reservaId}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        const data = await res.json();
        console.log("📥 Respuesta de cancelar reserva:", { status: res.status, data });

        if (res.ok) {
            alert("✅ " + (data.mensaje || "Reserva cancelada exitosamente"));
            console.log("🔄 Recargando lista de reservas...");
            await cargarReservas();
        } else if (res.status === 401 || res.status === 403) {
            localStorage.removeItem("token");
            localStorage.removeItem("userName");
            mostrarLogin();
            alert("⚠️ Sesión expirada. Por favor, inicia sesión nuevamente.");
        } else {
            alert("❌ " + (data.error || "Error al cancelar reserva"));
        }

    } catch (err) {
        console.error("❌ Error al cancelar reserva:", err);
        alert("❌ Error de conexión al cancelar la reserva");
    }
}

// Hacer la función global
window.cancelarReserva = cancelarReserva;

// --- REGISTRO ---
const registerForm = document.getElementById("registerForm");
if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const nameInput = document.getElementById("nameRegister");
        const emailInput = document.getElementById("emailRegister");
        const passwordInput = document.getElementById("passwordRegister");

        if (!nameInput || !emailInput || !passwordInput) {
            console.error("❌ Inputs de registro no encontrados");
            return alert("❌ Error en el formulario");
        }

        const name = nameInput.value.trim();
        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!name || !email || !password) {
            return alert("⚠️ Todos los campos son obligatorios");
        }

        console.log("📤 Intentando registrar:", email);

        try {
            const res = await fetch(`${API_BASE}register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, password })
            });

            const data = await res.json();
            console.log("📥 Respuesta de registro:", { status: res.status, data });

            if (res.ok) {
                alert("✅ Registro exitoso. Ahora inicia sesión.");
                registerForm.reset();
            } else {
                alert(data.error || "❌ Error en el registro");
            }
        } catch (err) {
            console.error("❌ Error en registro:", err);
            alert("❌ Error de conexión. Verifica que el servidor esté activo.");
        }
    });
}

// --- LOGIN ---
const loginForm = document.getElementById("loginForm");
if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const emailInput = document.getElementById("emailLogin");
        const passwordInput = document.getElementById("passwordLogin");

        if (!emailInput || !passwordInput) {
            console.error("❌ Inputs de login no encontrados");
            return alert("❌ Error en el formulario");
        }

        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        if (!email || !password) {
            return alert("⚠️ Email y contraseña son obligatorios");
        }

        console.log("📤 Intentando login para:", email);

        try {
            const res = await fetch(`${API_BASE}login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();
            console.log("📥 Respuesta de login:", { status: res.status, data });

            if (res.ok && data.token) {
                // Guardar token y datos del usuario
                localStorage.setItem("token", data.token);
                localStorage.setItem("userName", data.name);

                console.log("✅ Login exitoso");
                console.log("💾 Token guardado");
                console.log("👤 Usuario:", data.name);

                // Limpiar formulario
                loginForm.reset();

                // Mostrar interfaz (sin delay, el browser ya está listo)
                mostrarApp(data.name);

                // Pequeño delay para asegurar que el DOM se actualizó
                setTimeout(async () => {
                    console.log("📡 Iniciando carga de reservas...");
                    await cargarReservas();
                }, 200);

            } else {
                localStorage.removeItem("token");
                localStorage.removeItem("userName");
                console.error("❌ Login fallido:", data.error);
                alert(data.error || "❌ Usuario o contraseña incorrecta");
            }

        } catch (err) {
            console.error("❌ Error en login:", err);
            alert("❌ Error de conexión. Verifica que el servidor esté activo.");
        }
    });
} else {
    console.warn("⚠️ loginForm no encontrado en el DOM");
}

// --- LOGOUT ---
function logout() {
    console.log("🚪 Cerrando sesión");
    localStorage.removeItem("token");
    localStorage.removeItem("userName");
    location.reload();
}
window.logout = logout;

// --- CARGAR RESERVAS ---
async function cargarReservas() {
    // Evitar múltiples cargas simultáneas
    if (isLoadingReservas) {
        console.log("⏳ Ya se están cargando las reservas, esperando...");
        return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
        console.warn("❌ No hay token para cargar reservas");
        mostrarLogin();
        return;
    }

    isLoadingReservas = true;
    const lista = document.getElementById("reservasList");

    if (!lista) {
        console.error("❌ Elemento reservasList no encontrado en el DOM");
        isLoadingReservas = false;
        return;
    }

    showLoading("reservasList");
    console.log("📡 Solicitando reservas al servidor...");

    try {
        const res = await fetch(`${API_BASE}reservas`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        console.log("📥 Respuesta del servidor:", res.status, res.statusText);

        if (!res.ok) {
            if (res.status === 401 || res.status === 403) {
                console.error("🚫 Token inválido o expirado");
                localStorage.removeItem("token");
                localStorage.removeItem("userName");
                mostrarLogin();
                alert("⚠️ Sesión expirada. Por favor, inicia sesión nuevamente.");
                return;
            } else {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || `Error ${res.status}`);
            }
        }

        const reservas = await res.json();
        console.log("✅ Reservas recibidas:", reservas);
        console.log("📊 Cantidad de reservas:", Array.isArray(reservas) ? reservas.length : "NO ES ARRAY");

        if (!Array.isArray(reservas)) {
            console.error("❌ Respuesta inválida del servidor:", typeof reservas, reservas);
            throw new Error("Formato de respuesta inválido - se esperaba un array");
        }

        if (reservas.length === 0) {
            console.log("🔭 No hay reservas para mostrar");
            lista.innerHTML = `
                <p style="color: #999; text-align: center; padding: 30px; font-size: 1.1em;">
                    📅 No hay reservas aún. ¡Haz tu primera reserva!
                </p>`;
        } else {
            console.log("🎨 Renderizando", reservas.length, "reservas...");
            lista.innerHTML = reservas.map((r, index) => {
                console.log(`  Reserva ${index + 1}:`, r);
                return `
                <div class="reserva-card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; margin: 15px 0; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); color: white; position: relative;">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
                        <strong style="font-size: 1.3em;">${r.nombre || 'Sin nombre'}</strong>
                        <span style="background: rgba(255,255,255,0.2); padding: 5px 10px; border-radius: 15px; font-size: 0.9em;">
                            ${r.cancha || 'Sin cancha'}
                        </span>
                    </div>
                    <div style="font-size: 1.05em; opacity: 0.95; margin-top: 10px;">
                        📅 ${r.fecha || 'Sin fecha'} • ⏰ ${r.hora || 'Sin hora'}
                    </div>
                    ${r.telefono ? `<div style="margin-top: 8px; opacity: 0.9;">📞 ${r.telefono}</div>` : ''}
                    ${r.email ? `<div style="margin-top: 5px; opacity: 0.9;">✉️ ${r.email}</div>` : ''}
                    
                    <button 
                        onclick="cancelarReserva('${r._id}', '${(r.cancha || 'esta reserva').replace(/'/g, "\\'")}')"
                        style="
                            margin-top: 15px;
                            padding: 10px 20px;
                            background: rgba(255, 255, 255, 0.2);
                            color: white;
                            border: none;
                            border-radius: 15px;
                            font-size: 1rem;
                            font-weight: 600;
                            cursor: pointer;
                            transition: all 0.3s ease;
                            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        "
                        onmouseover="this.style.background='rgba(231, 76, 60, 0.9)'; this.style.transform='scale(1.05)';"
                        onmouseout="this.style.background='rgba(255, 255, 255, 0.2)'; this.style.transform='scale(1)';"
                    >
                        🗑️ Cancelar Reserva
                    </button>
                </div>
            `}).join("");
            console.log("✅ Reservas renderizadas exitosamente");
        }

    } catch (err) {
        console.error("❌ Error al cargar reservas:", err);
        lista.innerHTML = `
            <p style="color: #e74c3c; text-align: center; padding: 30px;">
                ❌ Error al cargar reservas: ${err.message}<br>
                <button onclick="window.cargarReservas()" style="margin-top: 15px; padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 1em;">
                    🔄 Reintentar
                </button>
            </p>`;
    } finally {
        isLoadingReservas = false;
        console.log("🏁 Carga de reservas finalizada");
    }
}

// Hacer la función global para debugging
window.cargarReservas = cargarReservas;

// --- CREAR RESERVA ---
const bookingForm = document.getElementById("bookingForm");
if (bookingForm) {
    bookingForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const token = localStorage.getItem("token");
        if (!token) {
            alert("⚠️ Debes iniciar sesión primero");
            mostrarLogin();
            return;
        }

        const nombreInput = document.getElementById("nombreReserva");
        const emailInput = document.getElementById("emailReserva");
        const telefonoInput = document.getElementById("telefonoReserva");
        const canchaInput = document.getElementById("cancha");
        const fechaInput = document.getElementById("fecha");
        const horaInput = document.getElementById("hora");

        if (!nombreInput || !emailInput || !canchaInput || !fechaInput || !horaInput) {
            console.error("❌ Faltan inputs del formulario");
            return alert("❌ Error en el formulario");
        }

        const reserva = {
            nombre: nombreInput.value.trim(),
            email: emailInput.value.trim(),
            telefono: telefonoInput?.value.trim() || '',
            cancha: canchaInput.value,
            fecha: fechaInput.value,
            hora: horaInput.value,
        };

        // Validación básica
        if (!reserva.nombre || !reserva.email || !reserva.cancha || !reserva.fecha || !reserva.hora) {
            return alert("⚠️ Por favor completa todos los campos obligatorios");
        }

        console.log("📤 Enviando nueva reserva:", reserva);

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
            console.log("📥 Respuesta de crear reserva:", { status: res.status, data });

            if (res.ok) {
                bookingForm.reset();
                alert("✅ " + (data.mensaje || "Reserva guardada con éxito"));
                console.log("🔄 Recargando lista de reservas...");
                await cargarReservas();
            } else if (res.status === 401 || res.status === 403) {
                localStorage.removeItem("token");
                localStorage.removeItem("userName");
                mostrarLogin();
                alert("⚠️ Sesión expirada. Por favor, inicia sesión nuevamente.");
            } else {
                alert("❌ " + (data.error || "Error al guardar reserva"));
            }

        } catch (err) {
            console.error("❌ Error al crear reserva:", err);
            alert("❌ Error de conexión al guardar la reserva");
        }
    });
} else {
    console.warn("⚠️ bookingForm no encontrado en el DOM");
}

// --- VALIDAR TOKEN AL INICIAR ---
document.addEventListener("DOMContentLoaded", async () => {
    if (isInitialized) {
        console.log("⚠️ Ya inicializado, evitando duplicación");
        return;
    }
    isInitialized = true;

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🚀 CanchaYa - Iniciando aplicación");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    const token = localStorage.getItem("token");
    const userName = localStorage.getItem("userName");

    console.log("🔍 Estado del localStorage:");
    console.log("  - Token:", token ? "✅ Presente" : "❌ Ausente");
    console.log("  - userName:", userName || "❌ No guardado");

    if (!token) {
        console.log("👉 No hay sesión activa, mostrando login");
        mostrarLogin();
        return;
    }

    // Mostrar indicador de carga
    const authForms = document.getElementById("authForms");
    if (authForms) {
        authForms.innerHTML = `
            <div style="text-align:center; padding:50px;">
                <p style="color:#666; font-size: 1.2em;">⏳ Validando sesión...</p>
                <p style="color:#999; font-size: 0.9em; margin-top: 10px;">Conectando con el servidor</p>
            </div>`;
        authForms.style.display = "block";
    }

    console.log("📡 Verificando token con el servidor...");

    try {
        const res = await fetch(`${API_BASE}verify`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        console.log("📥 Respuesta de /verify:", res.status, res.statusText);

        if (res.ok) {
            const data = await res.json();
            console.log("✅ Token válido, datos recibidos:", data);

            const finalUserName = data.name || userName;

            if (data.name) {
                localStorage.setItem("userName", data.name);
                console.log("💾 Nombre actualizado en localStorage:", data.name);
            }

            console.log("🎨 Mostrando interfaz de usuario...");
            mostrarApp(finalUserName);

            console.log("⏳ Esperando 200ms antes de cargar reservas...");
            setTimeout(async () => {
                await cargarReservas();
            }, 200);
        } else {
            console.warn("⚠️ Token inválido o expirado (status:", res.status + ")");
            localStorage.removeItem("token");
            localStorage.removeItem("userName");
            mostrarLogin();
        }
    } catch (err) {
        console.error("❌ Error al validar token:", err);
        console.log("🔧 Intentando modo offline con datos locales...");

        if (userName) {
            console.log("✅ userName encontrado en localStorage, usando modo offline");
            mostrarApp(userName);

            setTimeout(() => {
                cargarReservas().catch(() => {
                    const lista = document.getElementById("reservasList");
                    if (lista) {
                        lista.innerHTML = `
                            <p style="color: #e67e22; text-align: center; padding: 30px;">
                                ⚠️ No se pudo conectar con el servidor.<br>
                                <small style="display: block; margin-top: 10px; color: #999;">
                                    Verifica tu conexión a internet
                                </small>
                                <button onclick="location.reload()" style="margin-top: 15px; padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer;">
                                    🔄 Reintentar
                                </button>
                            </p>`;
                    }
                });
            }, 200);
        } else {
            console.log("❌ No hay datos locales, limpiando sesión");
            localStorage.removeItem("token");
            mostrarLogin();
        }
    }

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
});

console.log("✅ login.js cargado correctamente");
