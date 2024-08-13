const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');

const app = express();
const port = 3000;

app.use(bodyParser.json());  

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '3M1r@12110',
  database: 'toletdb'
});

db.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    return;
  }
  console.log('Connected to MySQL');
});

app.post('/property', (req, res) => {
  console.log(req.body);  // Log the request body to ensure it's being parsed

  const {
    ownerid,
    paddress,
    propertyname,
    propertytype,
    numberofroom,
    propertysize,
    sizeunit,
    apartmentnumber,
    description,
    petallowed,
    utility,
    otherfacilities,
    rent
  } = req.body;

  if (!ownerid) {
    res.status(400).json({ error: "ownerid is required" });
    return;
  }

  const query = `
    INSERT INTO tbproperty 
    (ownerid, paddress, propertyname, propertytype, numberofroom, propertysize, sizeunit, apartmentnumber, description, petallowed, utility, otherfacilities, rent) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(query, [
    ownerid,
    paddress,
    propertyname,
    propertytype,
    numberofroom,
    propertysize,
    sizeunit,
    apartmentnumber,
    description,
    petallowed,
    utility,
    otherfacilities,
    rent
  ], (err, result) => {
    if (err) {
      console.error('Error inserting data:', err.message);
      res.status(500).json({ error: 'Database insertion failed' });
      return;
    }
    res.status(201).json({ message: 'Property added successfully', id: result.insertId });
  });
});


app.get('/property', (req, res) => {
 
  const { propertyid, maxRent, numberofroom, propertysize } = req.query;
  let query;
  let queryParams = [];

  if (propertyid) {
    //retrive based on property id. specific property
    query = `SELECT * FROM tbproperty WHERE propertyid = ?`;
    queryParams.push(propertyid);
  } else if (propertysize && !propertyid && !maxRent && !numberofroom) {
    // Only propertysize is provided
    query = `SELECT * FROM tbproperty WHERE propertysize = ?`;
    queryParams.push(propertysize);
  } else if (maxRent && !propertyid && !propertysize && !numberofroom) {
    // Only rent is provided
    query = `SELECT * FROM tbproperty WHERE rent <= ?`;
    queryParams.push(maxRent);
  } else if (numberofroom && !propertyid && !propertysize && !maxRent) {
    // Only number of room is provided
    query = `SELECT * FROM tbproperty WHERE numberofroom = ?`;
    queryParams.push(numberofroom);
  } else {
    // No parameters provided, select all properties
    query = `SELECT * FROM tbproperty`;
  }
  console.log(query)

  db.query(query, queryParams, (err, results) => {
    if (err) {
      console.error('Error retrieving data:', err.message);
      res.status(500).json({ error: 'Database query failed' });
      return;
    }
    if (results.length === 0) {
      res.status(404).json({ message: 'No properties found' });
      return;
    }
    res.status(200).json(results);
  });
});


app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});