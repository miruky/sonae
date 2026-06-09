// 画面の描画。1画面構成で、状態が変わるたびに全体を描き直す。
// テキスト入力はchangeイベント(確定時)で反映するので、再描画で入力が途切れない。
// 品目は常に「急ぐ順」で保持し、表示の並びと配列の添字を一致させる。

import {
  CATEGORY_LABELS,
  MAX_DAYS,
  MAX_PEOPLE,
  newItemId,
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

function categoryOptions(selected: Category): string {
  return (Object.keys(CATEGORY_LABELS) as Category[])
    .map(
      (c) =>
        `<option value="${c}" ${c === selected ? 'selected' : ''}>${CATEGORY_LABELS[c]}</option>`,
    )
    .join('');
}

export interface AppDeps {
  root: HTMLElement;
  store: SonaeStore;
  initialData: SonaeData;
  now: number;
}

export function createApp({ root, store, initialData, now }: AppDeps): void {
  const today = todayISO(now);
  const data = initialData;
  data.items = sortByUrgency(data.items, today);
  let filterCategory: Category | 'all' = 'all';
  let attentionOnly = false;
  let copied = false;

  function commit(): void {
    data.items = sortByUrgency(data.items, today);
    store.save(data);
    render();
  }

  // ---- 部品 ----

  function header(): string {
    const count = data.items.filter((i) => needsAttention(itemStatus(i, today))).length;
    return `
      <header class="site-header">
        <div class="site-header-inner">
          <span class="brand">${icons.logo}<span>sonae</span></span>
          ${count > 0 ? `<span class="attention-badge">要対応 ${count}件</span>` : '<span class="attention-none">要対応なし</span>'}
        </div>
      </header>`;
  }

  function bar(label: string, unit: string, c: Coverage): string {
    return `
      <div class="coverage">
        <div class="coverage-head">
          <span class="coverage-label">${label}</span>
          <span class="coverage-value"><strong>${c.current}</strong> / ${c.target}${unit}(${c.percent}%)</span>
        </div>
        <div class="coverage-track" role="img" aria-label="${label}の充足率${c.percent}%">
          <div class="coverage-fill ${c.percent >= 100 ? 'full' : ''}" style="width:${c.percent}%"></div>
        </div>
      </div>`;
  }

  function targetPanel(): string {
    const usable = data.items.filter((i) => itemStatus(i, today) !== 'expired');
    return `
      <section class="panel">
        <h2>備蓄の目標</h2>
        <p class="hint">飲料水は1人1日3L、食料は1人1日3食を目安に計算します。期限切れの品は充足に数えません。</p>
        <div class="household">
          <label class="field"><span>人数</span>
            <input id="people" type="number" min="1" max="${MAX_PEOPLE}" value="${data.household.people}" /></label>
          <label class="field"><span>日数</span>
            <input id="days" type="number" min="1" max="${MAX_DAYS}" value="${data.household.days}" /></label>
        </div>
        ${bar('飲料水', 'L', waterCoverage(usable, data.household))}
        ${bar('食料', '食', foodCoverage(usable, data.household))}
        <div class="list-actions">
          <button type="button" class="button" id="copy-restock">
            ${copied ? icons.check : icons.copy}<span>${copied ? 'コピーしました' : '買い足しリストをコピー'}</span></button>
          <button type="button" class="button" id="download-restock">
            ${icons.download}<span>買い足しリストを保存</span></button>
        </div>
      </section>`;
  }

  function itemRow(item: StockItem, index: number): string {
    const status = itemStatus(item, today);
    const detail = statusDetail(item, today);
    return `
      <li class="item-row status-${status}" style="--i:${index}">
        <input class="item-name" id="i-${index}-name" data-item="${index}:name"
          value="${esc(item.name)}" aria-label="品名" />
        <select id="i-${index}-category" data-item="${index}:category" aria-label="カテゴリ">
          ${categoryOptions(item.category)}
        </select>
        <input class="item-quantity" id="i-${index}-quantity" data-item="${index}:quantity"
          type="number" min="0" step="any" value="${item.quantity}" aria-label="数量" />
        <input class="item-unit" id="i-${index}-unit" data-item="${index}:unit"
          value="${esc(item.unit)}" aria-label="単位" />
        <input class="item-expiry" id="i-${index}-expiry" data-item="${index}:expiry"
          type="date" value="${esc(item.expiry)}" aria-label="賞味期限" />
        <span class="status-badge" title="${item.expiry === '' ? `最終点検 ${formatDateJa(item.checkedAt)}` : `期限 ${formatDateJa(item.expiry)}`}">
          ${STATUS_LABELS[status]}${detail ? `<small>${detail}</small>` : ''}</span>
        <div class="row-actions">
          ${
            item.expiry === ''
              ? `<button type="button" class="icon-button ok" id="i-${index}-check" data-check="${index}"
                  aria-label="${esc(item.name)}を点検済みにする" title="点検した">${icons.recheck}</button>`
              : ''
          }
          <button type="button" class="icon-button" id="i-${index}-del" data-del="${index}"
            aria-label="${esc(item.name)}を削除">${icons.trash}</button>
        </div>
      </li>`;
  }

  function itemsPanel(): string {
    const visible = data.items
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => filterCategory === 'all' || item.category === filterCategory)
      .filter(({ item }) => !attentionOnly || needsAttention(itemStatus(item, today)));
    const rows = visible.map(({ item, index }) => itemRow(item, index)).join('');
    const empty =
      data.items.length === 0
        ? '<p class="empty">備蓄品がまだありません。下の行から追加してください。</p>'
        : visible.length === 0
          ? '<p class="empty">条件に当てはまる品目がありません。</p>'
          : '';
    return `
      <section class="panel">
        <div class="panel-head">
          <h2>備蓄品</h2>
          <div class="filters">
            <label class="filter-label"><span class="visually-hidden">カテゴリで絞り込む</span>
              <select id="filter-category">
                <option value="all" ${filterCategory === 'all' ? 'selected' : ''}>すべてのカテゴリ</option>
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
        <form class="item-add" id="add-form">
          <input name="name" id="add-name" placeholder="品名(例: 飲料水 2L×6本)" required aria-label="品名" />
          <select name="category" id="add-category" aria-label="カテゴリ">${categoryOptions('food')}</select>
          <input name="quantity" id="add-quantity" type="number" min="0" step="any" placeholder="数量" required aria-label="数量" />
          <input name="unit" id="add-unit" placeholder="単位(L・食・個)" aria-label="単位" />
          <input name="expiry" id="add-expiry" type="date" aria-label="賞味期限(なければ空)" />
          <button type="submit" class="icon-button accent" id="add-submit" aria-label="備蓄品を追加">${icons.plus}</button>
        </form>
        <p class="hint">賞味期限を空にした品は「点検」で管理します。点検から180日で要点検になります。</p>
      </section>`;
  }

  function bindEvents(): void {
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
        const [idxRaw, field] = (el.dataset.item ?? '').split(':');
        const item = data.items[Number(idxRaw)];
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
        const item = data.items[Number(el.dataset.check)];
        if (!item) return;
        item.checkedAt = today;
        commit();
      });
    }
    for (const el of root.querySelectorAll<HTMLElement>('[data-del]')) {
      el.addEventListener('click', () => {
        data.items.splice(Number(el.dataset.del), 1);
        commit();
      });
    }

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
      root.querySelector<HTMLInputElement>('#add-name')?.focus();
    });

    const markdown = (): string => restockMarkdown(data.items, data.household, today);
    root.querySelector('#copy-restock')?.addEventListener('click', () => {
      void navigator.clipboard.writeText(markdown()).then(() => {
        copied = true;
        render();
        setTimeout(() => {
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

  function render(): void {
    const activeId = document.activeElement instanceof HTMLElement ? document.activeElement.id : '';
    root.innerHTML = `
      ${header()}
      <main class="site-main">
        <section class="view">
          ${targetPanel()}
          ${itemsPanel()}
        </section>
      </main>
      <footer class="site-footer">
        <p>sonae — 防災備蓄の台帳。データはこの端末のブラウザにだけ保存されます。</p>
      </footer>`;
    bindEvents();
    if (activeId !== '') document.getElementById(activeId)?.focus();
  }

  render();
}
