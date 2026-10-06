const { waqi, cached } = require('./_lib');

module.exports = async function handler(req, res) {
  const q = String(req.query.q || '').trim();
  if (q.length < 2 || q.length > 60) {
    return res.status(400).json({ error: 'bad query' });
  }
  try {
    const body = await waqi(`/search/?keyword=${encodeURIComponent(q)}`);
    const raw = JSON.parse(body);
    const list = (raw.data || []).slice(0, 8).map((s) => ({
      name: s.station && s.station.name,
      aqi: s.aqi
    }));
    return cached(res, { results: list });
  } catch (e) {
    return res.status(502).json({ error: 'upstream unreachable' });
  }
};
