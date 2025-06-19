

const express = require('express'); //Express web server
const cors = require('cors'); //Middleware for enabling CORS
const { ObjectId } = require('mongodb'); //MongoDB ObjectId validator
const { connectToDb, getDb } = require('./db'); //DB utility functions
const bcrypt = require('bcryptjs'); //For hashing passwords securely
const jwt = require('jsonwebtoken'); //For issuing and verifying JWT tokens
const http = require('http');
const { Server } = require('socket.io');


// Set JWT secret from environment or fallback
const JWT_SECRET = process.env.JWT_SECRET || 'chamber_of_secrets';

// Initialize express app
const app = express();

//middleware
app.use(cors()); // enable cors for all domains 
app.use(express.json()); //auto read all incoming requests as a JSON 

//placeholder for MongoDB connection object
let db;

//wrap the Express app
const server = http.createServer(app); //required for websocket integration

//only start server after database connection succeeds
connectToDb((err) => {
  if (!err) {
    server.listen(5001, () => { //listen for requests 
      console.log("Server with sockets running on http://localhost:5001");
    });
    db = getDb();
  }
});


//attaching socket to http server 
const io = new Server(server, {
  cors: {
    origin: '*', // allow all origins (we can adjust in a real life production scenerio)
    methods: ['GET', 'POST', 'PUT'] //https methods clients can use in a websocket connection
  }
});

// map to associate email addresses to socket IDs
const userSocketMap = {};

//handle WebSocket connections from clients
//listens for an event calls 'connection' from the browser 
//pass a callback function which fires when a connection is made
//'socket' variable refers to the instance of the connection we made 
io.on('connection', (socket) => {
  console.log('New user connected with socket id:', socket.id);

  //register user with their email address
  socket.on('register', (email) => {
    userSocketMap[email] = socket.id; // map socket ids to user email
  });

  //handle typing notification to another participant
  socket.on('typing', ({ from, to }) => {
    const recipientSocketId = userSocketMap[to];
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('typing', { from }); //notify recipient
    }
  });

  //handle new message sent from a client
  socket.on('sendMessage', (data) => {
    // Message format: { participants: [...], message: {...} }
    console.log('Received message via socket:', data);

    //emit to connected clients
    io.emit('newMessage', data);

    //save message to MongoDB
    const { participants, message } = data;
    const dbInstance = getDb();

    dbInstance.collection('convos').findOne({ participants })
      .then(existing => {
        if (existing) {
          //append message to existing conversation
          return dbInstance.collection('convos').updateOne(
            { participants },
            { $push: { messages: message } }
          );
        } else {
          //insert new conversation document if a conversation doesnt yet exist 
          return dbInstance.collection('convos').insertOne({
            participants,
            messages: [message]
          });
        }
      })
      .catch(err => {
        console.error('Failed to save message to DB:', err);
      });
  });

  //Log when user disconnects
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});


//middleware for logging 
app.use((req, res, next) => {
    console.log('new request made: '); 
    console.log('host: ', req.hostname);
    console.log('path: ', req.path);
    console.log('method: ', req.method);
    next(); //telling express we are finished with this middlewear and to move on 
});



// REST API Routes


// GET all employees
//first argument is the path you wanna listen to requests for
//second argument is a function that takes in a request / response object 
//req contains information on the request such as the URL and the method (GET/POST ect)
//res is the object used to send a response 
app.get('/employees', (req, res) => {
  let employees = []; // array to collect results

  db.collection('employees')
    .find() //mongoDB function 
    .sort({ name: 1 }) //sort by name ascending
    .forEach(employee => employees.push(employee)) //accumulate employees
    .then(() => res.status(200).json(employees)) //send response
    .catch(() => res.status(500).json({ error: 'Could not fetch documents' }));
});

// GET single employee by ID
app.get('/employees/:id', (req, res) => {
  if (ObjectId.isValid(req.params.id)) {
    db.collection('employees')
      .findOne({ _id: new ObjectId(req.params.id) }) //mongoDB function
      .then(doc => res.status(200).json(doc))
      .catch(err => res.status(500).json({ error: "Could not fetch document" }));
  } else {
    res.status(500).json({ error: "Invalid ID format" });
  }
});

// POST new employee (with hashed password)
app.post('/employees', async (req, res) => {
  const { name, email, department, role, password } = req.body;

  try {
    //check if email is already used
    const existing = await db.collection('employees').findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    //hash password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    const newEmployee = {
      name,
      email,
      department,
      role,
      password: hashedPassword
    };

    await db.collection('employees').insertOne(newEmployee);
    res.status(201).json({ message: 'Employee registered' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create employee' });
  }
});

// POST login endpoint
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    //look up employee by email
    const user = await db.collection('employees').findOne({ email });
    if (!user) return res.status(404).json({ error: 'User not found' });

    //validate password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid password' });

    //create JWT token for authentication
    const token = jwt.sign(
      { email: user.email, id: user._id },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    //return token and basic user info
    res.status(200).json({
      token,
      user: {
        email: user.email,
        name: user.name,
        department: user.department
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});



// GET all conversations in database
app.get('/convos', (req, res) => {
  let convos = []; //temp array to hold documents
  db.collection('convos')
    .find()
    .forEach(convo => convos.push(convo))
    .then(() => res.status(200).json(convos))
    .catch(() => res.status(500).json({ error: 'Could not fetch convos' }));
});

// POST endpoint to get messages between two users
app.post('/messages', async (req, res) => {
  const { participants } = req.body;

  try {
    //find conversation by participants array
    const convo = await db.collection('convos').findOne({ participants });
    //return messages if found, else return empty array
    res.json({ messages: convo?.messages || [] });
  } catch (err) {
    res.status(500).json({ error: 'Error retrieving messages' });
  }
});

// PUT endpoint to send/save a new message
app.put('/messages', async (req, res) => {
  const { participants, message } = req.body;

  try {
    const existing = await db.collection('convos').findOne({ participants });

    if (existing) {
      //append message to existing conversation
      await db.collection('convos').updateOne(
        { participants },
        { $push: { messages: message } }
      );
    } else {
      //create new conversation document
      await db.collection('convos').insertOne({
        participants,
        messages: [message]
      });
    }

    res.status(200).send({ success: true });
  } catch (err) {
    res.status(500).send({ error: 'Error saving message' });
  }
});


