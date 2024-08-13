const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

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


// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Save with a unique filename
  }
});

const upload = multer({ storage: storage });

// POST API to upload images and save links in the propertyimage table
app.post('/upload-images/:propertyid', upload.array('images', 10), (req, res) => {
  const { propertyid } = req.params;
  const files = req.files;

  if (!files || files.length !== 10) {
    return res.status(400).json({ error: 'You must upload exactly 10 images.' });
  }

  const imagePaths = files.map((file) => {
    return `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;
  });

  // Create the query with each value wrapped in single quotes
  const query = `
    INSERT INTO propertyimage 
    (propertyid, image1, image2, image3, image4, image5, 
    image6, image7, image8, image9, image10) 
    VALUES (
      '${propertyid}', 
      '${imagePaths[0]}', '${imagePaths[1]}', '${imagePaths[2]}', '${imagePaths[3]}', '${imagePaths[4]}', 
      '${imagePaths[5]}', '${imagePaths[6]}', '${imagePaths[7]}', '${imagePaths[8]}', '${imagePaths[9]}'
    )
    ON DUPLICATE KEY UPDATE
    image1 = '${imagePaths[0]}', image2 = '${imagePaths[1]}', 
    image3 = '${imagePaths[2]}', image4 = '${imagePaths[3]}', 
    image5 = '${imagePaths[4]}', image6 = '${imagePaths[5]}', 
    image7 = '${imagePaths[6]}', image8 = '${imagePaths[7]}', 
    image9 = '${imagePaths[8]}', image10 = '${imagePaths[9]}'
  `;

  db.query(query, (err, result) => {
    if (err) {
      console.error('Error updating database:', err.message);
      res.status(500).json({ error: 'Database update failed' });
      return;
    }
    res.status(200).json({ message: 'Images uploaded and links saved successfully.' });
  });
});


// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// GET API to retrieve image links for a specific property from propertyimage table
app.get('/property-images/:propertyid', (req, res) => {
  const { propertyid } = req.params;

  const query = `
    SELECT image1, image2, image3, image4, image5, 
    image6, image7, image8, image9, image10 
    FROM propertyimage WHERE propertyid = ?
  `;

  db.query(query, [propertyid], (err, results) => {
    if (err) {
      console.error('Error retrieving data:', err.message);
      res.status(500).json({ error: 'Database query failed' });
      return;
    }
    if (results.length === 0) {
      res.status(404).json({ message: 'Property not found' });
      return;
    }

    const images = results[0];
    res.status(200).json(images);
  });
});


app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});