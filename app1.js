const express = require('express');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcrypt');
const cors = require('cors');
const db = require('./dbConfig');

// Create the Express application
const app = express();
const port = 3010;



// Middleware to parse form data
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Enable All CORS Requests
app.use(cors());

// Configure multer for file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');  // Set the destination folder for the uploaded files
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));  // Use a unique filename
  }
});

const upload = multer({ storage: storage });


// GET route to fetch all users
app.get('/api/users', async (req, res) => {

  const sql = 'SELECT * FROM tbusers';
  const [rows] = await db.query(sql);

  res.status(200).json({
    message: 'Users fetched successfully',
    data: rows
  });
});

// GET route to fetch a specific user by ID
app.get('/api/users/:userid', async (req, res) => {
  const { userid } = req.params;


  const sql = 'SELECT * FROM tbusers WHERE userid = ?';
  const [rows] = await db.query(sql, [userid]);

  if (rows.length === 0) {
    return res.status(404).json({ message: 'User not found' });
  }

  res.status(200).json({
    message: 'User fetched successfully',
    data: rows[0]
  });
});

// API endpoint to handle user data with image 
app.post('/api/user', upload.single('imagelink'), async (req, res) => {

  const userid = req.body.userid;
  const password = await bcrypt.hash(req.body.password, 10);
  const role = req.body.role;
  const firstname = req.body.firstname;
  const lastname = req.body.lastname;
  const address = req.body.address;
  const phone = req.body.phone;
  const email = req.body.email;
  const imagelink = req.file;
  // console.log(req.body)

  if (!imagelink) {
    return res.status(400).json({ message: 'No image uploaded' });
  }

  // const imagePath = image.path;
  const imageFilename = imagelink.filename;

  // Insert data into the database
  const sql = 'INSERT INTO tbusers (userid, password, role, firstname, address, phone, email, imagelink, lastname) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';

  const [result] = await db.query(sql, [userid, password, role, firstname, address, phone, email, imageFilename, lastname]);


  // Respond with success message
  res.status(200).json({
    message: 'User Data saved successfully!',
    data: {
      id: userid
    }
  });
});


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


// API endpoint to handle user login
app.post('/api/login', async (req, res) => {

  const { userid, password } = req.body;

  const sql = 'SELECT * FROM tbusers WHERE userid = ?';
  console.log(sql)
  const [result] = await db.query(sql, [userid]);
  
  bcrypt.compare(password, result[0].password, (err, isMatch) => {
    if (err) {
      return res.status(500).json({ message: 'Error comparing passwords', error: err });
    }

    if (isMatch) {
    
      return res.status(200).json({ 
        message: 'Login successful', 
        data: {
          userid:result[0].userid
        } 
      });
    } else {
      // Passwords do not match
      return res.status(401).json({ message: 'Invalid user or password' });
    }
  });
});

app.post("/api/book", async(req, res) =>{

  const propertyid = req.body.propertyid;
  const ownerid = req.body.ownerid;
  // const bookingdate = req.body.bookingdate;
  const bookedby = req.body.bookedby;
  const bookingstatus = req.body.bookingstatus;
  const requestnote = req.body.requestnote;
  const approvalnote = req.body.approvalnote;


  // Insert data into the database
  const sql = 'INSERT INTO tbbooking (propertyid, ownerid, bookedby, bookingstatus, requestnote, approvalnote) VALUES (?, ?, ?, ?, ?, ?)';

  const [result] = await db.query(sql, [propertyid, ownerid, bookedby, bookingstatus, requestnote, approvalnote]);

  // Respond with success message
  res.status(200).json({
    message: 'Booking Data saved successfully!',
    data: {
      id: result.insertId
    }
  });

});

app.put("/api/book", async(req, res) =>{

  const bookingid = req.body.bookingid
  // const bookingdate = req.body.bookingdate;
  const bookingstatus = req.body.bookingstatus;
  const approvalnote = req.body.approvalnote;

  // console.log(req.body)

  const sql = 'UPDATE tbbooking SET  bookingstatus = ?, approvalnote = ? WHERE bookingid = ?';
  const [result] = await db.query(sql, [bookingstatus, approvalnote, bookingid]);

  if (result.affectedRows === 0) {
    return res.status(404).json({ message: 'Booking not found' });
  }

  res.status(200).json({
    message: 'Booking Confirmed',
    data: {
      id: bookingid
    }
  });

});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});