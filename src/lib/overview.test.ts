import { describe, expect, it } from 'vitest';
import { overview } from './overview';
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

describe('overview', () => {
  it('状態ごとに数え、要対応の合計を出す', () => {
    const items = [
      item({ expiry: '2026-06-01' }), // 期限切れ
      item({ expiry: '2026-06-20' }), // 期限間近
      item({ expiry: '2027-01-01' }), // 期限内
      item({ checkedAt: '2025-01-01' }), // 要点検
      item({ checkedAt: '2026-06-01' }), // 点検済み
    ];
    const o = overview(items, TODAY);
    expect(o.total).toBe(5);
    expect(o.counts).toEqual({ expired: 1, expiring: 1, ok: 1, 'check-due': 1, checked: 1 });
    expect(o.attention).toBe(3);
  });

  it('次に切れる期限とその残り日数を返す', () => {
    const items = [
      item({ name: '遠い', expiry: '2027-01-01' }),
      item({ name: '近い', expiry: '2026-06-20' }),
      item({ name: '用具', expiry: '' }),
    ];
    const o = overview(items, TODAY);
    expect(o.soonestName).toBe('近い');
    expect(o.soonestExpiry).toBe('2026-06-20');
    expect(o.soonestDays).toBe(7);
  });

  it('期限つきが無ければ soonest は null', () => {
    const o = overview([item({ expiry: '' })], TODAY);
    expect(o.soonestExpiry).toBeNull();
    expect(o.soonestDays).toBeNull();
  });

  it('空の台帳でも壊れない', () => {
    const o = overview([], TODAY);
    expect(o.total).toBe(0);
    expect(o.attention).toBe(0);
    expect(o.soonestDays).toBeNull();
  });
});
