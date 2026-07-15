const fs = require('fs');
const xml = fs.readFileSync('docs/data/NorthLine_3.gpx','utf8');
const coords = [...xml.matchAll(/<trkpt[^>]*lat="([^"]+)"[^>]*lon="([^"]+)"/g)].map(m=>[parseFloat(m[1]),parseFloat(m[2])]);
function haversineKm(a,b){const toRad=v=>v*Math.PI/180; const [lat1,lon1]=a; const [lat2,lon2]=b; const R=6371; const dLat=toRad(lat2-lat1); const dLon=toRad(lon2-lon1); const lat1r=toRad(lat1); const lat2r=toRad(lat2); const sinLat=Math.sin(dLat/2); const sinLon=Math.sin(dLon/2); const h=sinLat*sinLat+Math.cos(lat1r)*Math.cos(lat2r)*sinLon*sinLon; const c=2*Math.atan2(Math.sqrt(h), Math.sqrt(1-h)); return R*c; }
let total=0; const cum=[0]; for(let i=1;i<coords.length;i++){ total += haversineKm(coords[i-1], coords[i]); cum.push(total); }
const gpxtotal = total;
console.log('points', coords.length, 'gpx km', gpxtotal.toFixed(3));
function computeBlendedRemaining(totalDistance, lastCoord){
  const gpxtotalLocal = gpxtotal || 290;
  const remainingGpx = Math.max(0, gpxtotalLocal - totalDistance);
  const remainingLive = haversineKm(lastCoord, coords[coords.length-1]);
  const progressFrac = Math.min(Math.max(totalDistance / gpxtotalLocal, 0), 1);
  const weightGpx = 1 - progressFrac;
  const blended = weightGpx * remainingGpx + (1 - weightGpx) * remainingLive;
  return {remainingGpx, remainingLive, progressFrac, weightGpx, blended};
}
// test at start, mid, half, near end
const tests = [0, Math.floor(coords.length*0.25), Math.floor(coords.length*0.5), Math.floor(coords.length*0.75), coords.length-1];
tests.forEach(idx=>{
  const totalKm = cum[idx];
  const lastC = coords[idx];
  const r = computeBlendedRemaining(totalKm, lastC);
  console.log('idx', idx, 'km', totalKm.toFixed(3), 'progress%', (r.progressFrac*100).toFixed(2), 'gpxRem', r.remainingGpx.toFixed(3), 'liveRem', r.remainingLive.toFixed(3), 'blend', r.blended.toFixed(3));
});
