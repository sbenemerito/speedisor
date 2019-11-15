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
    CREATE TABLE IF NOT EXISTS Operator (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT,
      last_name TEXT,
      username TEXT NOT NULL,
      password TEXT NOT NULL,
      display_image TEXT,
      is_active INTEGER DEFAULT 1 NOT NULL,
      date_created TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
      date_updated TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS Driver (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT,
      last_name TEXT,
      username TEXT NOT NULL,
      password TEXT NOT NULL,
      display_image TEXT,
      is_active INTEGER DEFAULT 0 NOT NULL,
      date_created TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
      date_updated TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
      plate_number TEXT NOT NULL,
      address TEXT NOT NULL,
      contact_number TEXT NOT NULL,
      taxi_name TEXT NOT NULL,
      operator_id INTEGER,
      FOREIGN KEY(operator_id) REFERENCES Operator(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS Violation (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      location TEXT,
      max_speed REAL,
      driver_speed REAL,
      date_created TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
      date_updated TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
      driver_id INTEGER,
      FOREIGN KEY(driver_id) REFERENCES Driver(id)
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
const server = http.createServer(app);
const io = socketIO(server);

io.on('connection', socket => {
  console.log('client connected on websocket');
});


// Authentication endpoints
app.post('/login/operator', (req, res, next) => {
  const { username, password } = req.body;

  if (!username) {
    return res.status(400).json({ error: 'Username is required', key: 'usernameMissing' });
  }

  if (!password) {
    return res.status(400).json({ error: 'Password is required', key: 'passwordMissing' });
  }

  db.serialize(() => {
    db.get(`SELECT * FROM Operator WHERE username = '${username}'`, (error, user) => {
      if (user === undefined) {
        return res.status(400).json({
          error: 'There is no account with the given username',
          key: 'wrongUsername'
        });
      }

      bcrypt.compare(password, user.password, (err, isEqual) => {
        if (!isEqual) {
          return res.status(400).json({ error: 'Invalid password', key: 'wrongPassword' });
        }

        if (socketMap[`uid${user.id}`] !== undefined) {
          return res.status(400).json({ error: 'The account is already online.', key: 'duplicateLogin' });
        }

        const token = jwt.sign(
          { id: user.id, role: 'operator' },
          process.env.SECRET,
          { expiresIn: '24h' }
        );

        // do not return password
        user.password = undefined;

        res.json({ user, token });
      });
    });
  });
});

app.post('/login/driver', (req, res, next) => {
  const { username, password } = req.body;

  if (!username) {
    return res.status(400).json({ error: 'Username is required', key: 'usernameMissing' });
  }

  if (!password) {
    return res.status(400).json({ error: 'Password is required', key: 'passwordMissing' });
  }

  db.serialize(() => {
    db.get(`SELECT * FROM Driver WHERE username = '${username}'`, (error, user) => {
      if (user === undefined) {
        return res.status(400).json({
          error: 'There is no account with the given username',
          key: 'wrongUsername'
        });
      }

      bcrypt.compare(password, user.password, (err, isEqual) => {
        if (!isEqual) {
          return res.status(400).json({ error: 'Invalid password', key: 'wrongPassword' });
        }

        if (socketMap[`uid${user.id}`] !== undefined) {
          return res.status(400).json({ error: 'The account is already online.', key: 'duplicateLogin' });
        }

        const token = jwt.sign(
          { id: user.id, role: 'operator' },
          process.env.SECRET,
          { expiresIn: '24h' }
        );

        // do not return password
        user.password = undefined;

        res.json({ user, token });
      });
    });
  });
});

app.post('/signup', (req, res, next) => {
  const { first_name, last_name, username, password, password2 } = req.body;

  if (!username) {
    return res.status(400).json({ error: 'Username is required', key: 'usernameMissing' });
  }

  if (username.length > 16) {
    return res.status(400).json({ error: 'Username exceeded max length: 16', key: 'usernameTooLong' });
  }

  if (!password) {
    return res.status(400).json({ error: 'Password is required', key: 'passwordMissing' });
  }

  if (password !== password2) {
    return res.status(400).json({ error: 'Passwords do not match', key: 'passwordsNotMatching' });
  }

  db.serialize(() => {
    db.get(`SELECT * FROM Operator WHERE username = '${username}'`, (error, user) => {
      if (user !== undefined) {
        return res.status(400).json({ error: 'Username is already taken', key: 'takenUsername'});
      }

      const hashedPassword = bcrypt.hashSync(password, bcrypt.genSaltSync(10));
      const insertQuery = `
        INSERT INTO Operator(first_name, last_name, username, password)
        VALUES ('${first_name || ''}', '${last_name || ''}', '${username}', '${hashedPassword}')
      `;

      db.run(insertQuery, (error, user) => {
        if (error) {
          return res.status(500).json({ error: 'Unexpected error', details: error });
        }

        db.get(`SELECT * FROM Operator WHERE username = '${username}'`, (error, user) => {
          const token = jwt.sign(
            { id: user.id, role: 'operator' },
            process.env.SECRET,
            { expiresIn: '24h' }
          );

          // do not return password
          user.password = undefined;

          res.json({ user, token });
        });
      });
    });
  });
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
