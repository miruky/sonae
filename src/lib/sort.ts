// 備蓄品の並べ替え。既定は「急ぐ順」だが、点検や棚卸しのために
// 期限・品名・カテゴリでも並べ替えられるようにする。すべて純粋関数。

import { daysBetween, sortByUrgency } from './expiry';
import { CATEGORY_LABELS, type Category, type StockItem } from './stock';

export type SortMode = 'urgency' | 'expiry' | 'name' | 'category';

export const SORT_LABELS: Record<SortMode, string> = {
  urgency: '急ぐ順',
  expiry: '期限の近い順',
  name: '品名順',
  category: 'カテゴリ順',
};

export function isSortMode(value: unknown): value is SortMode {
  return value === 'urgency' || value === 'expiry' || value === 'name' || value === 'category';
}

const CATEGORY_ORDER = Object.keys(CATEGORY_LABELS) as Category[];

/** 期限の残り日数。期限なしの用具は末尾へ送るため非常に大きな値にする */
function expiryRank(item: StockItem, today: string): number {
  if (item.expiry === '') return Number.MAX_SAFE_INTEGER;
  return daysBetween(today, item.expiry) ?? Number.MAX_SAFE_INTEGER;
}

export function sortItems(items: StockItem[], mode: SortMode, today: string): StockItem[] {
  if (mode === 'urgency') return sortByUrgency(items, today);
  const keyed = items.map((item, index) => ({ item, index }));
  keyed.sort((a, b) => {
    if (mode === 'expiry') {
      const diff = expiryRank(a.item, today) - expiryRank(b.item, today);
      if (diff !== 0) return diff;
    } else if (mode === 'name') {
      const diff = a.item.name.localeCompare(b.item.name, 'ja');
      if (diff !== 0) return diff;
    } else {
      const diff =
        CATEGORY_ORDER.indexOf(a.item.category) - CATEGORY_ORDER.indexOf(b.item.category);
      if (diff !== 0) return diff;
      const byName = a.item.name.localeCompare(b.item.name, 'ja');
      if (byName !== 0) return byName;
    }
    return a.index - b.index;
  });
  return keyed.map((k) => k.item);
}
