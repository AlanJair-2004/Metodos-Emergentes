const API = '/api';

let scanner = null;
let ultimaLectura = null;
let bloqueoTemporal = false;

const resultado = document.getElementById('resultado');
const tablaAccesos = document.getElementById('tablaAccesos');
const startScanBtn = document.getElementById('startScanBtn');
const stopScanBtn = document.getElementById('stopScanBtn');
const refreshBtn = document.getElementById('refreshBtn');

function setResultado(texto, tipo = 'neutro') {
  resultado.className = `resultado ${tipo}`;
  resultado.textContent = texto;
}

async function registrarEscaneo(qr) {
  const res = await fetch(`${API}/escanear`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ qr_code: qr })
  });

  const data = await res.json();

  if (data.acceso) {
    const alumno = data.alumno;

    alert(`Asistencia registrada correctamente.
Alumno: ${alumno.nombre}
Matrícula: ${alumno.matricula}
Movimiento: ${data.tipo}`);

    setResultado(
      `Asistencia registrada correctamente | ${alumno.nombre} | ${alumno.matricula} | ${alumno.placa || 'Sin placas'} | ${data.tipo}`,
      'ok'
    );
  } else {
    alert(data.mensaje || 'Acceso denegado.');
    setResultado(data.mensaje || 'Acceso denegado.', 'error');
  }

  await cargarHistorial();
}

async function iniciarScanner() {
  if (!window.Html5Qrcode) {
    setResultado('No se cargó la librería del escáner.', 'error');
    return;
  }

  if (scanner) return;

  scanner = new Html5Qrcode('reader');

  try {
    await scanner.start(
      { facingMode: 'environment' },
      {
        fps: 10,
        qrbox: { width: 250, height: 250 }
      },
      async (decodedText) => {
        if (bloqueoTemporal) return;
        if (decodedText === ultimaLectura) return;

        bloqueoTemporal = true;
        ultimaLectura = decodedText;

        try {
          await registrarEscaneo(decodedText);
        } catch (error) {
          console.error(error);
          setResultado('Error al registrar el escaneo.', 'error');
        }

        setTimeout(() => {
          bloqueoTemporal = false;
          ultimaLectura = null;
        }, 2500);
      },
      () => {}
    );

    setResultado('Cámara iniciada. Escanea un QR.', 'neutro');
  } catch (error) {
    console.error(error);
    setResultado('No se pudo iniciar la cámara. Revisa permisos del navegador.', 'error');
  }
}

async function detenerScanner() {
  if (!scanner) return;

  try {
    await scanner.stop();
    await scanner.clear();
  } catch (error) {
    console.error(error);
  }

  scanner = null;
  setResultado('Cámara detenida.', 'neutro');
}

async function cargarHistorial() {
  const res = await fetch(`${API}/accesos`);
  const data = await res.json();

  tablaAccesos.innerHTML = data.map(item => `
    <tr>
      <td>${item.id}</td>
      <td>${item.matricula}</td>
      <td>${item.nombre}</td>
      <td>${item.placa || ''}</td>
      <td>${item.tipo}</td>
      <td>${item.estatus}</td>
      <td>${item.mensaje}</td>
      <td>${item.fecha_hora}</td>
    </tr>
  `).join('');
}

startScanBtn.addEventListener('click', iniciarScanner);
stopScanBtn.addEventListener('click', detenerScanner);
refreshBtn.addEventListener('click', cargarHistorial);

cargarHistorial();