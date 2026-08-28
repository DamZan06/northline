const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const errors = [];

function filesIn(directory, extension) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory() && ['.git', '.tmp', 'node_modules'].includes(entry.name)) return [];
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return filesIn(full, extension);
    return entry.isFile() && full.endsWith(extension) ? [full] : [];
  });
}

function localPath(reference, sourceFile, siteRelative = false) {
  const clean = reference.split('#')[0].split('?')[0];
  if (!clean || /^(?:data:|mailto:|tel:|javascript:)/i.test(clean)) return null;

  if (/^https?:\/\//i.test(clean)) {
    const url = new URL(clean);
    if (url.hostname !== 'damzan06.github.io') return null;
    const prefix = '/northline/';
    if (!url.pathname.toLowerCase().startsWith(prefix)) {
      errors.push(`${path.relative(root, sourceFile)}: outdated GitHub Pages URL ${reference}`);
      return null;
    }
    return path.join(root, decodeURIComponent(url.pathname.slice(prefix.length)) || 'index.html');
  }

  const decoded = decodeURIComponent(clean);
  if (siteRelative || decoded.startsWith('/')) return path.join(root, decoded.replace(/^\/+/, ''));
  return path.resolve(path.dirname(sourceFile), decoded);
}

function verify(reference, sourceFile, siteRelative = false) {
  const target = localPath(reference, sourceFile, siteRelative);
  if (target && !fs.existsSync(target)) {
    errors.push(`${path.relative(root, sourceFile)}: missing ${reference}`);
  }
}

for (const file of filesIn(root, '.html')) {
  const source = fs.readFileSync(file, 'utf8');
  for (const match of source.matchAll(/\b(?:href|src)\s*=\s*["']([^"']+)["']/gi)) {
    verify(match[1], file);
  }
  for (const match of source.matchAll(/\bcontent\s*=\s*["'](https:\/\/damzan06\.github\.io\/[^"']+)["']/gi)) {
    verify(match[1], file);
  }
}

for (const file of filesIn(path.join(root, 'css'), '.css')) {
  const source = fs.readFileSync(file, 'utf8');
  for (const match of source.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) {
    verify(match[1], file);
  }
}

for (const file of filesIn(path.join(root, 'js'), '.js')) {
  const source = fs.readFileSync(file, 'utf8');
  for (const match of source.matchAll(/["']((?:assets|data)\/[^"'`]+\.(?:css|gif|gpx|jpe?g|js|json|png|svg|webp))["']/gi)) {
    verify(match[1], file, true);
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('Validated local links, assets, route files, and GitHub Pages URLs.');
