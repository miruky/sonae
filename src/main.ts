import './style.css';
import { createApp } from './app';
import { createStore } from './lib/stock';
import { seedData } from './lib/seed';

const root = document.getElementById('app');
if (!root) throw new Error('#app が見つかりません');

const store = createStore(localStorage);
const now = Date.now();

// 初回起動だけ見本の備蓄を入れて保存する。一度でも保存があればその状態を尊重する
let data = store.load();
if (data === null) {
  data = seedData(now);
  store.save(data);
}

createApp({ root, store, initialData: data, now });
