import type { CardValue } from '../types';

const SUITS = ['♠', '♥', '♦', '♣'];

interface Props {
  face: 'up' | 'down' | 'empty';
  value?: CardValue;
  suit?: number;
  gold?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function PlayingCard({ face, value, suit = 0, gold = false, size = 'md' }: Props) {
  const classes = ['pcard', `pcard--${size}`, face === 'up' && 'is-up', face === 'empty' && 'is-empty', gold && 'is-gold']
    .filter(Boolean)
    .join(' ');

  if (face === 'empty') return <div className={classes} aria-hidden="true" />;

  const suitChar = SUITS[suit % SUITS.length];
  const red = suitChar === '♥' || suitChar === '♦';

  return (
    <div className={classes} aria-hidden="true">
      <div className="pcard-inner">
        <div className="pcard-face pcard-front">
          {value !== undefined && (
            <>
              <span className="pcard-corner tl">
                {value}
                <span className={red ? 'is-red' : undefined}>{suitChar}</span>
              </span>
              <span className="pcard-value">{value}</span>
              <span className="pcard-corner br">
                {value}
                <span className={red ? 'is-red' : undefined}>{suitChar}</span>
              </span>
            </>
          )}
        </div>
        <div className="pcard-face pcard-back" />
      </div>
    </div>
  );
}
