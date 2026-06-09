// 買い足しリストの生成。要対応の品目と、目標に足りない水・食料をまとめて
// チェックボックス付きMarkdownにする。

import { itemStatus, needsAttention, statusDetail, STATUS_LABELS } from './expiry';
import type { Household, StockItem } from './stock';
import { foodCoverage, waterCoverage } from './target';

export function restockMarkdown(items: StockItem[], household: Household, today: string): string {
  const lines = ['# 買い足しリスト', ''];

  const attention = items.filter((i) => needsAttention(itemStatus(i, today)));
  for (const item of attention) {
    const status = itemStatus(item, today);
    lines.push(
      `- [ ] ${item.name} ${item.quantity}${item.unit}(${STATUS_LABELS[status]}・${statusDetail(item, today)})`,
    );
  }

  // 期限切れの水・食料は備蓄として当てにできないので、充足量から除いて数える
  const usable = items.filter((i) => itemStatus(i, today) !== 'expired');
  const water = waterCoverage(usable, household);
  if (water.current < water.target) {
    lines.push(`- [ ] 飲料水 あと${water.target - water.current}L(目標${water.target}L)`);
  }
  const food = foodCoverage(usable, household);
  if (food.current < food.target) {
    lines.push(`- [ ] 非常食 あと${food.target - food.current}食(目標${food.target}食)`);
  }

  if (lines.length === 2) {
    lines.push('買い足しは不要です。');
  }
  lines.push('');
  return lines.join('\n');
}
