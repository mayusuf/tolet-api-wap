// const mysql = require('mysql2');
const mysql = require("mysql2/promise");

const mysqlPool = mysql.createPool({
  host: 'localhost',  // Replace with your MySQL server host
  user: 'springstudent',       // Replace with your MySQL username
  password: 'springstudent',  // Replace with your MySQL password
  database: 'tolet'  // Replace with the name of your database
});

// db.connect((err) => {
//   if (err) {
//     console.error('Error connecting to the database:', err);
//     return;
//   }
//   console.log('Successfully to the MySQL database');
// });

module.exports =   mysqlPool; // Export the connection pool as a promise