// Logs where hands are played: country / region / city only, never the IP.
// POST /hand { table, round }  ->  hands/{hash(table, round)} in Firestore, written with a service account.
// The round must actually be revealed, so the endpoint can't be used to invent entries.

const ALLOWED_ORIGINS = ['https://planningjoker.com', 'https://www.planningjoker.com', 'http://localhost:5173'];
const TABLE_CODE = /^[a-z0-9-]{1,80}$/;

let cachedToken = null;

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') ?? '';
    const cors = {
      'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      Vary: 'Origin',
    };
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    const url = new URL(request.url);
    if (request.method !== 'POST' || url.pathname !== '/hand') return new Response('Not found', { status: 404, headers: cors });

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response('Bad request', { status: 400, headers: cors });
    }
    const { table, round } = body ?? {};
    if (typeof table !== 'string' || !TABLE_CODE.test(table) || !Number.isInteger(round) || round < 1) {
      return new Response('Bad request', { status: 400, headers: cors });
    }

    const firestore = await firestoreClient(env);
    const session = await firestore.get(`sessions/${table}`);
    const current = session?.fields?.currentRound?.mapValue?.fields;
    if (!current || current.status?.stringValue !== 'revealed' || Number(current.round?.integerValue) !== round) {
      return new Response('Not a revealed hand', { status: 409, headers: cors });
    }

    const cf = request.cf ?? {};
    const id = await sha256(`${table}:${round}`);
    await firestore.set(`hands/${id}`, {
      country: { stringValue: cf.country ?? 'unknown' },
      region: { stringValue: cf.region ?? '' },
      city: { stringValue: cf.city ?? '' },
      dealtAt: { timestampValue: new Date().toISOString() },
    });
    return new Response(null, { status: 204, headers: cors });
  },
};

async function sha256(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].slice(0, 16).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function firestoreClient(env) {
  const emulator = env.FIRESTORE_EMULATOR_HOST;
  const key = emulator ? null : JSON.parse(env.GCP_KEY);
  const project = emulator ? 'demo-planning-joker' : key.project_id;
  const root = `${emulator ? `http://${emulator}` : 'https://firestore.googleapis.com'}/v1/projects/${project}/databases/(default)/documents`;
  const token = emulator ? 'owner' : await accessToken(key);
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  return {
    async get(path) {
      const res = await fetch(`${root}/${path}`, { headers });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`Firestore get ${res.status}`);
      return res.json();
    },
    async set(path, fields) {
      const res = await fetch(`${root}/${path}`, { method: 'PATCH', headers, body: JSON.stringify({ fields }) });
      if (!res.ok) throw new Error(`Firestore set ${res.status}`);
    },
  };
}

// Service-account OAuth token via a signed JWT, cached until shortly before it expires.
async function accessToken(key) {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.exp - 60 > now) return cachedToken.value;
  const b64 = (data) =>
    btoa(typeof data === 'string' ? data : String.fromCharCode(...new Uint8Array(data)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  const unsigned = `${b64(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${b64(
    JSON.stringify({ iss: key.client_email, scope: 'https://www.googleapis.com/auth/datastore', aud: key.token_uri, iat: now, exp: now + 3600 }),
  )}`;
  const pem = key.private_key.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const signingKey = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', signingKey, new TextEncoder().encode(unsigned));
  const res = await fetch(key.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${b64(signature)}` }),
  });
  if (!res.ok) throw new Error(`Token request failed: ${res.status}`);
  const { access_token, expires_in } = await res.json();
  cachedToken = { value: access_token, exp: now + expires_in };
  return access_token;
}
