import type { Timestamp } from 'firebase/firestore';

export type CardValue = '0' | '1' | '2' | '3' | '5' | '8' | '13' | '21';

// A fold sits in the votes map like a card, but it's public and never counts toward the estimate.
export const FOLD = 'fold';
export type Vote = CardValue | typeof FOLD;

export interface Participant {
  name: string;
  joinedAt: Timestamp | null;
}

export interface Round {
  round: number;
  ticketLabel: string;
  status: 'voting' | 'revealed';
  votes: Record<string, Vote>;
}

export interface PastRound {
  round: number;
  ticketLabel: string;
  votes: Record<string, Vote>;
  consensus: boolean;
}

export interface Session {
  sessionId: string;
  dealerId: string;
  createdAt: Timestamp | null;
  expiresAt: Timestamp;
  participants: Record<string, Participant>;
  currentRound: Round;
  roundHistory: PastRound[];
  closed?: boolean;
}
