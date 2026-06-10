// 台帳の要約。状態ごとの件数と「次に切れる期限」を出し、
// 画面上部の概況とアクセシブルな読み上げに使う。「今日」を引数に取る純粋関数。

import { daysBetween, itemStatus, needsAttention, type ItemStatus } from './expiry';
import type { StockItem } from './stock';

export interface Overview {
  total: number;
  /** 期限切れ・期限間近・要点検の合計 */
  attention: number;
  counts: Record<ItemStatus, number>;
  /** 次に期限が来る品の期限(YYYY-MM-DD)。期限つきの品がなければ null */
  soonestExpiry: string | null;
  /** その品名 */
  soonestName: string | null;
  /** その残り日数。負なら超過 */
  soonestDays: number | null;
}

export function overview(items: StockItem[], today: string): Overview {
  const counts: Record<ItemStatus, number> = {
    expired: 0,
    expiring: 0,
    ok: 0,
    'check-due': 0,
    checked: 0,
  };
  let attention = 0;
  let soonest: StockItem | null = null;
  let soonestDays: number | null = null;

  for (const item of items) {
    const status = itemStatus(item, today);
    counts[status] += 1;
    if (needsAttention(status)) attention += 1;
    if (item.expiry !== '') {
      const left = daysBetween(today, item.expiry);
      if (left !== null && (soonestDays === null || left < soonestDays)) {
        soonest = item;
        soonestDays = left;
      }
    }
  }

  return {
    total: items.length,
    attention,
    counts,
    soonestExpiry: soonest?.expiry ?? null,
    soonestName: soonest?.name ?? null,
    soonestDays,
  };
}
