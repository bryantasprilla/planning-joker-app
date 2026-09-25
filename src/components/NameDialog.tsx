import { useState, type FormEvent } from 'react';

interface Props {
  title: string;
  intro: string;
  submitLabel: string;
  initialName: string;
  onSubmit: (name: string) => Promise<void>;
  onCancel?: () => void;
}

export function NameDialog({ title, intro, submitLabel, initialName, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(initialName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const trimmed = name.trim();

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!trimmed) return;
    setBusy(true);
    setError('');
    try {
      await onSubmit(trimmed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That didn’t save. Try again.');
      setBusy(false);
    }
  }

  return (
    <div className="overlay" onKeyDown={(e) => e.key === 'Escape' && onCancel?.()}>
      <form className="dialog" role="dialog" aria-modal="true" aria-labelledby="name-dialog-title" onSubmit={submit}>
        <h2 id="name-dialog-title" className="h3">
          {title}
        </h2>
        <p className="muted">{intro}</p>
        <div className="field">
          <label htmlFor="name-dialog-input">Your name</label>
          <input
            id="name-dialog-input"
            className="input"
            value={name}
            maxLength={40}
            autoFocus
            autoComplete="nickname"
            placeholder="e.g. Priya Shah"
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        {error && <p className="error-text">{error}</p>}
        <div className="row end">
          {onCancel && (
            <button type="button" className="btn btn-ghost" onClick={onCancel}>
              Cancel
            </button>
          )}
          <button type="submit" className="btn btn-primary" disabled={!trimmed || busy}>
            {busy ? 'Saving…' : submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
