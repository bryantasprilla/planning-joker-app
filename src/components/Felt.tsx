import { useState, type FormEvent } from 'react';
import type { Session } from '../types';
import { computeStats, formatPoints, isConsensus, ofAKind } from '../votes';
import { PlayingCard } from './PlayingCard';

interface Props {
  session: Session;
  myUid: string;
  isDealer: boolean;
  busy: boolean;
  onReveal: () => void;
  onRevote: () => void;
  onNextRound: (ticketLabel: string) => Promise<void>;
}

export function Felt({ session, myUid, isDealer, busy, onReveal, onRevote, onNextRound }: Props) {
  const { participants, currentRound, dealerId } = session;
  const revealed = currentRound.status === 'revealed';
  const votes = currentRound.votes;
  const values = Object.values(votes);
  const consensus = revealed && isConsensus(values);
  const stats = revealed ? computeStats(values) : null;

  const seats = Object.entries(participants).sort(
    ([, a], [, b]) => (a.joinedAt?.toMillis() ?? Infinity) - (b.joinedAt?.toMillis() ?? Infinity),
  );
  const lockedCount = seats.filter(([uid]) => votes[uid] !== undefined).length;
  const everyoneIn = lockedCount === seats.length;

  return (
    <section className="table-rail" aria-label="Poker table">
      <div className="felt">
        <ul className="seats">
          {seats.map(([uid, p], i) => {
            const vote = votes[uid];
            const face = vote === undefined ? 'empty' : revealed ? 'up' : 'down';
            const status = revealed ? (vote === undefined ? 'Sat out' : '') : vote === undefined ? 'Thinking…' : 'Locked in';
            return (
              <li key={uid} className={`seat${uid === myUid ? ' is-me' : ''}`}>
                <PlayingCard
                  face={face}
                  value={revealed ? vote : undefined}
                  suit={i}
                  gold={consensus && vote !== undefined}
                />
                <span className="seat-name">
                  {uid === dealerId && (
                    <span className="dealer-puck" title="Dealer">
                      D
                    </span>
                  )}
                  <span>
                    {p.name}
                    {uid === myUid && <span className="seat-you"> (you)</span>}
                  </span>
                </span>
                {status && (
                  <span className={`seat-status${status === 'Locked in' ? ' is-locked' : ''}`}>{status}</span>
                )}
                {revealed && vote !== undefined && <span className="sr-only">played {vote}</span>}
              </li>
            );
          })}
        </ul>

        <div className="felt-center" aria-live="polite">
          {!revealed ? (
            <>
              <p className="felt-status">
                {everyoneIn ? 'Everyone’s locked in' : `${lockedCount} of ${seats.length} locked in`}
              </p>
              {isDealer ? (
                <button type="button" className="btn btn-chip" disabled={busy || lockedCount === 0} onClick={onReveal}>
                  Reveal cards
                </button>
              ) : (
                <p className="felt-hint">The dealer reveals the cards when everyone’s in.</p>
              )}
            </>
          ) : (
            <>
              {consensus && stats ? (
                <p className="consensus-banner">
                  {ofAKind(stats.count)} · {formatPoints(stats.median)} points
                </p>
              ) : stats ? (
                <dl className="stats">
                  <div>
                    <dt>Average</dt>
                    <dd>{formatPoints(stats.average)}</dd>
                  </div>
                  <div>
                    <dt>Median</dt>
                    <dd>{formatPoints(stats.median)}</dd>
                  </div>
                  <div>
                    <dt>Range</dt>
                    <dd>
                      {stats.min}–{stats.max}
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="felt-status">No point estimates this round</p>
              )}
              {isDealer ? (
                <NextRoundControls busy={busy} onRevote={onRevote} onNextRound={onNextRound} />
              ) : (
                <p className="felt-hint">Waiting for the dealer to deal the next round.</p>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function NextRoundControls({
  busy,
  onRevote,
  onNextRound,
}: Pick<Props, 'busy' | 'onRevote' | 'onNextRound'>) {
  const [label, setLabel] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    await onNextRound(label);
    setLabel('');
  }

  return (
    <form className="next-round" onSubmit={submit}>
      <label htmlFor="next-ticket" className="sr-only">
        Next ticket
      </label>
      <input
        id="next-ticket"
        className="felt-input"
        value={label}
        maxLength={200}
        placeholder="Next ticket, e.g. PROJ-483"
        onChange={(e) => setLabel(e.target.value)}
      />
      <button type="submit" className="btn btn-chip" disabled={busy}>
        Next round
      </button>
      <button type="button" className="btn btn-felt-ghost" disabled={busy} onClick={onRevote}>
        Re-vote
      </button>
    </form>
  );
}
