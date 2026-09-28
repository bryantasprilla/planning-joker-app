import { useState } from 'react';
import {
  getDisplaySettings,
  saveDisplaySettings,
  type CardTheme,
  type DisplaySettings as Settings,
  type ThemeChoice,
} from '../storage';

const THEMES: { value: ThemeChoice; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

const CARD_THEMES: { value: CardTheme; label: string }[] = [
  { value: 'default', label: 'Default' },
  { value: 'magenta', label: 'Magenta' },
  { value: 'olive', label: 'Olive' },
];

export function DisplaySettingsButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn btn-ghost" onClick={() => setOpen(true)}>
        Display settings
      </button>
      {open && <DisplaySettingsDialog onDismiss={() => setOpen(false)} />}
    </>
  );
}

function DisplaySettingsDialog({ onDismiss }: { onDismiss: () => void }) {
  const [settings, setSettings] = useState(getDisplaySettings);

  function update(change: Partial<Settings>) {
    const next = { ...settings, ...change };
    setSettings(next);
    saveDisplaySettings(next);
  }

  return (
    <div className="overlay" onKeyDown={(e) => e.key === 'Escape' && onDismiss()}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="display-settings-title">
        <h2 id="display-settings-title" className="h3">
          Display settings
        </h2>
        <p className="small muted">Saved on this device. Other players keep their own settings.</p>

        <div className="dialog-section" role="radiogroup" aria-labelledby="theme-title">
          <h3 id="theme-title" className="eyebrow">
            Theme
          </h3>
          <div className="segmented">
            {THEMES.map((t) => (
              <label key={t.value} className="segment">
                <input
                  type="radio"
                  name="theme"
                  value={t.value}
                  checked={settings.theme === t.value}
                  onChange={() => update({ theme: t.value })}
                />
                <span>{t.label}</span>
              </label>
            ))}
          </div>
          <p className="small muted">System follows your device’s light or dark setting.</p>
        </div>

        <div className="dialog-section" role="radiogroup" aria-labelledby="card-theme-title">
          <h3 id="card-theme-title" className="eyebrow">
            Card theme
          </h3>
          <div className="card-theme-options">
            {CARD_THEMES.map((c) => (
              <label key={c.value} className="card-theme-option">
                <input
                  type="radio"
                  name="card-theme"
                  value={c.value}
                  checked={settings.cards === c.value}
                  onChange={() => update({ cards: c.value })}
                />
                <span className={`card-swatch card-swatch--${c.value}`} aria-hidden="true" />
                <span>{c.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="row end">
          <button type="button" className="btn btn-primary" autoFocus onClick={onDismiss}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
