const { DataTypes } = require('sequelize');
const sequelize = require('../config/configdb'); // Assuming you have Sequelize connection set up

const User = sequelize.define('User', {
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    email: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    role: {
        type: DataTypes.STRING,
        allowNull: false,  // 'consumer', 'rider', 'stakeholder'
    }
});

module.exports = User;
