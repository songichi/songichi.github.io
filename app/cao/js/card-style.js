/**
 * 卡面样式 — colorScheme / decoration / cardBase / cardModifier 工具与随机逻辑
 *
 * 配色数据见 card-color-schemes.js；底纹见 card-bases.js；修饰见 card-modifiers.js
 * unique 掉落几率 / 门控 / 保底墨见 unique-drop-rates.js（须先于本文件加载）
 * colorScheme 死 id：csNNN；class：card-scheme-{id}、card-deco-{id}、card-base-{id}、card-mod-{id}
 *
 * 色值语义：
 *   primaryColor   — 字形/卡图墨色（原 shapeColor）
 *   secondaryColor — 卡面底色（原 backgroundColor）
 *   tertiaryColor  — cardBase 装饰墨色（默认 = secondaryColor）
 *
 * 预览层叠（底→上）：secondary → cardBase(tertiary mask) → cardImage(primary mask) → cardModifier(sticker)
 */

/** 默认卡色 id（unique 随机池排除） */
const CARD_DEFAULT_COLOR_SCHEME_ID = 'cs000';

/** 稳定死 id：cs + 三位数字 */
const COLOR_SCHEME_ID_PATTERN = /^cs\d{3}$/;

/**
 * 历史 hex 派生 id → 死 id（只读兼容，新写入一律用死 id）
 * @type {Record<string, string>}
 */
const COLOR_SCHEME_ID_ALIASES = {
  'c14b10-0b2d99': 'cs001',
};

/** cardBase 黑白图目录（相对 cao/user/ 页面） */
const CARD_BASE_IMAGE_DIR = '../images/cardBases';
const CARD_BASE_IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp'];

/** 稳定死 id：cb + 三位数字（文件名 cb001_点纹.png → 只 match cb001） */
const CARD_BASE_ID_PATTERN = /^cb\d{3}$/;

/** cardModifier 图目录（相对 cao/user/ 页面） */
const CARD_MODIFIER_IMAGE_DIR = '../images/cardModifier';
const CARD_MODIFIER_IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp'];

/** 稳定死 id：cm + 三位数字（文件名 cm001.png / cm001_标签.png → 只 match cm001） */
const CARD_MODIFIER_ID_PATTERN = /^cm\d{3}$/;

/** 目前唯一 type：sticker（原图叠在卡最上层） */
const CARD_MODIFIER_TYPE_STICKER = 'sticker';
const CARD_MODIFIER_TYPES = Object.freeze([CARD_MODIFIER_TYPE_STICKER]);

/**
 * 解析卡背文件名主干：`cb001_点纹` → { id, label }
 * `_` 后仅人眼标签，不参与 match；亦接受纯 id：`cb001`
 * @param {string} raw
 * @returns {{ id: string, label: string }|null}
 */
function parseCardBaseBasename(raw) {
  const stem = String(raw || '').trim().replace(/\.(png|jpe?g|webp)$/i, '');
  if (!stem) return null;
  const match = /^(cb\d{3})(?:_(.+))?$/i.exec(stem);
  if (!match) return null;
  return {
    id: match[1].toLowerCase(),
    label: match[2] ? String(match[2]).trim() : '',
  };
}

/** 将 cardStyle.cardBase / 文件名规范为死 id（cbNNN） */
function resolveCardBaseId(raw) {
  const parsed = parseCardBaseBasename(raw);
  return parsed?.id || null;
}

/**
 * @param {{ id: string, name?: string, weight?: number }} spec
 */
function createCardBase({ id, name = '', weight = 1 } = {}) {
  const parsed = parseCardBaseBasename(id);
  const baseId = parsed?.id || String(id || '').trim().toLowerCase();
  if (!CARD_BASE_ID_PATTERN.test(baseId)) {
    throw new Error(`cardBase id 须为 cbNNN（三位数），收到: ${id}`);
  }
  const label = name || parsed?.label || '';
  const w = Number(weight);
  return {
    id: baseId,
    name: label || baseId,
    weight: Number.isFinite(w) && w > 0 ? w : 1,
  };
}

/**
 * 解析修饰文件名主干：`cm001_标签` → { id, label }
 * `_` 后仅人眼标签，不参与 match；亦接受纯 id：`cm001`
 * @param {string} raw
 * @returns {{ id: string, label: string }|null}
 */
function parseCardModifierBasename(raw) {
  const stem = String(raw || '').trim().replace(/\.(png|jpe?g|webp)$/i, '');
  if (!stem) return null;
  const match = /^(cm\d{3})(?:_(.+))?$/i.exec(stem);
  if (!match) return null;
  return {
    id: match[1].toLowerCase(),
    label: match[2] ? String(match[2]).trim() : '',
  };
}

/** 将 cardStyle.cardModifier / 文件名规范为死 id（cmNNN） */
function resolveCardModifierId(raw) {
  const parsed = parseCardModifierBasename(raw);
  return parsed?.id || null;
}

/**
 * @param {{ id: string, type?: string, name?: string, weight?: number }} spec
 */
function createCardModifier({ id, type = CARD_MODIFIER_TYPE_STICKER, name = '', weight = 1 } = {}) {
  const parsed = parseCardModifierBasename(id);
  const modId = parsed?.id || String(id || '').trim().toLowerCase();
  if (!CARD_MODIFIER_ID_PATTERN.test(modId)) {
    throw new Error(`cardModifier id 须为 cmNNN（三位数），收到: ${id}`);
  }
  const modType = String(type || CARD_MODIFIER_TYPE_STICKER).trim().toLowerCase();
  if (!CARD_MODIFIER_TYPES.includes(modType)) {
    throw new Error(`cardModifier type 须为 ${CARD_MODIFIER_TYPES.join('|')}，收到: ${type}`);
  }
  const label = name || parsed?.label || '';
  const w = Number(weight);
  return {
    id: modId,
    type: modType,
    name: label || modId,
    weight: Number.isFinite(w) && w > 0 ? w : 1,
  };
}

/** 将任意历史/当前 colorSchemeId 解析为库内死 id */
function resolveColorSchemeId(id) {
  if (!id) return null;
  const key = String(id);
  return COLOR_SCHEME_ID_ALIASES[key] || key;
}

/**
 * @param {{
 *   id: string,
 *   primaryColor?: string,
 *   secondaryColor?: string,
 *   tertiaryColor?: string,
 *   shapeColor?: string,
 *   backgroundColor?: string,
 *   name?: string,
 *   weight?: number,
 * }} spec
 */
function createColorScheme({
  id,
  primaryColor,
  secondaryColor,
  tertiaryColor,
  shapeColor,
  backgroundColor,
  name = '',
  weight = 1,
} = {}) {
  const schemeId = String(id || '').trim();
  if (!COLOR_SCHEME_ID_PATTERN.test(schemeId)) {
    throw new Error(`colorScheme id 须为 csNNN（三位数），收到: ${id}`);
  }
  const primary = primaryColor || shapeColor;
  const secondary = secondaryColor || backgroundColor;
  if (!primary || !secondary) {
    throw new Error(`colorScheme ${schemeId} 缺少 primaryColor / secondaryColor`);
  }
  const tertiary = tertiaryColor || secondary;
  const w = Number(weight);
  return {
    id: schemeId,
    name,
    primaryColor: primary,
    secondaryColor: secondary,
    tertiaryColor: tertiary,
    weight: Number.isFinite(w) && w > 0 ? w : 1,
  };
}

/** @type {{ id: string, name: string, primaryColor: string, secondaryColor: string, tertiaryColor: string, weight: number }[]} */
var CARD_COLOR_SCHEME_LIBRARY = [];

/** @type {{ id: string, name: string }[]} */
const CARD_DECORATION_LIBRARY = [];

/** @type {{ id: string, name: string, weight: number }[]} */
var CARD_BASE_LIBRARY = [];

/** @type {{ id: string, type: string, name: string, weight: number }[]} */
var CARD_MODIFIER_LIBRARY = [];

function registerColorSchemeLibrary(schemes) {
  CARD_COLOR_SCHEME_LIBRARY = Array.isArray(schemes) ? schemes.slice() : [];
}

function registerCardBaseLibrary(bases) {
  CARD_BASE_LIBRARY = Array.isArray(bases) ? bases.slice() : [];
}

function registerCardModifierLibrary(modifiers) {
  CARD_MODIFIER_LIBRARY = Array.isArray(modifiers) ? modifiers.slice() : [];
}

function getColorSchemeById(id) {
  const resolved = resolveColorSchemeId(id);
  if (!resolved) return null;
  return CARD_COLOR_SCHEME_LIBRARY.find((item) => item.id === resolved) || null;
}

function getDecorationById(id) {
  if (!id) return null;
  return CARD_DECORATION_LIBRARY.find((item) => item.id === id) || null;
}

function getCardBaseById(id) {
  const resolved = resolveCardBaseId(id);
  if (!resolved) return null;
  return CARD_BASE_LIBRARY.find((item) => item.id === resolved) || null;
}

function getCardModifierById(id) {
  const resolved = resolveCardModifierId(id);
  if (!resolved) return null;
  return CARD_MODIFIER_LIBRARY.find((item) => item.id === resolved) || null;
}

function colorSchemeClassName(colorSchemeId) {
  const resolved = resolveColorSchemeId(colorSchemeId);
  return resolved ? `card-scheme-${resolved}` : '';
}

function decorationClassName(decorationId) {
  return decorationId ? `card-deco-${decorationId}` : '';
}

function cardBaseClassName(cardBaseId) {
  const resolved = resolveCardBaseId(cardBaseId);
  return resolved ? `card-base-${resolved}` : '';
}

function cardModifierClassName(cardModifierId) {
  const resolved = resolveCardModifierId(cardModifierId);
  return resolved ? `card-mod-${resolved}` : '';
}

/** 卡面 style tags（class 名列表） */
function cardStyleClassNames({
  colorSchemeId = null,
  decorationId = null,
  cardBase = null,
  cardModifier = null,
} = {}) {
  return [
    colorSchemeClassName(colorSchemeId),
    decorationClassName(decorationId),
    cardBaseClassName(cardBase),
    cardModifierClassName(cardModifier),
  ].filter(Boolean);
}

/**
 * @param {string|null} colorSchemeId
 * @param {string|null} decorationId
 * @param {string|null} cardBase
 * @param {string|null} cardModifier
 */
function buildCardStyleRecord(
  colorSchemeId = null,
  decorationId = null,
  cardBase = null,
  cardModifier = null,
) {
  const resolvedSchemeId = resolveColorSchemeId(colorSchemeId);
  const baseId = resolveCardBaseId(cardBase);
  const modifierId = resolveCardModifierId(cardModifier);
  if (!resolvedSchemeId && !decorationId && !baseId && !modifierId) return null;
  return {
    colorSchemeId: resolvedSchemeId || null,
    decorationId: decorationId || null,
    cardBase: baseId || null,
    cardModifier: modifierId || null,
    tags: cardStyleClassNames({
      colorSchemeId: resolvedSchemeId,
      decorationId,
      cardBase: baseId || null,
      cardModifier: modifierId || null,
    }),
  };
}

/** 规范化写入记录的 cardStyle */
function normalizeCardStyleRecord(cardStyle) {
  if (!cardStyle || typeof cardStyle !== 'object') return null;
  return buildCardStyleRecord(
    cardStyle.colorSchemeId || null,
    cardStyle.decorationId || null,
    cardStyle.cardBase || null,
    cardStyle.cardModifier || null,
  );
}

function strokeHasUniqueCardStyle(stroke) {
  if (!stroke?.isUnique) return false;
  const cs = stroke.cardStyle;
  if (!cs) return false;
  const schemeId = resolveColorSchemeId(cs.colorSchemeId);
  const baseId = resolveCardBaseId(cs.cardBase);
  const modifierId = resolveCardModifierId(cs.cardModifier);
  return Boolean(schemeId || cs.decorationId || baseId || modifierId);
}

/** unique 次号：缺省兼容为 1 */
function resolveCiHao(source, defaultValue = 1) {
  const n = Number(source?.ciHao);
  if (Number.isFinite(n) && n >= 1) return Math.floor(n);
  return defaultValue;
}

function stripCardStyleClasses(element) {
  if (!element?.classList) return;
  for (const scheme of CARD_COLOR_SCHEME_LIBRARY) {
    element.classList.remove(colorSchemeClassName(scheme.id));
  }
  for (const alias of Object.keys(COLOR_SCHEME_ID_ALIASES)) {
    element.classList.remove(`card-scheme-${alias}`);
  }
  for (const deco of CARD_DECORATION_LIBRARY) {
    element.classList.remove(decorationClassName(deco.id));
  }
  for (const base of CARD_BASE_LIBRARY) {
    element.classList.remove(cardBaseClassName(base.id));
  }
  for (const mod of CARD_MODIFIER_LIBRARY) {
    element.classList.remove(cardModifierClassName(mod.id));
  }
  // 动态 cardBase / cardModifier class（库外 id）
  for (const cls of [...element.classList]) {
    const name = String(cls);
    if (name.startsWith('card-base-') || name.startsWith('card-mod-')) {
      element.classList.remove(cls);
    }
  }
}

/**
 * 为元素挂载 colorScheme / decoration / cardBase / cardModifier class
 * @param {Element} element
 * @param {{ colorSchemeId?: string|null, decorationId?: string|null, cardBase?: string|null, cardModifier?: string|null }} style
 */
function applyCardStyleToElement(element, {
  colorSchemeId = null,
  decorationId = null,
  cardBase = null,
  cardModifier = null,
} = {}) {
  if (!element) return;
  stripCardStyleClasses(element);
  const resolvedSchemeId = resolveColorSchemeId(colorSchemeId);
  const schemeClass = colorSchemeClassName(resolvedSchemeId);
  const decoClass = decorationClassName(decorationId);
  const baseClass = cardBaseClassName(cardBase);
  const modClass = cardModifierClassName(cardModifier);
  if (schemeClass) element.classList.add(schemeClass);
  if (decoClass) element.classList.add(decoClass);
  if (baseClass) element.classList.add(baseClass);
  if (modClass) element.classList.add(modClass);
}

/**
 * 按死 id 拼图片候选路径。磁盘上可有 `id_人眼标签.ext`，标签不参与 match，
 * 加载时用库内 name 猜 `id_name.ext`，并回退纯 `id.ext`。
 * @param {string} id
 * @param {string|null|undefined} name
 * @param {string} baseDir
 * @param {string[]} extensions
 */
function buildLabeledImageCandidates(id, name, baseDir, extensions) {
  const stems = [];
  const pushStem = (stem) => {
    const s = String(stem || '').trim();
    if (s && !stems.includes(s)) stems.push(s);
  };
  if (name && name !== id) pushStem(`${id}_${name}`);
  pushStem(id);
  const paths = [];
  for (const stem of stems) {
    for (const ext of extensions) {
      paths.push(`${baseDir}/${stem}.${ext}`);
    }
  }
  return paths;
}

/**
 * cardBase 图片候选路径（只认死 id；`_` 后缀仅文件命名便利）
 * @param {string} cardBaseId
 * @param {string} [baseDir]
 */
function getCardBaseImageCandidates(cardBaseId, baseDir = CARD_BASE_IMAGE_DIR) {
  const resolved = resolveCardBaseId(cardBaseId);
  if (!resolved) return [];
  const entry = getCardBaseById(resolved);
  return buildLabeledImageCandidates(
    resolved,
    entry?.name,
    baseDir,
    CARD_BASE_IMAGE_EXTENSIONS,
  );
}

/**
 * cardModifier 图片候选路径（只认死 id；`_` 后缀仅文件命名便利）
 * @param {string} cardModifierId
 * @param {string} [baseDir]
 */
function getCardModifierImageCandidates(cardModifierId, baseDir = CARD_MODIFIER_IMAGE_DIR) {
  const resolved = resolveCardModifierId(cardModifierId);
  if (!resolved) return [];
  const entry = getCardModifierById(resolved);
  return buildLabeledImageCandidates(
    resolved,
    entry?.name,
    baseDir,
    CARD_MODIFIER_IMAGE_EXTENSIONS,
  );
}

function pickRandomFromList(list, rng) {
  if (!list?.length) return null;
  const roll = typeof rng === 'function' ? rng() : Math.random();
  const idx = Math.floor(roll * list.length);
  return list[Math.min(idx, list.length - 1)];
}

/**
 * 按 weight 加权抽取（相对比例，支持小数）
 * 例：常见=1、半常见=0.5、很稀有=0.2 → 出现频率约为 1 : 0.5 : 0.2
 * 缺省 / ≤0 / 非法 视为 1
 */
function pickWeightedFromList(list, rng) {
  if (!list?.length) return null;
  let total = 0;
  const weights = list.map((item) => {
    const w = Number(item?.weight);
    const safe = Number.isFinite(w) && w > 0 ? w : 1;
    total += safe;
    return safe;
  });
  if (total <= 0) return pickRandomFromList(list, rng);

  let roll = (typeof rng === 'function' ? rng() : Math.random()) * total;
  for (let i = 0; i < list.length; i += 1) {
    roll -= weights[i];
    if (roll < 0) return list[i];
  }
  return list[list.length - 1];
}

/** unique 配色池：排除默认 cs000，按 weight 加权 */
function pickRandomColorScheme(rng) {
  const lib = (CARD_COLOR_SCHEME_LIBRARY || []).filter(
    (item) => item.id !== CARD_DEFAULT_COLOR_SCHEME_ID,
  );
  return pickWeightedFromList(lib.length ? lib : CARD_COLOR_SCHEME_LIBRARY, rng);
}

/** unique 底纹池：按 weight 加权 */
function pickRandomCardBase(rng) {
  return pickWeightedFromList(CARD_BASE_LIBRARY, rng);
}

/** unique 修饰池：按 weight 加权 */
function pickRandomCardModifier(rng) {
  return pickWeightedFromList(CARD_MODIFIER_LIBRARY, rng);
}

/**
 * unique 词条判定（配色 / 底纹 / 修饰，可叠加）
 * 不含「掉落判定」门控；供商店强制出货与 rollDropJudgment 共用。
 * @returns {{ isUnique: boolean, cardStyle: object|null }}
 */
function rollUniqueTraitChecks(rng = Math.random) {
  const next = typeof rng === 'function' ? rng : Math.random;
  const empty = { isUnique: false, cardStyle: null };

  let colorSchemeId = null;
  let cardBase = null;
  let cardModifier = null;

  if (next() < CARD_COLOR_SCHEME_APPEARANCE_CHANCE) {
    const scheme = pickRandomColorScheme(next);
    if (scheme) colorSchemeId = scheme.id;
  }

  if (next() < CARD_BASE_APPEARANCE_CHANCE) {
    const base = pickRandomCardBase(next);
    if (base) cardBase = base.id;
  }

  if (next() < CARD_MODIFIER_APPEARANCE_CHANCE) {
    const mod = pickRandomCardModifier(next);
    if (mod) cardModifier = mod.id;
  }

  if (!colorSchemeId && !cardBase && !cardModifier) return empty;

  const cardStyle = buildCardStyleRecord(colorSchemeId, null, cardBase, cardModifier);
  if (!cardStyle) return empty;

  return { isUnique: true, cardStyle };
}

function clampUniqueAppearanceChance(chance) {
  const n = Number(chance);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(1, n);
}

function getUniqueGlyphRevealBonus() {
  const n = Number(
    typeof CARD_UNIQUE_GLYPH_REVEAL_BONUS === 'number' ? CARD_UNIQUE_GLYPH_REVEAL_BONUS : 0,
  );
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** 当前字 unique 门控：默认 8%；本字翻开过原型则 +2% */
function resolveUniqueAppearanceChance({ glyphRevealed = false, chance } = {}) {
  const base = clampUniqueAppearanceChance(
    chance == null
      ? (typeof CARD_UNIQUE_APPEARANCE_CHANCE === 'number' ? CARD_UNIQUE_APPEARANCE_CHANCE : 0)
      : chance,
  );
  if (!glyphRevealed) return base;
  return clampUniqueAppearanceChance(base + getUniqueGlyphRevealBonus());
}

/**
 * 掉落判定（完成某字、跳到下一字时调用，勿在刚切换到该字时调用）
 * 默认 8% 进入 unique 词条判定（翻开过原型则 10%）；词条全空则保底 5 墨（非即刻入账）
 * @param {function} [rng]
 * @param {{ glyphRevealed?: boolean, chance?: number }} [options]
 * @returns {{ isUnique: boolean, cardStyle: object|null, inkDrop: number }}
 */
function rollDropJudgment(rng = Math.random, options = {}) {
  const extra = (rng && typeof rng === 'object') ? rng : (options || {});
  const next = typeof rng === 'function'
    ? rng
    : (typeof extra.rng === 'function' ? extra.rng : Math.random);
  const empty = { isUnique: false, cardStyle: null, inkDrop: 0 };
  const gate = resolveUniqueAppearanceChance(extra);

  // 掉落判定门控
  if (next() >= gate) return empty;

  const traits = rollUniqueTraitChecks(next);
  if (traits.isUnique && traits.cardStyle) {
    return { isUnique: true, cardStyle: traits.cardStyle, inkDrop: 0 };
  }

  // unique 无结果 → 保底墨
  return { isUnique: false, cardStyle: null, inkDrop: CARD_INK_DROP_AMOUNT };
}

/**
 * 保底领取：按 unique 词条正常几率出卡（不含掉落门控）
 * 若词条全空则重试，仍空则强制默认配色
 * @returns {{ isUnique: boolean, cardStyle: object|null }}
 */
function rollPityUniqueCardStyle(rng = Math.random) {
  const next = typeof rng === 'function' ? rng : Math.random;
  for (let i = 0; i < 48; i += 1) {
    const traits = rollUniqueTraitChecks(next);
    if (traits.isUnique && traits.cardStyle) return traits;
  }
  const scheme = typeof pickRandomColorScheme === 'function' ? pickRandomColorScheme(next) : null;
  const colorSchemeId = scheme?.id
    || (typeof CARD_DEFAULT_COLOR_SCHEME_ID !== 'undefined' ? CARD_DEFAULT_COLOR_SCHEME_ID : null);
  const cardStyle = typeof buildCardStyleRecord === 'function'
    ? buildCardStyleRecord(colorSchemeId, null, null, null)
    : { colorSchemeId, decorationId: null, cardBase: null, cardModifier: null, tags: [] };
  return cardStyle
    ? { isUnique: true, cardStyle }
    : { isUnique: false, cardStyle: null };
}

/**
 * 练字 / 商店：roll unique 卡背
 * 默认 8% unique 门控（翻开过原型则 10%）→ 独立 1/4 配色 + 1/8 底纹 + 1/10 修饰（可叠加）
 * 任一通过 → isUnique；可任意子集组合
 * （不含墨掉落；练习掉落请用 rollDropJudgment）
 * @param {function} [rng]
 * @param {{ glyphRevealed?: boolean, chance?: number }} [options]
 * @returns {{ isUnique: boolean, cardStyle: object|null }}
 */
function rollCardStyleForAppearance(rng = Math.random, options = {}) {
  const extra = (rng && typeof rng === 'object') ? rng : (options || {});
  const next = typeof rng === 'function'
    ? rng
    : (typeof extra.rng === 'function' ? extra.rng : Math.random);
  const empty = { isUnique: false, cardStyle: null };
  const gate = resolveUniqueAppearanceChance(extra);

  if (next() >= gate) return empty;

  const traits = rollUniqueTraitChecks(next);
  if (!traits.isUnique || !traits.cardStyle) return empty;
  return traits;
}

function serializeStrokeForSnapshot(stroke) {
  const out = {
    id: stroke.id,
    durationMs: Math.max(0, Number(stroke.durationMs) || 0),
  };
  if (strokeHasUniqueCardStyle(stroke)) {
    out.isUnique = true;
    out.ciHao = typeof resolveCiHao === 'function' ? resolveCiHao(stroke) : (Number(stroke.ciHao) || 1);
    out.cardStyle = normalizeCardStyleRecord(stroke.cardStyle);
  }
  const inkDrop = Math.floor(Number(stroke.inkDrop) || 0);
  if (inkDrop > 0) out.inkDrop = inkDrop;
  const seal = typeof normalizeZhenSeal === 'function'
    ? normalizeZhenSeal(stroke.seal)
    : (stroke.seal || null);
  if (seal) out.seal = seal;
  return out;
}

function buildColorSchemeCssRules() {
  const blocks = [];
  for (const scheme of CARD_COLOR_SCHEME_LIBRARY) {
    const cls = colorSchemeClassName(scheme.id);
    blocks.push(`
.${cls} {
  --card-primary-color: ${scheme.primaryColor};
  --card-secondary-color: ${scheme.secondaryColor};
  --card-tertiary-color: ${scheme.tertiaryColor};
}
.card-preview.${cls} {
  background: var(--card-secondary-color);
}
.card-preview.${cls} .card-preview-mask {
  background-color: var(--card-primary-color) !important;
}
.card-preview.${cls} .card-preview-base {
  background-color: var(--card-tertiary-color) !important;
}
.card-preview.${cls} .card-preview-fallback {
  color: var(--card-primary-color);
}
.level-frame.${cls},
.unique-card-frame.${cls} {
  background: var(--card-secondary-color) !important;
  border-color: var(--card-secondary-color) !important;
}
.level-frame.${cls} .char-glyph,
.level-frame.${cls} .level-badge,
.unique-card-frame.${cls} .char-glyph {
  color: var(--card-primary-color);
}
.level-frame.${cls} .level-bar-fill {
  background: var(--card-primary-color) !important;
}
`);
  }
  return blocks.join('\n');
}

function injectCardStyleSheet() {
  const styleId = 'cao-card-style-rules';
  const existing = document.getElementById(styleId);
  const css = buildColorSchemeCssRules();
  if (existing) {
    existing.textContent = css;
    return;
  }
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = css;
  document.head.appendChild(style);
}
