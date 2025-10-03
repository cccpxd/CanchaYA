document.addEventListener("DOMContentLoaded", () => {

    // Formulario login
    const loginForm = document.getElementById("loginForm");
    // Formulario registro
    const registerForm = document.getElementById("registerForm");
    // Div de bienvenida
    const welcomeDiv = document.getElementById("welcome");
    const userNameSpan = document.getElementById("userName");
    // Lista de reservas
    const lista = document.getElementById("listaReservas");

    // ---------- REGISTRO ----------
    if (registerForm) {
        registerForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const name = document.getElementById("name").value;
            const email = document.getElementById("emailRegister").value;
            const password = document.getElementById("passwordRegister").value;

            try {
                const res = await fetch("http://localhost:8080/register", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name, email, password })
                });

                const data = await res.json();

                if (res.ok) {
                    alert(data.mensaje);
                    registerForm.reset();
                } else {
                    alert(data.error);
                }
            } catch (err) {
                console.error(err);
                alert("Error al registrar usuario");
            }
        });
    }

    // ---------- LOGIN ----------
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const email = document.getElementById("emailLogin").value;
            const password = document.getElementById("password").value;

            try {
                const res = await fetch("http://localhost:8080/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, password })
                });

                const data = await res.json();

                if (res.ok) {
                    // Guardar token y nombre
                    localStorage.setItem("token", data.token);
                    localStorage.setItem("name", data.name);

                    userNameSpan.textContent = data.name;
                    welcomeDiv.style.display = "block";
                    loginForm.style.display = "none";

                    mostrarReservas();
                } else {
                    alert(data.error);
                }
            } catch (err) {
                console.error(err);
                alert("Error al iniciar sesión");
            }
        });
    }

    // ---------- LOGOUT ----------
    window.logout = function () {
        localStorage.removeItem("token");
        localStorage.removeItem("name");
        welcomeDiv.style.display = "none";
        loginForm.style.display = "block";
        lista.innerHTML = "";
    }

    // ---------- MOSTRAR RESERVAS ----------
    async function mostrarReservas() {
        const token = localStorage.getItem("token");
        if (!token) return;

        try {
            const res = await fetch("http://localhost:8080/reservas", {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const data = await res.json();

            if (!Array.isArray(data)) {
                console.error("Error al cargar reservas:", data);
                lista.innerHTML = "<li>No se pudieron cargar las reservas</li>";
                return;
            }

            lista.innerHTML = "";
            data.forEach(r => {
                const li = document.createElement("li");
                li.textContent = `${r.nombre} - ${r.cancha} - ${r.fecha} ${r.hora}`;
                lista.appendChild(li);
            });
        } catch (err) {
            console.error(err);
            lista.innerHTML = "<li>Error al cargar reservas</li>";
        }
    }

    // Si ya hay token guardado, mostrar bienvenida y reservas
    const savedName = localStorage.getItem("name");
    const savedToken = localStorage.getItem("token");
    if (savedToken && savedName) {
        userNameSpan.textContent = savedName;
        welcomeDiv.style.display = "block";
        if (loginForm) loginForm.style.display = "none";
        mostrarReservas();
    }
});
