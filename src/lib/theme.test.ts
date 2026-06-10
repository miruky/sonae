import { describe, expect, it } from 'vitest';
import { isTheme, loadTheme, nextTheme, resolveTheme, saveTheme } from './theme';

describe('resolveTheme', () => {
  it('自動はOSの設定に従う', () => {
    expect(resolveTheme('auto', true)).toBe('dark');
    expect(resolveTheme('auto', false)).toBe('light');
  });

  it('明示指定はOSを無視する', () => {
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });
});

describe('nextTheme', () => {
  it('自動→ライト→ダーク→自動と巡回する', () => {
    expect(nextTheme('auto')).toBe('light');
    expect(nextTheme('light')).toBe('dark');
    expect(nextTheme('dark')).toBe('auto');
  });
});

describe('isTheme', () => {
  it('正しい値だけを受け付ける', () => {
    expect(isTheme('auto')).toBe(true);
    expect(isTheme('night')).toBe(false);
    expect(isTheme(null)).toBe(false);
  });
});

describe('loadTheme / saveTheme', () => {
  function memoryStorage(): {
    getItem(k: string): string | null;
    setItem(k: string, v: string): void;
  } {
    const map = new Map<string, string>();
    return { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v) };
  }

  it('保存した値を読み戻す', () => {
    const s = memoryStorage();
    expect(loadTheme(s)).toBe('auto');
    saveTheme(s, 'dark');
    expect(loadTheme(s)).toBe('dark');
  });

  it('壊れた値は自動に倒す', () => {
    const s = memoryStorage();
    s.setItem('sonae.theme.v1', 'sepia');
    expect(loadTheme(s)).toBe('auto');
  });
});
