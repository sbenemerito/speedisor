import http from 'http';
import express from 'express';
import socketIO from 'socket.io';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import 'core-js/stable';
import 'regenerator-runtime/runtime';

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
      username TEXT NOT NULL UNIQUE,
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
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      display_image TEXT,
      is_active INTEGER DEFAULT 0 NOT NULL,
      date_created TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
      date_updated TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
      plate_number TEXT NOT NULL UNIQUE,
      address TEXT,
      contact_number TEXT,
      taxi_name TEXT NOT NULL UNIQUE,
      operator_id INTEGER,
      FOREIGN KEY(operator_id) REFERENCES Operator(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS Violation (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      latitude REAL,
      longitude REAL,
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

// Utility function(s)
const getUserFromToken = (token) => {
  return new Promise((resolve, reject) => {
    if (!token) resolve(null);

    try {
      /*
       * Try to decode & verify the JWT token
       * The token contains user's id ( it can contain more informations )
       * and this is saved in req.user object
       */
      const userFromToken = jwt.verify(token, process.env.SECRET);
      const tableName = userFromToken.role === 'operator' ? 'Operator' : 'Driver';

      db.serialize(() => {
        db.get(`SELECT * FROM ${tableName} WHERE id = ${userFromToken.id}`, (error, user) => {
          if (user !== undefined) resolve({ ...user, password: undefined, role: userFromToken.role });
          resolve(null);
        });
      });
    } catch (err) {
      resolve(null);
    }
  });
};

// Live data is stored in memory
let liveData = {};
let socketMap = {};
let onlineMap = {};
let recentViolators = [];


app.get('/', (req, res) => res.json({ msg: 'API is working!' }));


// Sockets handler
const server = http.createServer(app);
const io = socketIO(server);

io.on('connection', socket => {
  console.log('client connected on websocket');

  socket.on('bind token', async ({ token }) => {
    const userFromToken = await getUserFromToken(token);

    socketMap[socket.id] = userFromToken;

    if (userFromToken && userFromToken.role === 'operator') {
      socket.join(`${userFromToken.id}`);
      onlineMap[`oid${userFromToken.id}`] = true;
    } else {
      onlineMap[`did${userFromToken.id}`] = true;
    }
  });

  socket.on('stat update', async ({ userDetails, stats, readableLocation, token }) => {
    const userFromToken = await getUserFromToken(token);

    if (userFromToken.role === 'driver' && userDetails.id === userFromToken.id) {
      const operatorKey = `${userFromToken.operator_id}`;

      if (liveData[operatorKey] === undefined) {
        liveData[operatorKey] = [];
      }

      let updated = false;
      let tempData = liveData[operatorKey].map(item => {
        if (item.userDetails.id === userDetails.id) {
          updated = true;
          return { userDetails, stats, readableLocation };
        }

        return item;
      });

      if (!updated) tempData.push({ userDetails, stats, readableLocation });

      liveData[operatorKey] = [ ...tempData ];

      socket.to(operatorKey).emit('new stats', liveData[operatorKey]);

      let maxSpeed = 30;
      const maxSpeedTable = {
        'Ma-a': 40,
        'Carlos P. Garcia National Highway': 60,
        'Magtuod': 60,
        'McArthur Highway': 40,
        'MacArthur Hwy': 40,
        'Macarthur Hway': 40,
        'Diversion Road': 60,
        'Diversion Rd': 60,
        'Davao-Bukidnon Rd': 60,
        'Davao-Bukidnon Road': 60
      };

      if (readableLocation !== 'Davao City') {
        Object.keys(maxSpeedTable).forEach(key => {
          if (readableLocation.includes(key)) maxSpeed = maxSpeedTable[key];
        });
      }

      const convertedSpeed = Math.round((stats.speed * 3.6) * 100) / 100;
      if (convertedSpeed > maxSpeed && recentViolators.indexOf(`did${userDetails.id}`) === -1) {
        const violationQuery = `INSERT INTO Violation(latitude, longitude, location, max_speed, driver_speed, driver_id)
                                VALUES(${stats.latitude}, ${stats.longitude}, '${readableLocation}', ${maxSpeed}, ${convertedSpeed}, ${userDetails.id})`;
        db.run(violationQuery, (error, violation) => {
          if (!error) recentViolators.push(`did${userDetails.id}`);
        });
      }
    }
  });

  socket.on('disconnect', () => {
    let disconnectedUser = null;

    Object.keys(socketMap).forEach(item => {
      if (item === socket.id) {
        disconnectedUser = socketMap[item];
      }
    });

    if (disconnectedUser) {
      delete socketMap[socket.id];

      if (liveData[disconnectedUser.operator_id]) {
        let filteredData = liveData[disconnectedUser.operator_id].filter(val => {
          return val.userDetails.id !== disconnectedUser.id;
        });

        liveData[disconnectedUser.operator_id] = [...filteredData];
      }

      let keyPrefix = disconnectedUser.operator_id === undefined ? 'oid' : 'did';
      const mapKey = `${keyPrefix}${disconnectedUser.id}`;

      if (onlineMap[mapKey]) {
        onlineMap[mapKey] = undefined;
      }
    }
  });
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

        if (onlineMap[`oid${user.id}`] !== undefined) {
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

        if (onlineMap[`did${user.id}`] !== undefined) {
          return res.status(400).json({ error: 'The account is already online.', key: 'duplicateLogin' });
        }

        const token = jwt.sign(
          { id: user.id, role: 'driver' },
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

// Driver CRUD
app.get('/drivers', async (req, res, next) => {
  let token = null;
  if (req.hasOwnProperty('headers') && req.headers.hasOwnProperty('authorization')) {
    token = req.headers['authorization'];
  } else {
    return res.status(401).json({
      error: 'Failed to authenticate token!',
      key: 'missingToken'
    });
  }

  const userFromToken = await getUserFromToken(token);

  if (userFromToken !== null && userFromToken.role === 'operator') {
    const operatorKey = `${userFromToken.id}`;

    db.serialize(() => {
      db.all(`SELECT * FROM Driver WHERE operator_id = ${operatorKey}`, (error, drivers) => {
        res.json(drivers);
      });
    });
  } else {
    return res.status(403).json({
      error: 'Not an operator!',
      key: 'nonOperator'
    });
  }
});

app.get('/drivers/live', async (req, res, next) => {
  let token = null;
  if (req.hasOwnProperty('headers') && req.headers.hasOwnProperty('authorization')) {
    token = req.headers['authorization'];
  } else {
    return res.status(401).json({
      error: 'Failed to authenticate token!',
      key: 'missingToken'
    });
  }

  const userFromToken = await getUserFromToken(token);

  if (userFromToken.role === 'operator') {
    const operatorKey = `${userFromToken.id}`;

    if (liveData[operatorKey] === undefined) {
      liveData[operatorKey] = [];
    }

    res.json(liveData[operatorKey]);
  } else {
    return res.status(403).json({
      error: 'Not an operator!',
      key: 'nonOperator'
    });
  }
});

app.post('/drivers/create', async (req, res, next) => {
  let token = null;
  if (req.hasOwnProperty('headers') && req.headers.hasOwnProperty('authorization')) {
    token = req.headers['authorization'];
  } else {
    return res.status(401).json({
      error: 'Failed to authenticate token!',
      key: 'missingToken'
    });
  }

  const userFromToken = await getUserFromToken(token);

  if (userFromToken && userFromToken.role === 'operator') {
    const {
      first_name, last_name, username, password, password2,
      plate_number, address, contact_number, taxi_name
    } = req.body;

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
      db.get(`SELECT * FROM Driver WHERE username = '${username}'`, (error, user) => {
        if (user !== undefined) {
          return res.status(400).json({ error: 'Username is already taken', key: 'takenUsername'});
        }

        const hashedPassword = bcrypt.hashSync(password, bcrypt.genSaltSync(10));
        const insertQuery = `
          INSERT INTO Driver(
            first_name, last_name, username, password,
            plate_number, address, contact_number, taxi_name, operator_id)
          VALUES (
            '${first_name || ''}', '${last_name || ''}', '${username}', '${hashedPassword}',
            '${plate_number || ''}', '${address || ''}', '${contact_number || ''}', '${taxi_name || ''}', ${userFromToken.id})
        `;

        db.run(insertQuery, (error, user) => {
          if (error) {
            return res.status(500).json({ error: 'Unexpected error', details: error });
          }

          db.get(`SELECT * FROM Driver WHERE username = '${username}'`, (error, user) => {
            // do not return password
            user.password = undefined;
            res.json({ ...user });
          });
        });
      });
    });
  } else {
    return res.status(403).json({
      error: 'Not an operator!',
      key: 'nonOperator'
    });
  }
});

app.delete('/drivers/delete/:id', async (req, res, next) => {
  let token = null;
  if (req.hasOwnProperty('headers') && req.headers.hasOwnProperty('authorization')) {
    token = req.headers['authorization'];
  } else {
    return res.status(401).json({
      error: 'Failed to authenticate token!',
      key: 'missingToken'
    });
  }

  const userFromToken = await getUserFromToken(token);

  if (userFromToken.role === 'operator') {
    db.serialize(() => {
      db.get(`SELECT * FROM Driver WHERE id = '${req.params.id}'`, (error, user) => {
        if (user !== undefined) {
          if (user.operator_id !== userFromToken.id) {
            return res.status(403).json({ error: 'Driver does not belong to this operator', 'key': 'notOwner' });
          } else {
            const deleteQuery = `DELETE FROM Driver WHERE id = ${req.params.id}`;

            db.run(deleteQuery, (error, user) => {
              if (error) {
                return res.status(500).json({ error: 'Unexpected error', details: error });
              }

              res.json({ message: 'Successfully deleted' });
            });
          }
        } else {
          return res.status(404).json({ error: 'User does not exist', key: 'userNotFound'});
        }
      });
    });
  } else {
    return res.status(403).json({
      error: 'Not an operator!',
      key: 'nonOperator'
    });
  }
});


// Violation
app.get('/violations', async (req, res, next) => {
  let token = null;
  if (req.hasOwnProperty('headers') && req.headers.hasOwnProperty('authorization')) {
    token = req.headers['authorization'];
  } else {
    return res.status(401).json({
      error: 'Failed to authenticate token!',
      key: 'missingToken'
    });
  }

  const userFromToken = await getUserFromToken(token);

  if (userFromToken.role === 'operator') {
    const operatorKey = `${userFromToken.id}`;

    db.serialize(() => {
      db.all(`SELECT A.*, B.first_name, B.last_name, B.plate_number, B.taxi_name
              FROM Violation AS A
              INNER JOIN Driver AS B ON A.driver_id = B.id
              WHERE operator_id = ${operatorKey}`, (error, violations) => {
        res.json(violations);
      });
    });
  } else {
    return res.status(403).json({
      error: 'Not an operator!',
      key: 'nonOperator'
    });
  }
});

app.delete('/violations/delete/:id', async (req, res, next) => {
  let token = null;
  if (req.hasOwnProperty('headers') && req.headers.hasOwnProperty('authorization')) {
    token = req.headers['authorization'];
  } else {
    return res.status(401).json({
      error: 'Failed to authenticate token!',
      key: 'missingToken'
    });
  }

  const userFromToken = await getUserFromToken(token);

  if (userFromToken.role === 'operator') {
    const operatorKey = `${userFromToken.id}`;

    db.serialize(() => {
      db.get(`SELECT * FROM Violation
              INNER JOIN Driver on Violation.driver_id = Driver.id
              WHERE Violation.id = ${req.params.id}`, (error, violation) => {
        if (violation !== undefined) {
          if (violation.operator_id !== userFromToken.id) {
            return res.status(403).json({ error: 'Violation does not belong to this operator', 'key': 'notOwner' });
          } else {
            const deleteQuery = `DELETE FROM Violation WHERE id = ${req.params.id}`;

            db.run(deleteQuery, (error, violation) => {
              if (error) {
                return res.status(500).json({ error: 'Unexpected error', details: error });
              }

              db.all(`SELECT A.*, B.first_name, B.last_name, B.plate_number, B.taxi_name
                      FROM Violation AS A
                      INNER JOIN Driver AS B ON A.driver_id = B.id
                      WHERE operator_id = ${operatorKey}`, (error, violations) => {
                res.json(violations);
              });
            });
          }
        } else {
          return res.status(404).json({ error: 'Violation does not exist', key: 'violationNotFound'});
        }
      });
    });
  } else {
    return res.status(403).json({
      error: 'Not an operator!',
      key: 'nonOperator'
    });
  }
});


// Periodic cleaning every 5 minutes
const delayInMilliseconds = 300000;
const cleanData = setInterval(() => {
  recentViolators = [];
}, delayInMilliseconds);

// Serve
server.listen(PORT, () => {
  console.log('server started and listening on port ' + PORT);
});
