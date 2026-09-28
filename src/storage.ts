// Some embedded webviews (e.g. a Teams tab) can throw on localStorage access;
// fall back to memory so the app still works, it just forgets the name on reload.
const memory = new Map<string, string>();
const NAME_KEY = 'planning-joker:name';

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return memory.get(key) ?? null;
  }
}

function write(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    memory.set(key, value);
  }
}

export const getCachedName = () => read(NAME_KEY)?.trim() || '';
export const setCachedName = (name: string) => write(NAME_KEY, name.trim());

export type ThemeChoice = 'system' | 'light' | 'dark';
export type CardTheme = 'default' | 'magenta' | 'olive';

export interface DisplaySettings {
  theme: ThemeChoice;
  cards: CardTheme;
}

const THEME_KEY = 'planning-joker:theme';
const CARDS_KEY = 'planning-joker:cards';

export function getDisplaySettings(): DisplaySettings {
  const theme = read(THEME_KEY);
  const cards = read(CARDS_KEY);
  return {
    theme: theme === 'light' || theme === 'dark' ? theme : 'system',
    cards: cards === 'magenta' || cards === 'olive' ? cards : 'default',
  };
}

// "System" and "default" remove the attributes so the stylesheet's own defaults apply.
export function applyDisplaySettings({ theme, cards }: DisplaySettings) {
  const root = document.documentElement;
  if (theme === 'system') delete root.dataset.theme;
  else root.dataset.theme = theme;
  if (cards === 'default') delete root.dataset.cards;
  else root.dataset.cards = cards;
}

export function saveDisplaySettings(settings: DisplaySettings) {
  write(THEME_KEY, settings.theme);
  write(CARDS_KEY, settings.cards);
  applyDisplaySettings(settings);
}
