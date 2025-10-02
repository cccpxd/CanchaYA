const reservas = [];
let patino;
function hacerReserva() {
    const nombre = document.getElementById('nombre').value;
    const email = document.getElementById('email').value;
    const telefono = document.getElementById('telefono').value;
    const cancha = document.getElementById('cancha').value;
    const fecha = document.getElementById('fecha').value;
    const hora = document.getElementById('hora').value;

    if (!nombre || !email || !telefono || !cancha || !fecha || !hora) {
        alert('Por favor completa todos los campos');
        return;
    }

    const canchaNames = {
        'futbol5': 'Cancha Fútbol 5',
        'futbol7': 'Cancha Fútbol 7',
        'futbol11': 'Cancha Fútbol 11'
    };

    const reserva = {
        nombre,
        email,
        telefono,
        cancha: canchaNames[cancha],
        fecha,
        hora
    };

    reservas.push(reserva);
    mostrarReservas();
    document.getElementById('bookingForm').reset();
    alert('¡Reserva confirmada! Recibirás un email de confirmación.');
}

function mostrarReservas() {
    const lista = document.getElementById('reservasList');
    if (reservas.length === 0) {
        lista.innerHTML = '<p style="color: #999; text-align: center;">No hay reservas aún. ¡Haz tu primera reserva!</p>';
        return;
    }

    lista.innerHTML = reservas.map((r, i) => `
        <div class="reservation-item">
            <h4>${r.cancha}</h4>
            <p><strong>Nombre:</strong> ${r.nombre}</p>
            <p><strong>Fecha:</strong> ${r.fecha} - ${r.hora}</p>
            <p><strong>Contacto:</strong> ${r.email} | ${r.telefono}</p>
        </div>
    `).join('');
}

// Establecer fecha mínima como hoy
document.getElementById('fecha').min = new Date().toISOString().split('T')[0];
