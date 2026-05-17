contenedorQR.innerHTML = `
  <div>
    <p><strong>QR generado para:</strong> ${payload.nombre}</p>
    <img class="preview-qr" src="${data.qr_url}" alt="QR del alumno" />
    <br />
    <a class="qr-link" href="${data.qr_url}" target="_blank">Abrir / descargar QR</a>
  </div>

  if (!alumno.activo) {
  await insertarAcceso({
    alumno_id: alumno.id,
    matricula: alumno.matricula,
    nombre: alumno.nombre,
    placa: alumno.auto_placa,
    qr_code: alumno.qr_code,
    tipo: 'ENTRADA',
    estatus: 'DENEGADO',
    mensaje: 'Alumno registrado pero inactivo.'
  });
`;