import { describe, expect, it } from 'vitest';
import {
  daysBetween,
  formatDateJa,
  itemStatus,
  needsAttention,
  sortByUrgency,
  statusDetail,
  todayISO,
} from './expiry';
import type { StockItem } from './stock';

function item(over: Partial<StockItem>): StockItem {
  return {
    id: 'x',
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

describe('daysBetween / todayISO', () => {
  it('日数差を出し、過去は負になる', () => {
    expect(daysBetween('2026-06-13', '2026-06-14')).toBe(1);
    expect(daysBetween('2026-06-13', '2026-06-13')).toBe(0);
    expect(daysBetween('2026-06-13', '2026-06-03')).toBe(-10);
  });

  it('月またぎ・年またぎも数える', () => {
    expect(daysBetween('2026-06-30', '2026-07-01')).toBe(1);
    expect(daysBetween('2026-12-31', '2027-01-01')).toBe(1);
  });

  it('不正な日付はnull', () => {
    expect(daysBetween('2026/06/13', TODAY)).toBeNull();
    expect(daysBetween('', TODAY)).toBeNull();
  });

  it('todayISOはYYYY-MM-DDを返す', () => {
    expect(todayISO(Date.UTC(2026, 5, 13, 12))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('itemStatus', () => {
  it('期限で判定する', () => {
    expect(itemStatus(item({ expiry: '2026-06-12' }), TODAY)).toBe('expired');
    expect(itemStatus(item({ expiry: '2026-06-13' }), TODAY)).toBe('expiring');
    expect(itemStatus(item({ expiry: '2026-07-13' }), TODAY)).toBe('expiring');
    expect(itemStatus(item({ expiry: '2026-07-14' }), TODAY)).toBe('ok');
  });

  it('期限のないものは点検日からの経過で判定する', () => {
    expect(itemStatus(item({ checkedAt: '2026-01-01' }), TODAY)).toBe('checked');
    expect(itemStatus(item({ checkedAt: '2025-12-01' }), TODAY)).toBe('check-due');
  });
});

describe('statusDetail', () => {
  it('残り日数・超過日数・点検経過を言葉にする', () => {
    expect(statusDetail(item({ expiry: '2026-06-25' }), TODAY)).toBe('あと12日');
    expect(statusDetail(item({ expiry: '2026-06-13' }), TODAY)).toBe('今日まで');
    expect(statusDetail(item({ expiry: '2026-06-03' }), TODAY)).toBe('10日超過');
    expect(statusDetail(item({ checkedAt: '2026-06-03' }), TODAY)).toBe('点検から10日');
  });
});

describe('needsAttention / sortByUrgency', () => {
  it('期限切れ・期限間近・要点検だけが要対応', () => {
    expect(needsAttention('expired')).toBe(true);
    expect(needsAttention('expiring')).toBe(true);
    expect(needsAttention('check-due')).toBe(true);
    expect(needsAttention('ok')).toBe(false);
    expect(needsAttention('checked')).toBe(false);
  });

  it('急ぐものから並ぶ', () => {
    const items = [
      item({ name: '余裕', expiry: '2027-01-01' }),
      item({ name: '点検切れ', checkedAt: '2025-01-01' }),
      item({ name: '切れた', expiry: '2026-06-01' }),
      item({ name: '近い', expiry: '2026-06-20' }),
      item({ name: 'もっと近い', expiry: '2026-06-15' }),
    ];
    expect(sortByUrgency(items, TODAY).map((i) => i.name)).toEqual([
      '切れた',
      'もっと近い',
      '近い',
      '点検切れ',
      '余裕',
    ]);
  });
});

describe('formatDateJa', () => {
  it('日本語表記にする', () => {
    expect(formatDateJa('2026-06-13')).toBe('2026年6月13日');
    expect(formatDateJa('')).toBe('');
  });
});
