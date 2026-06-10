import { describe, expect, it } from 'vitest';
import { seedData } from './seed';
import { createStore, deserializeData, emptyData, mergeData, serializeData } from './stock';
import type { SonaeData, StockItem } from './stock';

describe('deserializeData', () => {
  it('seedDataと往復できる', () => {
    const data = seedData(Date.UTC(2026, 5, 13));
    expect(deserializeData(serializeData(data))).toEqual(data);
  });

  it('壊れたJSONはnull', () => {
    expect(deserializeData('{')).toBeNull();
    expect(deserializeData('null')).toBeNull();
    expect(deserializeData('[1,2]')).toBeNull();
  });

  it('形の崩れた品目だけを読み飛ばす', () => {
    const data = seedData(Date.UTC(2026, 5, 13));
    const json = JSON.stringify({
      household: data.household,
      items: [...data.items, { name: '名前だけ' }, { ...data.items[0], quantity: -1 }],
    });
    expect(deserializeData(json)?.items).toEqual(data.items);
  });

  it('世帯設定が壊れていれば既定値に戻す', () => {
    const json = JSON.stringify({ household: { people: 0, days: 999 }, items: [] });
    expect(deserializeData(json)?.household).toEqual(emptyData().household);
  });

  it('期限の形式が崩れた品目は受け付けない', () => {
    const base = seedData(Date.UTC(2026, 5, 13)).items[0];
    const json = JSON.stringify({
      household: emptyData().household,
      items: [{ ...base, expiry: '来年まで' }],
    });
    expect(deserializeData(json)?.items).toEqual([]);
  });
});

describe('createStore', () => {
  function memoryStorage(): {
    getItem(k: string): string | null;
    setItem(k: string, v: string): void;
  } {
    const map = new Map<string, string>();
    return {
      getItem: (k) => map.get(k) ?? null,
      setItem: (k, v) => void map.set(k, v),
    };
  }

  it('保存して読み戻せる', () => {
    const store = createStore(memoryStorage());
    expect(store.load()).toBeNull();
    const data = seedData(Date.UTC(2026, 5, 13));
    store.save(data);
    expect(store.load()).toEqual(data);
  });
});

describe('mergeData', () => {
  const water: StockItem = {
    id: 'a',
    name: '水',
    category: 'water',
    quantity: 12,
    unit: 'L',
    expiry: '',
    checkedAt: '2026-06-01',
  };
  const can: StockItem = {
    id: 'b',
    name: '缶詰',
    category: 'food',
    quantity: 6,
    unit: '食',
    expiry: '',
    checkedAt: '2026-06-01',
  };
  const base: SonaeData = { household: { people: 2, days: 3 }, items: [water, can] };

  it('同じidは取り込み側で上書きする', () => {
    const incoming: SonaeData = {
      household: { people: 4, days: 7 },
      items: [{ ...water, quantity: 24 }],
    };
    const merged = mergeData(base, incoming);
    expect(merged.household).toEqual({ people: 4, days: 7 });
    expect(merged.items.find((i) => i.id === 'a')?.quantity).toBe(24);
    expect(merged.items).toHaveLength(2);
  });

  it('新しいidは追加し、手元の品目は残す', () => {
    const battery: StockItem = {
      id: 'c',
      name: '電池',
      category: 'power',
      quantity: 8,
      unit: '本',
      expiry: '',
      checkedAt: '2026-06-01',
    };
    const incoming: SonaeData = { household: base.household, items: [battery] };
    const merged = mergeData(base, incoming);
    expect(merged.items.map((i) => i.id).sort()).toEqual(['a', 'b', 'c']);
  });
});
