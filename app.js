
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors=require('cors');
const mysql = require('mysql2');

const app = express();
const port = 3000;

// Set up MySQL connection
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

// Middleware to parse JSON bodies
app.use(express.json());

// POST route to create a property and upload images
app.post('/property', upload.array('propertyImages', 10), (req, res) => {
  const {
    ownerId,
    paddress,
    propertyName,
    propertyType,
    numberOfRooms,
    propertySize,
    sizeUnit,
    apartmentNumber,
    description,
    petAllowed,
    utility,
    rent,
    otherFacilities,
    status
    
  } = req.body;

  if (!ownerId) {
    res.status(400).json({ error: "ownerId is required" });
    return;
  }

  const files = req.files;

  if (!files || files.length > 10) {
    return res.status(400).json({ error: 'You can upload a maximum of 10 images.' });
  }

  const imageFilenames = files.map((file) => {
    return file.filename;
  });

  // Insert property data into tbproperty table
  const propertyQuery = `
    INSERT INTO tbproperty 
    (ownerid, paddress, propertyname, propertytype, numberofroom, propertysize, sizeunit, apartmentnumber, description, petallowed, utility, otherfacilities, rent, status) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?)
  `;
  

  db.query(propertyQuery, [
    ownerId,
    paddress,
    propertyName,
    propertyType,
    numberOfRooms,
    propertySize,
    sizeUnit,
    apartmentNumber,
    description,
    petAllowed,
    utility,
    otherFacilities,
    rent,
    status
  ], (err, result) => {
    
    if (err) {
      console.error('Error inserting data:', err.message);
      res.status(500).json({ error: 'Database insertion failed' });
      return;
    }

    // Get the auto-incremented property ID
    const propertyId = result.insertId;

    // Insert image filenames into propertyimage table
    const imageQuery = `
      INSERT INTO propertyimage 
      (propertyid, image1, image2, image3, image4, image5, 
      image6, image7, image8, image9, image10) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
      image1 = VALUES(image1), image2 = VALUES(image2), 
      image3 = VALUES(image3), image4 = VALUES(image4), 
      image5 = VALUES(image5), image6 = VALUES(image6), 
      image7 = VALUES(image7), image8 = VALUES(image8), 
      image9 = VALUES(image9), image10 = VALUES(image10)
    `;

    db.query(imageQuery, [
      propertyId,
      imageFilenames[0] || null, imageFilenames[1] || null, imageFilenames[2] || null,
      imageFilenames[3] || null, imageFilenames[4] || null, imageFilenames[5] || null,
      imageFilenames[6] || null, imageFilenames[7] || null, imageFilenames[8] || null,
      imageFilenames[9] || null
    ], (err, result) => {
      if (err) {
        console.error('Error inserting images:', err.message);
        res.status(500).json({ error: 'Image database update failed' });
        return;
      }

      res.status(200).json({ message: 'Property added successfully with images' });
    });
  });
});

// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));



app.get('/property', (req, res) => {
 
  const { propertyid, maxRent, numberofroom, propertysize } = req.query;
  let query;
  let queryParams = [];
  console.log(propertyid)

  if (propertyid) {
    //retrive based on property id. specific property
    query = `SELECT * FROM property_info WHERE propertyid = ?`;
    queryParams.push(propertyid);
  } else if (propertysize && !propertyid && !maxRent && !numberofroom) {
    // Only propertysize is provided
    query = `SELECT * FROM property_info WHERE propertysize = ? and status='active'`;
    queryParams.push(propertysize);
  } else if (maxRent && !propertyid && !propertysize && !numberofroom) {
    // Only rent is provided
    query = `SELECT * FROM property_info WHERE rent <= ? and status='active'`;
    queryParams.push(maxRent);
  } else if (numberofroom && !propertyid && !propertysize && !maxRent) {
    // Only number of room is provided
    query = `SELECT * FROM property_info WHERE numberofroom = ? status='active'`;
    queryParams.push(numberofroom);
  } else {
    // No parameters provided, select all properties
    query = `SELECT * FROM property_info where status='active'`;
  }
  

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

app.put('/updatepropertystatus/:propertyid',(req,res)=>{
  
    const { propertyid } = req.params;
  
    const query = `
     Update tbproperty Set status='sold' WHERE propertyid = ?
    `;
  
    db.query(query, [propertyid], (err, results) => {
      if (err) {
        console.error('Error updating data:', err.message);
        res.status(500).json({ error: 'Database query failed' });
        return;
      }
      if (results.affectedRows === 0) {
        res.status(404).json({ message: 'Property not found' });
      } else {
        res.status(200).json({ message: 'Record updated successfully' });
      }
      
    });

});


// GET API to retrieve image links for a specific property from propertyimage table
// app.get('/property-images/:propertyid', (req, res) => {
//   const { propertyid } = req.params;

//   const query = `
//     SELECT image1, image2, image3, image4, image5, 
//     image6, image7, image8, image9, image10 
//     FROM propertyimage WHERE propertyid = ?
//   `;

//   db.query(query, [propertyid], (err, results) => {
//     if (err) {
//       console.error('Error retrieving data:', err.message);
//       res.status(500).json({ error: 'Database query failed' });
//       return;
//     }
//     if (results.length === 0) {
//       res.status(404).json({ message: 'Image not found' });
//       return;
//     }

//     const images = results[0];
//     res.status(200).json(images);
//   });
// });


app.get('/bookinginfo/:ownerid', (req, res) => {
  const { ownerid } = req.params;
  const query = `
    SELECT * 
    FROM booking_info WHERE ownerId = ? and bookingStatus='requested'
  `;
  db.query(query, [ownerid], (err, results) => {
    if (err) {
      console.error('Error retrieving data:', err.message);
      res.status(500).json({ error: 'Database query failed' });
      return;
    }
    if (results.length === 0) {
      res.status(404).json({ message: 'Booking information not found' });
      return;
    }
    res.status(200).json(results);
  });
});







app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});