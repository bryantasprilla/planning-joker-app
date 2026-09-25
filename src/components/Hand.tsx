import type { CSSProperties } from 'react';
import type { CardValue } from '../types';
import { DECK } from '../votes';
import { PlayingCard } from './PlayingCard';

interface Props {
  myVote: CardValue | undefined;
  revealed: boolean;
  busy: boolean;
  onPlay: (value: CardValue | null) => void;
}

export function Hand({ myVote, revealed, busy, onPlay }: Props) {
  return (
    <section className="hand" aria-labelledby="hand-title">
      <div className="row between">
        <h2 id="hand-title" className="eyebrow">
          Your hand
        </h2>
        <p className="small muted">
          {revealed
            ? 'Cards are face up. Hang tight for the next round.'
            : myVote
              ? 'Locked in. Tap another card to change it, or the same one to pull it back.'
              : 'Tap a card to lock it in. Nobody sees it until the reveal.'}
        </p>
      </div>
      <div className="hand-cards">
        {DECK.map((value, i) => {
          const picked = myVote === value;
          return (
            <button
              key={value}
              type="button"
              className="hand-card"
              style={{ '--i': i } as CSSProperties}
              aria-pressed={picked}
              aria-label={`${value} points`}
              disabled={revealed || busy}
              onClick={() => onPlay(picked ? null : value)}
            >
              <PlayingCard face="up" value={value} suit={i} size="sm" />
            </button>
          );
        })}
      </div>
    </section>
  );
}
