// routes/mapProxy.js
import express from "express";
import fetch from "node-fetch";
const router = express.Router();

const MAPTILER_KEY = process.env.MAPTILER_API_KEY;

// Proxy for tiles
router.get("/tiles/:z/:x/:y.png", async (req, res) => {
  const { z, x, y } = req.params;
  const target = `https://api.maptiler.com/maps/streets/${z}/${x}/${y}.png?key=${MAPTILER_KEY}`;
  try {
    const r = await fetch(target);
    res.setHeader("Content-Type", "image/png");
    r.body.pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).send("Tile proxy error");
  }
});

export default router;
