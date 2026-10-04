/**
 * 字库管理模块
 *
 * 字库源数据见 js/zi.js + js/zi-catalog-*.js（Zi 结构）。
 * 设置面板仍可编辑草体汉字列表（localStorage）；运行时从 catalog 补全 metadata。
 */

const STORAGE_KEY = 'caoshu-characters';
const MODE_STORAGE_KEY = 'caoshu-learning-mode';
const SCRIPT_FILTER_STORAGE_KEY = 'caoshu-script-filter';

/** 书体标识 */
const SCRIPT = {
  cao: 'cao',
  kai: 'kai',
  ming: 'ming',
  hei: 'hei',
};

/** 书体筛选：单书体或「集」(全部) */
const SCRIPT_FILTER = {
  cao: 'cao',
  kai: 'kai',
  ming: 'ming',
  hei: 'hei',
  all: 'all',
};

/** 筛选按钮短标签 */
const SCRIPT_FILTER_LABEL = {
  [SCRIPT_FILTER.cao]: '草',
  [SCRIPT_FILTER.kai]: '楷',
  [SCRIPT_FILTER.ming]: '明',
  [SCRIPT_FILTER.hei]: '黑',
  [SCRIPT_FILTER.all]: '集',
};

/** 书体短标签（统计用；草体不额外加字） */
const SCRIPT_LABEL = {
  [SCRIPT.cao]: '',
  [SCRIPT.kai]: '楷',
  [SCRIPT.ming]: '明',
  [SCRIPT.hei]: '黑',
};

/** 书体中文名 */
const SCRIPT_NAME = {
  [SCRIPT.cao]: '草体',
  [SCRIPT.kai]: '楷书',
  [SCRIPT.ming]: '明体',
  [SCRIPT.hei]: '黑体',
};

/** 各书体图片目录（相对 app/cao/） */
const SCRIPT_IMAGE_DIR = {
  [SCRIPT.cao]: 'images/characters',
  [SCRIPT.kai]: 'images/characters/kai',
  [SCRIPT.ming]: 'images/characters/ming',
  [SCRIPT.hei]: 'images/characters/hei',
};

/**
 * 时间模式概率
 * - 倒数 8 字以外（头）：合计 1/10，平分
 * - 倒数 8 字以内（尾）：合计 9/10，越近越高
 */
const TIME_HEAD_PROB = 1 / 10;
const TIME_TAIL_PROBS = [80, 91, 100, 109, 118, 127, 135, 140].map((n) => n / 1000);
const TIME_TAIL_COUNT = TIME_TAIL_PROBS.length;

/**
 * 解析输入文本为汉字数组
 * 自动去除空格、换行，仅保留 CJK 统一汉字
 */
function parseCharacters(input) {
  if (!input || typeof input !== 'string') return [];

  const chars = [];
  for (const ch of input.replace(/\s+/g, '')) {
    if (/\p{Script=Han}/u.test(ch)) {
      chars.push(ch);
    }
  }
  return chars;
}

/**
 * 将字库源数组编译为单字数组（兼容旧 string[] 格式）
 */
function compileCharacters(sources) {
  if (!Array.isArray(sources)) return [];

  const paragraph = sources
    .map((item) => {
      if (typeof item === 'string') return item.replace(/\s+/g, '');
      if (item instanceof Zi) return item.char;
      if (item && typeof item === 'object' && item.char) return String(item.char);
      return String(item).replace(/\s+/g, '');
    })
    .join('');

  return parseCharacters(paragraph);
}

/** 兼容旧版 script 标识 */
function normalizeScript(script) {
  if (script === 'cursive' || script === 'cao' || !script) return SCRIPT.cao;
  if (script === 'song') return SCRIPT.ming;
  return script;
}

/** 条目唯一键：优先 Zi id，兼容无 id 的旧条目 */
function entryKey(entry) {
  if (!entry) return '';
  if (entry.id) return entry.id;
  const script = normalizeScript(entry.script);
  if (script === SCRIPT.cao) return entry.char;
  return `${entry.char}@${script}`;
}

/** 将汉字列表转为指定书体的最小条目（无 catalog 时） */
function toEntries(chars, script) {
  const normalized = normalizeScript(script);
  return chars.map((ch) => ({
    id: '',
    char: ch,
    script: normalized,
    alternatives: [],
    calligrapher: '',
    work: '',
  }));
}

/** 读取各书体 Zi catalog 条目 */
function getCatalogEntries(script) {
  const normalized = normalizeScript(script);
  if (normalized === SCRIPT.cao && typeof getDefaultZiCaoEntries === 'function') {
    return getDefaultZiCaoEntries();
  }
  if (normalized === SCRIPT.kai && typeof getDefaultZiKaiEntries === 'function') {
    return getDefaultZiKaiEntries();
  }
  return [];
}

/** 默认草体主字列表（Zi catalog） */
function getDefaultCaoCharacters() {
  if (typeof getDefaultCaoCharList === 'function') {
    return getDefaultCaoCharList();
  }
  return compileCharacters([]);
}

/**
 * 合并各书体字库为完整练习条目列表
 * @param {string[]} caoChars 草体/自定义池（可被设置面板覆盖）
 */
function buildLibrary(caoChars) {
  const caoCatalog = getCatalogEntries(SCRIPT.cao);
  const caoEntries = typeof enrichEntriesFromCatalog === 'function'
    ? enrichEntriesFromCatalog(caoChars, caoCatalog.map((entry) => ({
      ...entry,
      script: normalizeScript(entry.script),
    })), SCRIPT.cao)
    : toEntries(caoChars, SCRIPT.cao);

  for (const entry of caoEntries) {
    entry.script = SCRIPT.cao;
  }

  return [
    ...caoEntries,
    ...getCatalogEntries(SCRIPT.kai),
    ...getCatalogEntries(SCRIPT.ming),
    ...getCatalogEntries(SCRIPT.hei),
  ];
}

/** 按书体筛选练习库；集 = 全部 */
function filterLibrary(entries, filter) {
  if (!filter || filter === SCRIPT_FILTER.all) return entries;
  return entries.filter((entry) => normalizeScript(entry.script) === filter);
}

/** 从 localStorage 读取可编辑草体池；若无则使用 Zi catalog */
function loadEditableCharacters() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        if (typeof parsed[0] === 'string') return parsed;
        return parsed
          .filter((item) => {
            if (!item || !item.char) return false;
            const script = normalizeScript(item.script || item.style);
            return script === SCRIPT.cao;
          })
          .map((item) => item.char);
      }
    } catch {
      // 降级到默认字库
    }
  }
  return getDefaultCaoCharacters();
}

/** 加载完整练习字库（草体池 + 各书体 catalog） */
function loadCharacters() {
  return buildLibrary(loadEditableCharacters());
}

/** 保存可编辑草体池到 localStorage（仍为汉字 string[]） */
function saveCharacters(characters) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(characters));
}

/** 读取书体筛选：cao | kai | ming | hei | all；默认草体 */
function loadScriptFilter() {
  const stored = localStorage.getItem(SCRIPT_FILTER_STORAGE_KEY);
  if (stored && Object.values(SCRIPT_FILTER).includes(stored)) return stored;
  return SCRIPT_FILTER.cao;
}

/** 保存书体筛选 */
function saveScriptFilter(filter) {
  localStorage.setItem(SCRIPT_FILTER_STORAGE_KEY, filter);
}

/** 获取默认顺序的条目键列表（时间模式权重用） */
function getDefaultOrder() {
  return buildLibrary(getDefaultCaoCharacters()).map(entryKey);
}

/**
 * 构建时间模式的权重表
 * 头合计 1/10 平分；尾（最多 8 字）合计 9/10，按 TIME_TAIL_PROBS 分配
 */
function buildTimeWeights(order) {
  const weights = new Map();
  if (order.length === 0) return weights;

  const tailCount = Math.min(TIME_TAIL_COUNT, order.length);
  const headCount = order.length - tailCount;
  const rawTail = TIME_TAIL_PROBS.slice(TIME_TAIL_COUNT - tailCount);
  const rawSum = rawTail.reduce((sum, p) => sum + p, 0);
  const tailBudget = headCount > 0 ? 1 - TIME_HEAD_PROB : 1;
  const scale = rawSum > 0 ? tailBudget / rawSum : 0;
  const headWeight = headCount > 0 ? TIME_HEAD_PROB / headCount : 0;

  for (let i = 0; i < headCount; i++) {
    weights.set(order[i], headWeight);
  }

  for (let i = 0; i < tailCount; i++) {
    const index = order.length - tailCount + i;
    weights.set(order[index], rawTail[i] * scale);
  }

  return weights;
}

/** 读取学习模式：'default' | 'time' | 'recognize' */
function loadLearningMode() {
  const stored = localStorage.getItem(MODE_STORAGE_KEY);
  if (stored === 'time' || stored === 'recognize') return stored;
  return 'default';
}

/** 保存学习模式 */
function saveLearningMode(mode) {
  localStorage.setItem(MODE_STORAGE_KEY, mode);
}

/** 将字库格式化为可编辑的文本（每行若干字，便于阅读） */
function formatForInput(characters) {
  const perLine = 10;
  const lines = [];
  for (let i = 0; i < characters.length; i += perLine) {
    lines.push(characters.slice(i, i + perLine).join(''));
  }
  return lines.join('\n');
}

/** 按主字或 id 查找 Zi entry */
function findZiEntry(charOrId, script = SCRIPT.cao) {
  const normalized = normalizeScript(script);
  const catalogs = [
    ...getCatalogEntries(SCRIPT.cao),
    ...getCatalogEntries(SCRIPT.kai),
    ...getCatalogEntries(SCRIPT.ming),
    ...getCatalogEntries(SCRIPT.hei),
  ];

  for (const entry of catalogs) {
    if (entry.id && entry.id === charOrId) return entry;
  }

  for (const entry of catalogs) {
    if (normalizeScript(entry.script) !== normalized) continue;
    if (entry.char === charOrId) return entry;
    if ((entry.alternatives || []).includes(charOrId)) return entry;
  }
  return null;
}

/** 加载各 catalog 后为未手写 id 的条目生成稳定 id */
function initZiCatalogIds() {
  if (typeof finalizeZiCatalog !== 'function') return;
  const groups = [];
  if (typeof DEFAULT_ZI_CAO !== 'undefined') groups.push(DEFAULT_ZI_CAO);
  if (typeof DEFAULT_ZI_KAI !== 'undefined') groups.push(DEFAULT_ZI_KAI);
  finalizeZiCatalog(groups);
}

initZiCatalogIds();
