import { describe, expect, it } from 'vitest';
import { restockMarkdown } from './restock';
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
const HOUSEHOLD = { people: 2, days: 3 };

describe('restockMarkdown', () => {
  it('要対応の品目と不足分をチェックボックス付きで並べる', () => {
    const items = [
      item({ name: '缶詰', expiry: '2026-06-01', quantity: 6, unit: '食' }),
      item({ name: '救急セット', checkedAt: '2025-06-01', unit: '式' }),
      item({ name: '水', category: 'water', quantity: 6, unit: 'L', expiry: '2027-01-01' }),
    ];
    const md = restockMarkdown(items, HOUSEHOLD, TODAY);
    expect(md).toContain('# 買い足しリスト');
    expect(md).toContain('- [ ] 缶詰 6食(期限切れ・12日超過)');
    expect(md).toContain('- [ ] 救急セット 1式(要点検・点検から377日)');
    expect(md).toContain('- [ ] 飲料水 あと12L(目標18L)');
    expect(md).toContain('- [ ] 非常食 あと18食(目標18食)');
  });

  it('期限内の品目は載せない', () => {
    const items = [item({ name: '余裕の缶詰', expiry: '2027-06-13' })];
    expect(restockMarkdown(items, HOUSEHOLD, TODAY)).not.toContain('余裕の缶詰');
  });

  it('すべて満たしていれば不要と書く', () => {
    const items = [
      item({ name: '水', category: 'water', quantity: 18, unit: 'L', expiry: '2027-01-01' }),
      item({ name: '米', category: 'food', quantity: 18, unit: '食', expiry: '2027-01-01' }),
    ];
    expect(restockMarkdown(items, HOUSEHOLD, TODAY)).toContain('買い足しは不要です。');
  });
});
