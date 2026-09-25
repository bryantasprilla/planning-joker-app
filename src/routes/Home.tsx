import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlayingCard } from '../components/PlayingCard';
import type { AuthState } from '../hooks';
import { createSession } from '../sessionApi';
import { getCachedName, setCachedName } from '../storage';
import { ofAKind } from '../votes';

const SAMPLE_SEATS = ['Priya', 'Marco', 'Wei', 'Aisha'];

export function Home({ auth }: { auth: AuthState }) {
  const navigate = useNavigate();
  const [name, setName] = useState(getCachedName);
  const [ticket, setTicket] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const ready = auth.status === 'ready';

  async function deal(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError('');
    try {
      setCachedName(name);
      const sessionId = await createSession(name, ticket);
      navigate(`/table/${sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t deal a table. Try again.');
      setBusy(false);
    }
  }

  return (
    <main className="app">
      <header className="topbar">
        <span className="brand">
          <span className="brand-mark" aria-hidden="true" />
          Planning Joker
        </span>
      </header>

      <div className="home">
        <div className="stack-lg">
          <div className="stack">
            <h1 className="display">Deal your team in.</h1>
            <p className="lede">
              Planning poker for backlog refinement. No accounts and no setup: deal a table, send the link, and estimate
              each ticket in rounds.
            </p>
          </div>

          <form className="panel stack" onSubmit={deal}>
            <div className="field">
              <label htmlFor="dealer-name">Your name</label>
              <input
                id="dealer-name"
                className="input"
                value={name}
                maxLength={40}
                autoComplete="nickname"
                placeholder="e.g. Priya Shah"
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="first-ticket">
                First ticket <span className="muted">(optional)</span>
              </label>
              <input
                id="first-ticket"
                className="input"
                value={ticket}
                maxLength={200}
                placeholder="e.g. PROJ-482 Bulk CSV import"
                onChange={(e) => setTicket(e.target.value)}
              />
            </div>
            {auth.status === 'error' && <p className="error-text">{auth.message}</p>}
            {error && <p className="error-text">{error}</p>}
            <button type="submit" className="btn btn-primary btn-lg" disabled={!ready || busy || !name.trim()}>
              {!ready ? 'Connecting…' : busy ? 'Dealing…' : 'Deal a new table'}
            </button>
            <p className="small muted">You’ll be the dealer. Tables clear out 24 hours after they’re dealt.</p>
          </form>
        </div>

        <figure className="home-demo">
          <div className="table-rail">
            <div className="felt">
              <ul className="seats">
                {SAMPLE_SEATS.map((seat, i) => (
                  <li key={seat} className="seat">
                    <PlayingCard face="up" value="5" suit={i} gold />
                    <span className="seat-name">
                      {i === 0 && <span className="dealer-puck">D</span>}
                      <span>{seat}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="consensus-banner">{ofAKind(SAMPLE_SEATS.length)} · 5 points</p>
            </div>
          </div>
          <figcaption className="small muted">When every card matches, the table turns gold.</figcaption>
        </figure>
      </div>

      <section className="panel" aria-labelledby="how-title">
        <h2 id="how-title" className="eyebrow">
          How a round plays
        </h2>
        <ol className="steps">
          <li>
            <strong>Deal a table</strong> and copy the invite link into your meeting chat.
          </li>
          <li>
            <strong>Everyone plays a card.</strong> The table only shows who’s locked in, never the number.
          </li>
          <li>
            <strong>You reveal.</strong> Talk through the spread, re-vote if needed, then deal the next ticket.
          </li>
        </ol>
      </section>
    </main>
  );
}
