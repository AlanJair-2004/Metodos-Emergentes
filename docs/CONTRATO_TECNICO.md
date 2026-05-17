# Contrato técnico del proyecto

## Proyecto
Sistema Inteligente de Control de Acceso Vehicular

## Objetivo del archivo
Este documento define los nombres de variables, estructura de datos, endpoints, tablas y acuerdos técnicos que utilizará el equipo durante el desarrollo del sistema.

---

# 1. Convenciones generales

## Lenguaje
- Frontend web: HTML, CSS, JavaScript
- Backend: Node.js con Express
- Base de datos: SQLite
- Apps móviles: React Native con Expo

## Nomenclatura
- Variables en JavaScript: camelCase
- Tablas en base de datos: minúsculas y plural
- Endpoints: minúsculas, separados con guion si es necesario
- Commits: tipo(Sprint): descripción

Ejemplo:

```bash
feat(S9): implementar registro de alumnos
fix(S16): corregir mensajes temporales
docs(S20): documentar metodologia scrumban
2. Ramas de Git
Ramas principales
main
desarrollo
Ramas por módulo
feature/S6-interfaz-admin
feature/S7-base-datos
feature/S8-backend-base
feature/S9-registro-alumnos
feature/S10-admin-crud
feature/S11-configuracion-qr
feature/S12-app-alumno
feature/S13-app-guardia
feature/S14-qr-temporal-seguridad
feature/S15-registro-accesos
feature/S16-historial-mensajes
fix/S19-correcciones-finales
docs/S20-documentacion
Flujo de trabajo
feature/... → desarrollo → main
3. Estructura del proyecto
acceso-vehicular/
├── server.js
├── db.js
├── schema.sql
├── public/
│   ├── index.html
│   ├── app.js
│   └── styles.css
├── docs/
│   └── CONTRATO_TECNICO.md
└── qrs/

acceso-vehicular-alumno-app/
└── App.js

acceso-vehicular-guardia-app/
└── App.js
4. Variables principales del sistema
Alumno
id
matricula
nombre
auto_placa
activo
qr_code
qr_file
creado_en
Acceso
id
alumno_id
matricula
nombre
placa
qr_code
tipo
fecha_hora
estatus
mensaje
QR temporal
id
alumno_id
token
usado
creado_en
expira_en
Configuración
id
clave
valor
5. Reglas de validación
Matrícula
Debe tener exactamente 8 números.
No puede contener letras.

Ejemplo válido:

12345678

Ejemplo inválido:

A1234567
12345
Nombre
Solo puede contener letras y espacios.

Ejemplo válido:

Juan Perez
Maria Fernanda Lopez

Ejemplo inválido:

Juan123
Pedro_99
Placas
Máximo 7 caracteres alfanuméricos.
Se muestra con guion automático después de los primeros 3 caracteres.

Ejemplo:

ABC-1234
6. Base de datos
Tabla alumnos
CREATE TABLE IF NOT EXISTS alumnos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  matricula TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  qr_code TEXT UNIQUE,
  qr_file TEXT,
  auto_placa TEXT,
  activo INTEGER NOT NULL DEFAULT 1,
  creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
);
Tabla accesos
CREATE TABLE IF NOT EXISTS accesos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  alumno_id INTEGER NOT NULL,
  matricula TEXT NOT NULL,
  nombre TEXT NOT NULL,
  placa TEXT,
  qr_code TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK(tipo IN ('ENTRADA', 'SALIDA')),
  fecha_hora DATETIME DEFAULT CURRENT_TIMESTAMP,
  estatus TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  FOREIGN KEY (alumno_id) REFERENCES alumnos(id)
);
Tabla configuracion
CREATE TABLE IF NOT EXISTS configuracion (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clave TEXT NOT NULL UNIQUE,
  valor TEXT NOT NULL
);
Tabla qr_temporales
CREATE TABLE IF NOT EXISTS qr_temporales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  alumno_id INTEGER NOT NULL,
  token TEXT NOT NULL UNIQUE,
  usado INTEGER NOT NULL DEFAULT 0,
  creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
  expira_en DATETIME NOT NULL,
  FOREIGN KEY (alumno_id) REFERENCES alumnos(id)
);
7. Endpoints del backend
Alumnos
Obtener alumnos
GET /api/alumnos

Respuesta esperada:

[
  {
    "id": 1,
    "matricula": "12345678",
    "nombre": "Juan Perez",
    "auto_placa": "ABC-1234",
    "activo": 1
  }
]
Registrar alumno
POST /api/alumnos

Body:

{
  "matricula": "12345678",
  "nombre": "Juan Perez",
  "auto_placa": "ABC-1234",
  "activo": true
}

Respuesta correcta:

{
  "ok": true,
  "id": 1,
  "mensaje": "Alumno registrado correctamente."
}
Editar alumno
PUT /api/alumnos/:id

Body:

{
  "matricula": "12345678",
  "nombre": "Juan Perez",
  "auto_placa": "ABC-1234",
  "activo": true
}
Eliminar alumno
DELETE /api/alumnos/:id
8. Configuración del QR
Obtener tiempo del QR
GET /api/configuracion/qr-tiempo

Respuesta:

{
  "segundos": 60
}
Actualizar tiempo del QR
PUT /api/configuracion/qr-tiempo

Body:

{
  "segundos": 60
}
9. App Alumno
Endpoint usado
POST /api/alumno/generar-qr-temporal

Body:

{
  "matricula": "12345678"
}

Respuesta:

{
  "ok": true,
  "token": "TEMP-abc123",
  "segundos": 60,
  "alumno": {
    "nombre": "Juan Perez",
    "matricula": "12345678",
    "placa": "ABC-1234"
  }
}
Reglas de la app alumno
Solo genera QR.
No puede escanear QR.
No puede editar alumnos.
No puede consultar historial.
El botón se bloquea mientras el QR esté activo.
10. App Guardia
Endpoint usado
POST /api/escanear

Body:

{
  "qr_code": "TEMP-abc123"
}

Respuesta autorizada:

{
  "acceso": true,
  "tipo": "ENTRADA",
  "mensaje": "Asistencia registrada correctamente.",
  "alumno": {
    "nombre": "Juan Perez",
    "matricula": "12345678",
    "placa": "ABC-1234"
  }
}

Respuesta denegada:

{
  "acceso": false,
  "mensaje": "Este QR ya fue utilizado. El alumno debe generar uno nuevo."
}
Reglas de la app guardia
Solo escanea QR.
No puede generar QR.
No puede registrar alumnos.
No puede editar alumnos.
No puede eliminar alumnos.
