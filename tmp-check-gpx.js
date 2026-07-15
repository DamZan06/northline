const fs = require('fs');
const path = 'site/NorthLine_3.gpx';
const xml = fs.readFileSync(path, 'utf8');
const coords = [...xml.matchAll(/<trkpt[^>]*lat="([^"]+)"[^>]*lon="([^"]+)"/g)].map((m) => [parseFloat(m[1]), parseFloat(m[2])]);
const hav = (a, b) => {
  const toRad = (v) => v * Math.PI / 180;
  const [lat1, lon1] = a;
  const [lat2, lon2] = b;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const lat1r = toRad(lat1);
  const lat2r = toRad(lat2);
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const h = sinLat * sinLat + Math.cos(lat1r) * Math.cos(lat2r) * sinLon * sinLon;
  return 2 * R * Math.asin(Math.sqrt(h));
};
let total = 0;
for (let i = 1; i < coords.length; i += 1) {
  total += hav(coords[i - 1], coords[i]);
}
console.log('points', coords.length);
console.log('km', (total / 1000).toFixed(3));
