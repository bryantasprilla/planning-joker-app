import type { PastRound } from '../types';
import { computeStats, formatPoints } from '../votes';

export function History({ rounds }: { rounds: PastRound[] }) {
  if (rounds.length === 0) return null;

  return (
    <section className="panel" aria-labelledby="history-title">
      <h2 id="history-title" className="eyebrow">
        Earlier rounds
      </h2>
      <ol className="history" reversed>
        {[...rounds].reverse().map((r) => {
          const stats = computeStats(Object.values(r.votes));
          return (
            <li key={r.round} className="history-row">
              <span className="mono small muted">Round {r.round}</span>
              <span className={r.ticketLabel ? '' : 'muted'}>{r.ticketLabel || 'Untitled ticket'}</span>
              {!stats ? (
                <span className="result-chip">No estimates</span>
              ) : r.consensus ? (
                <span className="result-chip is-gold">{formatPoints(stats.median)} · consensus</span>
              ) : (
                <span className="result-chip">
                  median {formatPoints(stats.median)} · {stats.min}–{stats.max}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
