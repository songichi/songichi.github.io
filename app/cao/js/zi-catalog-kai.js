/**
 * 默认字库 · 楷书（Zi 结构，预留）
 * 未来 id 前缀为 k，如 k.06C38.01
 */

const DEFAULT_ZI_KAI = createZiList([
  // caoZi('永', { style: 'kai', calligrapher: '', work: '' }),
]);

function getDefaultZiKaiEntries() {
  return DEFAULT_ZI_KAI.map((zi) => zi.toEntry());
}
