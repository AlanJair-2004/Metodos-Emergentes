function validarAlumno(data) {
  const errores = [];

  if (!data.matricula || data.matricula.trim() === '') {
    errores.push('La matrícula es obligatoria.');
  }

  if (!data.nombre || data.nombre.trim() === '') {
    errores.push('El nombre es obligatorio.');
  }

  if (data.auto_placa && data.auto_placa.length > 15) {
    errores.push('La placa no debe exceder 15 caracteres.');
  }

  return {
    valido: errores.length === 0,
    errores
  };
}

function validarQR(qr_code) {
  if (!qr_code || qr_code.trim() === '') {
    return {
      valido: false,
      mensaje: 'El QR es obligatorio.'
    };
  }

  return {
    valido: true
  };
}

module.exports = {
  validarAlumno,
  validarQR
};