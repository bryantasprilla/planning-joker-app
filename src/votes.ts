import { FOLD, type CardValue, type Vote } from './types';

export const DECK: CardValue[] = ['0', '1', '2', '3', '5', '8', '13', '21'];

export const isCard = (v: Vote): v is CardValue => v !== FOLD;

// A lone card agrees with nobody, so consensus needs at least two matching cards. Folds don't count.
export function isConsensus(votes: Vote[]): boolean {
  const cards = votes.filter(isCard);
  return cards.length >= 2 && cards.every((v) => v === cards[0]);
}

const COUNT_WORDS = ['', '', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'];

export function ofAKind(count: number): string {
  return `${COUNT_WORDS[count] ?? count} of a Kind!`;
}

export interface RoundStats {
  count: number;
  average: number;
  median: number;
  min: number;
  max: number;
}

export function computeStats(votes: Vote[]): RoundStats | null {
  const nums = votes.filter(isCard).map(Number).sort((a, b) => a - b);
  if (nums.length === 0) return null;
  const mid = Math.floor(nums.length / 2);
  return {
    count: nums.length,
    average: nums.reduce((sum, n) => sum + n, 0) / nums.length,
    median: nums.length % 2 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2,
    min: nums[0],
    max: nums[nums.length - 1],
  };
}

export function formatPoints(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}
