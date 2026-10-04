/**
 * 卡面配色库（可扩展：在此追加 createColorScheme 条目）
 * id 须为死 id：csNNN（三位数），颜色可改、id 不可改。
 * primaryColor / secondaryColor / tertiaryColor（缺省 = secondary）
 * weight：相对出现权重（支持小数）。越大越常见，如 1 / 0.5 / 0.2；缺省 1
 * cs000 = 默认卡色（不进 unique 随机池）
 * 需在 card-style.js 之后加载。
 */

registerColorSchemeLibrary([
  createColorScheme({
    id: 'cs000',
    primaryColor: '#191919',
    secondaryColor: '#848484',
    tertiaryColor: '#8c8c8c',
    name: '默认',
    weight: 1,
  }),
  createColorScheme({
    id: 'cs001',
    primaryColor: '#c14b10',
    secondaryColor: '#0b2d99',
    tertiaryColor: '#042c8e',
    name: '深橙',
    weight: 1,
  }),
  createColorScheme({
    id: 'cs002',
    primaryColor: '#f7f1da',
    secondaryColor: '#efb454',
    tertiaryColor: '#eaa542',
    name: '光明',
    weight: 1,
  }),
  createColorScheme({
    id: 'cs003',
    primaryColor: '#c1e5c9',
    secondaryColor: '#32bf82',
    tertiaryColor: '#28b575',
    name: '青光白玉',
    weight: 1,
  }),
  createColorScheme({
    id: 'cs004',
    primaryColor: '#d62907',
    secondaryColor: '#131413',
    tertiaryColor: '#3f0e06',
    name: '鹤顶红',
    weight: 1,
  }),
  createColorScheme({
    id: 'cs005',
    primaryColor: '#e8e83d',
    secondaryColor: '#89db89',
    tertiaryColor: '#aae286',
    name: '腐蚀',
    weight: 1,
  }),
  createColorScheme({
    id: 'cs006',
    primaryColor: '#f74319',
    secondaryColor: '#b919e0',
    tertiaryColor: '#b31bce',
    name: '姹紫嫣红',
    weight: 1,
  }),
  createColorScheme({
    id: 'cs007',
    primaryColor: '#e1e1f9',
    secondaryColor: '#1714a5',
    tertiaryColor: '#0f0f96',
    name: '海洋',
    weight: 1,
  }),
  createColorScheme({
    id: 'cs008',
    primaryColor: '#ffffff',
    secondaryColor: '#29296d',
    tertiaryColor: '#3b19e0',
    name: '荧蓝',
    weight: 1,
  }),
  createColorScheme({
    id: 'cs009',
    primaryColor: '#f2f22c',
    secondaryColor: '#34dce0',
    tertiaryColor: '#32d6d6',
    name: '黄玉',
    weight: 1,
  }),
  createColorScheme({
    id: 'cs010',
    primaryColor: '#2b28bc',
    secondaryColor: '#d1ea3d',
    tertiaryColor: '#d4dd1d',
    name: '熒光',
    weight: 1,
  }),



  createColorScheme({
    id: 'cs011',
    primaryColor: '#ffffff',
    secondaryColor: '#f7b7e5',
    tertiaryColor: '#f7a9e5',
    name: '珠粉',
    weight: 1,
  }),
  createColorScheme({
    id: 'cs012',
    primaryColor: '#4c152c',
    secondaryColor: '#bc0826',
    tertiaryColor: '#a80428',
    name: '血牙',
    weight: 1,
  }),
  createColorScheme({
    id: 'cs013',
    primaryColor: '#a3c1aa',
    secondaryColor: '#076022',
    tertiaryColor: '#0b541e',
    name: '森林',
    weight: 1,
  }),
]);
