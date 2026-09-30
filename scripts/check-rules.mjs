// Exercises firestore.rules against the running emulators: `npm run emulators`, then `npm run test:rules`.
import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, signInAnonymously } from 'firebase/auth';
import {
  Timestamp,
  arrayUnion,
  collection,
  connectFirestoreEmulator,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  increment,
  limit,
  query,
  where,
  writeBatch,
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
await expect('alice folds for bob', false, () => updateDoc(ref(alice), { [`currentRound.votes.${bob.uid}`]: 'fold' }));
await expect('bob folds', true, () => updateDoc(ref(bob), { [`currentRound.votes.${bob.uid}`]: 'fold' }));
await expect('bob pulls his card back', true, () => updateDoc(ref(bob), { [`currentRound.votes.${bob.uid}`]: deleteField() }));

await expect('alice reveals', false, () => updateDoc(ref(alice), { 'currentRound.status': 'revealed' }));
await expect('alice makes herself dealer', false, () => updateDoc(ref(alice), { dealerId: alice.uid }));
await expect('alice extends the table’s life', false, () =>
  updateDoc(ref(alice), { expiresAt: Timestamp.fromMillis(Date.now() + 99 * 24 * 3600 * 1000) }),
);
await expect('dealer renames the ticket', true, () => updateDoc(ref(dealer), { 'currentRound.ticketLabel': 'PROJ-1 CSV' }));
const statsDoc = (p) => doc(p.db, 'stats', 'global');
const bump = (p, by = 1) => setDoc(statsDoc(p), { handsDealt: increment(by), lastSession: id }, { merge: true });
const revealAndBump = (p, by = 1) => {
  const batch = writeBatch(p.db);
  batch.update(ref(p), { 'currentRound.status': 'revealed' });
  batch.set(statsDoc(p), { handsDealt: increment(by), lastSession: id }, { merge: true });
  return batch.commit();
};
await expect('anyone can read the hands-dealt counter', true, () => getDoc(statsDoc(eve)));
await expect('alice bumps the counter without a reveal', false, () => bump(alice));
await expect('dealer bumps the counter without revealing', false, () => bump(dealer));
await expect('alice reveals and bumps the counter', false, () => revealAndBump(alice));
await expect('dealer reveals and bumps the counter by 2', false, () => revealAndBump(dealer, 2));
await expect('dealer reveals and bumps the counter by 1', true, () => revealAndBump(dealer));
await expect('dealer bumps again for the already revealed table', false, () => bump(dealer));
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
await expect('bob rejoins with a text join time', false, () =>
  updateDoc(ref(bob), { [`participants.${bob.uid}`]: { name: 'Bob', joinedAt: 'yesterday' } }),
);
await expect('bob adds an extra field to his seat', false, () =>
  updateDoc(ref(bob), { [`participants.${bob.uid}.isAdmin`]: true }),
);
await expect('bob uses a name that is not text', false, () =>
  updateDoc(ref(bob), { [`participants.${bob.uid}.name`]: 42 }),
);
await expect('bob uses a 41-character name', false, () =>
  updateDoc(ref(bob), { [`participants.${bob.uid}.name`]: 'x'.repeat(41) }),
);
await expect('script and SQL text are stored as a plain name', true, () =>
  updateDoc(ref(bob), { [`participants.${bob.uid}.name`]: "<b>x</b>'; DROP TABLE--" }),
);
await expect('dealer renames bob', false, () => updateDoc(ref(dealer), { [`participants.${bob.uid}.name`]: 'Nope' }));
await expect('dealer plays a card for bob', false, () => updateDoc(ref(dealer), { [`currentRound.votes.${bob.uid}`]: '21' }));
await expect('dealer uses a 201-character ticket', false, () =>
  updateDoc(ref(dealer), { 'currentRound.ticketLabel': 'x'.repeat(201) }),
);
await expect('dealer uses a ticket that is not text', false, () =>
  updateDoc(ref(dealer), { 'currentRound.ticketLabel': { html: '<script>' } }),
);

await expect('alice passes the dealer button', false, () => updateDoc(ref(alice), { dealerId: alice.uid }));
await expect('dealer passes the button to someone not seated', false, () => updateDoc(ref(dealer), { dealerId: eve.uid }));
await expect('dealer passes the button to alice', true, () => updateDoc(ref(dealer), { dealerId: alice.uid }));
await expect('old dealer tries to reveal', false, () => updateDoc(ref(dealer), { 'currentRound.status': 'revealed' }));
await expect('new dealer alice reveals', true, () => updateDoc(ref(alice), { 'currentRound.status': 'revealed' }));
await expect('bob closes the table', false, () => updateDoc(ref(bob), { closed: true }));
await expect('alice (dealer) closes the table', true, () => updateDoc(ref(alice), { closed: true }));
await expect('alice reopens the table', false, () => updateDoc(ref(alice), { closed: false }));
await expect('bob renames himself after close', false, () => updateDoc(ref(bob), { [`participants.${bob.uid}.name`]: 'B' }));

await expect('eve reads hand locations', false, () => getDocs(collection(eve.db, 'hands')));
await expect('dealer writes a hand location', false, () => setDoc(doc(dealer.db, 'hands', 'x'), { country: 'US' }));
await expect('eve opens a table by its code', true, () => getDoc(ref(eve)));
await expect('eve lists every table', false, () => getDocs(collection(eve.db, 'sessions')));
await expect('eve queries tables by player name', false, () =>
  getDocs(query(collection(eve.db, 'sessions'), where('dealerId', '==', dealer.uid), limit(5))),
);

await expect('alice deletes the table', false, () => deleteDoc(ref(alice)));
await expect('dealer deletes the table', false, () => deleteDoc(ref(dealer)));

await Promise.all(dbs.map((db) => terminate(db)));
console.log(failures ? `\n${failures} rule check(s) failed` : '\nAll rule checks passed');
process.exit(failures ? 1 : 0);
