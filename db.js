const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'acceso_vehicular.db');
const schemaPath = path.join(__dirname, 'schema.sql');

const db = new sqlite3.Database(dbPath);

function initDb() {
  const schema = fs.readFileSync(schemaPath, 'utf8');

  db.exec(schema, (err) => {
    if (err) {
      console.error('Error al inicializar la base de datos:', err.message);
      return;
    }

    console.log('Base de datos lista.');
  });
}

module.exports = { db, initDb };