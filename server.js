const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');
const { db, initDb } = require('./db');
const https = require('https');

const app = express();
const PORT = 3001;

initDb();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/qrs', express.static(path.join(__dirname, 'qrs')));

function generarCodigoQR(matricula) {
  return `QR-${matricula}-${Date.now()}`;
}

app.post('/api/alumnos', async (req, res) => {
  // lógica para registrar alumno y generar QR
});

app.post('/api/escanear', async (req, res) => {
  // lógica de validación y acceso
});

app.put('/api/alumnos/:id', (req, res) => {
  // lógica de actualización
});

app.delete('/api/alumnos/:id', (req, res) => {
  // lógica de eliminación
});