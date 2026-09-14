/** Детерминированный PRNG (mulberry32): один seed — одна и та же орг-структура при каждом запуске. */
export interface Prng {
  /** Число в [0, 1). */
  next(): number;
  /** Целое в [min, max] включительно. */
  int(min: number, max: number): number;
  /** Случайный элемент массива. */
  pick<T>(items: readonly T[]): T;
}

export function createPrng(seed: number): Prng {
  let state = seed >>> 0;
  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int(min, max) {
      return min + Math.floor(next() * (max - min + 1));
    },
    pick(items) {
      if (items.length === 0) throw new Error('pick() from empty array');
      return items[Math.floor(next() * items.length)] as (typeof items)[number];
    },
  };
}
