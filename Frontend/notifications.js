const NotificationManager = {
    API_BASE: "/",
    notificaciones: [],
    noLeidas: 0,
    isLoadingNotifications: false,
    audioNotificacion: null,

    // Inicializar el sistema
    init() {
        console.log("🔔 Inicializando sistema de notificaciones");
        this.crearIconoNotificaciones();
        this.crearPanelNotificaciones();
        this.cargarNotificaciones();
        this.iniciarActualizacionAutomatica();
        this.inicializarAudio();
    },

    // Crear ícono en el navbar
    crearIconoNotificaciones() {
        const navLinks = document.getElementById("navLinks");
        if (!navLinks) return;

        const notifItem = document.createElement("li");
        notifItem.style.position = "relative";
        notifItem.innerHTML = `
            <a href="#" id="notificationBtn" style="display: flex; align-items: center; gap: 5px; position: relative;">
                Notificaciones
                <span id="notificationBadge" class="notification-badge" style="display: none;">0</span>
            </a>
        `;

        navLinks.insertBefore(notifItem, navLinks.children[navLinks.children.length - 1]);

        document.getElementById("notificationBtn").addEventListener("click", (e) => {
            e.preventDefault();
            this.togglePanel();
        });
    },

    // Crear panel de notificaciones
    crearPanelNotificaciones() {
        const panel = document.createElement("div");
        panel.id = "notificationPanel";
        panel.className = "notification-panel";
        panel.innerHTML = `
            <div class="notification-header">
                <h3>Notificaciones</h3>
                <div class="notification-actions">
                    <button id="markAllReadBtn" class="btn-icon" title="Marcar todas como leídas">
                        ✓
                    </button>
                    <button id="clearReadBtn" class="btn-icon" title="Limpiar leídas">
                        🗑️
                    </button>
                    <button id="closeNotifPanel" class="btn-icon" title="Cerrar">
                        ✕
                    </button>
                </div>
            </div>
            <div class="notification-filters">
                <button class="filter-btn active" data-filter="todas">Todas</button>
                <button class="filter-btn" data-filter="no_leidas">No leídas</button>
                <button class="filter-btn" data-filter="reserva">Reservas</button>
                <button class="filter-btn" data-filter="recordatorio">Recordatorios</button>
            </div>
            <div id="notificationList" class="notification-list">
                <p style="text-align: center; color: #999; padding: 20px;">Cargando notificaciones...</p>
            </div>
        `;

        document.body.appendChild(panel);

        // Event listeners
        document.getElementById("closeNotifPanel").addEventListener("click", () => this.togglePanel());
        document.getElementById("markAllReadBtn").addEventListener("click", () => this.marcarTodasLeidas());
        document.getElementById("clearReadBtn").addEventListener("click", () => this.limpiarLeidas());

        // Filtros
        document.querySelectorAll(".filter-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
                e.target.classList.add("active");
                this.filtrarNotificaciones(e.target.dataset.filter);
            });
        });

        // Cerrar al hacer click fuera
        document.addEventListener("click", (e) => {
            const panel = document.getElementById("notificationPanel");
            const btn = document.getElementById("notificationBtn");
            if (panel && !panel.contains(e.target) && !btn.contains(e.target)) {
                panel.classList.remove("show");
            }
        });
    },

    // Inicializar audio de notificación
    inicializarAudio() {
        // Crear un beep simple usando Web Audio API
        this.audioNotificacion = {
            play: () => {
                try {
                    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    const oscillator = audioContext.createOscillator();
                    const gainNode = audioContext.createGain();
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(audioContext.destination);
                    
                    oscillator.frequency.value = 800;
                    oscillator.type = 'sine';
                    
                    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
                    
                    oscillator.start(audioContext.currentTime);
                    oscillator.stop(audioContext.currentTime + 0.3);
                } catch (err) {
                    console.warn("No se pudo reproducir sonido de notificación");
                }
            }
        };
    },

    // Toggle panel
    togglePanel() {
        const panel = document.getElementById("notificationPanel");
        if (panel) {
            panel.classList.toggle("show");
            if (panel.classList.contains("show")) {
                this.cargarNotificaciones();
            }
        }
    },

    // Cargar notificaciones desde el servidor
    async cargarNotificaciones(filtro = null) {
        if (this.isLoadingNotifications) return;

        const token = localStorage.getItem("token");
        if (!token) return;

        this.isLoadingNotifications = true;
        const lista = document.getElementById("notificationList");

        try {
            let url = `${this.API_BASE}notificaciones?limit=50`;
            if (filtro === 'no_leidas') {
                url += '&solo_no_leidas=true';
            }

            const res = await fetch(url, {
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            if (!res.ok) throw new Error("Error al cargar notificaciones");

            const data = await res.json();
            this.notificaciones = data.notificaciones;
            this.noLeidas = data.noLeidas;

            this.actualizarContador();
            this.renderizarNotificaciones(filtro);

        } catch (err) {
            console.error("❌ Error al cargar notificaciones:", err);
            if (lista) {
                lista.innerHTML = '<p style="text-align: center; color: #e74c3c; padding: 20px;">Error al cargar notificaciones</p>';
            }
        } finally {
            this.isLoadingNotifications = false;
        }
    },

    // Renderizar notificaciones
    renderizarNotificaciones(filtro = null) {
        const lista = document.getElementById("notificationList");
        if (!lista) return;

        let notifsFiltradas = this.notificaciones;

        if (filtro && filtro !== 'todas') {
            if (filtro === 'no_leidas') {
                notifsFiltradas = this.notificaciones.filter(n => !n.leida);
            } else {
                notifsFiltradas = this.notificaciones.filter(n => n.tipo === filtro);
            }
        }

        if (notifsFiltradas.length === 0) {
            lista.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #999;">
                    <div style="font-size: 3em; margin-bottom: 10px;">🔕</div>
                    <p>No hay notificaciones</p>
                </div>
            `;
            return;
        }

        lista.innerHTML = notifsFiltradas.map(notif => {
            const fecha = new Date(notif.createdAt);
            const tiempoTranscurrido = this.calcularTiempoTranscurrido(fecha);
            const leidaClass = notif.leida ? 'leida' : 'no-leida';
            const prioridadClass = `prioridad-${notif.prioridad}`;

            return `
                <div class="notification-item ${leidaClass} ${prioridadClass}" data-id="${notif._id}">
                    <div class="notification-icon">${notif.icono}</div>
                    <div class="notification-content">
                        <div class="notification-title">${notif.titulo}</div>
                        <div class="notification-message">${notif.mensaje}</div>
                        <div class="notification-time">${tiempoTranscurrido}</div>
                    </div>
                    <div class="notification-actions-inline">
                        ${!notif.leida ? `
                            <button class="btn-notif-action" onclick="NotificationManager.marcarComoLeida('${notif._id}')" title="Marcar como leída">
                                ✓
                            </button>
                        ` : ''}
                        <button class="btn-notif-action delete" onclick="NotificationManager.eliminarNotificacion('${notif._id}')" title="Eliminar">
                            🗑️
                        </button>
                    </div>
                </div>
            `;
        }).join("");
    },

    // Filtrar notificaciones
    filtrarNotificaciones(filtro) {
        this.renderizarNotificaciones(filtro);
    },

    // Actualizar contador
    actualizarContador() {
        const badge = document.getElementById("notificationBadge");
        if (!badge) return;

        if (this.noLeidas > 0) {
            badge.textContent = this.noLeidas > 99 ? '99+' : this.noLeidas;
            badge.style.display = "flex";
        } else {
            badge.style.display = "none";
        }
    },

    // Marcar como leída
    async marcarComoLeida(id) {
        const token = localStorage.getItem("token");
        if (!token) return;

        try {
            const res = await fetch(`${this.API_BASE}notificaciones/${id}/leer`, {
                method: "PATCH",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            if (res.ok) {
                await this.cargarNotificaciones();
            }
        } catch (err) {
            console.error("Error al marcar notificación:", err);
        }
    },

    // Marcar todas como leídas
    async marcarTodasLeidas() {
        if (!confirm("¿Marcar todas las notificaciones como leídas?")) return;

        const token = localStorage.getItem("token");
        if (!token) return;

        try {
            const res = await fetch(`${this.API_BASE}notificaciones/leer-todas`, {
                method: "PATCH",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            if (res.ok) {
                await this.cargarNotificaciones();
            }
        } catch (err) {
            console.error("Error al marcar todas:", err);
        }
    },

    // Eliminar notificación
    async eliminarNotificacion(id) {
        const token = localStorage.getItem("token");
        if (!token) return;

        try {
            const res = await fetch(`${this.API_BASE}notificaciones/${id}`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            if (res.ok) {
                await this.cargarNotificaciones();
            }
        } catch (err) {
            console.error("Error al eliminar notificación:", err);
        }
    },

    // Limpiar notificaciones leídas
    async limpiarLeidas() {
        if (!confirm("¿Eliminar todas las notificaciones leídas?")) return;

        const token = localStorage.getItem("token");
        if (!token) return;

        try {
            const res = await fetch(`${this.API_BASE}notificaciones/limpiar-leidas`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            if (res.ok) {
                await this.cargarNotificaciones();
            }
        } catch (err) {
            console.error("Error al limpiar notificaciones:", err);
        }
    },

    // Actualización automática
    iniciarActualizacionAutomatica() {
        setInterval(() => {
            const token = localStorage.getItem("token");
            if (token) {
                this.verificarNuevasNotificaciones();
            }
        }, 30000); // Cada 30 segundos
    },

    // Verificar nuevas notificaciones
    async verificarNuevasNotificaciones() {
        const token = localStorage.getItem("token");
        if (!token) return;

        try {
            const res = await fetch(`${this.API_BASE}notificaciones/contador`, {
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            if (res.ok) {
                const data = await res.json();
                const anteriorNoLeidas = this.noLeidas;
                this.noLeidas = data.noLeidas;

                // Si hay nuevas notificaciones
                if (data.noLeidas > anteriorNoLeidas) {
                    this.mostrarNotificacionNueva();
                    if (this.audioNotificacion) {
                        this.audioNotificacion.play();
                    }
                }

                this.actualizarContador();
            }
        } catch (err) {
            console.error("Error al verificar notificaciones:", err);
        }
    },

    // Mostrar notificación nueva (estilo toast)
    mostrarNotificacionNueva() {
        const toast = document.createElement("div");
        toast.className = "notification-toast";
        toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 1.5em;">🔔</span>
                <span>Tienes nuevas notificaciones</span>
            </div>
        `;
        document.body.appendChild(toast);

        setTimeout(() => toast.classList.add("show"), 100);
        setTimeout(() => {
            toast.classList.remove("show");
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    // Calcular tiempo transcurrido
    calcularTiempoTranscurrido(fecha) {
        const ahora = new Date();
        const diff = ahora - fecha;
        const segundos = Math.floor(diff / 1000);
        const minutos = Math.floor(segundos / 60);
        const horas = Math.floor(minutos / 60);
        const dias = Math.floor(horas / 24);

        if (dias > 0) return `Hace ${dias} día${dias > 1 ? 's' : ''}`;
        if (horas > 0) return `Hace ${horas} hora${horas > 1 ? 's' : ''}`;
        if (minutos > 0) return `Hace ${minutos} minuto${minutos > 1 ? 's' : ''}`;
        return 'Ahora mismo';
    }
};

// Hacer disponible globalmente
window.NotificationManager = NotificationManager;

// Inicializar cuando el usuario haga login
document.addEventListener("DOMContentLoaded", () => {
    // Esperar a que el usuario esté logueado
    const checkLogin = setInterval(() => {
        const token = localStorage.getItem("token");
        const protectedContent = document.getElementById("protectedContent");
        
        if (token && protectedContent && protectedContent.style.display !== "none") {
            NotificationManager.init();
            clearInterval(checkLogin);
        }
    }, 500);
});

console.log("✅ Sistema de notificaciones cargado");
