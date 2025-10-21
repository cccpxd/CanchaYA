// torneos.js - Sistema de gestión de torneos
// =====================================================

// Configuración de la API
const API_URL = window.location.origin + '/api';

// Variables globales
let torneoSeleccionado = null;
let currentUserId = null;
let currentUserName = null;

// =====================================================
// 🔹 INICIALIZACIÓN
// =====================================================

// Obtener datos del usuario al cargar
function initUserData() {
    const token = localStorage.getItem("token");
    if (token) {
        try {
            // Decodificar el token JWT (solo la parte del payload)
            const payload = JSON.parse(atob(token.split('.')[1]));
            currentUserId = payload.id;
            currentUserName = localStorage.getItem("userName") || payload.name;
            console.log("👤 Usuario identificado:", currentUserName, "ID:", currentUserId);
        } catch (e) {
            console.error("Error al decodificar token:", e);
        }
    }
}

// =====================================================
// 🔹 NAVEGACIÓN
// =====================================================

// Mostrar secciones
function showSection(section) {
    // Verificar autenticación para crear torneos
    if (section === 'crear') {
        const token = localStorage.getItem("token");
        if (!token) {
            alert("⚠️ Debes iniciar sesión para crear torneos.\n\nSerás redirigido a la página de inicio.");
            window.location.href = "/";
            return;
        }
    }

    document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
    document.getElementById(`${section}-section`).classList.remove('hidden');

    if (section === 'torneos') {
        cargarTorneos();
    }
}

// =====================================================
// 🔹 CREAR TORNEO
// =====================================================

// Event listener para el formulario de crear torneo
function initCrearTorneoForm() {
    const form = document.getElementById('crear-torneo-form');
    if (!form) {
        console.error('❌ Formulario crear-torneo-form no encontrado');
        return;
    }

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        const token = localStorage.getItem("token");
        if (!token) {
            alert("⚠️ Debes iniciar sesión para crear torneos");
            window.location.href = "/";
            return;
        }

        const nombreTorneo = document.getElementById('nombre-torneo').value;
        const fechaInicio = document.getElementById('fecha-inicio').value;
        const fechaFin = document.getElementById('fecha-fin').value;
        const numEquipos = document.getElementById('num-equipos').value;
        const costo = document.getElementById('costo').value;
        const ubicacion = document.getElementById('ubicacion').value;
        const descripcion = document.getElementById('descripcion').value;

        // Validación de fechas
        if (new Date(fechaFin) <= new Date(fechaInicio)) {
            showMessage('crear-message', 'La fecha de finalización debe ser posterior a la fecha de inicio', 'error');
            return;
        }

        const torneo = {
            nombre: nombreTorneo,
            fechaInicio,
            fechaFin,
            numEquipos: parseInt(numEquipos),
            costo: parseFloat(costo),
            ubicacion,
            descripcion
        };

        try {
            const response = await fetch(`${API_URL}/torneos`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(torneo)
            });

            const data = await response.json();

            if (response.ok) {
                showMessage('crear-message', data.mensaje, 'success');
                this.reset();

                setTimeout(() => {
                    showSection('torneos');
                }, 2000);
            } else if (response.status === 401 || response.status === 403) {
                localStorage.removeItem("token");
                localStorage.removeItem("userName");
                alert("⚠️ Sesión expirada. Por favor, inicia sesión nuevamente.");
                window.location.href = "/";
            } else {
                showMessage('crear-message', data.error || 'Error al crear el torneo', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showMessage('crear-message', 'Error de conexión con el servidor', 'error');
        }
    });
}

// =====================================================
// 🔹 CARGAR TORNEOS
// =====================================================

async function cargarTorneos() {
    const grid = document.getElementById('torneos-grid');

    try {
        const response = await fetch(`${API_URL}/torneos`);
        const torneos = await response.json();

        if (torneos.length === 0) {
            grid.innerHTML = '<p style="color: #e5e7eb; text-align: center; grid-column: 1/-1;">No hay torneos disponibles aún. ¡Crea el primero!</p>';
            return;
        }

        grid.innerHTML = torneos.map(torneo => {
            const esCreador = currentUserId && torneo.creadorId === currentUserId;

            return `
                <div class="torneo-card">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
                        <h3 style="margin: 0;">${torneo.nombre}</h3>
                        ${esCreador ? '<span style="background: #10b981; color: white; padding: 4px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 600;">✓ Creado por ti</span>' : ''}
                    </div>

                    ${torneo.creadorNombre ? `<div style="color: #9ca3af; font-size: 0.875rem; margin-bottom: 1rem;">👤 Organizado por: ${torneo.creadorNombre}</div>` : ''}

                    <div class="torneo-info">
                        <strong>📅 Inicio:</strong> ${formatDate(torneo.fechaInicio)}
                    </div>
                    <div class="torneo-info">
                        <strong>🏁 Fin:</strong> ${formatDate(torneo.fechaFin)}
                    </div>
                    <div class="torneo-info">
                        <strong>👥 Equipos:</strong> ${torneo.equiposInscritos.length}/${torneo.numEquipos}
                    </div>
                    <div class="torneo-info">
                        <strong>📍 Ubicación:</strong> ${torneo.ubicacion}
                    </div>
                    ${torneo.descripcion ? `<div class="torneo-info" style="margin-top: 1rem;">${torneo.descripcion}</div>` : ''}
                    <div class="price-tag">$${formatPrice(torneo.costo)}</div>

                    <div style="display: flex; gap: 0.5rem; margin-top: 1rem; flex-wrap: wrap;">
                        <button class="btn inscribirse-btn" onclick="openModal('${torneo._id}')"
                            style="flex: 1; ${torneo.equiposInscritos.length >= torneo.numEquipos ? 'opacity: 0.5; cursor: not-allowed;' : ''}"
                            ${torneo.equiposInscritos.length >= torneo.numEquipos ? 'disabled' : ''}>
                            ${torneo.equiposInscritos.length >= torneo.numEquipos ? 'Cupos Llenos' : 'Inscribir Equipo'}
                        </button>

                        ${torneo.equiposInscritos.length > 0 ? `
                            <button class="btn" onclick="verEquipos('${torneo._id}')"
                                style="flex: 1; background: #059669;">
                                Ver Equipos (${torneo.equiposInscritos.length})
                            </button>
                        ` : ''}

                        ${esCreador ? `
                            <button class="btn" onclick="eliminarTorneo('${torneo._id}', '${torneo.nombre.replace(/'/g, "\\'")}')"
                                style="background: #dc2626; flex: 1;">
                                🗑️ Eliminar
                            </button>
                        ` : ''}
                    </div>
                </div>
            `}).join('');
    } catch (error) {
        console.error('Error al cargar torneos:', error);
        grid.innerHTML = '<p style="color: #ef4444; text-align: center; grid-column: 1/-1;">Error al cargar los torneos. Por favor, recarga la página.</p>';
    }
}

// =====================================================
// 🔹 INSCRIPCIÓN DE EQUIPOS
// =====================================================

// Abrir modal de inscripción
async function openModal(torneoId) {
    try {
        const response = await fetch(`${API_URL}/torneos/${torneoId}`);
        torneoSeleccionado = await response.json();

        document.getElementById('inscripcion-modal').style.display = 'flex';
        document.getElementById('inscripcion-form').reset();
        document.getElementById('modal-message').style.display = 'none';
    } catch (error) {
        console.error('Error al cargar torneo:', error);
        alert('Error al cargar el torneo');
    }
}

// Cerrar modal de inscripción
function closeModal() {
    document.getElementById('inscripcion-modal').style.display = 'none';
    torneoSeleccionado = null;
}

// Event listener para el formulario de inscripción
function initInscripcionForm() {
    const form = document.getElementById('inscripcion-form');
    if (!form) {
        console.error('❌ Formulario inscripcion-form no encontrado');
        return;
    }

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        if (!torneoSeleccionado) return;

        const equipo = {
            nombre: document.getElementById('nombre-equipo').value,
            capitan: document.getElementById('nombre-capitan').value,
            telefono: document.getElementById('telefono').value,
            email: document.getElementById('email').value
        };

        try {
            const response = await fetch(`${API_URL}/torneos/${torneoSeleccionado._id}/equipos`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(equipo)
            });

            const data = await response.json();

            if (response.ok) {
                showMessage('modal-message', data.mensaje, 'success');

                setTimeout(() => {
                    closeModal();
                    cargarTorneos();
                    showMessage('torneos-message', `El equipo "${equipo.nombre}" ha sido inscrito en el torneo "${torneoSeleccionado.nombre}"`, 'success');
                }, 2000);
            } else {
                showMessage('modal-message', data.error || 'Error al inscribir el equipo', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showMessage('modal-message', 'Error de conexión con el servidor', 'error');
        }
    });
}

// =====================================================
// 🔹 VER EQUIPOS
// =====================================================

async function verEquipos(torneoId) {
    try {
        const response = await fetch(`${API_URL}/torneos/${torneoId}/equipos`);
        const data = await response.json();

        const equiposList = document.getElementById('equipos-list');

        if (data.equipos.length === 0) {
            equiposList.innerHTML = '<p style="color: #e5e7eb; text-align: center;">No hay equipos inscritos aún.</p>';
        } else {
            equiposList.innerHTML = `
                <div style="margin-bottom: 1rem; padding: 1rem; background: #1f2937; border-radius: 8px;">
                    <h3 style="color: #10b981; margin: 0;">${data.torneo}</h3>
                    <p style="color: #9ca3af; margin: 0.5rem 0 0 0;">
                        Cupos disponibles: ${data.cuposDisponibles}
                    </p>
                </div>
                ${data.equipos.map((equipo, index) => `
                    <div style="padding: 1rem; background: #374151; border-radius: 8px; margin-bottom: 1rem;">
                        <h4 style="color: #10b981; margin: 0 0 0.5rem 0;">
                            ${index + 1}. ${equipo.nombre}
                        </h4>
                        <p style="color: #e5e7eb; margin: 0.25rem 0;">
                            <strong>Capitán:</strong> ${equipo.capitan}
                        </p>
                        <p style="color: #e5e7eb; margin: 0.25rem 0;">
                            <strong>Teléfono:</strong> ${equipo.telefono}
                        </p>
                        <p style="color: #e5e7eb; margin: 0.25rem 0;">
                            <strong>Email:</strong> ${equipo.email}
                        </p>
                        <p style="color: #9ca3af; margin: 0.5rem 0 0 0; font-size: 0.875rem;">
                            Inscrito: ${formatDate(equipo.fechaInscripcion)}
                        </p>
                    </div>
                `).join('')}
            `;
        }

        document.getElementById('equipos-modal').style.display = 'flex';
    } catch (error) {
        console.error('Error al cargar equipos:', error);
        alert('Error al cargar los equipos');
    }
}

function closeEquiposModal() {
    document.getElementById('equipos-modal').style.display = 'none';
}

// =====================================================
// 🔹 ELIMINAR TORNEO
// =====================================================

async function eliminarTorneo(torneoId, nombreTorneo) {
    if (!confirm(`¿Estás seguro de eliminar el torneo "${nombreTorneo}"?\n\nEsta acción no se puede deshacer y eliminará todos los equipos inscritos.`)) {
        return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
        alert("⚠️ Debes iniciar sesión para eliminar torneos");
        window.location.href = "/";
        return;
    }

    try {
        const response = await fetch(`${API_URL}/torneos/${torneoId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (response.ok) {
            alert("✅ " + (data.mensaje || "Torneo eliminado exitosamente"));
            cargarTorneos();
        } else if (response.status === 401 || response.status === 403) {
            alert("❌ " + (data.error || "No tienes permiso para eliminar este torneo"));
        } else {
            alert("❌ " + (data.error || "Error al eliminar el torneo"));
        }
    } catch (error) {
        console.error('Error al eliminar torneo:', error);
        alert('❌ Error de conexión con el servidor');
    }
}

// =====================================================
// 🔹 UTILIDADES
// =====================================================

function showMessage(elementId, text, type) {
    const messageEl = document.getElementById(elementId);
    if (!messageEl) return;

    messageEl.textContent = text;
    messageEl.className = `message ${type}`;
    messageEl.style.display = 'block';

    setTimeout(() => {
        messageEl.style.display = 'none';
    }, 5000);
}

function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('es-ES', options);
}

function formatPrice(price) {
    return price.toLocaleString('es-CO');
}

// =====================================================
// 🔹 EVENT LISTENERS GLOBALES
// =====================================================

// Cerrar modales al hacer clic fuera
window.onclick = function(event) {
    const inscripcionModal = document.getElementById('inscripcion-modal');
    const equiposModal = document.getElementById('equipos-modal');

    if (event.target === inscripcionModal) {
        closeModal();
    }
    if (event.target === equiposModal) {
        closeEquiposModal();
    }
}

// =====================================================
// 🔹 INICIALIZACIÓN AL CARGAR LA PÁGINA
// =====================================================

window.addEventListener('DOMContentLoaded', () => {
    console.log('✅ torneos.js cargado - API URL:', API_URL);

    // Inicializar datos del usuario
    initUserData();

    // Inicializar formularios
    initCrearTorneoForm();
    initInscripcionForm();

    // Actualizar UI según estado de login
    const token = localStorage.getItem("token");
    const crearBtn = document.querySelector('.nav-style-btn');

    if (!token && crearBtn) {
        crearBtn.innerHTML = '🔒 Crear Torneo (Requiere Login)';
        crearBtn.style.background = '#6b7280';
    }
});

console.log("✅ torneos.js cargado correctamente");