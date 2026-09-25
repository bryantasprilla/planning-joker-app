const FIRST = [
  'royal', 'lucky', 'wild', 'pocket', 'high', 'golden', 'silent', 'bold',
  'loose', 'tight', 'double', 'split', 'blind', 'hot', 'cold', 'big',
];

const SECOND = [
  'flush', 'river', 'ante', 'bluff', 'ace', 'king', 'queen', 'jack',
  'joker', 'pot', 'flop', 'turn', 'showdown', 'stack', 'raise', 'deck',
];

// No 0/o, 1/l/i so a code read aloud in a meeting can't be misheard.
const SUFFIX_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

function pick<T>(items: T[], random: number): T {
  return items[random % items.length];
}

export function newSessionId(): string {
  const r = crypto.getRandomValues(new Uint32Array(6));
  const suffix = Array.from(r.slice(2), (n) => pick([...SUFFIX_ALPHABET], n)).join('');
  return `${pick(FIRST, r[0])}-${pick(SECOND, r[1])}-${suffix}`;
}
