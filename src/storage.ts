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
