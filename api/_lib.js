// Shared logic for the AQI Alarm Vercel serverless functions.

const WAQI_TOKEN = process.env.WAQI_TOKEN || 'demo';

const LEADERBOARD_CITIES = [
  'delhi', 'mumbai', 'kolkata', 'chennai', 'bengaluru', 'hyderabad',
  'ahmedabad', 'pune', 'jaipur', 'lucknow', 'kanpur', 'patna',
  'ludhiana', 'agra', 'varanasi', 'indore'
];

async function waqi(pathSuffix) {
  const url = `https://api.waqi.info${pathSuffix}${pathSuffix.includes('?') ? '&' : '?'}token=${encodeURIComponent(WAQI_TOKEN)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
  if (!res.ok) throw new Error(`WAQI upstream ${res.status}`);
  return await res.text();
}

function bandFor(aqi) {
  if (aqi <= 50) return { label: 'Good', color: '#00e400' };
  if (aqi <= 100) return { label: 'Satisfactory', color: '#e6e600' };
  if (aqi <= 200) return { label: 'Moderate', color: '#ff7e00' };
  if (aqi <= 300) return { label: 'Poor', color: '#ff0000' };
  if (aqi <= 400) return { label: 'Very Poor', color: '#8f3f97' };
  return { label: 'Severe', color: '#7e0023' };
}

function adviceFor(aqi) {
  if (aqi <= 50) return {
    en: 'Air is clean. Great time to be outside.',
    hi: 'हवा साफ है। बाहर जाने का अच्छा समय है।'
  };
  if (aqi <= 100) return {
    en: 'Air is acceptable. Sensitive people should take it easy outdoors.',
    hi: 'हवा ठीक है। संवेदनशील लोग बाहर संभलकर रहें।'
  };
  if (aqi <= 200) return {
    en: 'Some may feel discomfort. Limit long outdoor activity.',
    hi: 'कुछ लोगों को परेशानी हो सकती है। लंबी बाहरी गतिविधि कम करें।'
  };
  if (aqi <= 300) return {
    en: 'Everyone may feel effects. Avoid prolonged outdoor exertion.',
    hi: 'सभी को असर हो सकता है। लंबी बाहरी मेहनत से बचें।'
  };
  if (aqi <= 400) return {
    en: 'Health warnings of emergency conditions. Avoid all outdoor exertion.',
    hi: 'स्वास्थ्य आपातकाल की स्थिति। बाहरी मेहनत बिल्कुल न करें।'
  };
  return {
    en: 'Health alert: everyone may experience serious effects. Stay indoors.',
    hi: 'स्वास्थ्य चेतावनी: सभी को गंभीर असर हो सकता है। घर के अंदर रहें।'
  };
}

function shapeCity(raw) {
  const d = raw.data || {};
  const aqi = typeof d.aqi === 'number' ? d.aqi : -1;
  const unknown = aqi < 0;
  const iaqi = d.iaqi || {};
  const val = (k) => (iaqi[k] && typeof iaqi[k].v === 'number' ? Math.round(iaqi[k].v) : null);
  const forecast = [];
  const daily = (d.forecast && d.forecast.daily) || {};
  const pm25 = daily.pm25 || [];
  for (const f of pm25.slice(0, 4)) {
    forecast.push({ day: f.day, avg: f.avg, ...bandFor(f.avg) });
  }
  return {
    aqi,
    city: (d.city && d.city.name) || '',
    time: (d.time && (d.time.iso || d.time.s)) || '',
    dominant: d.dominentpol || null,
    pollutants: {
      pm25: val('pm25'), pm10: val('pm10'),
      no2: val('no2'), o3: val('o3'), so2: val('so2'), co: val('co')
    },
    forecast,
    band: unknown ? { label: 'Unknown', color: '#6b7280' } : bandFor(aqi),
    advice: unknown
      ? { en: 'No live reading for this station right now.', hi: 'इस स्टेशन का लाइव डेटा अभी उपलब्ध नहीं है।' }
      : adviceFor(aqi),
    attribution: 'World Air Quality Index · aqicn.org'
  };
}

// 20-minute edge cache — replaces the in-memory cache from the Botkeep server.
function cached(res, obj) {
  res.setHeader('Cache-Control', 's-maxage=1200, stale-while-revalidate=600');
  res.status(200).json(obj);
}

module.exports = { waqi, bandFor, adviceFor, shapeCity, cached, LEADERBOARD_CITIES };
