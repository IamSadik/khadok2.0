const express = require('express');
const router = express.Router();

router.get('/tile-url', (req, res) => {
  const apiKey = process.env.MAPTILER_API_KEY;
  const tileURL = `https://api.maptiler.com/maps/streets/{z}/{x}/{y}.png?key=${apiKey}`;
  res.json({ tileURL });
});

module.exports = router;
