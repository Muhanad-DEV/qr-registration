import { getStore } from '@netlify/blobs';

const FORM_NAME = 'register';

function escapeCsv(value) {
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export async function handler(event) {
  try {
    const payload = JSON.parse(event.body || '{}');
    if (payload?.name !== 'submission-created' || payload?.data?.form_name !== FORM_NAME) {
      return { statusCode: 200, body: 'ignored' };
    }

    const formData = payload.data?.payload || {};
    const name = formData.name;
    const timestamp = formData.timestamp;
    const date = formData.date;
    if (!name || !timestamp || !date) {
      return { statusCode: 200, body: 'missing fields' };
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

    return { statusCode: 200, body: 'ok' };
  } catch (e) {
    return { statusCode: 200, body: 'error' };
  }
}


