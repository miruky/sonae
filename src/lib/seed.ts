// 初回起動時に入れる見本の備蓄。期限の状態が一通り見えるよう、
// 実行日を基準に期限を散らして作る。

import { todayISO } from './expiry';
import type { SonaeData } from './stock';

function shiftDays(now: number, days: number): string {
  return todayISO(now + days * 24 * 60 * 60 * 1000);
}

export function seedData(now: number): SonaeData {
  const today = todayISO(now);
  return {
    household: { people: 2, days: 3 },
    items: [
      {
        id: 'seed-water',
        name: '飲料水 2L×6本',
        category: 'water',
        quantity: 12,
        unit: 'L',
        expiry: shiftDays(now, 240),
        checkedAt: today,
      },
      {
        id: 'seed-rice',
        name: 'アルファ米',
        category: 'food',
        quantity: 10,
        unit: '食',
        expiry: shiftDays(now, 400),
        checkedAt: today,
      },
      {
        id: 'seed-can',
        name: 'さばの缶詰',
        category: 'food',
        quantity: 6,
        unit: '食',
        expiry: shiftDays(now, 21),
        checkedAt: today,
      },
      {
        id: 'seed-firstaid',
        name: '救急セット',
        category: 'medical',
        quantity: 1,
        unit: '式',
        expiry: '',
        checkedAt: shiftDays(now, -200),
      },
      {
        id: 'seed-battery',
        name: 'モバイルバッテリー',
        category: 'power',
        quantity: 2,
        unit: '個',
        expiry: '',
        checkedAt: shiftDays(now, -30),
      },
      {
        id: 'seed-light',
        name: 'ヘッドライト',
        category: 'gear',
        quantity: 2,
        unit: '個',
        expiry: '',
        checkedAt: shiftDays(now, -30),
      },
      {
        id: 'seed-toilet',
        name: '簡易トイレ',
        category: 'daily',
        quantity: 15,
        unit: '回分',
        expiry: '',
        checkedAt: shiftDays(now, -30),
      },
    ],
  };
}
