const authModel = require('../models/authModel');
const bcrypt = require('bcrypt');
const pool = require('../config/configdb')
const util = require('util');
// Promisify pool.query so we can await it
const dbQuery = util.promisify(pool.query).bind(pool);

exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        // 1. Fetch user by email
        const user = await authModel.getUserByEmail(email);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not found'
            });
        }

        // 2. Compare entered password with hashed one
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid password'
            });
        }

        // 3 & 4. Rotate session to clear old one, then store user info in the new session
        return req.session.regenerate((err) => {
            if (err) {
                console.error('Session regeneration error:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Session error'
                });
            }

            // 4. Store user info in this new session
            req.session.userId = user.user_id;
            req.session.role   = user.role;
            

            console.log('🔑 New session created, ID:', req.sessionID);

            // 5. Define role-based redirect path
            const redirectMap = {
                consumer:    '/consumer/khadok.consumer.dashboard.html',
                stakeholder: '/stakeholder/khadok.stakeholder.index.html',
                rider:       '/rider/index.html'
            };

            const redirectUrl = redirectMap[user.role];
            if (!redirectUrl) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid user role'
                });
            }

            // 6. Send success response
            return res.status(200).json({
                success: true,
                message: 'Login successful',
                sessionId: req.sessionID,
                user: {
                    id: user.user_id,
                    role: user.role
                },
                redirect: redirectUrl
            });
        });

    } catch (error) {
        console.error('💥 Login error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};


// controllers/authController.js
exports.logout = (req, res) => {
    // Get the current session ID from Express (this will only work if user is logged in)
    const sessionId = req.sessionID;

    // Retrieve session ID from the client's localStorage (sent in request body)
    const sessionIdFromLocalStorage = req.body.sessionId;

    // If no session ID is found, respond with an error
    if (!sessionIdFromLocalStorage) {
        return res.status(400).json({ message: 'No session ID provided' });
    }

    // 1. Delete the session from MySQL using the session ID retrieved from localStorage
    const deleteSessionQuery = 'DELETE FROM sessions WHERE session_id = ?';

    pool.query(deleteSessionQuery, [sessionIdFromLocalStorage], (err, result) => {
        if (err) {
            console.error('Database error while deleting session:', err);
            return res.status(500).json({ message: 'Logout failed (DB error)' });
        }

        // 2. Destroy the session in memory (Express session)
        req.session.destroy((err) => {
            if (err) {
                console.error('Session destroy error:', err);
                return res.status(500).json({ message: 'Logout failed (Session destroy error)' });
            }

            // 3. Clear the session cookie from the client
            res.clearCookie(process.env.SESSION_NAME);

            // 4. Respond with success
            return res.status(200).json({ message: 'Logged out successfully' });
        });
    });
};


  
// controllers/authController.js
exports.checkSession = (req, res) => {
    if (req.session && req.session.userId) {
      return res.status(200).json({
        loggedIn: true,
        userId: req.session.userId,
        role: req.session.role
      });
    }
    return res.status(401).json({ loggedIn: false });
  };
  