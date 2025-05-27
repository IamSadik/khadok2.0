// controllers/signupController.js
const { validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const signupModel = require('../models/signupModel.js');

// Consumer signup handler
const signupConsumer = async (req, res) => {
    const { name, email, password } = req.body;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array() });
    }

    try {
        const emailExists = await signupModel.checkEmailExists(email);
        if (emailExists) {
            return res.status(400).json({ success: false, message: 'Email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await signupModel.createUser(name, email, hashedPassword, 'consumer');
        await signupModel.createConsumer(user.id, name, email );

        res.status(201).json({ success: true, message: 'Consumer registered successfully' });

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'Email already exists' });
        }

        console.error(error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// Rider signup handler
const riderSignup = async (req, res) => {
    const { name, email, password } = req.body;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array() });
    }

    try {
        const emailExists = await signupModel.checkEmailExists(email);
        if (emailExists) {
            return res.status(400).json({ success: false, message: 'Email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await signupModel.createUser(name, email, hashedPassword, 'rider');
        await signupModel.createRider(user.id, name, email);

        res.status(201).json({ success: true, message: 'Rider registered successfully' });

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'Email already exists' });
        }

        console.error(error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// Stakeholder signup handler
const stakeholderSignup = async (req, res) => {
    const { name, email, password, restaurant_name } = req.body;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array() });
    }

    try {
        const emailExists = await signupModel.checkEmailExists(email);
        if (emailExists) {
            return res.status(400).json({ success: false, message: 'Email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await signupModel.createUser(name, email, hashedPassword, 'stakeholder');
        await signupModel.createStakeholder(user.id, name, email,  restaurant_name);

        res.status(201).json({ success: true, message: 'Stakeholder registered successfully' });

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'Email already exists' });
        }

        console.error(error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

module.exports = {
    signupConsumer,
    riderSignup,
    stakeholderSignup,
};
