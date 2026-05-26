const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

// Tiny in-memory cache to reduce rate-limits (best-effort)
const cache = new Map();
function getCache(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}
function setCache(key, value, ttlMs) {
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

function getUserAgent() {
  return process.env.NOMINATIM_USER_AGENT || 'Khadok/2.0 (local-dev)';
}

function safeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

router.get('/tile-url', (req, res) => {
  const apiKey = process.env.MAPTILER_API_KEY;
  const tileURL = `https://api.maptiler.com/maps/streets/{z}/{x}/{y}.png?key=${apiKey}`;
  res.json({ tileURL });
});

// Proxy: Nominatim reverse geocoding (coords -> address)
router.get('/reverse', async (req, res) => {
  const lat = safeNumber(req.query.lat);
  const lon = safeNumber(req.query.lon);
  const zoom = safeNumber(req.query.zoom) ?? 16;
  const addressdetails = String(req.query.addressdetails ?? '1');
  const acceptLanguage = String(req.query.acceptLanguage ?? req.query['accept-language'] ?? 'en');

  if (lat === null || lon === null) {
    return res.status(400).json({ error: 'lat and lon are required numbers' });
  }

  const cacheKey = `reverse:${lat.toFixed(5)}:${lon.toFixed(5)}:${zoom}:${acceptLanguage}`;
  const cached = getCache(cacheKey);
  if (cached) return res.json(cached);

  const url = new URL('/reverse', NOMINATIM_BASE_URL);
  url.searchParams.set('format', 'json');
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lon));
  url.searchParams.set('zoom', String(zoom));
  url.searchParams.set('addressdetails', addressdetails);
  url.searchParams.set('accept-language', acceptLanguage);

  try {
    const upstream = await fetch(url.toString(), {
      headers: {
        'User-Agent': getUserAgent(),
        'Accept': 'application/json',
        'Accept-Language': acceptLanguage,
      },
    });

    const contentType = upstream.headers.get('content-type') || '';
    const payload = contentType.includes('application/json')
      ? await upstream.json()
      : { error: await upstream.text() };

    if (!upstream.ok) {
      return res.status(upstream.status).json(payload);
    }

    setCache(cacheKey, payload, 60_000);
    return res.json(payload);
  } catch (err) {
    console.error('Nominatim reverse proxy error:', err);
    return res.status(502).json({ error: 'Reverse geocode failed' });
  }
});

// Proxy: Nominatim search (query -> places)
router.get('/search', async (req, res) => {
  const q = String(req.query.q ?? '').trim();
  const limit = safeNumber(req.query.limit) ?? 5;
  const countrycodes = String(req.query.countrycodes ?? 'bd');
  const acceptLanguage = String(req.query.acceptLanguage ?? req.query['accept-language'] ?? 'en');

  if (!q) return res.status(400).json({ error: 'q is required' });

  const cacheKey = `search:${countrycodes}:${limit}:${acceptLanguage}:${q.toLowerCase()}`;
  const cached = getCache(cacheKey);
  if (cached) return res.json(cached);

  const url = new URL('/search', NOMINATIM_BASE_URL);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('countrycodes', countrycodes);
  url.searchParams.set('q', q);

  try {
    const upstream = await fetch(url.toString(), {
      headers: {
        'User-Agent': getUserAgent(),
        'Accept': 'application/json',
        'Accept-Language': acceptLanguage,
      },
    });

    const contentType = upstream.headers.get('content-type') || '';
    const payload = contentType.includes('application/json')
      ? await upstream.json()
      : { error: await upstream.text() };

    if (!upstream.ok) {
      return res.status(upstream.status).json(payload);
    }

    setCache(cacheKey, payload, 30_000);
    return res.json(payload);
  } catch (err) {
    console.error('Nominatim search proxy error:', err);
    return res.status(502).json({ error: 'Search failed' });
  }
});



module.exports = router;
