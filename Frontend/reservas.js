// reservas.js
document.addEventListener("DOMContentLoaded", () => {
    const bookingForm = document.getElementById("bookingForm");
    const reservasList = document.getElementById("reservasList");
    const user = JSON.parse(localStorage.getItem("currentUser"));

    if (!bookingForm || !user) return;

    cargarReservas();
    fetch("/api/reservas/expired", { method: "DELETE" });

    bookingForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const reserva = {
            nombre: document.getElementById("nombreReserva").value,
            email: document.getElementById("emailReserva").value,
            telefono: document.getElementById("telefonoReserva").value,
            cancha: document.getElementById("cancha").value,
            fecha: document.getElementById("fecha").value,
            hora: document.getElementById("hora").value,
        };

        const resp = await fetch("/api/reservas", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(reserva),
        });

        if (resp.ok) {
            alert("✅ Reserva creada correctamente");
            bookingForm.reset();
            cargarReservas();
        } else {
            alert("❌ Error al crear la reserva");
        }
    });

    async function cargarReservas() {
        const email = user.email;
        const resp = await fetch(`/api/reservas?email=${encodeURIComponent(email)}`);
        const reservas = await resp.json();

        reservasList.innerHTML = "";

        if (reservas.length === 0) {
            reservasList.innerHTML = "<p>No hay reservas aún. ¡Haz tu primera reserva!</p>";
            return;
        }

        reservas.forEach((r) => {
            const item = document.createElement("div");
            item.classList.add("reservation-item");
            item.innerHTML = `
                <h4>${r.cancha} - ${r.fecha} ${r.hora}</h4>
                <p><strong>Nombre:</strong> ${r.nombre}</p>
                <p><strong>Email:</strong> ${r.email}</p>
                <p><strong>Teléfono:</strong> ${r.telefono}</p>
                <button class="btn" data-id="${r.id}">Cancelar reserva</button>
            `;
            reservasList.appendChild(item);
        });

        document.querySelectorAll(".btn[data-id]").forEach(btn => {
            btn.addEventListener("click", async () => {
                const id = btn.getAttribute("data-id");
                if (confirm("¿Deseas cancelar esta reserva?")) {
                    const resp = await fetch(`/api/reservas/${id}`, { method: "DELETE" });
                    if (resp.ok) {
                        alert("🗑️ Reserva cancelada");
                        cargarReservas();
                    } else {
                        alert("❌ Error al cancelar la reserva");
                    }
                }
            });
        });
    }
});
