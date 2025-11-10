document.addEventListener("DOMContentLoaded", () => {
  const bookingForm = document.getElementById("bookingForm");
  if (!bookingForm) return;

  bookingForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const mensajePago = document.getElementById("mensajePago");
    const formData = new FormData(e.target);
    const datos = Object.fromEntries(formData.entries());

    mensajePago.textContent = "Procesando pago...";
    mensajePago.style.color = "orange";

    await new Promise((res) => setTimeout(res, 2000));

    mensajePago.textContent = "Pago exitoso. Confirmando reserva...";
    mensajePago.style.color = "green";

    datos.estado_pago = "pagado";

    try {
      const respuesta = await fetch("/reservas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });

      const resultado = await respuesta.json();

      if (respuesta.ok) {
        mensajePago.textContent = "Reserva confirmada correctamente.";
        e.target.reset();
      } else {
        mensajePago.textContent =
          resultado.error || "Error al registrar la reserva.";
        mensajePago.style.color = "red";
      }
    } catch (error) {
      mensajePago.textContent = "Error de conexión con el servidor.";
      mensajePago.style.color = "red";
    }
  });
});