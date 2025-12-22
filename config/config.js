// config/config.js
require('dotenv').config();  // Load environment variables from .env file

module.exports = {
  PORT: process.env.PORT || 3000,
  HOST: process.env.HOST || 'localhost',
  USER: process.env.USER || 'root',
  PASSWORD: process.env.PASSWORD || '',
  DB_PORT: process.env.DB_PORT || 3306,
  DATABASE: process.env.DATABASE || 'khadok2.0',
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  sessionSecret: process.env.SESSION_SECRET || 'your-session-secret',
  
  // bKash Payment Gateway Configuration
  bkash: {
      // For sandbox/testing
      base_url: process.env.BKASH_BASE_URL || 'https://tokenized.sandbox.bka.sh/v1.2.0-beta',
      
      // Production URL (uncomment when going live)
      // base_url: 'https://tokenized.pay.bka.sh/v1.2.0-beta',
      
      username: process.env.BKASH_USERNAME || 'sandboxTokenizedUser02',
      password: process.env.BKASH_PASSWORD || 'sandboxTokenizedUser02@12345',
      app_key: process.env.BKASH_APP_KEY || '4f6o0cjiki2rfm34kfdadl1eqq',
      app_secret: process.env.BKASH_APP_SECRET || '2is7hdktrekvrbljjh44ll3d9l1dtjo4pasmjvs5vl5qr3fug4b',
      
      // Merchant configuration
      merchant_number: '01937890430', // Your merchant number
      
      // Callback URLs
      callback_url: process.env.BKASH_CALLBACK_URL || 'http://localhost:3000/api/payment/bkash/callback',
  }
};
