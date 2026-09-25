import { FirebaseError } from 'firebase/app';
import {
  Timestamp,
  arrayUnion,
  deleteField,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { newSessionId } from './sessionId';
import type { CardValue, PastRound, Round, Session } from './types';
import { isConsensus } from './votes';

const DAY_MS = 24 * 60 * 60 * 1000;

const sessionRef = (sessionId: string) => doc(db, 'sessions', sessionId);

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

export function playCard(sessionId: string, value: CardValue | null) {
  return updateDoc(sessionRef(sessionId), {
    [`currentRound.votes.${myUid()}`]: value ?? deleteField(),
  });
}

export function setTicketLabel(sessionId: string, ticketLabel: string) {
  return updateDoc(sessionRef(sessionId), { 'currentRound.ticketLabel': ticketLabel.trim() });
}

export function revealCards(sessionId: string) {
  return updateDoc(sessionRef(sessionId), { 'currentRound.status': 'revealed' });
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
