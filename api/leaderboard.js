const { waqi, bandFor, cached, LEADERBOARD_CITIES } = require('./_lib');

module.exports = async function handler(req, res) {
  try {
    const settled = await Promise.allSettled(
      LEADERBOARD_CITIES.map((c) => waqi(`/feed/${c}/`).then((t) => ({ city: c, raw: t })))
    );
    const rows = [];
    for (const s of settled) {
      if (s.status !== 'fulfilled') continue;
      try {
        const raw = JSON.parse(s.value.raw);
        if (raw.status !== 'ok' || typeof raw.data.aqi !== 'number') continue;
        const aqi = raw.data.aqi;
        rows.push({ city: s.value.city, aqi, ...bandFor(aqi) });
      } catch (_) { /* skip malformed */ }
    }
    rows.sort((a, b) => b.aqi - a.aqi);
    return cached(res, { updated: new Date().toISOString(), rows });
  } catch (e) {
    return res.status(502).json({ error: 'upstream unreachable' });
  }
};
