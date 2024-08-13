// const mysql = require('mysql2');
const mysql = require("mysql2");

const mysqlPool = mysql.createPool({
  host: 'localhost',  // Replace with your MySQL server host
  user: 'springstudent',       // Replace with your MySQL username
  password: 'springstudent',  // Replace with your MySQL password
  database: 'tolet'  // Replace with the name of your database
});

mysqlPool.getConnection((err, connection) => {
  
  if (err) {
    // console.log("dddd")
    console.error('Database connection failed:', err);
    return;
  }
  console.log('Connected to the MySQL database');
  
});

module.exports =   mysqlPool.promise(); // Export the connection pool as a promise