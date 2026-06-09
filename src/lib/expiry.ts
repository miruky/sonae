// 賞味期限と点検時期の判定。日付はすべてYYYY-MM-DDの文字列で受け取り、
// 「今日」を引数に取る純粋関数にしてテストしやすくする。

import type { StockItem } from './stock';

/** 期限が近いとみなす残り日数 */
export const EXPIRING_DAYS = 30;
/** 期限のない用具の点検間隔(日) */
export const CHECK_INTERVAL_DAYS = 180;

export type ItemStatus = 'expired' | 'expiring' | 'ok' | 'check-due' | 'checked';

export const STATUS_LABELS: Record<ItemStatus, string> = {
  expired: '期限切れ',
  expiring: '期限間近',
  ok: '期限内',
  'check-due': '要点検',
  checked: '点検済み',
};

export function todayISO(now: number): string {
  const d = new Date(now);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function toUTC(iso: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const [, y, mo, d] = m;
  return Date.UTC(Number(y), Number(mo) - 1, Number(d));
}

/** fromからtoまでの日数。toが過去なら負 */
export function daysBetween(fromISO: string, toISO: string): number | null {
  const from = toUTC(fromISO);
  const to = toUTC(toISO);
  if (from === null || to === null) return null;
  return Math.round((to - from) / (24 * 60 * 60 * 1000));
}

/**
 * 品目の状態。期限のあるものは期限で、ないものは最終点検日からの
 * 経過で判定する。
 */
export function itemStatus(item: StockItem, today: string): ItemStatus {
  if (item.expiry !== '') {
    const left = daysBetween(today, item.expiry);
    if (left === null) return 'ok';
    if (left < 0) return 'expired';
    if (left <= EXPIRING_DAYS) return 'expiring';
    return 'ok';
  }
  const since = daysBetween(item.checkedAt, today);
  if (since !== null && since >= CHECK_INTERVAL_DAYS) return 'check-due';
  return 'checked';
}

/** 状態の説明文。「あと12日」「点検から200日」のような補足を作る */
export function statusDetail(item: StockItem, today: string): string {
  if (item.expiry !== '') {
    const left = daysBetween(today, item.expiry);
    if (left === null) return '';
    if (left < 0) return `${-left}日超過`;
    if (left === 0) return '今日まで';
    return `あと${left}日`;
  }
  const since = daysBetween(item.checkedAt, today);
  if (since === null) return '';
  return `点検から${since}日`;
}

/** 対応が必要な状態かどうか。買い足しリストとバッジ数に使う */
export function needsAttention(status: ItemStatus): boolean {
  return status === 'expired' || status === 'expiring' || status === 'check-due';
}

const URGENCY: Record<ItemStatus, number> = {
  expired: 0,
  expiring: 1,
  'check-due': 2,
  ok: 3,
  checked: 4,
};

/** 急ぐものから並べる。同じ状態の中では期限の近い順、入力順 */
export function sortByUrgency(items: StockItem[], today: string): StockItem[] {
  const keyed = items.map((item, index) => ({
    item,
    index,
    urgency: URGENCY[itemStatus(item, today)],
    left: item.expiry !== '' ? (daysBetween(today, item.expiry) ?? 0) : 0,
  }));
  keyed.sort((a, b) => a.urgency - b.urgency || a.left - b.left || a.index - b.index);
  return keyed.map((k) => k.item);
}

/** 「2026-06-13」を「2026年6月13日」にする。不正な形はそのまま返す */
export function formatDateJa(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const [, y, mo, d] = m;
  return `${Number(y)}年${Number(mo)}月${Number(d)}日`;
}
