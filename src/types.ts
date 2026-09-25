import type { Timestamp } from 'firebase/firestore';

export type CardValue = '0' | '1' | '2' | '3' | '5' | '8' | '13' | '21';

export interface Participant {
  name: string;
  joinedAt: Timestamp | null;
}

export interface Round {
  round: number;
  ticketLabel: string;
  status: 'voting' | 'revealed';
  votes: Record<string, CardValue>;
}

export interface PastRound {
  round: number;
  ticketLabel: string;
  votes: Record<string, CardValue>;
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
}
