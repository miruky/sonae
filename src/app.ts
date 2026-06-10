// 画面の描画。1画面構成で、状態が変わるたびに全体を描き直す。
// テキスト入力はchangeイベント(確定時)で反映するので、再描画で入力が途切れない。
// 品目はidで識別し、表示順(並べ替え)とデータの保持順を切り離している。

import {
  CATEGORY_LABELS,
  MAX_DAYS,
  MAX_PEOPLE,
  mergeData,
  newItemId,
  deserializeData,
  serializeData,
  type Category,
  type SonaeData,
  type SonaeStore,
  type StockItem,
} from './lib/stock';
import {
  formatDateJa,
  itemStatus,
  needsAttention,
  sortByUrgency,
  statusDetail,
  STATUS_LABELS,
  todayISO,
} from './lib/expiry';
import { foodCoverage, waterCoverage, type Coverage } from './lib/target';
import { restockMarkdown } from './lib/restock';
import { overview } from './lib/overview';
import { isSortMode, SORT_LABELS, sortItems, type SortMode } from './lib/sort';
import { loadTheme, nextTheme, saveTheme, THEME_LABELS, type Theme } from './lib/theme';
import { icons } from './icons';

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function esc(text: string): string {
  return text.replace(/[&<>"']/g, (ch) => ESCAPES[ch] ?? ch);
}

function reducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function categoryOptions(selected: Category): string {
  return (Object.keys(CATEGORY_LABELS) as Category[])
    .map(
      (c) =>
        `<option value="${c}" ${c === selected ? 'selected' : ''}>${CATEGORY_LABELS[c]}</option>`,
    )
    .join('');
}

const THEME_ICON: Record<Theme, string> = {
  auto: icons.auto,
  light: icons.sun,
  dark: icons.moon,
};

export interface AppDeps {
  root: HTMLElement;
  store: SonaeStore;
  initialData: SonaeData;
  now: number;
  /** テーマの永続化先。既定は localStorage */
  themeStorage?: Pick<Storage, 'getItem' | 'setItem'>;
}

export function createApp({ root, store, initialData, now, themeStorage }: AppDeps): void {
  const today = todayISO(now);
  const data = initialData;
  data.items = sortByUrgency(data.items, today);
  const persistTheme = themeStorage ?? localStorage;

  let filterCategory: Category | 'all' = 'all';
  let attentionOnly = false;
  let sortMode: SortMode = 'urgency';
  let theme: Theme = loadTheme(persistTheme);
  let copied = false;
  let notice = '';
  let lastDeleted: StockItem | null = null;
  let undoTimer = 0;
  let firstRender = true;

  document.documentElement.classList.add('has-js');
  applyTheme();

  function applyTheme(): void {
    if (theme === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', theme);
  }

  function commit(): void {
    data.items = sortByUrgency(data.items, today);
    store.save(data);
    render();
  }

  function flash(message: string): void {
    notice = message;
    render();
    window.setTimeout(() => {
      if (notice === message) {
        notice = '';
        render();
      }
    }, 2600);
  }

  function findItem(id: string): StockItem | undefined {
    return data.items.find((i) => i.id === id);
  }

  // ---- 部品 ----

  function header(): string {
    const count = data.items.filter((i) => needsAttention(itemStatus(i, today))).length;
    return `
      <header class="masthead">
        <div class="masthead-bar">
          <span class="brand">${icons.logo}<span>sonae</span></span>
          <div class="toolbar">
            <button type="button" class="ghost-button" id="theme-toggle"
              aria-label="テーマを切り替える(現在: ${THEME_LABELS[theme]})" title="テーマ: ${THEME_LABELS[theme]}">
              ${THEME_ICON[theme]}<span>${THEME_LABELS[theme]}</span></button>
            <button type="button" class="ghost-button" id="export-data" title="台帳をJSONで書き出す">
              ${icons.download}<span class="on-wide">書き出し</span></button>
            <button type="button" class="ghost-button" id="import-data" title="JSONを読み込んで統合する">
              ${icons.upload}<span class="on-wide">読み込み</span></button>
            <input type="file" id="import-file" accept="application/json,.json" hidden />
          </div>
        </div>
        <div class="masthead-hero">
          <div class="masthead-media">
            <img src="https://picsum.photos/seed/sonae-stock/1600/900?grayscale" alt=""
              width="1600" height="900" loading="lazy" decoding="async" />
          </div>
          <div class="masthead-copy">
            <p class="kicker">防災備蓄の台帳</p>
            <h1>備えの鮮度と量を、<br />ひと目で確かめる。</h1>
            <p class="lead">水や非常食の賞味期限、用具の点検時期、世帯人数に対する不足。
              三つを一つの台帳でまとめて見張り、足りない分は買い足しリストにします。</p>
            <p class="masthead-status">
              ${
                count > 0
                  ? `<span class="pill pill-alert">要対応 ${count}件</span>`
                  : `<span class="pill pill-ok">要対応なし</span>`
              }
              <span class="store-note">データはこの端末にだけ保存されます</span>
            </p>
          </div>
        </div>
        <p class="status-line" role="status" aria-live="polite">${esc(notice)}</p>
      </header>`;
  }

  function statBlock(label: string, value: number, suffix: string, sub: string): string {
    return `
      <div class="stat">
        <span class="stat-label">${label}</span>
        <span class="stat-value"><span data-count="${value}" data-suffix="${suffix}">${value}${suffix}</span></span>
        <span class="stat-sub">${sub}</span>
      </div>`;
  }

  function overviewSection(rev: string): string {
    const o = overview(data.items, today);
    let soonest = '期限つきの品なし';
    if (o.soonestDays !== null && o.soonestName) {
      const when =
        o.soonestDays < 0
          ? `${-o.soonestDays}日超過`
          : o.soonestDays === 0
            ? '今日まで'
            : `あと${o.soonestDays}日`;
      soonest = `${esc(o.soonestName)} ・ ${when}`;
    }
    return `
      <section class="block overview${rev}" aria-labelledby="ov-h">
        <p class="kicker">概況</p>
        <h2 id="ov-h" class="block-title">いまの備え</h2>
        <div class="stats">
          ${statBlock('登録品目', o.total, '', '台帳にある全品')}
          ${statBlock('要対応', o.attention, '', '期限切れ・間近・要点検')}
          <div class="stat stat-wide">
            <span class="stat-label">次に切れる</span>
            <span class="stat-value stat-text">${soonest}</span>
            <span class="stat-sub">最も期限の近い品</span>
          </div>
        </div>
      </section>`;
  }

  function bar(label: string, unit: string, c: Coverage): string {
    const width = firstRender ? 0 : c.percent;
    return `
      <div class="coverage">
        <div class="coverage-head">
          <span class="coverage-label">${label}</span>
          <span class="coverage-value"><strong>${c.current}</strong> / ${c.target}${unit}
            <span class="coverage-percent" data-count="${c.percent}" data-suffix="%">${c.percent}%</span></span>
        </div>
        <div class="coverage-track" role="img" aria-label="${label}の充足率${c.percent}%">
          <div class="coverage-fill ${c.percent >= 100 ? 'full' : ''}" data-fill="${c.percent}" style="width:${width}%"></div>
        </div>
      </div>`;
  }

  function targetSection(rev: string): string {
    const usable = data.items.filter((i) => itemStatus(i, today) !== 'expired');
    return `
      <section class="block${rev}" aria-labelledby="tg-h">
        <p class="kicker">備えの充足</p>
        <h2 id="tg-h" class="block-title">世帯の目標に対する量</h2>
        <p class="hint">飲料水は1人1日3L、食料は1人1日3食を目安に計算します。期限切れの品は充足に数えません。</p>
        <div class="household">
          <label class="field"><span>人数</span>
            <input id="people" type="number" inputmode="numeric" min="1" max="${MAX_PEOPLE}" value="${data.household.people}" /></label>
          <label class="field"><span>日数</span>
            <input id="days" type="number" inputmode="numeric" min="1" max="${MAX_DAYS}" value="${data.household.days}" /></label>
        </div>
        ${bar('飲料水', 'L', waterCoverage(usable, data.household))}
        ${bar('食料', '食', foodCoverage(usable, data.household))}
        <div class="list-actions">
          <button type="button" class="button button-accent" id="copy-restock">
            ${copied ? icons.check : icons.copy}<span>${copied ? 'コピーしました' : '買い足しリストをコピー'}</span></button>
          <button type="button" class="button" id="download-restock">
            ${icons.download}<span>Markdownで保存</span></button>
        </div>
      </section>`;
  }

  function itemRow(item: StockItem, index: number): string {
    const status = itemStatus(item, today);
    const detail = statusDetail(item, today);
    const id = item.id;
    return `
      <li class="item-row status-${status}" style="--i:${index}">
        <input class="item-name" data-item="${esc(id)}:name"
          value="${esc(item.name)}" aria-label="品名" />
        <select data-item="${esc(id)}:category" aria-label="カテゴリ">
          ${categoryOptions(item.category)}
        </select>
        <input class="item-quantity" data-item="${esc(id)}:quantity"
          type="number" inputmode="decimal" min="0" step="any" value="${item.quantity}" aria-label="数量" />
        <input class="item-unit" data-item="${esc(id)}:unit"
          value="${esc(item.unit)}" aria-label="単位" />
        <input class="item-expiry" data-item="${esc(id)}:expiry"
          type="date" value="${esc(item.expiry)}" aria-label="賞味期限" />
        <span class="status-badge" title="${item.expiry === '' ? `最終点検 ${formatDateJa(item.checkedAt)}` : `期限 ${formatDateJa(item.expiry)}`}">
          ${STATUS_LABELS[status]}${detail ? `<small>${detail}</small>` : ''}</span>
        <div class="row-actions">
          ${
            item.expiry === ''
              ? `<button type="button" class="icon-button ok" data-check="${esc(id)}"
                  aria-label="${esc(item.name)}を点検済みにする" title="点検した">${icons.recheck}</button>`
              : ''
          }
          <button type="button" class="icon-button" data-del="${esc(id)}"
            aria-label="${esc(item.name)}を削除">${icons.trash}</button>
        </div>
      </li>`;
  }

  function undoBar(): string {
    if (!lastDeleted) return '';
    return `
      <div class="undo-bar" role="status">
        <span>「${esc(lastDeleted.name)}」を削除しました</span>
        <button type="button" class="link-button" id="undo-delete">${icons.undo}<span>元に戻す</span></button>
      </div>`;
  }

  function itemsSection(rev: string): string {
    const visible = sortItems(data.items, sortMode, today)
      .filter((item) => filterCategory === 'all' || item.category === filterCategory)
      .filter((item) => !attentionOnly || needsAttention(itemStatus(item, today)));
    const rows = visible.map((item, i) => itemRow(item, i)).join('');
    const empty =
      data.items.length === 0
        ? '<p class="empty">備蓄品がまだありません。下の行から追加してください。</p>'
        : visible.length === 0
          ? '<p class="empty">条件に当てはまる品目がありません。</p>'
          : '';
    return `
      <section class="block${rev}" aria-labelledby="it-h">
        <div class="block-head">
          <div>
            <p class="kicker">在庫</p>
            <h2 id="it-h" class="block-title">備蓄品</h2>
          </div>
          <div class="controls">
            <label class="control"><span class="control-label">並び</span>
              <select id="sort-mode">
                ${(Object.keys(SORT_LABELS) as SortMode[])
                  .map(
                    (m) =>
                      `<option value="${m}" ${sortMode === m ? 'selected' : ''}>${SORT_LABELS[m]}</option>`,
                  )
                  .join('')}
              </select></label>
            <label class="control"><span class="control-label">分類</span>
              <select id="filter-category">
                <option value="all" ${filterCategory === 'all' ? 'selected' : ''}>すべて</option>
                ${(Object.keys(CATEGORY_LABELS) as Category[])
                  .map(
                    (c) =>
                      `<option value="${c}" ${filterCategory === c ? 'selected' : ''}>${CATEGORY_LABELS[c]}</option>`,
                  )
                  .join('')}
              </select></label>
            <label class="attention-filter">
              <input type="checkbox" id="filter-attention" ${attentionOnly ? 'checked' : ''} />
              <span>要対応のみ</span>
            </label>
          </div>
        </div>
        ${empty || `<ul class="items">${rows}</ul>`}
        ${undoBar()}
        <form class="item-add" id="add-form">
          <input name="name" id="add-name" placeholder="品名(例: 飲料水 2L×6本)" required aria-label="品名" />
          <select name="category" id="add-category" aria-label="カテゴリ">${categoryOptions('food')}</select>
          <input name="quantity" id="add-quantity" type="number" inputmode="decimal" min="0" step="any" placeholder="数量" required aria-label="数量" />
          <input name="unit" id="add-unit" placeholder="単位" aria-label="単位" />
          <input name="expiry" id="add-expiry" type="date" aria-label="賞味期限(なければ空)" />
          <button type="submit" class="icon-button accent" id="add-submit" aria-label="備蓄品を追加">${icons.plus}</button>
        </form>
        <p class="hint">賞味期限を空にした品は「点検」で管理します。点検から180日で要点検になります。
          キーボード <kbd>N</kbd> で追加欄へ、<kbd>T</kbd> でテーマ切替。</p>
      </section>`;
  }

  // ---- イベント ----

  function focusAdd(): void {
    const el = root.querySelector<HTMLInputElement>('#add-name');
    el?.scrollIntoView({ block: 'center', behavior: reducedMotion() ? 'auto' : 'smooth' });
    el?.focus();
  }

  function cycleTheme(): void {
    theme = nextTheme(theme);
    saveTheme(persistTheme, theme);
    applyTheme();
    render();
  }

  function removeItem(id: string): void {
    const idx = data.items.findIndex((i) => i.id === id);
    if (idx < 0) return;
    const [removed] = data.items.splice(idx, 1);
    lastDeleted = removed ?? null;
    window.clearTimeout(undoTimer);
    undoTimer = window.setTimeout(() => {
      lastDeleted = null;
      render();
    }, 7000);
    commit();
  }

  function undoDelete(): void {
    if (!lastDeleted) return;
    data.items.push(lastDeleted);
    lastDeleted = null;
    window.clearTimeout(undoTimer);
    commit();
  }

  function exportData(): void {
    const url = URL.createObjectURL(new Blob([serializeData(data)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sonae-backup.json';
    a.click();
    URL.revokeObjectURL(url);
    flash('台帳をJSONに書き出しました');
  }

  function importData(file: File): void {
    const reader = new FileReader();
    reader.onload = () => {
      const incoming = deserializeData(String(reader.result ?? ''));
      if (!incoming) {
        flash('JSONを読み込めませんでした');
        return;
      }
      const before = data.items.length;
      const merged = mergeData(data, incoming);
      data.household = merged.household;
      data.items = merged.items;
      commit();
      flash(`読み込みました(${data.items.length - before}件追加 / 計${data.items.length}件)`);
    };
    reader.onerror = () => flash('ファイルを読み込めませんでした');
    reader.readAsText(file);
  }

  function bindEvents(): void {
    root.querySelector('#theme-toggle')?.addEventListener('click', cycleTheme);
    root.querySelector('#export-data')?.addEventListener('click', exportData);
    const fileInput = root.querySelector<HTMLInputElement>('#import-file');
    root.querySelector('#import-data')?.addEventListener('click', () => fileInput?.click());
    fileInput?.addEventListener('change', () => {
      const file = fileInput.files?.[0];
      if (file) importData(file);
      fileInput.value = '';
    });

    root.querySelector<HTMLInputElement>('#people')?.addEventListener('change', (e) => {
      const value = Number((e.target as HTMLInputElement).value);
      if (Number.isInteger(value) && value >= 1 && value <= MAX_PEOPLE)
        data.household.people = value;
      commit();
    });
    root.querySelector<HTMLInputElement>('#days')?.addEventListener('change', (e) => {
      const value = Number((e.target as HTMLInputElement).value);
      if (Number.isInteger(value) && value >= 1 && value <= MAX_DAYS) data.household.days = value;
      commit();
    });

    root.querySelector('#sort-mode')?.addEventListener('change', (e) => {
      const value = (e.target as HTMLSelectElement).value;
      if (isSortMode(value)) sortMode = value;
      render();
    });
    root.querySelector('#filter-category')?.addEventListener('change', (e) => {
      filterCategory = (e.target as HTMLSelectElement).value as Category | 'all';
      render();
    });
    root.querySelector('#filter-attention')?.addEventListener('change', (e) => {
      attentionOnly = (e.target as HTMLInputElement).checked;
      render();
    });

    for (const el of root.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-item]')) {
      el.addEventListener('change', () => {
        const parts = (el.dataset.item ?? '').split(':');
        const id = parts[0] ?? '';
        const field = parts[1] ?? '';
        const item = findItem(id);
        if (!item) return;
        if (field === 'name') {
          if (el.value.trim() !== '') item.name = el.value.trim();
        } else if (field === 'category') {
          item.category = el.value as Category;
        } else if (field === 'quantity') {
          const q = Number(el.value);
          if (Number.isFinite(q) && q >= 0) item.quantity = q;
        } else if (field === 'unit') {
          item.unit = el.value.trim();
        } else if (field === 'expiry') {
          item.expiry = el.value;
        }
        commit();
      });
    }

    for (const el of root.querySelectorAll<HTMLElement>('[data-check]')) {
      el.addEventListener('click', () => {
        const item = findItem(el.dataset.check ?? '');
        if (!item) return;
        item.checkedAt = today;
        commit();
      });
    }
    for (const el of root.querySelectorAll<HTMLElement>('[data-del]')) {
      el.addEventListener('click', () => removeItem(el.dataset.del ?? ''));
    }
    root.querySelector('#undo-delete')?.addEventListener('click', undoDelete);

    root.querySelector<HTMLFormElement>('#add-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const form = e.currentTarget as HTMLFormElement;
      const fd = new FormData(form);
      const read = (key: string): string => String(fd.get(key) ?? '').trim();
      const name = read('name');
      const quantity = Number(read('quantity'));
      if (name === '' || !Number.isFinite(quantity) || quantity < 0) return;
      data.items.push({
        id: newItemId(),
        name,
        category: (read('category') || 'food') as Category,
        quantity,
        unit: read('unit') || '個',
        expiry: read('expiry'),
        checkedAt: today,
      });
      commit();
      focusAdd();
    });

    const markdown = (): string => restockMarkdown(data.items, data.household, today);
    root.querySelector('#copy-restock')?.addEventListener('click', () => {
      void navigator.clipboard.writeText(markdown()).then(() => {
        copied = true;
        render();
        window.setTimeout(() => {
          copied = false;
          render();
        }, 2000);
      });
    });
    root.querySelector('#download-restock')?.addEventListener('click', () => {
      const url = URL.createObjectURL(new Blob([markdown()], { type: 'text/markdown' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'kaitashi-list.md';
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  // ---- 入場演出(初回描画のみ) ----

  function animateCount(el: HTMLElement, to: number, suffix: string): void {
    if (reducedMotion() || typeof requestAnimationFrame !== 'function') {
      el.textContent = `${to}${suffix}`;
      return;
    }
    const start = performance.now();
    const duration = 700;
    const step = (t: number): void => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = `${Math.round(to * eased)}${suffix}`;
      if (p < 1) requestAnimationFrame(step);
    };
    el.textContent = `0${suffix}`;
    requestAnimationFrame(step);
  }

  function playEntrance(): void {
    for (const el of root.querySelectorAll<HTMLElement>('[data-count]')) {
      animateCount(el, Number(el.dataset.count), el.dataset.suffix ?? '');
    }
    const fills = root.querySelectorAll<HTMLElement>('.coverage-fill');
    if (reducedMotion()) {
      fills.forEach((el) => (el.style.width = `${el.dataset.fill}%`));
    } else {
      requestAnimationFrame(() => fills.forEach((el) => (el.style.width = `${el.dataset.fill}%`)));
    }
    const targets = root.querySelectorAll<HTMLElement>('.reveal');
    if (reducedMotion() || typeof IntersectionObserver !== 'function') {
      targets.forEach((el) => el.classList.add('is-revealed'));
      return;
    }
    const io = new IntersectionObserver(
      (entries, obs) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            obs.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12 },
    );
    targets.forEach((el) => io.observe(el));
  }

  function render(): void {
    const activeId = document.activeElement instanceof HTMLElement ? document.activeElement.id : '';
    const rev = firstRender ? ' reveal' : '';
    root.innerHTML = `
      ${header()}
      <main class="site-main">
        ${overviewSection(rev)}
        ${targetSection(rev)}
        ${itemsSection(rev)}
      </main>
      <footer class="site-footer">
        <p>sonae — 防災備蓄の台帳。すべての処理はこのブラウザの中で完結し、外部に送信しません。</p>
      </footer>`;
    bindEvents();
    if (firstRender) {
      playEntrance();
      firstRender = false;
    }
    if (activeId !== '') document.getElementById(activeId)?.focus();
  }

  document.addEventListener('keydown', (e) => {
    const t = e.target as HTMLElement | null;
    const typing =
      !!t &&
      (t.tagName === 'INPUT' ||
        t.tagName === 'SELECT' ||
        t.tagName === 'TEXTAREA' ||
        t.isContentEditable);
    if (typing) {
      if (e.key === 'Escape') t.blur();
      return;
    }
    if (e.key === 'n' || e.key === 'N') {
      e.preventDefault();
      focusAdd();
    } else if (e.key === 't' || e.key === 'T') {
      cycleTheme();
    } else if ((e.key === 'z' || e.key === 'Z') && lastDeleted) {
      undoDelete();
    }
  });

  render();
}
