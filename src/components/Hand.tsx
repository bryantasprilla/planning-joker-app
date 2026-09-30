import type { CSSProperties } from 'react';
import { FOLD, type Vote } from '../types';
import { DECK } from '../votes';
import { PlayingCard } from './PlayingCard';

interface Props {
  myVote: Vote | undefined;
  revealed: boolean;
  busy: boolean;
  onPlay: (value: Vote | null) => void;
}

export function Hand({ myVote, revealed, busy, onPlay }: Props) {
  const folded = myVote === FOLD;

  return (
    <section className="hand" aria-labelledby="hand-title">
      <div className="row between">
        <h2 id="hand-title" className="eyebrow">
          Your hand
        </h2>
        <p className="small muted">
          {revealed
            ? 'Cards are face up. Hang tight for the next round.'
            : folded
              ? 'You’ve folded this round. Tap the chip, or any card, to come back in.'
              : myVote
                ? 'Locked in. Tap another card to change it, or the same one to pull it back.'
                : 'Tap a card to lock it in. Nobody sees it until the reveal.'}
        </p>
      </div>
      <div className="hand-body">
        <span className="fold-wrap">
          <button
            type="button"
            className="fold-chip"
            aria-pressed={folded}
            aria-label={folded ? 'Come back into this round' : 'Fold this round'}
            aria-describedby="fold-help"
            disabled={revealed || busy}
            onClick={() => onPlay(folded ? null : FOLD)}
          >
            {folded ? (
              <>
                BACK
                <br />
                IN
              </>
            ) : (
              'FOLD'
            )}
          </button>
          <span className="fold-tip" id="fold-help" role="tooltip">
            {folded
              ? 'You’re sitting this round out. Tap to come back in, then pick a card to count toward the estimate.'
              : 'Not your ticket? Fold to pass on this round. Your seat stays, and you won’t count toward the estimate.'}
          </span>
        </span>
        <span className="hand-divider" aria-hidden="true" />
        <div className={`hand-cards${folded ? ' is-folded' : ''}`}>
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
      </div>
    </section>
  );
}
