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
const { requireLogin, requireRiderAuth } = require('./middlewares/authMiddleware');
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

// Protect routes by role first
app.use('/api/consumer', requireLogin('consumer'));
app.use('/api/stakeholder', requireLogin('stakeholder'));
// Remove session authentication for rider routes - using simple rider_id validation instead
// app.use('/api/rider', requireLogin('rider'));

// Then register routes
app.use('/api/auth', authRoutes);
app.use('/api/signup', signupRoutes);
app.use('/api/map', mapRoutes);

const consumerRoutes = require('./routes/consumerRoutes');
app.use('/api/consumer', consumerRoutes);
const stakeholderRoutes = require('./routes/stakeholderRoutes');
app.use('/api/stakeholder', stakeholderRoutes);
const menuRoutes = require('./routes/menuRoutes');
app.use('/api/menu', menuRoutes);
const interiorRoutes = require('./routes/interiorRoutes');
app.use('/api/interior', interiorRoutes);
const restaurantRoutes = require('./routes/restaurantRoutes');
app.use('/api/restaurant', restaurantRoutes);
const locationRoutes = require('./routes/locationRoute');
app.use('/api/location',locationRoutes);
const cartRoutes = require('./routes/cartRoutes');
app.use('/api/cart', cartRoutes);
const dineInRoutes = require('./routes/dineInRoutes');
app.use('/api/dine-in', dineInRoutes);
const paymentRoutes = require('./routes/paymentRoutes');
app.use('/api/payment', paymentRoutes);
const orderRoutes = require('./routes/orderRoutes');
app.use('/api/orders', orderRoutes);
const riderRoutes = require('./routes/riderRoutes');
app.use('/api/rider', riderRoutes);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve login page
app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.use((req, res, next) => {
    if (req.path.endsWith('.html') && !req.path.includes('/login.html')) {
        return res.status(403).send('Direct access to HTML files is restricted.');
    }
    next();
});

const server = http.createServer(app);
const io = socketio(server);
app.set('io', io);

// ==================== SOCKET.IO - REAL-TIME TRACKING ====================
const consumerSockets = new Map(); // Track consumer connections

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // 🔥 Consumer registers for notifications
    socket.on('registerConsumer', (consumerId) => {
        consumerSockets.set(consumerId, socket.id);
        socket.join(`consumer-${consumerId}`);
        console.log(`✅ Consumer ${consumerId} registered for notifications (Socket: ${socket.id})`);
    });

    // Rider joins a tracking room for an order
    socket.on('join-tracking', (data) => {
        const { orderId, riderId } = data;
        const room = `order-${orderId}`;
        socket.join(room);
        console.log(`Rider ${riderId} joined tracking room for order ${orderId}`);
    });

    // 🔥 Consumer joins tracking room for their order
    socket.on('join-order-tracking', (data) => {
        const { orderId, consumerId } = data;
        const room = `order-${orderId}`;
        socket.join(room);
        console.log(`✅ Consumer ${consumerId} joined tracking room for order ${orderId}`);
    });

    // Rider sends location update
    socket.on('update-rider-location', (data) => {
        const { orderId, riderId, lat, lng } = data;
        const room = `order-${orderId}`;

        // Broadcast location to everyone in the room (including consumer tracking)
        io.to(room).emit('rider-location-update', {
            orderId: orderId,
            riderId: riderId,
            lat: lat,
            lng: lng,
            timestamp: new Date().toISOString()
        });

        console.log(`Location update for order ${orderId}: ${lat}, ${lng}`);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        // Remove consumer from tracking
        for (const [consumerId, socketId] of consumerSockets.entries()) {
            if (socketId === socket.id) {
                consumerSockets.delete(consumerId);
                console.log(`Consumer ${consumerId} disconnected`);
                break;
            }
        }
        console.log('Client disconnected:', socket.id);
    });
});

// 🔥 Export io for use in controllers
module.exports = { io, consumerSockets };

// Start
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on ${PORT}`));
