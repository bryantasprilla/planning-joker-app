import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Felt } from '../components/Felt';
import { Hand } from '../components/Hand';
import { History } from '../components/History';
import { NameDialog } from '../components/NameDialog';
import { ShareButton } from '../components/ShareButton';
import { TicketBar } from '../components/TicketBar';
import { useSession, type AuthState } from '../hooks';
import {
  joinSession,
  nextRound,
  playCard,
  renameSelf,
  revealCards,
  revote,
  setTicketLabel,
} from '../sessionApi';
import { getCachedName, setCachedName } from '../storage';
import type { Session } from '../types';

export function Table({ auth }: { auth: AuthState }) {
  const { sessionId = '' } = useParams();
  const state = useSession(sessionId, auth.status === 'ready');

  if (auth.status === 'error') return <Notice title="Can’t reach the table" body={auth.message} />;
  if (state.status === 'error') return <Notice title="Can’t reach the table" body={state.message} />;
  if (state.status === 'closed') {
    return (
      <Notice
        title="This table has closed"
        body="Tables clear out 24 hours after they’re dealt, or the link may be mistyped. Deal a new one to keep going."
      />
    );
  }
  if (auth.status !== 'ready' || state.status === 'loading') {
    return (
      <main className="app narrow">
        <p className="muted center">Finding your seat…</p>
      </main>
    );
  }

  return <TableReady session={state.session} uid={auth.user.uid} />;
}

function TableReady({ session, uid }: { session: Session; uid: string }) {
  const { sessionId, participants, currentRound, dealerId } = session;
  const me = participants[uid];
  const isDealer = uid === dealerId;
  const revealed = currentRound.status === 'revealed';

  const [cachedName] = useState(getCachedName);
  const [autoJoinFailed, setAutoJoinFailed] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const autoJoinTried = useRef(false);

  // A returning player with a remembered name sits straight down; no prompt.
  useEffect(() => {
    if (me || !cachedName || autoJoinTried.current) return;
    autoJoinTried.current = true;
    joinSession(sessionId, cachedName).catch(() => setAutoJoinFailed(true));
  }, [me, cachedName, sessionId]);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That didn’t go through. Try again.');
    } finally {
      setBusy(false);
    }
  }

  async function join(name: string) {
    await joinSession(sessionId, name);
    setCachedName(name);
  }

  async function rename(name: string) {
    await renameSelf(sessionId, name);
    setCachedName(name);
    setRenaming(false);
  }

  const inviteUrl = `${window.location.origin}/table/${sessionId}`;

  return (
    <main className="app">
      <header className="topbar">
        <Link to="/" className="brand">
          <span className="brand-mark" aria-hidden="true" />
          Planning Joker
        </Link>
        <div className="topbar-actions">
          <span className="table-code mono" title="Table code">
            {sessionId}
          </span>
          {me && (
            <button type="button" className="btn btn-ghost" onClick={() => setRenaming(true)}>
              {me.name} <span aria-hidden="true">✎</span>
              <span className="sr-only">, change your name</span>
            </button>
          )}
          <ShareButton url={inviteUrl} />
        </div>
      </header>

      {error && (
        <div className="banner-error" role="alert">
          <span>{error}</span>
          <button type="button" className="link-btn" onClick={() => setError('')}>
            Dismiss
          </button>
        </div>
      )}

      <TicketBar
        key={currentRound.round}
        round={currentRound}
        isDealer={isDealer}
        onSave={(label) => run(() => setTicketLabel(sessionId, label))}
      />

      <Felt
        session={session}
        myUid={uid}
        isDealer={isDealer}
        busy={busy}
        onReveal={() => run(() => revealCards(sessionId))}
        onRevote={() => run(() => revote(session))}
        onNextRound={(label) => run(() => nextRound(session, label))}
      />

      <Hand
        myVote={currentRound.votes[uid]}
        revealed={revealed}
        busy={busy || !me}
        onPlay={(value) => run(() => playCard(sessionId, value))}
      />

      <History rounds={session.roundHistory} />

      {!me && (!cachedName || autoJoinFailed) && (
        <NameDialog
          title="Take a seat"
          intro={`${participants[dealerId]?.name ?? 'The dealer'} dealt you in. What should the table call you?`}
          submitLabel="Sit down"
          initialName={cachedName}
          onSubmit={join}
        />
      )}

      {me && renaming && (
        <NameDialog
          title="Change your name"
          intro="Everyone at the table sees the new name right away."
          submitLabel="Save name"
          initialName={me.name}
          onSubmit={rename}
          onCancel={() => setRenaming(false)}
        />
      )}
    </main>
  );
}

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <main className="app narrow">
      <div className="panel stack">
        <h1 className="h2">{title}</h1>
        <p className="muted">{body}</p>
        <Link to="/" className="btn btn-primary align-start">
          Deal a new table
        </Link>
      </div>
    </main>
  );
}
