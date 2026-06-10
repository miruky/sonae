// テーマ(自動・ライト・ダーク)の解決。描画前に確定させてFOUCを防ぐため、
// 解決ロジックは副作用のない関数にして index.html の先頭スクリプトとUIの両方から使う。

export type Theme = 'auto' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

const ORDER: Theme[] = ['auto', 'light', 'dark'];

export const THEME_LABELS: Record<Theme, string> = {
  auto: '自動',
  light: 'ライト',
  dark: 'ダーク',
};

export function isTheme(value: unknown): value is Theme {
  return value === 'auto' || value === 'light' || value === 'dark';
}

/** 自動はOSの設定に従う。明示指定はそのまま採用する */
export function resolveTheme(theme: Theme, prefersDark: boolean): ResolvedTheme {
  if (theme === 'auto') return prefersDark ? 'dark' : 'light';
  return theme;
}

/** 自動 → ライト → ダーク → 自動 と巡回する */
export function nextTheme(theme: Theme): Theme {
  return ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length] ?? 'auto';
}

const STORAGE_KEY = 'sonae.theme.v1';

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function loadTheme(storage: StorageLike): Theme {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    return isTheme(raw) ? raw : 'auto';
  } catch {
    return 'auto';
  }
}

export function saveTheme(storage: StorageLike, theme: Theme): void {
  try {
    storage.setItem(STORAGE_KEY, theme);
  } catch {
    // ストレージが使えない環境では永続化を諦め、その回のセッションだけ適用する
  }
}
