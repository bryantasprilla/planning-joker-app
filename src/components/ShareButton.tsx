import { useEffect, useRef, useState } from 'react';

// Clipboard API rather than window.open or a share sheet: both misbehave inside a Teams tab iframe.
export function ShareButton({ url }: { url: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'manual'>('idle');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state !== 'copied') return;
    const timer = window.setTimeout(() => setState('idle'), 2200);
    return () => window.clearTimeout(timer);
  }, [state]);

  useEffect(() => {
    if (state === 'manual') inputRef.current?.select();
  }, [state]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setState('copied');
    } catch {
      setState('manual');
    }
  }

  return (
    <div className="share">
      <button type="button" className="btn btn-primary" onClick={copy}>
        {state === 'copied' ? 'Link copied' : 'Copy invite link'}
      </button>
      {state === 'manual' && (
        <div className="share-manual">
          <label htmlFor="share-link" className="small muted">
            Copy this link and send it to your team:
          </label>
          <input id="share-link" ref={inputRef} className="input mono small" readOnly value={url} />
        </div>
      )}
      <span className="sr-only" aria-live="polite">
        {state === 'copied' ? 'Invite link copied to clipboard' : ''}
      </span>
    </div>
  );
}
