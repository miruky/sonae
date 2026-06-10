// 備蓄品の型・検証・永続化。世帯設定と品目一覧を1つのデータとして持つ。

export type Category = 'water' | 'food' | 'medical' | 'power' | 'daily' | 'gear';

export const CATEGORY_LABELS: Record<Category, string> = {
  water: '水',
  food: '食料',
  medical: '医療・衛生',
  power: '電源・灯り',
  daily: '生活用品',
  gear: '避難用具',
};

export interface StockItem {
  id: string;
  name: string;
  category: Category;
  quantity: number;
  /** 「L」「食」「個」「本」のような自由な単位 */
  unit: string;
  /** 賞味期限(YYYY-MM-DD)。期限のない用具は空文字 */
  expiry: string;
  /** 最終点検日(YYYY-MM-DD)。登録時と「点検した」で更新する */
  checkedAt: string;
}

export interface Household {
  /** 何人分を備えるか */
  people: number;
  /** 何日分を備えるか */
  days: number;
}

export interface SonaeData {
  household: Household;
  items: StockItem[];
}

export const MAX_PEOPLE = 20;
export const MAX_DAYS = 30;

export function newItemId(): string {
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function emptyData(): SonaeData {
  return { household: { people: 2, days: 3 }, items: [] };
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isItem(value: unknown): value is StockItem {
  if (typeof value !== 'object' || value === null) return false;
  const i = value as Record<string, unknown>;
  return (
    typeof i.id === 'string' &&
    typeof i.name === 'string' &&
    i.name !== '' &&
    typeof i.category === 'string' &&
    i.category in CATEGORY_LABELS &&
    typeof i.quantity === 'number' &&
    Number.isFinite(i.quantity) &&
    i.quantity >= 0 &&
    typeof i.unit === 'string' &&
    typeof i.expiry === 'string' &&
    (i.expiry === '' || DATE_RE.test(i.expiry)) &&
    typeof i.checkedAt === 'string' &&
    DATE_RE.test(i.checkedAt)
  );
}

function isHousehold(value: unknown): value is Household {
  if (typeof value !== 'object' || value === null) return false;
  const h = value as Record<string, unknown>;
  return (
    typeof h.people === 'number' &&
    Number.isInteger(h.people) &&
    h.people >= 1 &&
    h.people <= MAX_PEOPLE &&
    typeof h.days === 'number' &&
    Number.isInteger(h.days) &&
    h.days >= 1 &&
    h.days <= MAX_DAYS
  );
}

/**
 * JSON文字列から復元する。世帯設定が壊れていれば既定値に戻し、
 * 品目は形の崩れた要素だけを読み飛ばす。
 */
export function deserializeData(json: string): SonaeData | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
  const d = parsed as Record<string, unknown>;
  const household = isHousehold(d.household) ? d.household : emptyData().household;
  const items = Array.isArray(d.items) ? d.items.filter(isItem) : [];
  return { household, items };
}

export function serializeData(data: SonaeData): string {
  return JSON.stringify(data, null, 2);
}

/**
 * 取り込んだデータを現在の台帳に統合する。品目はidで突き合わせ、
 * 同じidは取り込み側で上書きする。これで別端末の書き出しを読み込んでも
 * 手元の品目を失わない。世帯設定は取り込み側を採用する。
 */
export function mergeData(current: SonaeData, incoming: SonaeData): SonaeData {
  const byId = new Map(current.items.map((item) => [item.id, item]));
  for (const item of incoming.items) byId.set(item.id, item);
  return { household: incoming.household, items: [...byId.values()] };
}

export interface SonaeStore {
  load(): SonaeData | null;
  save(data: SonaeData): void;
}

const STORAGE_KEY = 'sonae.data.v1';

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function createStore(storage: StorageLike): SonaeStore {
  return {
    load() {
      const raw = storage.getItem(STORAGE_KEY);
      return raw === null ? null : deserializeData(raw);
    },
    save(data) {
      storage.setItem(STORAGE_KEY, serializeData(data));
    },
  };
}
