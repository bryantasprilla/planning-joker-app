import { onAuthStateChanged, signInAnonymously, type User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { auth, db } from './firebase';
import type { Session } from './types';

export type AuthState = { status: 'loading' } | { status: 'ready'; user: User } | { status: 'error'; message: string };

// Anonymous sign-in: no login screen, but every browser gets a stable id the
// security rules can check ("only you can play your card", "only the dealer can reveal").
export function useAnonymousUser(): AuthState {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      if (user) {
        setState({ status: 'ready', user });
        return;
      }
      signInAnonymously(auth).catch((err: Error) =>
        setState({ status: 'error', message: `Couldn't connect to the table server. ${err.message}` }),
      );
    });
  }, []);

  return state;
}

export type SessionState =
  | { status: 'loading' }
  | { status: 'closed'; byDealer: boolean }
  | { status: 'ready'; session: Session }
  | { status: 'error'; message: string };

export function useSession(sessionId: string, enabled: boolean): SessionState {
  const [state, setState] = useState<SessionState>({ status: 'loading' });

  useEffect(() => {
    if (!enabled) return;
    setState({ status: 'loading' });
    return onSnapshot(
      doc(db, 'sessions', sessionId),
      (snap) => {
        const session = snap.data() as Session | undefined;
        if (!session || session.closed || session.expiresAt.toMillis() < Date.now()) {
          setState({ status: 'closed', byDealer: Boolean(session?.closed) });
        } else {
          setState({ status: 'ready', session });
        }
      },
      (err) => setState({ status: 'error', message: err.message }),
    );
  }, [sessionId, enabled]);

  return state;
}
