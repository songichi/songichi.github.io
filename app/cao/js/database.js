/**
 * 字库管理模块
 *
 * 字库源数据见 js/zi.js + js/zi-catalog-*.js（Zi 结构）。
 * 设置面板仍可编辑草体汉字列表（localStorage）；运行时从 catalog 补全 metadata。
 */

const STORAGE_KEY = 'caoshu-characters';
const MODE_STORAGE_KEY = 'caoshu-learning-mode';
const SCRIPT_FILTER_STORAGE_KEY = 'caoshu-script-filter';

/** 书体标识（练习筛选：草 / 真 / 集） */
const SCRIPT = {
  cao: 'cao',
  zhen: 'zhen',
};

/** 真书细分（均写在 zi-catalog-zhen.js） */
const ZHEN_FORM = {
  kai: 'kai',
  printKai: 'print-kai',
  ming: 'ming',
  song: 'song',
  hei: 'hei',
};

const ZHEN_FORM_LABEL = {
  [ZHEN_FORM.kai]: '楷书',
  [ZHEN_FORM.printKai]: '印刷楷书',
  [ZHEN_FORM.ming]: '明体',
  [ZHEN_FORM.song]: '宋体',
  [ZHEN_FORM.hei]: '黑体',
};

/** 书体筛选：单书体或「集」(全部) */
const SCRIPT_FILTER = {
  cao: 'cao',
  zhen: 'zhen',
  all: 'all',
};

/** 筛选按钮短标签 */
const SCRIPT_FILTER_LABEL = {
  [SCRIPT_FILTER.cao]: '草',
  [SCRIPT_FILTER.zhen]: '真',
  [SCRIPT_FILTER.all]: '集',
};

/** 书体短标签（统计用；草/真均只显示汉字，不加后缀） */
const SCRIPT_LABEL = {
  [SCRIPT.cao]: '',
  [SCRIPT.zhen]: '',
};

/** 书体中文名 */
const SCRIPT_NAME = {
  [SCRIPT.cao]: '草体',
  [SCRIPT.zhen]: '真书',
};

/** 各书体图片目录（相对 app/cao/） */
const SCRIPT_IMAGE_DIR = {
  [SCRIPT.cao]: 'images/characters/cao',
  [SCRIPT.zhen]: 'images/characters/zhen',
};

/** 真书字形目录：统一 images/characters/zhen，文件名 {styleId}_{字} */
const ZHEN_FORM_IMAGE_DIR = {
  [ZHEN_FORM.kai]: 'images/characters/zhen',
  [ZHEN_FORM.printKai]: 'images/characters/zhen',
  [ZHEN_FORM.ming]: 'images/characters/zhen',
  [ZHEN_FORM.song]: 'images/characters/zhen',
  [ZHEN_FORM.hei]: 'images/characters/zhen',
};

const GLYPH_IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp'];

/** 字形是否存在的探测缓存（键：glyphAvailabilityCacheKey） */
const glyphImageExistsCache = new Map();

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

/** 兼容旧版 script 标识：楷/明/黑/宋均归真书 */
function normalizeZhenForm(form) {
  const raw = String(form || '').trim().toLowerCase();
  if (raw === 'printkai' || raw === 'print-kai' || raw === '印刷楷书') return ZHEN_FORM.printKai;
  if (raw === 'ming' || raw === '明' || raw === '明体') return ZHEN_FORM.ming;
  if (raw === 'song' || raw === '宋' || raw === '宋体') return ZHEN_FORM.song;
  if (raw === 'hei' || raw === '黑' || raw === '黑体') return ZHEN_FORM.hei;
  if (raw === 'kai' || raw === '楷' || raw === '楷书') return ZHEN_FORM.kai;
  return ZHEN_FORM.kai;
}

function normalizeScript(script) {
  if (script === 'cursive' || script === 'cao' || !script) return SCRIPT.cao;
  if (
    script === 'zhen'
    || script === 'kai'
    || script === 'ming'
    || script === 'hei'
    || script === 'song'
    || script === 'print-kai'
    || script === 'printKai'
  ) {
    return SCRIPT.zhen;
  }
  return script;
}

function resolveScriptImageDir(entry) {
  const script = normalizeScript(entry?.script);
  if (script === SCRIPT.zhen) {
    return SCRIPT_IMAGE_DIR[SCRIPT.zhen];
  }
  return SCRIPT_IMAGE_DIR[script] || SCRIPT_IMAGE_DIR[SCRIPT.cao];
}

/** 真书字形文件名主干：{styleId}_{字}，如 zk001_永 */
function zhenGlyphImageBasenames(entry) {
  const styleId = String(entry?.styleId || '').trim().toLowerCase();
  if (!styleId) return [];
  const forms = typeof glyphImageCharForms === 'function'
    ? glyphImageCharForms(entry?.char, entry)
    : [entry?.char, ...(entry?.alternatives || [])].filter(Boolean);
  const names = [];
  for (const form of forms) {
    const ch = String(form || '').trim();
    if (ch) names.push(`${styleId}_${ch}`);
  }
  return names;
}

function glyphAvailabilityCacheKey(entry) {
  if (!entry) return '';
  if (entry.id) return String(entry.id);
  const script = normalizeScript(entry.script);
  if (script === SCRIPT.zhen) {
    return `zhen:${entry.styleId || ''}:${entry.char || ''}`;
  }
  return `${script}:${entry.char || ''}`;
}

/**
 * 资源路径前缀：练习页在 app/cao/ 为空；用户页在 app/cao/user/ 为 ../
 * 各页可设全局 CAO_ASSET_PREFIX 覆盖。
 */
function caoAssetPrefix() {
  if (typeof CAO_ASSET_PREFIX === 'string') return CAO_ASSET_PREFIX;
  return '';
}

/**
 * 字形图片候选路径
 * - 草体：images/characters/cao/{字}.ext
 * - 真书：images/characters/zhen/{styleId}_{字}.ext
 */
function getGlyphImageCandidates(entry) {
  if (!entry) return [];
  const prefix = caoAssetPrefix();
  const dir = resolveScriptImageDir(entry);
  const script = normalizeScript(entry.script);
  const basenames = script === SCRIPT.zhen
    ? zhenGlyphImageBasenames(entry)
    : (typeof glyphImageCharForms === 'function'
      ? glyphImageCharForms(entry.char, entry)
      : [entry.char, ...(entry.alternatives || [])].filter(Boolean));

  const paths = [];
  const seen = new Set();
  for (const raw of basenames) {
    const name = String(raw || '').trim();
    if (!name) continue;
    for (const ext of GLYPH_IMAGE_EXTENSIONS) {
      const path = `${prefix}${dir}/${name}.${ext}`;
      if (seen.has(path)) continue;
      seen.add(path);
      paths.push(path);
    }
  }
  return paths;
}

/** 探测字形图是否存在（结果写入 glyphImageExistsCache） */
function probeGlyphImageExists(entry) {
  const key = glyphAvailabilityCacheKey(entry);
  if (!key) return Promise.resolve(false);
  if (glyphImageExistsCache.has(key)) {
    return Promise.resolve(glyphImageExistsCache.get(key));
  }

  const candidates = getGlyphImageCandidates(entry);
  if (candidates.length === 0) {
    glyphImageExistsCache.set(key, false);
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    let index = 0;
    const tryNext = () => {
      if (index >= candidates.length) {
        glyphImageExistsCache.set(key, false);
        resolve(false);
        return;
      }
      const path = candidates[index++];
      const probe = new Image();
      probe.onload = () => {
        glyphImageExistsCache.set(key, true);
        resolve(true);
      };
      probe.onerror = tryNext;
      probe.src = path;
    };
    tryNext();
  });
}

/** 练习库：真书仅保留有字形图的条目；草体原样保留 */
async function filterPracticeEntriesByGlyph(entries) {
  const list = Array.isArray(entries) ? entries : [];
  await Promise.all(list.map((entry) => {
    if (normalizeScript(entry?.script) !== SCRIPT.zhen) return Promise.resolve(false);
    return probeGlyphImageExists(entry);
  }));
  return list.filter((entry) => {
    if (normalizeScript(entry?.script) !== SCRIPT.zhen) return true;
    const key = glyphAvailabilityCacheKey(entry);
    return glyphImageExistsCache.get(key) === true;
  });
}

/** 卡面子目录名：cao / kai / ming / hei / zhen */
function cardImageSubdir(script, form) {
  const family = normalizeScript(script);
  if (family !== SCRIPT.zhen) return family === SCRIPT.cao ? 'cao' : family;
  const zhenForm = normalizeZhenForm(form || script);
  if (zhenForm === ZHEN_FORM.hei) return 'hei';
  if (zhenForm === ZHEN_FORM.ming || zhenForm === ZHEN_FORM.song) return 'ming';
  if (zhenForm === ZHEN_FORM.kai || zhenForm === ZHEN_FORM.printKai) return 'kai';
  return 'zhen';
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
  if (normalized === SCRIPT.zhen && typeof getDefaultZiZhenEntries === 'function') {
    return getDefaultZiZhenEntries();
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
    ...getCatalogEntries(SCRIPT.zhen),
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

/** 读取书体筛选：cao | zhen | all；旧的楷/明/黑视为真 */
function loadScriptFilter() {
  const stored = localStorage.getItem(SCRIPT_FILTER_STORAGE_KEY);
  if (stored === 'kai' || stored === 'ming' || stored === 'hei' || stored === 'song') {
    return SCRIPT_FILTER.zhen;
  }
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

/** 可选学习模式（UI）；`time` 仍可出现在历史 session 中，但练习页已隐藏入口 */
const LEARNING_MODE = {
  default: 'default',
  random: 'random',
  time: 'time',
  recognize: 'recognize',
};

/** 练习页可选模式（不含已隐藏的时间） */
const LEARNING_MODE_SELECTABLE = [
  LEARNING_MODE.default,
  LEARNING_MODE.random,
  LEARNING_MODE.recognize,
];

const LEARNING_MODE_LABEL = {
  [LEARNING_MODE.default]: '默认',
  [LEARNING_MODE.random]: '随机',
  [LEARNING_MODE.time]: '时间',
  [LEARNING_MODE.recognize]: '识字',
};

function formatLearningModeLabel(mode) {
  return LEARNING_MODE_LABEL[mode] || LEARNING_MODE_LABEL[LEARNING_MODE.default];
}

/**
 * 读取学习模式：'default' | 'random' | 'recognize'
 * 旧存盘 `time` 映射为 default（时间模式 UI 已隐藏；历史 session.mode=time 仍保留）
 */
function loadLearningMode() {
  const stored = localStorage.getItem(MODE_STORAGE_KEY);
  if (stored === LEARNING_MODE.recognize || stored === LEARNING_MODE.random) return stored;
  // time：入口已隐藏，回退默认；数据里的 time session 不受影响
  return LEARNING_MODE.default;
}

/** 保存学习模式 */
function saveLearningMode(mode) {
  if (!LEARNING_MODE_SELECTABLE.includes(mode) && mode !== LEARNING_MODE.time) {
    mode = LEARNING_MODE.default;
  }
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
    ...getCatalogEntries(SCRIPT.zhen),
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
  if (typeof DEFAULT_ZI_ZHEN !== 'undefined') groups.push(DEFAULT_ZI_ZHEN);
  finalizeZiCatalog(groups);
}

initZiCatalogIds();
