const fs = require('fs');
const files = ['docs/live.html','docs/index.html','docs/dashboard.html'];
const checks = ['data-page="live"','id="distance"','id="remaining"','id="completion"','id="progressBar"','id="centerLiveBtn"','script.js'];
files.forEach(f=>{
  try{
    const s = fs.readFileSync(f,'utf8');
    console.log('\n== '+f+' ==');
    checks.forEach(q=>console.log(q+':', s.includes(q)));
  }catch(e){ console.log('Cannot read', f, e.message); }
});
