// server.js
const express = require('express');
require('dotenv').config();
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const http = require('http');
const socketio = require('socket.io');

const pool = require('./config/configdb');
const authRoutes = require('./routes/authRoutes');
const signupRoutes = require('./routes/signupRoutes');
const sessionMiddleware = require('./middlewares/sessionMiddleware');
const { requireLogin } = require('./middlewares/authMiddleware');
const mapRoutes = require('./routes/mapRoutes');

const app = express();

// Body + CORS
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors({ origin: true, credentials: true }));

// Session store
const sessionStore = new MySQLStore({}, pool);
app.use(session({
  name: process.env.SESSION_NAME,
  secret: process.env.SESSION_SECRET,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: parseInt(process.env.SESSION_LIFETIME),
    httpOnly: true,
    secure: false,
    sameSite: 'lax'
  }
}));

// Public API routes
app.use('/api/auth', authRoutes);
app.use('/api/signup', signupRoutes);
app.use('/api/map', mapRoutes);
// Everything under /api requires a valid session
//app.use('/api', sessionMiddleware);

// /server.js
const consumerRoutes = require('./routes/consumerRoutes');
app.use('/api/consumer', consumerRoutes);
const stakeholderRoutes = require('./routes/stakeholderRoutes');
app.use('/api/stakeholder', stakeholderRoutes);
const menuRoutes = require('./routes/menuRoutes');
app.use('/api/menu',menuRoutes); // or utilityRoutes if you put it there





// Serve login page
app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Protect dashboard routes by role
app.use('api/consumer', requireLogin('consumer'));
app.use('api/stakeholder', requireLogin('stakeholder'));
app.use('api/rider', requireLogin('rider'));

// Now serve the actual dashboards and other static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


app.use((req, res, next) => {
    if (req.path.endsWith('.html') && !req.path.includes('/login.html')) {
        return res.status(403).send('Direct access to HTML files is restricted.');
    }
    next();
});


// ... your socket.io setup, other routes, etc.

const server = http.createServer(app);
const io = socketio(server);
// attach io to req if needed
app.set('io', io);

// Start
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on ${PORT}`));
