const authModel = require('../models/authModel');
const bcrypt = require('bcrypt');

exports.login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await authModel.getUserByEmail(email);
        if (!user) return res.status(401).json({ message: 'User not found' });

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ message: 'Invalid password' });

        // Save session
        req.session.userId = user.id;
        req.session.role = user.role;

        res.status(200).json({ message: 'Login successful', user: { id: user.id, role: user.role } });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err });
    }
};

exports.logout = (req, res) => {
    req.session.destroy(err => {
        if (err) return res.status(500).json({ message: 'Logout failed' });
        res.clearCookie(process.env.SESSION_NAME);
        res.status(200).json({ message: 'Logged out successfully' });
    });
};

exports.checkSession = (req, res) => {
    if (req.session.userId) {
        res.status(200).json({ loggedIn: true, userId: req.session.userId, role: req.session.role });
    } else {
        res.status(401).json({ loggedIn: false });
    }
};
