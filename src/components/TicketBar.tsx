import { useState, type FormEvent } from 'react';
import type { Round } from '../types';

interface Props {
  round: Round;
  isDealer: boolean;
  onSave: (label: string) => Promise<void>;
  onDealerOptions: () => void;
}

export function TicketBar({ round, isDealer, onSave, onDealerOptions }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(round.ticketLabel);

  function startEditing() {
    setDraft(round.ticketLabel);
    setEditing(true);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    await onSave(draft);
    setEditing(false);
  }

  return (
    <section className="ticket" aria-label="Current ticket">
      <div className="ticket-text">
        <p className="eyebrow">
          {round.ticketLabel && `Round ${round.round} · `}
          {round.status === 'voting' ? 'Now estimating' : 'Cards revealed'}
        </p>
        {editing ? (
          <form className="row" onSubmit={submit}>
            <label htmlFor="ticket-edit" className="sr-only">
              Ticket being estimated
            </label>
            <input
              id="ticket-edit"
              className="input grow"
              value={draft}
              maxLength={200}
              autoFocus
              placeholder="e.g. PROJ-482 Bulk CSV import"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && setEditing(false)}
            />
            <button type="submit" className="btn btn-primary">
              Save
            </button>
          </form>
        ) : (
          <h1 className="ticket-label">{round.ticketLabel || `Round ${round.round}`}</h1>
        )}
      </div>
      {isDealer && !editing && (
        <div className="row">
          <button type="button" className="btn btn-ghost" onClick={startEditing}>
            {round.ticketLabel ? 'Edit ticket' : 'Add ticket'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={onDealerOptions}>
            Dealer options
          </button>
        </div>
      )}
    </section>
  );
}
