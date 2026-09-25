// Exercises firestore.rules against the running emulators: `npm run emulators`, then `npm run test:rules`.
import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, signInAnonymously } from 'firebase/auth';
import {
  Timestamp,
  arrayUnion,
  connectFirestoreEmulator,
  deleteDoc,
  deleteField,
  doc,
  getFirestore,
  serverTimestamp,
  setDoc,
  terminate,
  updateDoc,
} from 'firebase/firestore';

const PROJECT = 'demo-planning-joker';
const dbs = [];

async function player(label) {
  const app = initializeApp({ apiKey: 'demo-key', projectId: PROJECT }, label);
  const auth = getAuth(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  const db = getFirestore(app);
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  dbs.push(db);
  const { user } = await signInAnonymously(auth);
  return { uid: user.uid, db };
}

let failures = 0;
async function expect(label, shouldPass, action) {
  let passed = true;
  let detail = '';
  try {
    await action();
  } catch (err) {
    passed = false;
    detail = err.code ?? err.message;
  }
  const ok = passed === shouldPass;
  if (!ok) failures++;
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${shouldPass ? 'allow' : 'deny '}  ${label}${!ok && detail ? `  (${detail})` : ''}`);
}

const dealer = await player('dealer');
const alice = await player('alice');
const bob = await player('bob');
const eve = await player('eve');

const id = `test-${Date.now().toString(36)}`;
const ref = (p) => doc(p.db, 'sessions', id);
const newSession = (uid, overrides = {}) => ({
  sessionId: id,
  dealerId: uid,
  createdAt: serverTimestamp(),
  expiresAt: Timestamp.fromMillis(Date.now() + 24 * 3600 * 1000),
  participants: { [uid]: { name: 'Priya', joinedAt: serverTimestamp() } },
  currentRound: { round: 1, ticketLabel: 'PROJ-1', status: 'voting', votes: {} },
  roundHistory: [],
  ...overrides,
});

await expect('create a table that lives more than 25h', false, () =>
  setDoc(ref(dealer), newSession(dealer.uid, { expiresAt: Timestamp.fromMillis(Date.now() + 7 * 24 * 3600 * 1000) })),
);
await expect('create a table naming someone else as dealer', false, () => setDoc(ref(eve), newSession(dealer.uid)));
await expect('dealer creates a table', true, () => setDoc(ref(dealer), newSession(dealer.uid)));
await expect('another player overwrites an existing table', false, () => setDoc(ref(eve), newSession(eve.uid)));

await expect('alice joins', true, () =>
  updateDoc(ref(alice), { [`participants.${alice.uid}`]: { name: 'Alice', joinedAt: serverTimestamp() } }),
);
await expect('bob joins', true, () =>
  updateDoc(ref(bob), { [`participants.${bob.uid}`]: { name: 'Bob', joinedAt: serverTimestamp() } }),
);
await expect('alice renames herself', true, () => updateDoc(ref(alice), { [`participants.${alice.uid}.name`]: 'Al' }));
await expect('alice renames the dealer', false, () =>
  updateDoc(ref(alice), { [`participants.${dealer.uid}.name`]: 'Nope' }),
);
await expect('alice picks an empty name', false, () => updateDoc(ref(alice), { [`participants.${alice.uid}.name`]: '' }));

await expect('alice plays a 5', true, () => updateDoc(ref(alice), { [`currentRound.votes.${alice.uid}`]: '5' }));
await expect('alice changes to 8', true, () => updateDoc(ref(alice), { [`currentRound.votes.${alice.uid}`]: '8' }));
await expect('alice plays a card not in the deck', false, () =>
  updateDoc(ref(alice), { [`currentRound.votes.${alice.uid}`]: '4' }),
);
await expect('alice plays a card for bob', false, () => updateDoc(ref(alice), { [`currentRound.votes.${bob.uid}`]: '1' }));
await expect('eve votes without sitting down', false, () =>
  updateDoc(ref(eve), { [`currentRound.votes.${eve.uid}`]: '3' }),
);
await expect('bob plays a 21', true, () => updateDoc(ref(bob), { [`currentRound.votes.${bob.uid}`]: '21' }));
for (const retired of ['34', '?', '☕']) {
  await expect(`bob plays a retired ${retired} card`, false, () =>
    updateDoc(ref(bob), { [`currentRound.votes.${bob.uid}`]: retired }),
  );
}
await expect('bob pulls his card back', true, () => updateDoc(ref(bob), { [`currentRound.votes.${bob.uid}`]: deleteField() }));

await expect('alice reveals', false, () => updateDoc(ref(alice), { 'currentRound.status': 'revealed' }));
await expect('alice makes herself dealer', false, () => updateDoc(ref(alice), { dealerId: alice.uid }));
await expect('alice extends the table’s life', false, () =>
  updateDoc(ref(alice), { expiresAt: Timestamp.fromMillis(Date.now() + 99 * 24 * 3600 * 1000) }),
);
await expect('dealer renames the ticket', true, () => updateDoc(ref(dealer), { 'currentRound.ticketLabel': 'PROJ-1 CSV' }));
await expect('dealer reveals', true, () => updateDoc(ref(dealer), { 'currentRound.status': 'revealed' }));
await expect('alice changes her card after the reveal', false, () =>
  updateDoc(ref(alice), { [`currentRound.votes.${alice.uid}`]: '3' }),
);
await expect('dealer deals the next round', true, () =>
  updateDoc(ref(dealer), {
    currentRound: { round: 2, ticketLabel: 'PROJ-2', status: 'voting', votes: {} },
    roundHistory: arrayUnion({ round: 1, ticketLabel: 'PROJ-1 CSV', votes: { [alice.uid]: '8' }, consensus: true }),
  }),
);
await expect('alice plays in round 2', true, () => updateDoc(ref(alice), { [`currentRound.votes.${alice.uid}`]: '3' }));
await expect('alice deletes the table', false, () => deleteDoc(ref(alice)));
await expect('dealer deletes the table', false, () => deleteDoc(ref(dealer)));

await Promise.all(dbs.map((db) => terminate(db)));
console.log(failures ? `\n${failures} rule check(s) failed` : '\nAll rule checks passed');
process.exit(failures ? 1 : 0);
