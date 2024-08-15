


const express = require('express');
const bodyParser = require('body-parser');
// const mysql = require('mysql2');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const cors = require('cors');
//const mysql = require('mysql2/promise');
const mysql = require("mysql2");
//const { query } = require('./dbConfig');
//const db = require('./dbConfig');

const app = express();
const port = 3000;

app.use(bodyParser.json());  
// Middleware to parse form data
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Enable All CORS Requests
app.use(cors());

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

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images are allowed'));
    }
  }
});

// Middleware to parse JSON bodies
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
//app.use('/uploads', express.static(path.join(__dirname, 'uploads')));



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
    query = `SELECT * FROM property_info WHERE numberofroom = ? and status='active'`;
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

// GET route to fetch all users
app.get('/api/users',  (req, res) => {

  const sql = 'SELECT * FROM tbusers';
 
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error retrieving data:', err.message);
      res.status(500).json({ error: 'Database query failed' });
      return;
    }
    if (results.length === 0) {
      res.status(404).json({ message: 'No user found' });
      return;
    }
    res.status(200).json(results);
  });
});

// GET booking info for tenant
app.get('/api/bookinginfotenant/:tenantId',  (req, res) => {
  const {tenantId}=req.params;

  const sql = `SELECT * FROM booking_info where tenantId = ?`;

  db.query(sql,[tenantId], (err, results) => {
     
    if (err) {
      console.error('Error retrieving data:', err.message);
      res.status(500).json({ error: 'Database query failed' });
      return;
    }
    if (results.length === 0) {
      res.status(404).json({ message: 'No booking found for the user' });
      return;
    }
    res.status(200).json(results);
  });
});

app.get('/api/users/:userid', (req, res) => {
  const { userid } = req.params;
  const query = `
    SELECT * 
    FROM tbusers WHERE userid = ?`;
  db.query(query, [userid], (err, results) => {
    if (err) {
      console.error('Error retrieving data:', err.message);
      res.status(500).json({ error: 'Database query failed' });
      return;
    }
    if (results.length === 0) {
      res.status(404).json({ message: 'User information not found' });
      return;
    }
    res.status(200).json(results);
  });
});

// API endpoint to handle user data with image 
app.post('/api/user', upload.single('imagelink'), async (req, res) => {

  try {
    const userid = req.body.userid;
    const password = await bcrypt.hash(req.body.password, 10);  // Wait for hashing to complete
    const role = req.body.role;
    const firstname = req.body.firstname;
    const lastname = req.body.lastname;
    const address = req.body.address;
    const phone = req.body.phone;
    const email = req.body.email;
    const imagelink = req.file ? req.file.filename : null;  // Store just the filename or null if no file

    const sql = `INSERT INTO tbusers (userid, password, role, firstname, lastname, address, phone, email, imagelink) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    db.query(sql, [userid, password, role, firstname, lastname, address, phone, email, imagelink], (err, results) => {
      if (err) {
        console.error('Error inserting user:', err.message);
        return res.status(500).json({ error: 'Database insertion failed' });
      }

      //res.status(200).json({ message: 'User added successfully with image' });
      res.status(200).json({
        message: 'User created successfully',
        data: {
          id: userid
        }
      });
    });
  } catch (err) {
    console.error('Error processing request:', err.message);
    res.status(500).json({ error: 'An error occurred' });
  }
  
});


// Serve static files from the uploads directory
//app.use('/uploads', express.static(path.join(__dirname, 'uploads')));



// PUT route to edit user information
app.put('/api/user', upload.single('imagelink'), async (req, res) => {

  const userid = req.body.userid;
  
  const password = await bcrypt.hash(req.body.password, 10);
  const role = req.body.role;
  const firstname = req.body.firstname;
  const lastname = req.body.lastname;
  const address = req.body.address;
  const phone = req.body.phone;
  const email = req.body.email;
  const imagelink = req.file;

  if (!imagelink) {
    return res.status(400).json({ message: 'No image uploaded' });
  }

  // const imagePath = image.path;
  const imageFilename = imagelink.filename;

  const sql = 'UPDATE tbusers SET password = ?, role = ?, firstname = ?, address = ?, phone = ?, email = ?, imagelink = ? , lastname = ? WHERE userid = ?';
  const [result] = await db.query(sql, [password, role, firstname, address, phone, email, imageFilename, lastname, userid]);

  if (result.affectedRows === 0) {
    return res.status(404).json({ message: 'User not found' });
  }

  res.status(200).json({
    message: 'User updated successfully',
    data: {
      id: userid
    }
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


// API endpoint to handle user login
app.post('/api/login', (req, res) => {

  const { userid, password } = req.body;

  const sql = 'SELECT * FROM tbusers WHERE userid = ?';
 

  db.query(sql, [userid], (err, results) => {
    if (err) {
      console.error('Error updating data:', err.message);
      res.status(500).json({ error: 'Database query failed' });
      return;
    }
    //const user=results[0];
    
    bcrypt.compare(password, results[0].password, (err, isMatch) => {
      if (err) {
        return res.status(500).json({ message: 'Error comparing passwords', error: err });
      }
      
  
      if (isMatch) {
      
        return res.status(200).json({ 
          message: 'Login successful', 
          data: {
            userid:results[0].userid
          } 
        });
      } else {
        // Passwords do not match
        return res.status(401).json({ message: 'Invalid user or password' });
      }
    });
    
  });
  
 
});

app.post("/api/book", (req, res) =>{

  const propertyid = req.body.propertyid;
  const ownerid = req.body.ownerid;
  // const bookingdate = req.body.bookingdate;
  const bookedby = req.body.bookedby;
  const bookingstatus = req.body.bookingstatus;
  const requestnote = req.body.requestnote;
  const approvalnote = req.body.approvalnote;


  // Insert data into the database
  const sql = 'INSERT INTO tbbooking (propertyid, ownerid, bookedby, bookingstatus, requestnote, approvalnote) VALUES (?, ?, ?, ?, ?, ?)';

  //const [result] = db.query(sql, [propertyid, ownerid, bookedby, bookingstatus, requestnote, approvalnote]);

  db.query(sql, [propertyid,ownerid, bookedby, bookingstatus, requestnote, approvalnote], (err, result) => {
    if (err) {
      console.error('Error inserting booking a property:', err.message);
      res.status(500).json({ error: 'Booking a property database update failed' });
      return;
    }

    res.status(200).json({ message: 'Booking a Property added successfully' });
  });
});

app.put("/api/book", (req, res) =>{
 
  const bookingid = req.body.bookingid
  const propertyid = req.body.propertyid;
  const bookingstatus = req.body.bookingstatus;
  const approvalnote = req.body.approvalnote;
 
  const sql1 = 'UPDATE tbbooking SET  bookingstatus = "rejected" WHERE propertyid = ?';
  db.query(sql1, [ propertyid], (err, result) => {
    if (err) {
      res.status(500).json({ error: 'Update a booking information for a property has been failed' });
      return;
    }
  });
 
  const sql = 'UPDATE tbbooking SET  bookingstatus = ?, approvalnote = ? WHERE bookingid = ?';
  db.query(sql, [bookingstatus, approvalnote, bookingid], (err, result) => {
    if (err) {
      res.status(500).json({ error: 'Update a booking information for a property has been failed' });
      return;
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    res.status(200).json({
      message: 'Booking Confirmed',
      data: {
        id: bookingid
      }
    });

  const sql2 = 'UPDATE tbproperty SET  status = "sold" WHERE propertyid = ?';
  db.query(sql2, [ propertyid], (err, result) => {
    if (err) {
      res.status(500).json({ error: 'Update a property information has been failed' });
      return;
    }

  });

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

//today's task is done. thank you