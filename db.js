const { MongoClient } = require('mongodb');

// variable holds database connection instance
let dbConnection;

//export two functions:
// 1. connectToDb: Initializes the database connection
// 2. getDb: Returns the previously stored connection
module.exports = {
  //connect to MongoDB
  connectToDb: (cb) => {
    //connect to the 'employees' database on localhost
    MongoClient.connect('mongodb://localhost:27017/employees')
      .then((client) => {
        //use the 'employeedir' database within the Mongo cluster
        dbConnection = client.db('employeedir');
        //call the callback to indicate success
        return cb();
      })
      .catch((err) => {
        //log connection error to console
        console.log(err);
        //pass the error to the callback
        return cb(err);
      });
  },

  //retrieve the stored database connection instance
  getDb: () => dbConnection
};