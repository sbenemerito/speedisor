import http from 'http';
import express from 'express';
import socketIO from 'socket.io';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';


// Use .env config
dotenv.config();

// Database initialization
const databaseDir = process.env.DATABASE || 'db.sqlite3';
const sqlite = sqlite3.verbose();
const db = new sqlite.Database(databaseDir, error => {
  if (error === null) console.log('Successfully connected to DB');
  else console.error(error, 'Cannot connect to database!');
});

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS Users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT,
      last_name TEXT,
      username TEXT NOT NULL,
      password TEXT NOT NULL,
      wins_blue INTEGER DEFAULT 0 NOT NULL,
      wins_white INTEGER DEFAULT 0 NOT NULL,
      losses_blue INTEGER DEFAULT 0 NOT NULL,
      losses_white INTEGER DEFAULT 0 NOT NULL,
      is_admin INTEGER DEFAULT 0 NOT NULL,
      date_created DEFAULT CURRENT_DATE NOT NULL
    )
  `);
});

// Express setup
const PORT = process.env.PORT || 5000;

const app = express();

// body-parser middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended:false }));

// CORS middleware
app.use(cors())

// Live data is stored in memory
let socketMap = {};

app.get('/', (req, res) => res.json({ msg: 'API is working!' }));

// Sockets handler
const getSecret = () => [...Array(30)].map(() => Math.random().toString(36)[2]).join('');
console.log(getSecret());

const server = http.createServer(app);
const io = socketIO(server);

io.on('connection', socket => {
  console.log('client connected on websocket');
});

// Periodic cleaning every hour here
const hourInMilliseconds = 3600;
const cleanData = setInterval(() => {
  console.log('clean');
}, hourInMilliseconds);

// Serve
server.listen(PORT, () => {
  console.log('server started and listening on port ' + PORT);
});
