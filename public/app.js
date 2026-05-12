const API = "/api";

const resultado = document.createElement("div");
resultado.style.display = "none";

const tablaAccesos = document.getElementById("tablaAccesos");
const tablaAlumnos = document.getElementById("tablaAlumnos");
const formAlumno = document.getElementById("formAlumno");
const refreshBtn = document.getElementById("refreshBtn");
const refreshAlumnosBtn = document.getElementById("refreshAlumnosBtn");
const contenedorQR = document.getElementById("contenedorQR");
const cancelarEdicionBtn = document.getElementById("cancelarEdicionBtn");

function soloNumeros(valor) {
  return valor.replace(/\D/g, "");
}

function soloLetras(valor) {
  return valor.replace(/[^a-zA-ZÁÉÍÓÚáéíóúÑñ\s]/g, "");
}

function formatearPlaca(valor) {
  let limpio = valor
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 7);

  if (limpio.length > 3) {
    return `${limpio.slice(0, 3)}-${limpio.slice(3)}`;
  }

  return limpio;
}

const inputMatricula = document.getElementById("matricula");
const inputNombre = document.getElementById("nombre");
const inputPlacas = document.getElementById("auto_placa");

if (inputMatricula) {
  inputMatricula.addEventListener("input", () => {
    inputMatricula.value = soloNumeros(inputMatricula.value).slice(0, 8);
  });
}

if (inputNombre) {
  inputNombre.addEventListener("input", () => {
    inputNombre.value = soloLetras(inputNombre.value);
  });
}

if (inputPlacas) {
  inputPlacas.addEventListener("input", () => {
    inputPlacas.value = formatearPlaca(inputPlacas.value);
  });
}

function validarFormularioAlumno(matricula, nombre, placas) {
  if (!/^\d{8}$/.test(matricula)) {
    alert("La matrícula debe tener exactamente 8 números.");
    return false;
  }

  if (!/^[a-zA-ZÁÉÍÓÚáéíóúÑñ\s]+$/.test(nombre)) {
    alert("El nombre solo puede contener letras y espacios.");
    return false;
  }

  function formatearFechaHora(fechaSQLite) {
    if (!fechaSQLite) return "Sin fecha";

    const fecha = new Date(fechaSQLite.replace(" ", "T"));

    if (isNaN(fecha.getTime())) {
      return fechaSQLite;
    }

    return fecha.toLocaleString("es-MX", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  }

  const placaSinGuion = placas.replace("-", "");

  if (placaSinGuion && !/^[A-Z0-9]{1,7}$/.test(placaSinGuion)) {
    alert(
      "La placa solo puede contener letras y números, máximo 7 caracteres.",
    );
    return false;
  }

  return true;
}

function limpiarFormulario() {
  document.getElementById("alumnoId").value = "";
  document.getElementById("matricula").value = "";
  document.getElementById("nombre").value = "";
  document.getElementById("auto_placa").value = "";
  document.getElementById("activo").checked = true;
}

async function cargarHistorial() {
  const res = await fetch(`${API}/accesos`);
  const data = await res.json();

  tablaAccesos.innerHTML = data
    .map(
      (item) => `
    <tr>
      <td>${item.id}</td>
      <td>${item.matricula}</td>
      <td>${item.nombre}</td>
      <td>${item.placa || ""}</td>
      <td>${item.tipo}</td>
      <td>${item.estatus}</td>
      <td>${item.mensaje}</td>
      <td>${formatearFechaHora(item.fecha_hora)}</td>
    </tr>
  `,
    )
    .join("");
}

async function cargarAlumnos() {
  const res = await fetch(`${API}/alumnos`);
  const data = await res.json();

  tablaAlumnos.innerHTML = data
    .map(
      (item) => `
    <tr>
      <td>${item.id}</td>
      <td>${item.matricula}</td>
      <td>${item.nombre}</td>
      <td>${item.auto_placa || ""}</td>
      <td>${item.activo ? "Sí" : "No"}</td>
      <td>
        <button 
          class="btn-editar" 
          onclick="abrirModalEditar(
            ${item.id}, 
            '${item.matricula}', 
            '${item.nombre.replace(/'/g, "\\'")}', 
            '${(item.auto_placa || "").replace(/'/g, "\\'")}', 
            ${item.activo}
          )"
        >
          Editar
        </button>

        <button 
          class="btn-eliminar" 
          onclick="eliminarAlumno(${item.id}, '${item.nombre.replace(/'/g, "\\'")}')"
        >
          Eliminar
        </button>
      </td>
    </tr>
  `,
    )
    .join("");
}

window.editarAlumno = function (id, matricula, nombre, auto_placa, activo) {
  document.getElementById("alumnoId").value = id;
  document.getElementById("matricula").value = matricula;
  document.getElementById("nombre").value = nombre;
  document.getElementById("auto_placa").value = auto_placa;
  document.getElementById("activo").checked = Boolean(activo);

  contenedorQR.innerHTML = `<p><strong>Editando alumno:</strong> ${nombre}</p>`;
};

window.eliminarAlumno = async function (id, nombre) {
  const confirmar = confirm(`¿Seguro que deseas eliminar a ${nombre}?`);
  if (!confirmar) return;

  const res = await fetch(`${API}/alumnos/${id}`, {
    method: "DELETE",
  });

  const data = await res.json();

  if (res.ok) {
    alert(data.mensaje);
    limpiarFormulario();
    contenedorQR.innerHTML = "";
    await cargarAlumnos();
    await cargarHistorial();
  } else {
    alert(data.error || "No se pudo eliminar el alumno.");
  }
};

window.regenerarQR = async function (id, nombre) {
  const confirmar = confirm(
    `¿Deseas generar un nuevo QR para ${nombre}? El QR anterior dejará de funcionar.`,
  );
  if (!confirmar) return;

  const res = await fetch(`${API}/alumnos/${id}/regenerar-qr`, {
    method: "POST",
  });

  const data = await res.json();

  if (res.ok) {
    alert(data.mensaje);

    contenedorQR.innerHTML = `
      <div>
        <p><strong>Nuevo QR generado para:</strong> ${nombre}</p>
        <img class="preview-qr" src="${data.qr_url}" alt="Nuevo QR del alumno" />
        <br />
        <a class="qr-link" href="${data.qr_url}" target="_blank">Abrir / descargar nuevo QR</a>
      </div>
    `;

    await cargarAlumnos();
  } else {
    alert(data.error || "No se pudo regenerar el QR.");
  }
};

formAlumno.addEventListener("submit", async (e) => {
  console.log("enviando formulario de alumno...");
  e.preventDefault();

  const id = document.getElementById("alumnoId").value.trim();

  const payload = {
    matricula: document.getElementById("matricula").value.trim(),
    nombre: document.getElementById("nombre").value.trim(),
    auto_placa: document.getElementById("auto_placa").value.trim(),
    activo: document.getElementById("activo").checked,
  };

  if (
    !validarFormularioAlumno(
      payload.matricula,
      payload.nombre,
      payload.auto_placa,
    )
  ) {
    return;
  }

  const url = id ? `${API}/alumnos/${id}` : `${API}/alumnos`;
  const method = id ? "PUT" : "POST";

  const res = await fetch(url, {
    method: method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (res.ok) {
    if (id) {
      alert(data.mensaje || "Alumno actualizado correctamente.");
      contenedorQR.innerHTML = `<p><strong>Alumno actualizado correctamente.</strong></p>`;
    } else {
      alert(data.mensaje || "Alumno registrado correctamente.");
      contenedorQR.innerHTML = `
        <div>
          <p><strong>QR generado para:</strong> ${payload.nombre}</p>
          <img class="preview-qr" src="${data.qr_url}" alt="QR del alumno" />
          <br />
          <a class="qr-link" href="${data.qr_url}" target="_blank">Abrir / descargar QR</a>
        </div>
      `;
    }

    limpiarFormulario();
    await cargarAlumnos();
  } else {
    alert(data.error || "No se pudo guardar el alumno.");
  }
});

cancelarEdicionBtn.addEventListener("click", () => {
  limpiarFormulario();
  contenedorQR.innerHTML = "";
});

refreshBtn.addEventListener("click", cargarHistorial);
refreshAlumnosBtn.addEventListener("click", cargarAlumnos);

cargarHistorial();
cargarAlumnos();

const formConfigQR = document.getElementById("formConfigQR");
const tiempoQR = document.getElementById("tiempoQR");
const mensajeConfigQR = document.getElementById("mensajeConfigQR");

function setMensajeConfig(texto, tipo = "neutro") {
  if (!mensajeConfigQR) return;
  mensajeConfigQR.className = `resultado ${tipo}`;
  mensajeConfigQR.textContent = texto;
}

async function cargarTiempoQR() {
  if (!tiempoQR) return;

  const res = await fetch(`${API}/configuracion/qr-tiempo`);
  const data = await res.json();

  if (res.ok) {
    tiempoQR.value = data.segundos;
  }
}

if (formConfigQR) {
  formConfigQR.addEventListener("submit", async (e) => {
    e.preventDefault();

    const segundos = Number(tiempoQR.value);

    const res = await fetch(`${API}/configuracion/qr-tiempo`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ segundos }),
    });

    const data = await res.json();

    if (res.ok) {
      setMensajeConfig(data.mensaje, "ok");
    } else {
      setMensajeConfig(
        data.error || "No se pudo guardar la configuración.",
        "error",
      );
    }
  });

  cargarTiempoQR();
}

const modalEditar = document.getElementById("modalEditar");
const formEditarAlumno = document.getElementById("formEditarAlumno");
const cerrarModalBtn = document.getElementById("cerrarModalBtn");

const editAlumnoId = document.getElementById("editAlumnoId");
const editMatricula = document.getElementById("editMatricula");
const editNombre = document.getElementById("editNombre");
const editPlacas = document.getElementById("editPlacas");
const editActivo = document.getElementById("editActivo");

window.abrirModalEditar = function (id, matricula, nombre, placas, activo) {
  editAlumnoId.value = id;
  editMatricula.value = matricula;
  editNombre.value = nombre;
  editPlacas.value = placas || "";
  editActivo.checked = Boolean(activo);

  modalEditar.classList.add("activo");
};

function cerrarModalEditar() {
  modalEditar.classList.remove("activo");
}

if (cerrarModalBtn) {
  cerrarModalBtn.addEventListener("click", cerrarModalEditar);
}

if (modalEditar) {
  modalEditar.addEventListener("click", (e) => {
    if (e.target === modalEditar) {
      cerrarModalEditar();
    }
  });
}

if (editMatricula) {
  editMatricula.addEventListener("input", () => {
    editMatricula.value = soloNumeros(editMatricula.value).slice(0, 8);
  });
}

if (editNombre) {
  editNombre.addEventListener("input", () => {
    editNombre.value = soloLetras(editNombre.value);
  });
}

if (editPlacas) {
  editPlacas.addEventListener("input", () => {
    editPlacas.value = formatearPlaca(editPlacas.value);
  });
}

if (formEditarAlumno) {
  formEditarAlumno.addEventListener("submit", async (e) => {
    e.preventDefault();

    const id = editAlumnoId.value;

    const payload = {
      matricula: editMatricula.value.trim(),
      nombre: editNombre.value.trim(),
      auto_placa: editPlacas.value.trim(),
      activo: editActivo.checked,
    };

    if (
      !validarFormularioAlumno(
        payload.matricula,
        payload.nombre,
        payload.auto_placa,
      )
    ) {
      return;
    }

    const res = await fetch(`${API}/alumnos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (res.ok) {
      alert("Alumno actualizado correctamente.");
      cerrarModalEditar();
      await cargarAlumnos();
    } else {
      alert(data.error || "No se pudo actualizar el alumno.");
    }
  });
}
