# Real-Time Messaging Backend

This is a lightweight messaging backend built with **Node.js**, **Express**, **Socket.IO**, and **MongoDB**. 

It supports real-time 1:1 chats between users, with persistent message history, authentication via JWT, and typing indicators.



## Features

- User registration and login with hashed passwords (bcrypt)
- JWT-based authentication
- Real-time messaging via WebSockets (Socket.IO)
- Typing indicators
- Message history saved to MongoDB
- REST endpoints for message retrieval and storage

---

## Architecture

```text
Client (React)
      <-->
    HTTP + WebSocket
      <-->
Express + Socket.IO (Node.js)
      <-->
    TCP
      <-->
MongoDB (localhost)

/project-root
├── app.js         # Express server with REST API and Socket.IO
├── db.js          # MongoDB connection utilities
├── package.json   # Dependencies and scripts


```

## Authentication 

# Sign Up 
Endpoint: POST /employees
```
[{"_id": "685362c8106af0075b57af7a"
, "name"
: "Abby
Jacobs", "email": "Abby@example.com", "department": "Analytics", "role": "Software Engineer", "password" : "$2b$10$NjOu0vc7uQF4zINm5gkaWOyKP58XUUUIeF×CoUGJe.El1moz8K0Mi" }
```

# Login
Endpoint: POST /login 
```
{
  "email": "alice@example.com",
  "password": "securepassword"
}
```

## Messasing 

# Get Messages 
Endpoint: POST /messages 
```
{
  "participants": ["alice@example.com", "bob@example.com"]
}
```

# Send Message 
Endpoint: PUT /messages 
```
{
  "participants": ["alice@example.com", "bob@example.com"],
  "message": {
    "sender": "alice@example.com",
    "text": "Hi Bob!",
    "timestamp": "2025-06-19T15:00:00Z"
  }
}
```

## MongoDB Schema 

# /employees Collection 
```
{
  "_id": ObjectId,
  "name": "Alice",
  "email": "alice@example.com",
  "department": "Engineering",
  "role": "Developer",
  "password": "bcrypt-hash"
}
```

# /convos Collection
```
{
  "_id": ObjectId,
  "participants": ["alice@example.com", "bob@example.com"],
  "messages": [
    {
      "sender": "alice@example.com",
      "text": "Hi Bob!",
      "timestamp": "2025-06-19T15:00:00Z"
    }
  ]
}
```












