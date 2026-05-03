import { similarity } from './statistics';

interface Tx {
  amount: number | string;
  payee?: string | null;
  category_id?: string | null;
  type: string;
}

export interface CategorySuggestion {
  categoryId: string;
  probability: number;
  reasoning: string;
}

/**
 * Multinomial Naive Bayes classifier trained on user's own transaction history.
 * Features: payee tokens, amount-bucket, transaction type.
 * Includes Laplace (add-1) smoothing.
 */
export class TransactionClassifier {
  private classPriors = new Map<string, number>();
  private featureCounts = new Map<string, Map<string, number>>(); // category -> token -> count
  private classTotals = new Map<string, number>();
  private vocab = new Set<string>();
  private trained = false;

  train(txs: Tx[]): void {
    this.classPriors.clear();
    this.featureCounts.clear();
    this.classTotals.clear();
    this.vocab.clear();

    const labeled = txs.filter(t => t.category_id && t.type === 'expense');
    if (labeled.length < 10) return;

    for (const t of labeled) {
      const c = t.category_id!;
      this.classPriors.set(c, (this.classPriors.get(c) || 0) + 1);
      if (!this.featureCounts.has(c)) this.featureCounts.set(c, new Map());
      const feats = this.featurize(t);
      for (const f of feats) {
        this.vocab.add(f);
        this.featureCounts.get(c)!.set(f, (this.featureCounts.get(c)!.get(f) || 0) + 1);
        this.classTotals.set(c, (this.classTotals.get(c) || 0) + 1);
      }
    }

    const total = labeled.length;
    for (const [c, count] of this.classPriors) this.classPriors.set(c, count / total);
    this.trained = true;
  }

  predict(tx: { payee?: string | null; amount: number; type: string }): CategorySuggestion[] {
    if (!this.trained) return [];
    const feats = this.featurize(tx);
    const vocabSize = this.vocab.size;

    const scores: { c: string; logProb: number; matchedTokens: string[] }[] = [];
    for (const [c, prior] of this.classPriors) {
      let logProb = Math.log(prior);
      const counts = this.featureCounts.get(c)!;
      const total = this.classTotals.get(c) || 1;
      const matched: string[] = [];
      for (const f of feats) {
        const count = counts.get(f) || 0;
        if (count > 0) matched.push(f);
        // Laplace smoothing
        logProb += Math.log((count + 1) / (total + vocabSize));
      }
      scores.push({ c, logProb, matchedTokens: matched });
    }

    // Softmax-normalize
    const maxLog = Math.max(...scores.map(s => s.logProb));
    const exps = scores.map(s => Math.exp(s.logProb - maxLog));
    const sum = exps.reduce((a, b) => a + b, 0);
    return scores
      .map((s, i) => ({
        categoryId: s.c,
        probability: exps[i] / sum,
        reasoning: s.matchedTokens.length
          ? `Matched: ${s.matchedTokens.slice(0, 3).join(', ')}`
          : 'Based on amount range',
      }))
      .sort((a, b) => b.probability - a.probability)
      .slice(0, 3);
  }

  private featurize(tx: { payee?: string | null; amount: number | string; type: string }): string[] {
    const feats: string[] = [];
    const payee = (tx.payee || '').toLowerCase();
    const tokens = payee.split(/\s+/).filter(t => t.length >= 3);
    feats.push(...tokens.map(t => `tok:${t}`));
    if (tokens.length >= 2) feats.push(`bi:${tokens[0]}_${tokens[1]}`);

    const amt = Number(tx.amount);
    let bucket = 'amt:micro';
    if (amt >= 1000) bucket = 'amt:huge';
    else if (amt >= 200) bucket = 'amt:large';
    else if (amt >= 50) bucket = 'amt:med';
    else if (amt >= 10) bucket = 'amt:small';
    feats.push(bucket);
    feats.push(`type:${tx.type}`);
    return feats;
  }

  isTrained(): boolean { return this.trained; }
}
