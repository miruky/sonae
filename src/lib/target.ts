// 備蓄目標の計算。農林水産省の家庭備蓄の目安(飲料水 1人1日3L、
// 食料 1人1日3食)をもとに、世帯設定から必要量を出して現在量と比べる。

import type { Category, Household, StockItem } from './stock';

export const WATER_LITERS_PER_PERSON_DAY = 3;
export const MEALS_PER_PERSON_DAY = 3;

export function waterTargetLiters(h: Household): number {
  return h.people * h.days * WATER_LITERS_PER_PERSON_DAY;
}

export function foodTargetMeals(h: Household): number {
  return h.people * h.days * MEALS_PER_PERSON_DAY;
}

/** 単位の表記ゆれを吸収する。「l」「リットル」はL、「食分」は食に寄せる */
function normalizeUnit(unit: string): string {
  const text = unit.trim().toLowerCase();
  if (text === 'l' || text === 'リットル' || text === 'ℓ') return 'L';
  if (text === '食' || text === '食分') return '食';
  return unit.trim();
}

/** 指定カテゴリのうち、単位の一致する品目の数量合計 */
export function sumByUnit(items: StockItem[], category: Category, unit: string): number {
  return items
    .filter((i) => i.category === category && normalizeUnit(i.unit) === unit)
    .reduce((sum, i) => sum + i.quantity, 0);
}

export interface Coverage {
  current: number;
  target: number;
  /** 0〜100に丸めた充足率 */
  percent: number;
}

export function coverage(current: number, target: number): Coverage {
  const percent = target <= 0 ? 0 : Math.min(100, Math.round((current / target) * 100));
  return { current, target, percent };
}

export function waterCoverage(items: StockItem[], h: Household): Coverage {
  return coverage(sumByUnit(items, 'water', 'L'), waterTargetLiters(h));
}

export function foodCoverage(items: StockItem[], h: Household): Coverage {
  return coverage(sumByUnit(items, 'food', '食'), foodTargetMeals(h));
}
