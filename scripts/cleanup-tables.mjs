// Deletes tables that expired more than a day ago. Run daily by .github/workflows/cleanup.yml.
// Auth: FIREBASE_CLEANUP_KEY holds a service-account JSON key (Firestore access only).
// Local testing: set FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 and it talks to the emulator instead.
import { createSign } from 'node:crypto';

const GRACE_MS = 24 * 60 * 60 * 1000;
const BATCH = 300;

const emulator = process.env.FIRESTORE_EMULATOR_HOST;
const key = emulator ? null : JSON.parse(process.env.FIREBASE_CLEANUP_KEY ?? 'null');
if (!emulator && !key) throw new Error('Set FIREBASE_CLEANUP_KEY (service account JSON) or FIRESTORE_EMULATOR_HOST.');

const projectId = emulator ? 'demo-planning-joker' : key.project_id;
const root = `${emulator ? `http://${emulator}` : 'https://firestore.googleapis.com'}/v1/projects/${projectId}/databases/(default)/documents`;

async function accessToken() {
  if (emulator) return 'owner';
  const now = Math.floor(Date.now() / 1000);
  const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const unsigned = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({
    iss: key.client_email,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: key.token_uri,
    iat: now,
    exp: now + 600,
  })}`;
  const signature = createSign('RSA-SHA256').update(unsigned).sign(key.private_key, 'base64url');
  const res = await fetch(key.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${signature}` }),
  });
  if (!res.ok) throw new Error(`Token request failed: ${res.status} ${await res.text()}`);
  return (await res.json()).access_token;
}

async function call(token, url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${url} -> ${res.status} ${await res.text()}`);
  return res.json();
}

const dryRun = process.argv.includes('--dry-run');
const token = await accessToken();
const cutoff = new Date(Date.now() - GRACE_MS).toISOString();
let deleted = 0;

for (;;) {
  const rows = await call(token, `${root}:runQuery`, {
    structuredQuery: {
      from: [{ collectionId: 'sessions' }],
      where: { fieldFilter: { field: { fieldPath: 'expiresAt' }, op: 'LESS_THAN', value: { timestampValue: cutoff } } },
      select: { fields: [{ fieldPath: '__name__' }] },
      limit: BATCH,
    },
  });
  const names = rows.map((r) => r.document?.name).filter(Boolean);
  if (names.length === 0) break;
  deleted += names.length;
  if (dryRun) break;
  await call(token, `${root}:commit`, { writes: names.map((name) => ({ delete: name })) });
  if (names.length < BATCH) break;
}

console.log(`${dryRun ? 'Would delete' : 'Deleted'} ${deleted} table(s) that expired before ${cutoff}.`);
