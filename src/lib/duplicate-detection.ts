import { differenceInCalendarDays } from 'date-fns';

export interface DuplicateCandidate {
  id: string;
  date: string;
  amount: number | string;
  type: string;
  account_id: string;
  category_id: string | null;
  to_account_id?: string | null;
  payee?: string | null;
  notes?: string | null;
  account?: { name?: string } | null;
  category?: { name?: string } | null;
}

export interface DuplicateMatch {
  transaction: DuplicateCandidate;
  score: number; // 0-100
  reasons: string[];
}

export interface DuplicateCheckInput {
  id?: string; // exclude self when editing
  type: string;
  amount: number;
  date: string;
  account_id: string;
  category_id?: string | null;
  payee?: string | null;
}

/**
 * Heuristic duplicate detection:
 * - Same account + type
 * - Amount within 1 cent
 * - Date within +/- 3 days
 * - Bonus for matching payee / category
 */
export function findDuplicates(
  input: DuplicateCheckInput,
  pool: DuplicateCandidate[],
  maxResults = 3
): DuplicateMatch[] {
  const inputDate = new Date(input.date);
  const matches: DuplicateMatch[] = [];

  for (const t of pool) {
    if (input.id && t.id === input.id) continue;
    if (t.type !== input.type) continue;
    if (t.account_id !== input.account_id) continue;

    const amt = Number(t.amount);
    if (!Number.isFinite(amt)) continue;
    const amountDiff = Math.abs(amt - input.amount);
    if (amountDiff > 0.01) continue;

    const dayDiff = Math.abs(differenceInCalendarDays(new Date(t.date), inputDate));
    if (dayDiff > 3) continue;

    let score = 60; // base from amount + account + type
    const reasons: string[] = ['Same amount', 'Same account', `Same type (${input.type})`];

    if (dayDiff === 0) {
      score += 20;
      reasons.push('Same date');
    } else {
      score += Math.max(0, 15 - dayDiff * 5);
      reasons.push(`${dayDiff} day${dayDiff > 1 ? 's' : ''} apart`);
    }

    const inputPayee = (input.payee || '').trim().toLowerCase();
    const tPayee = (t.payee || '').trim().toLowerCase();
    if (inputPayee && tPayee && inputPayee === tPayee) {
      score += 15;
      reasons.push('Same payee');
    }

    if (input.category_id && t.category_id && input.category_id === t.category_id) {
      score += 5;
      reasons.push('Same category');
    }

    matches.push({
      transaction: t,
      score: Math.min(100, score),
      reasons,
    });
  }

  return matches
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
}
