/**
 * 卡背底纹库（可扩展）
 * 文件命名：cbNNN.ext 或 cbNNN_人眼标签.ext（如 cb001_点纹.png）
 * `_` 后只给人看，match / 写入只认死 id：cb001
 * weight：相对出现权重（支持小数）。越大越常见，如 1 / 0.5 / 0.2；缺省 1
 * 需在 card-style.js 之后加载。
 */

registerCardBaseLibrary([
  createCardBase({ id: 'cb001', name: '点纹', weight: 1 }),
  createCardBase({ id: 'cb002', name: '直纹', weight: 1 }),
  createCardBase({ id: 'cb003', name: '方点', weight: 1 }),
  createCardBase({ id: 'cb004', name: '折线', weight: 1 }),
  createCardBase({ id: 'cb005', name: '圆形重叠', weight: 1 }),
]);
