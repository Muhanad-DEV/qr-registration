'use strict';

const http = require('http');
const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');

const DEFAULT_PORT = 3000;
const ROOT = __dirname;
const CSV_PATH = path.join(ROOT, 'registrations.csv');

async function ensureCsvWithHeader() {
  try {
    await fsp.access(CSV_PATH);
    const stat = await fsp.stat(CSV_PATH);
    if (stat.size === 0) {
      await fsp.writeFile(CSV_PATH, 'timestamp,date,name,visitorId\n', 'utf8');
    }
  } catch {
    await fsp.writeFile(CSV_PATH, 'timestamp,date,name,visitorId\n', 'utf8');
  }
}

function serveStatic(req, res) {
  const urlPath = req.url === '/' ? '/index.html' : req.url;
  const filePath = path.join(ROOT, urlPath);
  const ext = path.extname(filePath).toLowerCase();
  const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.csv': 'text/csv' };
  const contentType = types[ext] || 'application/octet-stream';

  fs.createReadStream(filePath)
    .on('error', () => {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
    })
    .once('open', () => {
      res.writeHead(200, { 'Content-Type': contentType });
    })
    .pipe(res);
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
      if (data.length > 1e6) {
        req.destroy();
        reject(new Error('Body too large'));
      }
    });
    req.on('end', () => {
      try { resolve(JSON.parse(data || '{}')); } catch (e) { reject(e); }
    });
  });
}

async function handleRegister(req, res) {
  try {
    await ensureCsvWithHeader();
    const { name, timestamp, date } = await parseJsonBody(req);
    if (!name || !timestamp || !date) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Missing fields');
      return;
    }

    // compute next visitorId by counting existing lines minus header
    const content = await fsp.readFile(CSV_PATH, 'utf8');
    const lines = content.trim() === '' ? [] : content.trim().split(/\r?\n/);
    const count = Math.max(0, lines.length - 1);
    const visitorId = String(count + 1);

    const row = `${timestamp},${date},${escapeCsv(name)},${visitorId}\n`;
    await fsp.appendFile(CSV_PATH, row, 'utf8');

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, visitorId }));
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Server error');
  }
}

function escapeCsv(value) {
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/register') {
    await handleRegister(req, res);
    return;
  }
  serveStatic(req, res);
});

function startServer(port) {
  server.once('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
      const next = port + 1;
      console.log(`Port ${port} in use, trying ${next}...`);
      server.close(() => startServer(next));
      return;
    }
    console.error('Server error:', err);
  });
  server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}

startServer(DEFAULT_PORT);


