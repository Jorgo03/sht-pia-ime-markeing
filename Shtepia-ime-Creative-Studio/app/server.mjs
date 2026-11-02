// Your private local app: browse every idea in every language, copy the
// post-ready caption, download the MP4, tick what you have posted where.
// Serves only this machine (127.0.0.1) from local/library/ — nothing leaves it.
//
//   npm run app            → http://127.0.0.1:4747
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const KIT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LIB = path.join(KIT, 'local/library');
const TYPES = { '.html': 'text/html; charset=utf-8', '.mp4': 'video/mp4', '.jpg': 'image/jpeg', '.png': 'image/png', '.json': 'application/json; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8' };

function ideas() {
  if (!fs.existsSync(LIB)) return [];
  return fs.readdirSync(LIB).map((id) => {
    const f = path.join(LIB, id, 'idea.json');
    if (!fs.existsSync(f)) return null;
    const meta = JSON.parse(fs.readFileSync(f, 'utf8'));
    const sf = path.join(LIB, id, 'status.json');
    meta.status = fs.existsSync(sf) ? JSON.parse(fs.readFileSync(sf, 'utf8')) : {};
    return meta;
  }).filter(Boolean).sort((a, b) => String(b.created).localeCompare(String(a.created)));
}

// Static files with byte ranges (so videos seek).
function sendFile(req, res, file) {
  const st = fs.statSync(file);
  const type = TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';
  const range = req.headers.range && req.headers.range.match(/bytes=(\d*)-(\d*)/);
  if (range) {
    const start = range[1] ? +range[1] : 0, end = range[2] ? Math.min(+range[2], st.size - 1) : st.size - 1;
    res.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${start}-${end}/${st.size}`, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1 });
    fs.createReadStream(file, { start, end }).pipe(res);
  } else {
    res.writeHead(200, { 'Content-Type': type, 'Content-Length': st.size, 'Accept-Ranges': 'bytes' });
    fs.createReadStream(file).pipe(res);
  }
}

export function startApp({ port = 4747 } = {}) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    try {
      if (url.pathname === '/' ) return sendFile(req, res, path.join(KIT, 'app/index.html'));
      if (url.pathname === '/api/ideas') { res.writeHead(200, { 'Content-Type': TYPES['.json'] }); return res.end(JSON.stringify(ideas())); }
      if (url.pathname === '/api/status' && req.method === 'POST') {
        let body = ''; req.on('data', (d) => (body += d)); req.on('end', () => {
          const { id, lang, platform, posted } = JSON.parse(body || '{}');
          if (!/^[\w.-]+$/.test(id || '') || !/^[a-z]{2}$/.test(lang || '') || !/^[\w-]+$/.test(platform || '')) { res.writeHead(400); return res.end(); }
          const sf = path.join(LIB, id, 'status.json');
          const st = fs.existsSync(sf) ? JSON.parse(fs.readFileSync(sf, 'utf8')) : {};
          st[lang] = st[lang] || {}; st[lang][platform] = posted ? new Date().toISOString() : null;
          fs.writeFileSync(sf, JSON.stringify(st, null, 2));
          res.writeHead(200, { 'Content-Type': TYPES['.json'] }); res.end(JSON.stringify(st));
        });
        return;
      }
      if (url.pathname.startsWith('/library/')) {
        const file = path.normalize(path.join(LIB, decodeURIComponent(url.pathname.slice('/library/'.length))));
        if (!file.startsWith(LIB + path.sep) || !fs.existsSync(file)) { res.writeHead(404); return res.end('not found'); }
        if (url.searchParams.has('download')) res.setHeader('Content-Disposition', `attachment; filename="${path.basename(path.dirname(path.dirname(file)))}-${path.basename(path.dirname(file))}${path.extname(file)}"`);
        return sendFile(req, res, file);
      }
      res.writeHead(404); res.end('not found');
    } catch (e) { res.writeHead(500); res.end(String(e.message)); }
  });
  server.listen(port, '127.0.0.1', () => console.log(`Shtëpia.ime Studio library → http://127.0.0.1:${port}  (Ctrl+C to stop)`));
  return server;
}
