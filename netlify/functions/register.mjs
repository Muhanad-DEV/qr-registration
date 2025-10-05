import { getStore } from 'netlify:blobs';

function escapeCsv(value) {
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { name, timestamp, date } = JSON.parse(event.body || '{}');
    if (!name || !timestamp || !date) {
      return { statusCode: 400, body: 'Missing fields' };
    }

    const store = getStore('data');
    const key = 'registrations.csv';

    let csv = await store.get(key);
    if (!csv || csv.trim() === '') {
      csv = 'timestamp,date,name,visitorId\n';
    }

    const lines = csv.trim() === '' ? [] : csv.trim().split(/\r?\n/);
    const count = Math.max(0, lines.length - 1);
    const visitorId = String(count + 1);

    const row = `${timestamp},${date},${escapeCsv(name)},${visitorId}\n`;
    const updated = csv + row;
    await store.set(key, updated, { contentType: 'text/csv' });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true, visitorId })
    };
  } catch (e) {
    return { statusCode: 500, body: 'Server error' };
  }
}


