import { describe, expect, it } from 'vitest';
import { isSortMode, sortItems } from './sort';
import type { StockItem } from './stock';

function item(over: Partial<StockItem>): StockItem {
  return {
    id: Math.random().toString(36).slice(2),
    name: '品',
    category: 'food',
    quantity: 1,
    unit: '個',
    expiry: '',
    checkedAt: '2026-06-01',
    ...over,
  };
}

const TODAY = '2026-06-13';

describe('sortItems', () => {
  it('急ぐ順は期限切れ・間近を先頭にする', () => {
    const items = [
      item({ name: '余裕', expiry: '2027-01-01' }),
      item({ name: '切れた', expiry: '2026-06-01' }),
      item({ name: '近い', expiry: '2026-06-20' }),
    ];
    expect(sortItems(items, 'urgency', TODAY).map((i) => i.name)).toEqual([
      '切れた',
      '近い',
      '余裕',
    ]);
  });

  it('期限順は期限なしを末尾に送る', () => {
    const items = [
      item({ name: '点検品', expiry: '' }),
      item({ name: '遠い', expiry: '2027-01-01' }),
      item({ name: '近い', expiry: '2026-06-20' }),
    ];
    expect(sortItems(items, 'expiry', TODAY).map((i) => i.name)).toEqual([
      '近い',
      '遠い',
      '点検品',
    ]);
  });

  it('品名順は日本語の読みで並べる', () => {
    const items = [item({ name: 'みず' }), item({ name: 'あんぱん' }), item({ name: 'かんづめ' })];
    expect(sortItems(items, 'name', TODAY).map((i) => i.name)).toEqual([
      'あんぱん',
      'かんづめ',
      'みず',
    ]);
  });

  it('カテゴリ順は定義順、同カテゴリは品名順', () => {
    const items = [
      item({ name: 'パン', category: 'food' }),
      item({ name: '水2', category: 'water' }),
      item({ name: '水1', category: 'water' }),
    ];
    expect(sortItems(items, 'category', TODAY).map((i) => i.name)).toEqual(['水1', '水2', 'パン']);
  });

  it('元の配列を破壊しない', () => {
    const items = [
      item({ name: 'a', expiry: '2027-01-01' }),
      item({ name: 'b', expiry: '2026-06-20' }),
    ];
    const before = items.map((i) => i.name);
    sortItems(items, 'expiry', TODAY);
    expect(items.map((i) => i.name)).toEqual(before);
  });
});

describe('isSortMode', () => {
  it('既知のモードだけ受け付ける', () => {
    expect(isSortMode('expiry')).toBe(true);
    expect(isSortMode('size')).toBe(false);
  });
});
