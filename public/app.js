contenedorQR.innerHTML = `
  <div>
    <p><strong>QR generado para:</strong> ${payload.nombre}</p>
    <img class="preview-qr" src="${data.qr_url}" alt="QR del alumno" />
    <br />
    <a class="qr-link" href="${data.qr_url}" target="_blank">Abrir / descargar QR</a>
  </div>
`;