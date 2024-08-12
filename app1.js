const express = require('express');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcrypt');
const db = require('./dbConfig');

// Create the Express application
const app = express();
const port = 3010;



// Middleware to parse form data
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

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

// API endpoint to handle user data with image 

app.post('/api/user', upload.single('imagelink'), async(req, res) => {

  const userid = req.body.userid;
  const password = await bcrypt.hash(req.body.password, 10);
  const role = req.body.role;
  const name = req.body.name;
  const address = req.body.address;
  const phone = req.body.phone;
  const email = req.body.email;
  const imagelink = req.file;

  if (!imagelink) {
    return res.status(400).json({ message: 'No image uploaded' });
  }

  // const imagePath = image.path;
  const imageFilename = imagelink.filename;

  // Insert data into the database
  const sql = 'INSERT INTO tbusers (userid, password, role, name, address, phone, email, imagelink) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
  
  const [result] = await db.query(sql, [userid, password, role, name, address, phone, email, imageFilename]);

  
  // Respond with success message
  res.status(200).json({
    message: 'User Data saved successfully!',
    data: {
      id: userid
    }
  });
});




// API endpoint to handle form data with image
app.post('/upload', upload.single('pic'), async(req, res) => {

  const name = req.body.name;
  const image = req.file;

  if (!image) {
    return res.status(400).json({ message: 'No image uploaded' });
  }

  // const imagePath = image.path;
  const imageFilename = image.filename;

  // Insert data into the database
  const sql = 'INSERT INTO profile (name, pic) VALUES (?, ?)';
  // console.log(sql)
  // db.query(sql, [name, imageFilename]);

  const [result] = await db.query(sql, [name, imageFilename]);

  // Respond with success message
  res.status(200).json({
    message: 'Data saved successfully!',
    data: {
      id: result.insertId,
      name: name,
      filename: imageFilename
    }
  });

  // , (err, result) => {
  //   if (err) {
  //     console.error('Error inserting data into the database:', err);
  //     return res.status(500).json({ message: 'Database error', error: err });
  //   }

  //   res.status(200).json({
  //     message: 'Form data and image uploaded successfully!',
  //     data: {
  //       name: name,
  //       imageFilename: imageFilename
  //     }
  //   });
  // });

});


app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});