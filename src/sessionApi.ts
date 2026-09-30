import { FirebaseError } from 'firebase/app';
import {
  Timestamp,
  arrayUnion,
  deleteField,
  doc,
  increment,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { newSessionId } from './sessionId';
import type { PastRound, Round, Session, Vote } from './types';
import { isConsensus } from './votes';

const DAY_MS = 24 * 60 * 60 * 1000;

const sessionRef = (sessionId: string) => doc(db, 'sessions', sessionId);
export const statsRef = () => doc(db, 'stats', 'global');

function myUid(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not connected yet. Reload the page and try again.');
  return uid;
}

function freshRound(round: number, ticketLabel: string): Round {
  return { round, ticketLabel: ticketLabel.trim(), status: 'voting', votes: {} };
}

export async function createSession(dealerName: string, ticketLabel: string): Promise<string> {
  const uid = myUid();
  // Security rules refuse to overwrite an existing table, so a (very unlikely) id clash
  // surfaces as permission-denied and we just deal a different id.
  for (let attempt = 0; attempt < 3; attempt++) {
    const sessionId = newSessionId();
    try {
      await setDoc(sessionRef(sessionId), {
        sessionId,
        dealerId: uid,
        createdAt: serverTimestamp(),
        expiresAt: Timestamp.fromMillis(Date.now() + DAY_MS),
        participants: { [uid]: { name: dealerName.trim(), joinedAt: serverTimestamp() } },
        currentRound: freshRound(1, ticketLabel),
        roundHistory: [],
      });
      return sessionId;
    } catch (err) {
      if (!(err instanceof FirebaseError && err.code === 'permission-denied') || attempt === 2) throw err;
    }
  }
  throw new Error('Could not deal a new table.');
}

export function joinSession(sessionId: string, name: string) {
  const uid = myUid();
  return updateDoc(sessionRef(sessionId), {
    [`participants.${uid}`]: { name: name.trim(), joinedAt: serverTimestamp() },
  });
}

export function renameSelf(sessionId: string, name: string) {
  return updateDoc(sessionRef(sessionId), { [`participants.${myUid()}.name`]: name.trim() });
}

export function playCard(sessionId: string, value: Vote | null) {
  return updateDoc(sessionRef(sessionId), {
    [`currentRound.votes.${myUid()}`]: value ?? deleteField(),
  });
}

export function setTicketLabel(sessionId: string, ticketLabel: string) {
  return updateDoc(sessionRef(sessionId), { 'currentRound.ticketLabel': ticketLabel.trim() });
}

// The reveal and the site-wide counter commit together; the rules only accept the +1 alongside a real reveal.
export async function revealCards(sessionId: string, round: number) {
  const batch = writeBatch(db);
  batch.update(sessionRef(sessionId), { 'currentRound.status': 'revealed' });
  batch.set(statsRef(), { handsDealt: increment(1), lastSession: sessionId }, { merge: true });
  await batch.commit();
  logHandLocation(sessionId, round);
}

// Fire-and-forget: the Worker records country/region/city for this hand. Failures never affect the game.
function logHandLocation(table: string, round: number) {
  const url = import.meta.env.VITE_HAND_LOG_URL;
  if (!url) return;
  // text/plain keeps this a "simple" request, so the browser skips the CORS preflight.
  fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ table, round }), keepalive: true }).catch(
    () => {},
  );
}

export function passDealerButton(sessionId: string, newDealerId: string) {
  return updateDoc(sessionRef(sessionId), { dealerId: newDealerId });
}

export function closeTable(sessionId: string) {
  return updateDoc(sessionRef(sessionId), { closed: true });
}

export function revote(session: Session) {
  const { round, ticketLabel } = session.currentRound;
  return updateDoc(sessionRef(session.sessionId), { currentRound: freshRound(round, ticketLabel) });
}

export function nextRound(session: Session, nextTicketLabel: string) {
  const { round, ticketLabel, votes, status } = session.currentRound;
  const played = Object.keys(votes).length > 0;
  const update: Record<string, unknown> = { currentRound: freshRound(round + 1, nextTicketLabel) };
  if (played) {
    const finished: PastRound = {
      round,
      ticketLabel,
      votes,
      consensus: status === 'revealed' && isConsensus(Object.values(votes)),
    };
    update.roundHistory = arrayUnion(finished);
  }
  return updateDoc(sessionRef(session.sessionId), update);
}
