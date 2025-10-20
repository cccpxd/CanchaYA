// reservas.js
document.addEventListener("DOMContentLoaded", () => {
  const bookingForm = document.getElementById("bookingForm");
  const reservasList = document.getElementById("reservasList");
  const user = JSON.parse(localStorage.getItem("currentUser"));

  // Si no hay sesión iniciada o no hay formulario, no continúa
  if (!bookingForm || !user) {
    console.warn("⚠️ No hay sesión iniciada o el formulario no existe.");
    return;
  }

  const token = user.token;

  // Cargar reservas existentes al iniciar
  cargarReservas();

  // Enviar el formulario de reserva
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

    try {
      const resp = await fetch("/reservas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(reserva),
      });

      const data = await resp.json();

      if (resp.ok) {
        alert("✅ Reserva creada correctamente");
        bookingForm.reset();
        cargarReservas();
      } else {
        alert("❌ Error al crear la reserva: " + (data.error || "Error desconocido"));
      }
    } catch (error) {
      console.error("Error al enviar reserva:", error);
      alert("⚠️ No se pudo conectar con el servidor.");
    }
  });

  // Cargar reservas del usuario
  async function cargarReservas() {
    try {
      const resp = await fetch("/reservas", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      if (!resp.ok) {
        console.warn("Error al cargar reservas:", resp.status);
        reservasList.innerHTML = "<p>No se pudieron cargar tus reservas.</p>";
        return;
      }

      const reservas = await resp.json();
      reservasList.innerHTML = "";

      if (reservas.length === 0) {
        reservasList.innerHTML = "<p>No tienes reservas aún. ¡Haz tu primera reserva!</p>";
        return;
      }

      // Mostrar cada reserva en pantalla
      reservas.forEach((r) => {
        const item = document.createElement("div");
        item.classList.add("reservation-item");
        item.innerHTML = `
          <h4>${r.cancha} - ${r.fecha} ${r.hora}</h4>
          <p><strong>Nombre:</strong> ${r.nombre}</p>
          <p><strong>Email:</strong> ${r.email}</p>
          <p><strong>Teléfono:</strong> ${r.telefono || "N/A"}</p>
          <button class="btn" data-id="${r._id}">Cancelar reserva</button>
        `;
        reservasList.appendChild(item);
      });

      // Agregar funcionalidad a los botones de cancelar
      document.querySelectorAll(".btn[data-id]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const id = btn.getAttribute("data-id");
          if (confirm("¿Deseas cancelar esta reserva?")) {
            try {
              const resp = await fetch(`/reservas/${id}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` },
              });

              const data = await resp.json();

              if (resp.ok) {
                alert("🗑️ Reserva cancelada correctamente");
                cargarReservas();
              } else {
                alert("❌ Error al cancelar la reserva: " + (data.error || "Error desconocido"));
              }
            } catch (err) {
              console.error("Error al eliminar reserva:", err);
              alert("⚠️ No se pudo conectar con el servidor.");
            }
          }
        });
      });
    } catch (error) {
      console.error("Error al obtener reservas:", error);
      reservasList.innerHTML = "<p>Error al cargar las reservas.</p>";
    }
  }
});
