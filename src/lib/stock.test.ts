import { describe, expect, it } from 'vitest';
import { seedData } from './seed';
import { createStore, deserializeData, emptyData, serializeData } from './stock';

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
