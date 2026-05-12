const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');
const { db, initDb } = require('./db');
const crypto = require('crypto');
const app = express();
const PORT = 3001;

initDb();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/qrs', express.static(path.join(__dirname, 'qrs')));

const qrDir = path.join(__dirname, 'qrs');
if (!fs.existsSync(qrDir)) {
  fs.mkdirSync(qrDir);
}

function obtenerAlumnoPorQR(qrCode) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT * FROM alumnos WHERE qr_code = ?',
      [qrCode],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });
}

function obtenerUltimoAcceso(alumnoId) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT * FROM accesos WHERE alumno_id = ? ORDER BY id DESC LIMIT 1',
      [alumnoId],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });
}

function obtenerFechaHoraLocal() {
  const ahora = new Date();

  const opciones = {
    timeZone: 'America/Cancun',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  };

  const partes = new Intl.DateTimeFormat('es-MX', opciones)
    .formatToParts(ahora)
    .reduce((acc, parte) => {
      acc[parte.type] = parte.value;
      return acc;
    }, {});

  return `${partes.year}-${partes.month}-${partes.day} ${partes.hour}:${partes.minute}:${partes.second}`;
}

function insertarAcceso(data) {
  return new Promise((resolve, reject) => {
    const fechaHora = obtenerFechaHoraLocal();

    const sql = `
      INSERT INTO accesos (
        alumno_id, 
        matricula, 
        nombre, 
        placa, 
        qr_code, 
        tipo, 
        fecha_hora,
        estatus, 
        mensaje
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(
      sql,
      [
        data.alumno_id,
        data.matricula,
        data.nombre,
        data.placa,
        data.qr_code,
        data.tipo,
        fechaHora,
        data.estatus,
        data.mensaje
      ],
      function (err) {
        if (err) reject(err);
        else resolve({ id: this.lastID });
      }
    );
  });
}


function generarCodigoQRSeguro() {
  return `QR-${crypto.randomBytes(32).toString('hex')}`;
}

function generarNombreArchivoQR() {
  return `qr-${crypto.randomUUID()}.png`;
}

function generarTokenTemporal() {
  return `TEMP-${crypto.randomBytes(32).toString('hex')}`;
}

function obtenerConfiguracion(clave) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT valor FROM configuracion WHERE clave = ?',
      [clave],
      (err, row) => {
        if (err) reject(err);
        else resolve(row ? row.valor : null);
      }
    );
  });
}

function validarDatosAlumno(matricula, nombre, auto_placa = '') {
  const errores = [];

  if (!/^\d{8}$/.test(matricula)) {
    errores.push('La matrícula debe tener exactamente 8 números.');
  }

  if (!/^[a-zA-ZÁÉÍÓÚáéíóúÑñ\s]+$/.test(nombre)) {
    errores.push('El nombre solo puede contener letras y espacios.');
  }

  const placaSinGuion = auto_placa.replace('-', '');

  if (placaSinGuion && !/^[A-Z0-9]{1,7}$/.test(placaSinGuion)) {
    errores.push('La placa solo puede contener letras y números, máximo 7 caracteres.');
  }

  return errores;
}

app.get('/api/alumnos', (req, res) => {
  db.all('SELECT * FROM alumnos ORDER BY id DESC', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Error al consultar alumnos.' });
    }
    res.json(rows);
  });
});

app.get('/api/configuracion/qr-tiempo', async (req, res) => {
  try {
    const valor = await obtenerConfiguracion('qr_tiempo_segundos');

    res.json({
      segundos: Number(valor || 60)
    });
  } catch (error) {
    res.status(500).json({
      error: 'No se pudo consultar la configuración.'
    });
  }
});

app.put('/api/configuracion/qr-tiempo', (req, res) => {
  const { segundos } = req.body;
  const tiempo = Number(segundos);

  if (!tiempo || tiempo < 10 || tiempo > 3600) {
    return res.status(400).json({
      error: 'El tiempo debe estar entre 10 y 3600 segundos.'
    });
  }

  db.run(
    `INSERT INTO configuracion (clave, valor)
     VALUES ('qr_tiempo_segundos', ?)
     ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor`,
    [String(tiempo)],
    function (err) {
      if (err) {
        return res.status(500).json({
          error: 'No se pudo actualizar la configuración.'
        });
      }

      res.json({
        ok: true,
        mensaje: `Tiempo de QR actualizado a ${tiempo} segundos.`
      });
    }
  );
});

app.post('/api/alumnos', async (req, res) => {
  try {
    const { matricula, nombre, auto_placa, activo } = req.body;

    const errores = validarDatosAlumno(matricula, nombre, auto_placa || '');

if (errores.length > 0) {
  return res.status(400).json({
    error: errores.join(' ')
  });
}

    if (!matricula || !nombre) {
      return res.status(400).json({
        error: 'Matrícula y nombre son obligatorios.'
      });
    }

    const qr_code = generarCodigoQRSeguro();
    const qrFileName = generarNombreArchivoQR();
    const qrPath = path.join(qrDir, qrFileName);

    await QRCode.toFile(qrPath, qr_code, {
      width: 300,
      margin: 2
    });

    db.run(
  `INSERT INTO alumnos (matricula, nombre, qr_code, qr_file, auto_placa, activo)
   VALUES (?, ?, ?, ?, ?, ?)`,
  [matricula, nombre, qr_code, qrFileName, auto_placa || '', activo ? 1 : 0],
      function (err) {
        if (err) {
          return res.status(400).json({
            error: 'No se pudo registrar el alumno. Verifica que la matrícula no esté repetida.'
          });
        }

        res.json({
  ok: true,
  id: this.lastID,
  qr_code,
  qr_url: `/qrs/${qrFileName}`
});
      }
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: 'Error al generar el QR del alumno.'
    });
  }
});


app.post('/api/alumno/generar-qr-temporal', async (req, res) => {
  try {
    const { matricula } = req.body;

    if (!matricula) {
      return res.status(400).json({
        error: 'La matrícula es obligatoria.'
      });
    }

    db.get(
      'SELECT * FROM alumnos WHERE matricula = ?',
      [matricula],
      async (err, alumno) => {
        if (err) {
          return res.status(500).json({
            error: 'Error al buscar alumno.'
          });
        }

        if (!alumno) {
          return res.status(404).json({
            error: 'Alumno no encontrado.'
          });
        }

        if (!alumno.activo) {
          return res.status(403).json({
            error: 'El alumno está inactivo.'
          });
        }

        const tiempoConfig = await obtenerConfiguracion('qr_tiempo_segundos');
        const segundos = Number(tiempoConfig || 60);

        db.run(
          `UPDATE qr_temporales
           SET usado = 1
           WHERE alumno_id = ?
           AND usado = 0`,
          [alumno.id],
          function (cerrarErr) {
            if (cerrarErr) {
              return res.status(500).json({
                error: 'No se pudieron invalidar los QR anteriores.'
              });
            }

            const token = generarTokenTemporal();

            db.run(
              `INSERT INTO qr_temporales (alumno_id, token, expira_en)
               VALUES (?, ?, datetime('now', ?))`,
              [alumno.id, token, `+${segundos} seconds`],
              function (insertErr) {
                if (insertErr) {
                  return res.status(500).json({
                    error: 'No se pudo generar QR temporal.'
                  });
                }

                res.json({
                  ok: true,
                  token,
                  segundos,
                  alumno: {
                    nombre: alumno.nombre,
                    matricula: alumno.matricula,
                    placa: alumno.auto_placa
                  }
                });
              }
            );
          }
        );
      }
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: 'Error interno al generar QR temporal.'
    });
  }
});

app.put('/api/alumnos/:id', (req, res) => {
  const { id } = req.params;
  const { matricula, nombre, auto_placa, activo } = req.body;

  const errores = validarDatosAlumno(matricula, nombre, auto_placa || '');

if (errores.length > 0) {
  return res.status(400).json({
    error: errores.join(' ')
  });
}

  if (!matricula || !nombre) {
    return res.status(400).json({
      error: 'Matrícula y nombre son obligatorios.'
    });
  }

  db.get('SELECT * FROM alumnos WHERE id = ?', [id], (err, alumno) => {
    if (err || !alumno) {
      return res.status(404).json({
        error: 'Alumno no encontrado.'
      });
    }

    const sql = `
      UPDATE alumnos
      SET matricula = ?, nombre = ?, auto_placa = ?, activo = ?
      WHERE id = ?
    `;

    db.run(
      sql,
      [matricula, nombre, auto_placa || '', activo ? 1 : 0, id],
      function (updateErr) {
        if (updateErr) {
          return res.status(400).json({
            error: 'No se pudo actualizar el alumno. Verifica que la matrícula no esté repetida.'
          });
        }

        if (alumno.matricula !== matricula) {
          const oldQr = path.join(qrDir, `${alumno.matricula}.png`);
          const newQr = path.join(qrDir, `${matricula}.png`);

          if (fs.existsSync(oldQr)) {
            fs.renameSync(oldQr, newQr);
          }
        }

        res.json({
          ok: true,
          mensaje: 'Alumno actualizado correctamente.'
        });
      }
    );
  });
});


app.delete('/api/alumnos/:id', (req, res) => {
  const { id } = req.params;

  db.get('SELECT * FROM alumnos WHERE id = ?', [id], (err, alumno) => {
    if (err || !alumno) {
      return res.status(404).json({
        error: 'Alumno no encontrado.'
      });
    }

    db.run('DELETE FROM accesos WHERE alumno_id = ?', [id], (errAccesos) => {
      if (errAccesos) {
        return res.status(500).json({
          error: 'No se pudieron eliminar los accesos del alumno.'
        });
      }

      db.run('DELETE FROM alumnos WHERE id = ?', [id], function (deleteErr) {
        if (deleteErr) {
          return res.status(500).json({
            error: 'No se pudo eliminar el alumno.'
          });
        }

        const qrPath = path.join(qrDir, `${alumno.matricula}.png`);
        if (fs.existsSync(qrPath)) {
          fs.unlinkSync(qrPath);
        }

        db.get('SELECT COUNT(*) AS total FROM alumnos', (countErr, row) => {
          if (countErr) {
            return res.status(500).json({
              error: 'Alumno eliminado, pero no se pudo verificar la secuencia.'
            });
          }

          if (row.total === 0) {
            db.run("DELETE FROM sqlite_sequence WHERE name = 'alumnos'", (seqErr) => {
              if (seqErr) {
                return res.status(500).json({
                  error: 'Alumno eliminado, pero no se pudo reiniciar el contador.'
                });
              }

              res.json({
                ok: true,
                mensaje: 'Alumno eliminado correctamente. El contador de alumnos se reinició a 1.'
              });
            });
          } else {
            res.json({
              ok: true,
              mensaje: 'Alumno eliminado correctamente.'
            });
          }
        });
      });
    });
  });
});


app.post('/api/alumnos/:id/regenerar-qr', async (req, res) => {
  const { id } = req.params;

  db.get('SELECT * FROM alumnos WHERE id = ?', [id], async (err, alumno) => {
    if (err || !alumno) {
      return res.status(404).json({
        error: 'Alumno no encontrado.'
      });
    }

    try {
      const nuevoQrCode = generarCodigoQRSeguro();
      const nuevoQrFile = generarNombreArchivoQR();
      const nuevoQrPath = path.join(qrDir, nuevoQrFile);

      await QRCode.toFile(nuevoQrPath, nuevoQrCode, {
        width: 300,
        margin: 2
      });

      if (alumno.qr_file) {
        const oldQrPath = path.join(qrDir, alumno.qr_file);
        if (fs.existsSync(oldQrPath)) {
          fs.unlinkSync(oldQrPath);
        }
      }

      db.run(
        'UPDATE alumnos SET qr_code = ?, qr_file = ? WHERE id = ?',
        [nuevoQrCode, nuevoQrFile, id],
        function (updateErr) {
          if (updateErr) {
            return res.status(500).json({
              error: 'No se pudo actualizar el QR del alumno.'
            });
          }

          res.json({
            ok: true,
            mensaje: 'QR regenerado correctamente. El QR anterior ya no es válido.',
            qr_code: nuevoQrCode,
            qr_url: `/qrs/${nuevoQrFile}`
          });
        }
      );
    } catch (error) {
      console.error(error);
      res.status(500).json({
        error: 'Error al regenerar el QR.'
      });
    }
  });
});

app.post('/api/escanear', async (req, res) => {
  try {
    const { qr_code } = req.body;

    if (!qr_code) {
      return res.status(400).json({
        acceso: false,
        mensaje: 'QR no recibido.'
      });
    }

    if (qr_code.startsWith('TEMP-')) {
  db.get(
    `SELECT 
       qt.*,
       a.id AS alumno_id_real,
       a.matricula,
       a.nombre,
       a.auto_placa,
       a.activo
     FROM qr_temporales qt
     INNER JOIN alumnos a ON a.id = qt.alumno_id
     WHERE qt.token = ?`,
    [qr_code],
    async (err, row) => {
      if (err) {
        return res.status(500).json({
          acceso: false,
          mensaje: 'Error al validar QR temporal.'
        });
      }

      if (!row) {
        return res.status(404).json({
          acceso: false,
          mensaje: 'QR temporal no existe.'
        });
      }

      if (row.usado) {
        return res.status(403).json({
          acceso: false,
          mensaje: 'Este QR ya fue utilizado. El alumno debe generar uno nuevo.'
        });
      }

      db.get(
        `SELECT datetime('now') AS ahora, datetime(?) AS expira`,
        [row.expira_en],
        async (timeErr, timeRow) => {
          if (timeErr) {
            return res.status(500).json({
              acceso: false,
              mensaje: 'Error al validar expiración.'
            });
          }

          if (timeRow.ahora > timeRow.expira) {
            return res.status(403).json({
              acceso: false,
              mensaje: 'Este QR ya expiro. El alumno debe generar uno nuevo'
            });
          }

          if (!row.activo) {
            return res.status(403).json({
              acceso: false,
              mensaje: 'Alumno inactivo.'
            });
          }

          const ultimo = await obtenerUltimoAcceso(row.alumno_id_real);
          const siguienteTipo =
            !ultimo || ultimo.tipo === 'SALIDA' ? 'ENTRADA' : 'SALIDA';

          await insertarAcceso({
            alumno_id: row.alumno_id_real,
            matricula: row.matricula,
            nombre: row.nombre,
            placa: row.auto_placa,
            qr_code: row.token,
            tipo: siguienteTipo,
            estatus: 'AUTORIZADO',
            mensaje: `Registro exitoso de ${siguienteTipo.toLowerCase()} con QR temporal.`
          });

          db.run(
            'UPDATE qr_temporales SET usado = 1 WHERE id = ?',
            [row.id]
          );

          return res.json({
            acceso: true,
            tipo: siguienteTipo,
            alumno: {
              nombre: row.nombre,
              matricula: row.matricula,
              placa: row.auto_placa
            },
            mensaje: `Asistencia registrada correctamente. ${siguienteTipo} registrada.`
          });
        }
      );
    }
  );

  return;
}

    const alumno = await obtenerAlumnoPorQR(qr_code);

    

    if (!alumno) {
      return res.status(404).json({
        acceso: false,
        mensaje: 'Acceso denegado. El QR no existe en la base de datos.'
      });
    }

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

      return res.status(403).json({
        acceso: false,
        mensaje: 'Acceso denegado. Alumno inactivo en la base de datos.'
      });
    }

    const ultimo = await obtenerUltimoAcceso(alumno.id);
    const siguienteTipo = !ultimo || ultimo.tipo === 'SALIDA' ? 'ENTRADA' : 'SALIDA';

    await insertarAcceso({
      alumno_id: alumno.id,
      matricula: alumno.matricula,
      nombre: alumno.nombre,
      placa: alumno.auto_placa,
      qr_code: alumno.qr_code,
      tipo: siguienteTipo,
      estatus: 'AUTORIZADO',
      mensaje: `Registro exitoso de ${siguienteTipo.toLowerCase()}.`
    });

    res.json({
      acceso: true,
      tipo: siguienteTipo,
      alumno: {
        nombre: alumno.nombre,
        matricula: alumno.matricula,
        placa: alumno.auto_placa
      },
      mensaje: `Acceso autorizado. ${siguienteTipo} registrada correctamente.`
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      acceso: false,
      mensaje: 'Error interno del servidor.'
    });
  }
});

app.get('/api/accesos', (req, res) => {
  db.all(
    'SELECT * FROM accesos ORDER BY id DESC LIMIT 100',
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Error al consultar accesos.' });
      }
      res.json(rows);
    }
  );
});

app.listen(PORT, 'localhost', () => {
  console.log(`Servidor listo en http://localhost:${PORT}`);
  console.log(`Usa la IP de tu laptop para la app, por ejemplo: http://TU_IP:${PORT}`);
});


