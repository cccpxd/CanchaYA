const loginForm = document.getElementById("loginForm");
const welcomeDiv = document.getElementById("welcome");
const userNameSpan = document.getElementById("userName");

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

function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("name");
    welcomeDiv.style.display = "none";
    loginForm.style.display = "block";
}

async function mostrarReservas() {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
        const res = await fetch("http://localhost:8080/reservas", {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const reservas = await res.json();

        const lista = document.getElementById("listaReservas");
        lista.innerHTML = "";

        reservas.forEach(r => {
            const li = document.createElement("li");
            li.textContent = `${r.nombre} - ${r.cancha} - ${r.fecha} ${r.hora}`;
            lista.appendChild(li);
        });
    } catch (err) {
        console.error(err);
    }
}
const registerForm = document.getElementById("registerForm");

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
