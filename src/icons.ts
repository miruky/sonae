// UIで使う線画アイコン。24pxグリッド・stroke=currentColorで統一し、
// 隣に必ずテキストラベルを置く前提ですべて装飾(aria-hidden)とする。

const svg = (body: string): string =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ` +
  `stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;

export const icons = {
  logo: svg(
    '<path d="M3.5 10.5 12 7l8.5 3.5v7L12 21l-8.5-3.5z"/>' +
      '<path d="M3.5 10.5 12 14l8.5-3.5"/>' +
      '<path d="M12 14v7"/>' +
      '<path d="M12 1.5c-1.1 1.4-1.7 2.3-1.7 3.1a1.7 1.7 0 0 0 3.4 0c0-.8-.6-1.7-1.7-3.1z"/>',
  ),
  plus: svg('<path d="M12 5v14"/><path d="M5 12h14"/>'),
  trash: svg(
    '<path d="M4 7h16"/>' +
      '<path d="M9.5 7V5A1.5 1.5 0 0 1 11 3.5h2A1.5 1.5 0 0 1 14.5 5v2"/>' +
      '<path d="m6.5 7 .7 11.2a2 2 0 0 0 2 1.8h5.6a2 2 0 0 0 2-1.8L17.5 7"/>' +
      '<path d="M10 11v5.5"/><path d="M14 11v5.5"/>',
  ),
  copy: svg(
    '<rect x="9" y="9" width="11" height="11" rx="2"/>' + '<path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
  ),
  check: svg('<path d="m5 13 4.5 4.5L19 7"/>'),
  recheck: svg(
    '<path d="M20 12a8 8 0 1 1-2.6-5.9"/>' +
      '<path d="M20 3.5V8h-4.5"/>' +
      '<path d="m8.5 12.5 2.5 2.5 4.5-4.5"/>',
  ),
  download: svg('<path d="M12 4v11"/><path d="m7 11 5 5 5-5"/><path d="M5 20h14"/>'),
  upload: svg('<path d="M12 20V9"/><path d="m7 13 5-5 5 5"/><path d="M5 4h14"/>'),
  undo: svg('<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>'),
  sun: svg(
    '<circle cx="12" cy="12" r="4"/>' +
      '<path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.9 4.9 1.4 1.4"/>' +
      '<path d="m17.7 17.7 1.4 1.4"/><path d="M2 12h2"/><path d="M20 12h2"/>' +
      '<path d="m6.3 17.7-1.4 1.4"/><path d="m19.1 4.9-1.4 1.4"/>',
  ),
  moon: svg('<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>'),
  auto: svg(
    '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" stroke="none"/>',
  ),
} as const;
