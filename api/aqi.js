const { waqi, shapeCity, cached } = require('./_lib');

module.exports = async function handler(req, res) {
  const city = String(req.query.city || 'delhi').trim().toLowerCase();
  if (!/^[a-z0-9 .,'-]{2,60}$/.test(city)) {
    return res.status(400).json({ error: 'bad city' });
  }
  try {
    const body = await waqi(`/feed/${encodeURIComponent(city)}/`);
    const raw = JSON.parse(body);
    if (raw.status !== 'ok') return res.status(502).json({ error: 'upstream', detail: raw.data });
    return cached(res, shapeCity(raw));
  } catch (e) {
    return res.status(502).json({ error: 'upstream unreachable' });
  }
};
