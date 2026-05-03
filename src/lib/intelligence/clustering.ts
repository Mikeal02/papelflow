import { mean } from './statistics';

interface Tx {
  amount: number | string;
  date: string;
  type: string;
  category?: { name?: string; category_group?: string | null } | null;
}

export interface SpendingPersonality {
  archetype: 'Saver' | 'Investor' | 'Experiencer' | 'Provider' | 'Builder' | 'Explorer' | 'Balanced';
  confidence: number;
  traits: string[];
  vector: Record<string, number>; // normalized weights
  description: string;
}

const ARCHETYPES: { name: SpendingPersonality['archetype']; weights: Record<string, number>; description: string; traits: string[] }[] = [
  { name: 'Saver',       weights: { savings: 0.6, essentials: 0.3, lifestyle: 0.1 }, description: 'Prioritizes long-term security and minimal discretionary spend.', traits: ['Frugal', 'Future-focused', 'Low burn-rate'] },
  { name: 'Investor',    weights: { investments: 0.5, savings: 0.3, essentials: 0.2 }, description: 'Channels surplus into wealth-building instruments.', traits: ['Compounder', 'Asset accumulator', 'Strategic'] },
  { name: 'Experiencer', weights: { entertainment: 0.4, food: 0.3, travel: 0.3 }, description: 'Spends on memories — dining, travel and experiences.', traits: ['Lifestyle-rich', 'Memory-maker', 'Social'] },
  { name: 'Provider',    weights: { essentials: 0.5, family: 0.3, savings: 0.2 }, description: 'Focused on essentials and dependents.', traits: ['Stable', 'Caregiver', 'Pragmatic'] },
  { name: 'Builder',     weights: { home: 0.4, essentials: 0.3, savings: 0.3 }, description: 'Investing in lasting assets — home, vehicle, durables.', traits: ['Long-horizon', 'Equity-builder'] },
  { name: 'Explorer',    weights: { travel: 0.5, entertainment: 0.3, food: 0.2 }, description: 'Heavy travel + experience footprint.', traits: ['Adventurous', 'Globally-curious'] },
];

const CATEGORY_MAP: Record<string, string> = {
  groceries: 'essentials', utilities: 'essentials', rent: 'essentials', mortgage: 'essentials', housing: 'essentials', insurance: 'essentials', health: 'essentials',
  food: 'food', restaurant: 'food', dining: 'food', coffee: 'food',
  travel: 'travel', flight: 'travel', hotel: 'travel', vacation: 'travel',
  entertainment: 'entertainment', subscription: 'entertainment', streaming: 'entertainment', game: 'entertainment',
  shopping: 'lifestyle', clothing: 'lifestyle', personal: 'lifestyle',
  investment: 'investments', stock: 'investments', crypto: 'investments',
  savings: 'savings', transfer: 'savings',
  family: 'family', kids: 'family', child: 'family',
  home: 'home', furniture: 'home', repair: 'home',
};

function bucketize(name: string): string {
  const lower = name.toLowerCase();
  for (const [k, v] of Object.entries(CATEGORY_MAP)) if (lower.includes(k)) return v;
  return 'lifestyle';
}

/** Cosine similarity between two weight maps. */
function cosine(a: Record<string, number>, b: Record<string, number>): number {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  let dot = 0, na = 0, nb = 0;
  for (const k of keys) {
    const x = a[k] || 0, y = b[k] || 0;
    dot += x * y; na += x * x; nb += y * y;
  }
  const den = Math.sqrt(na * nb);
  return den === 0 ? 0 : dot / den;
}

/**
 * Classifies user into a financial archetype using cosine similarity
 * between their normalized spend vector and reference archetype vectors.
 */
export function classifyPersonality(txs: Tx[]): SpendingPersonality {
  const expenses = txs.filter(t => t.type === 'expense');
  const buckets: Record<string, number> = {};
  let total = 0;
  for (const t of expenses) {
    const name = t.category?.name || 'lifestyle';
    const bucket = bucketize(name);
    const amt = Number(t.amount);
    buckets[bucket] = (buckets[bucket] || 0) + amt;
    total += amt;
  }

  if (total === 0) {
    return { archetype: 'Balanced', confidence: 0, traits: ['Insufficient data'], vector: {}, description: 'Add transactions to discover your spending personality.' };
  }

  const vector: Record<string, number> = {};
  for (const k of Object.keys(buckets)) vector[k] = buckets[k] / total;

  const scored = ARCHETYPES.map(a => ({ ...a, score: cosine(vector, a.weights) })).sort((x, y) => y.score - x.score);
  const top = scored[0];
  const second = scored[1];
  const margin = top.score - (second?.score || 0);

  // If two archetypes are too close → Balanced
  if (top.score < 0.5 || margin < 0.05) {
    return { archetype: 'Balanced', confidence: top.score, traits: ['Diversified spend', 'No dominant pattern'], vector, description: 'Your spending is balanced across multiple lifestyle dimensions.' };
  }

  return { archetype: top.name, confidence: Math.min(1, top.score + margin), traits: top.traits, vector, description: top.description };
}
