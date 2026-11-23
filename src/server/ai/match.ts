import type { MenuItemSnap } from "./types";

export const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

function bigrams(s: string): Map<string, number> {
  const m = new Map<string, number>();
  const t = ` ${s} `;
  for (let i = 0; i < t.length - 1; i++) {
    const g = t.slice(i, i + 2);
    m.set(g, (m.get(g) ?? 0) + 1);
  }
  return m;
}

/** Sørensen–Dice similarity on character bigrams (0..1). */
export function similarity(a: string, b: string): number {
  const x = normalize(a);
  const y = normalize(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  const A = bigrams(x);
  const B = bigrams(y);
  let overlap = 0;
  for (const [g, n] of A) overlap += Math.min(n, B.get(g) ?? 0);
  const total = [...A.values()].reduce((s, n) => s + n, 0) + [...B.values()].reduce((s, n) => s + n, 0);
  return (2 * overlap) / total;
}

export function namesOf(x: { name: string; nameI18n?: Record<string, string>; aliases?: string[] }): string[] {
  return [x.name, ...Object.values(x.nameI18n ?? {}), ...(x.aliases ?? [])].filter(Boolean);
}

export function bestMatch<T extends { name: string; nameI18n?: Record<string, string>; aliases?: string[] }>(
  candidates: T[],
  query: string,
  threshold = 0.62,
): { item: T; score: number } | null {
  const q = normalize(query);
  if (!q) return null;
  let best: { item: T; score: number } | null = null;
  for (const c of candidates) {
    for (const n of namesOf(c)) {
      const nn = normalize(n);
      let score = similarity(q, nn);
      // Whole-word containment ("large pepperoni pizza" vs "pepperoni pizza").
      if (score < 0.9 && nn.length >= 3 && (` ${q} `.includes(` ${nn} `) || ` ${nn} `.includes(` ${q} `))) score = Math.max(score, 0.85);
      if (!best || score > best.score) best = { item: c, score };
    }
  }
  return best && best.score >= threshold ? best : null;
}

export function suggestItems(items: MenuItemSnap[], query: string, n = 3): string[] {
  return items
    .filter((i) => i.isAvailable && !i.isSoldOut)
    .map((i) => ({ i, s: Math.max(...namesOf(i).map((x) => similarity(query, x))) }))
    .sort((a, b) => b.s - a.s)
    .filter((x) => x.s > 0.25)
    .slice(0, n)
    .map((x) => x.i.name);
}
