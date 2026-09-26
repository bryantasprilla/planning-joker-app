import { useState } from 'react';
import type { Session } from '../types';

interface Props {
  session: Session;
  myUid: string;
  onPass: (uid: string) => Promise<void>;
  onCloseTable: () => Promise<void>;
  onDismiss: () => void;
}

export function DealerOptions({ session, myUid, onPass, onCloseTable, onDismiss }: Props) {
  const [confirmingClose, setConfirmingClose] = useState(false);
  const [busy, setBusy] = useState(false);
  const others = Object.entries(session.participants)
    .filter(([uid]) => uid !== myUid)
    .sort(([, a], [, b]) => a.name.localeCompare(b.name));

  async function act(action: () => Promise<void>) {
    setBusy(true);
    await action();
    setBusy(false);
  }

  return (
    <div className="overlay" onKeyDown={(e) => e.key === 'Escape' && onDismiss()}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="dealer-options-title">
        <h2 id="dealer-options-title" className="h3">
          Dealer options
        </h2>

        <section className="dialog-section" aria-labelledby="pass-title">
          <h3 id="pass-title" className="eyebrow">
            Pass the dealer button
          </h3>
          <p className="small muted">They’ll reveal the cards and deal the rounds from here on.</p>
          {others.length === 0 ? (
            <p className="small muted">No one else is seated yet.</p>
          ) : (
            <ul className="player-list">
              {others.map(([uid, p]) => (
                <li key={uid}>
                  <span>{p.name}</span>
                  <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => act(() => onPass(uid))}>
                    Make dealer
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="dialog-section" aria-labelledby="close-title">
          <h3 id="close-title" className="eyebrow">
            Close the table
          </h3>
          <p className="small muted">Ends the game for everyone. The invite link stops working.</p>
          {confirmingClose ? (
            <div className="row">
              <span className="small">Close it for everyone?</span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmingClose(false)}>
                Keep playing
              </button>
              <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={() => act(onCloseTable)}>
                Close table
              </button>
            </div>
          ) : (
            <button type="button" className="btn btn-danger-ghost btn-sm align-start" onClick={() => setConfirmingClose(true)}>
              Close table
            </button>
          )}
        </section>

        <div className="row end">
          <button type="button" className="btn btn-primary" autoFocus onClick={onDismiss}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
