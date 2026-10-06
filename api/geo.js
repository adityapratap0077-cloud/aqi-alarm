const { waqi, shapeCity, cached } = require('./_lib');

module.exports = async function handler(req, res) {
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);
  if (!isFinite(lat) || !isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return res.status(400).json({ error: 'bad coordinates' });
  }
  try {
    const body = await waqi(`/feed/geo:${lat.toFixed(4)};${lng.toFixed(4)}/`);
    const raw = JSON.parse(body);
    if (raw.status !== 'ok') return res.status(502).json({ error: 'upstream', detail: raw.data });
    return cached(res, shapeCity(raw));
  } catch (e) {
    return res.status(502).json({ error: 'upstream unreachable' });
  }
};
