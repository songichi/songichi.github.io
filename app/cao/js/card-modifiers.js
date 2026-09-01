/**
 * 卡面修饰库（可扩展）
 * 文件命名：cmNNN.ext 或 cmNNN_人眼标签.ext（如 cm001_黑白角标.png）
 * `_` 后只给人看，match / 写入只认死 id：cm001
 * type 目前仅 sticker（原图叠在卡最上层，含 cardImage 之上）
 * weight：相对出现权重（支持小数）。越大越常见，如 1 / 0.5 / 0.2；缺省 1
 * 需在 card-style.js 之后加载。
 */

registerCardModifierLibrary([
  createCardModifier({ id: 'cm001', type: 'sticker', name: '黑白角标', weight: 1 }),
  createCardModifier({ id: 'cm002', type: 'sticker', name: '红宝石标', weight: 1 }),
  createCardModifier({ id: 'cm003', type: 'sticker', name: '准心', weight: 1 }),
  createCardModifier({ id: 'cm004', type: 'sticker', name: '星光', weight: 1 }),
  createCardModifier({ id: 'cm005', type: 'sticker', name: '连珠', weight: 1 }),
]);
