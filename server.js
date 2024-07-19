const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
const config = require('./config');
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Configuración de la conexión a la base de datos
const connection = mysql.createConnection(config);
connection.connect(err => {
  if (err) {
    console.error('Error conectando a la base de datos:', err);
    return;
  }
  console.log('Conectado a la base de datos MySQL');
});

app.use(express.static(path.join(__dirname, 'views')));
app.use('/icons', express.static(path.join(__dirname, 'icons')));
// Rutas
app.use(express.static(path.join(__dirname)));

// Rutas para servir archivos HTML específicos
app.get('/ordencompra.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'ordencompra.html'));
});

// Ruta para el índice principal
app.get('/index.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// Rutas de la API
app.get('/api/PersonalActivo', (req, res) => {
  connection.query('SELECT id, Nombre, Categoria, Departamento, LiderDeArea, NomUsu, contrasena FROM PersonalActivo', (err, results) => {
    if (err) {
      return res.status(500).send(err);
    }
    res.json(results);
  });
});

app.post('/api/login', (req, res) => {
  const { NomUsu, contrasena } = req.body;
  const query = 'SELECT * FROM PersonalActivo WHERE NomUsu = ? AND contrasena = ?';
  
  connection.query(query, [NomUsu, contrasena], (err, results) => {
    if (err) {
      return res.status(500).send(err);
    }
    if (results.length === 0) {
      return res.status(401).json({ message: 'Credenciales incorrectas' });
    }
    res.status(200).json({ message: 'Inicio de sesión exitoso', user: results[0] });
  });
});

app.post('/api/guardarRequisicion', (req, res) => {
  const requisicion = req.body;

  const query = `
    INSERT INTO requisiciones (date, department, customer, contractNumber, requiredBy, requisitionNo, projectLocation, jobOrder, equipmentNo, drawingNo, review, requiredDeliveredDate, notes, reviewedBy, preparedBy, approvedBy, authorizedBy, receivedBy)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const requisicionValues = [
    requisicion.date,
    requisicion.department,
    requisicion.customer,
    requisicion.contractNumber,
    requisicion.requiredBy,
    requisicion.requisitionNo,
    requisicion.projectLocation,
    requisicion.jobOrder,
    requisicion.equipmentNo,
    requisicion.drawingNo,
    requisicion.review,
    requisicion.requiredDeliveredDate,
    requisicion.notes,
    requisicion.reviewedBy,
    requisicion.preparedBy,
    requisicion.approvedBy,
    requisicion.authorizedBy,
    requisicion.receivedBy
  ];

  connection.query(query, requisicionValues, (err, result) => {
    if (err) {
      console.error('Error guardando la requisición:', err);
      res.status(500).json({ error: 'Error guardando la requisición' });
      return;
    }

    const requisicionId = result.insertId;

    const itemsQuery = `
      INSERT INTO requisicion_items (requisicion_id, quantity, unit, description, specification, stock, remarks)
      VALUES ?
    `;

    const itemsValues = requisicion.sections.flatMap(section => section.items.map(item => [
      requisicionId,
      item.quantity,
      item.unit,
      item.description,
      item.specification,
      item.stock,
      item.remarks
    ]));

    connection.query(itemsQuery, [itemsValues], (err, result) => {
      if (err) {
        console.error('Error guardando los ítems de la requisición:', err);
        res.status(500).json({ error: 'Error guardando los ítems de la requisición' });
        return;
      }

      res.status(200).json({ message: 'Requisición guardada exitosamente' });
    });

  });
});

// Endpoint para obtener detalles de una requisición por ID con sus items
app.get('/api/requisiciones/:id', (req, res) => {
  const requisicionId = req.params.id;

  const query = `
    SELECT 
      r.id AS requisicion_id,
      r.date,
      r.department,
      r.customer,
      r.contractNumber,
      r.requiredBy,
      r.requisitionNo,
      r.projectLocation,
      r.jobOrder,
      r.equipmentNo,
      r.drawingNo,
      r.review,
      r.requiredDeliveredDate,
      r.notes,
      r.reviewedBy,
      r.preparedBy,
      r.approvedBy,
      r.authorizedBy,
      r.receivedBy,
      ri.id AS item_id,
      ri.quantity,
      ri.unit,
      ri.description,
      ri.specification,
      ri.stock,
      ri.remarks
    FROM 
      requisiciones r
    INNER JOIN 
      requisicion_items ri ON r.id = ri.requisicion_id
    WHERE 
      r.id = ?
  `;

  connection.query(query, [requisicionId], (err, results) => {
    if (err) {
      console.error('Error obteniendo detalles de la requisición:', err);
      res.status(500).json({ error: 'Error obteniendo detalles de la requisición' });
      return;
    }
    res.json(results);
  });
});

// Endpoint para obtener todas las requisiciones con sus items
app.get('/api/requisiciones', (req, res) => {
  const query = `
    SELECT 
      r.id AS requisicion_id,
      r.*,
      ri.id AS item_id,
      ri.*
    FROM 
      requisiciones r
    INNER JOIN 
      requisicion_items ri ON r.id = ri.requisicion_id
  `;

  connection.query(query, (err, results) => {
    if (err) {
      console.error('Error obteniendo todas las requisiciones:', err);
      res.status(500).json({ error: 'Error obteniendo todas las requisiciones' });
      return;
    }
    res.json(results);
  });
});
// Ruta para insertar un nuevo proveedor y su dirección
app.post('/api/proveedores', (req, res) => {
  const { nombreRazonSocial, nombreComercial, rfc, nombreContacto, correoElectronico, telefono, calleNumero, colonia, localidadMunicipio, codigoPostal, ciudadEstado, pais, banco, numeroCuenta, clabeInterbancaria } = req.body;

  const domicilioQuery = `
    INSERT INTO DomPro (calle_numero, colonia, localidad_municipio, codigo_postal, ciudad_estado, pais)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  connection.query(domicilioQuery, [calleNumero, colonia, localidadMunicipio, codigoPostal, ciudadEstado, pais], (err, result) => {
    if (err) {
      console.error('Error guardando la dirección del proveedor:', err);
      res.status(500).json({ error: 'Error guardando la dirección del proveedor' });
      return;
    }

    const domicilioId = result.insertId;

    const proveedorQuery = `
      INSERT INTO Provvedores (nombre_razon_social_persona_moral, nombre_comercial, rfc, nombre_contacto, correo_electronico, telefono, domicilio_id, banco, numero_cuenta, clabe_interbancaria)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    connection.query(proveedorQuery, [nombreRazonSocial, nombreComercial, rfc, nombreContacto, correoElectronico, telefono, domicilioId, banco, numeroCuenta, clabeInterbancaria], (err, result) => {
      if (err) {
        console.error('Error guardando el proveedor:', err);
        res.status(500).json({ error: 'Error guardando el proveedor' });
        return;
      }

      res.status(200).json({ message: 'Proveedor guardado exitosamente' });
    });
  });
});
// Ruta para obtener todos los proveedores con sus domicilios
app.get('/api/proveedores', (req, res) => {
  const query = `
   SELECT 
  p.id AS proveedor_id,
  p.nombre_razon_social_persona_moral AS nombreRazonSocial,
  p.nombre_comercial AS nombreComercial,
  p.rfc,
  p.nombre_contacto AS nombreContacto,
  p.correo_electronico AS correoElectronico,
  p.telefono,
  p.banco,
  p.numero_cuenta AS numeroCuenta,
  p.clabe_interbancaria AS clabeInterbancaria,
  d.id AS domicilio_id,
  d.calle_numero AS calleNumero,
  d.colonia,
  d.localidad_municipio AS localidadMunicipio,
  d.codigo_postal AS codigoPostal,
  d.ciudad_estado AS ciudadEstado,
  d.pais
FROM 
  Provvedores p
INNER JOIN 
  DomPro d ON p.domicilio_id = d.id;

  `;

  connection.query(query, (err, results) => {
    if (err) {
      console.error('Error obteniendo proveedores con domicilios:', err);
      res.status(500).json({ error: 'Error obteniendo proveedores con domicilios' });
      return;
    }
    res.json(results);
  });
});

const PORT = process.env.PORT || 48983;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
