import { describe, expect, it } from 'vitest';
import type { StockItem } from './stock';
import {
  coverage,
  foodCoverage,
  foodTargetMeals,
  sumByUnit,
  waterCoverage,
  waterTargetLiters,
} from './target';

function item(over: Partial<StockItem>): StockItem {
  return {
    id: 'x',
    name: '品',
    category: 'water',
    quantity: 1,
    unit: 'L',
    expiry: '',
    checkedAt: '2026-06-01',
    ...over,
  };
}

describe('目標量', () => {
  it('水は1人1日3L、食料は1人1日3食', () => {
    expect(waterTargetLiters({ people: 2, days: 3 })).toBe(18);
    expect(foodTargetMeals({ people: 4, days: 7 })).toBe(84);
  });
});

describe('sumByUnit', () => {
  it('カテゴリと単位の合う品目だけを合算する', () => {
    const items = [
      item({ quantity: 12, unit: 'L' }),
      item({ quantity: 6, unit: 'l' }),
      item({ quantity: 500, unit: 'ml' }),
      item({ category: 'food', quantity: 10, unit: '食' }),
    ];
    expect(sumByUnit(items, 'water', 'L')).toBe(18);
    expect(sumByUnit(items, 'food', '食')).toBe(10);
  });

  it('「食分」は「食」として数える', () => {
    const items = [item({ category: 'food', quantity: 5, unit: '食分' })];
    expect(sumByUnit(items, 'food', '食')).toBe(5);
  });
});

describe('coverage', () => {
  it('充足率を0〜100に丸める', () => {
    expect(coverage(9, 18).percent).toBe(50);
    expect(coverage(20, 18).percent).toBe(100);
    expect(coverage(0, 18).percent).toBe(0);
    expect(coverage(5, 0).percent).toBe(0);
  });

  it('水と食料の充足をまとめて出す', () => {
    const items = [
      item({ quantity: 9, unit: 'L' }),
      item({ category: 'food', quantity: 18, unit: '食' }),
    ];
    const h = { people: 2, days: 3 };
    expect(waterCoverage(items, h)).toEqual({ current: 9, target: 18, percent: 50 });
    expect(foodCoverage(items, h)).toEqual({ current: 18, target: 18, percent: 100 });
  });
});
