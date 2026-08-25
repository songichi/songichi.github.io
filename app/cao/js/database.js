/**
 * 字库管理模块
 * 支持有空格 / 无空格两种输入方式
 *
 * 书体分表：在下方各 DEFAULT_CHARACTERS_* 中直接粘贴汉字即可，
 * 运行时会合并为带 script 的条目。设置面板仅编辑草体/自定义池。
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
 *   倒数第八 8%、倒数第一 14%；当中按近期程度线性铺开
 *   倒数第八 → 第一：8.0% 9.1% 10.0% 10.9% 11.8% 12.7% 13.5% 14.0%
 */
const TIME_HEAD_PROB = 1 / 10;
const TIME_TAIL_PROBS = [80, 91, 100, 109, 118, 127, 135, 140].map((n) => n / 1000);
const TIME_TAIL_COUNT = TIME_TAIL_PROBS.length;

/**
 * 默认字库 · 草体（可直接修改此数组）
 * 每个元素可以是单个汉字，也可以是多个汉字组成的字符串
 */
const DEFAULT_CHARACTERS_cao = [
  '是 地 明 有 示',

  '心 長 分 令 專 風 相 須 与 使 即 所 解 節 等 問 包 五 交 此',
  '聞 猶 服 器 章 甚 鳥 永 成 既 記 欲 乖 具 劳 属 巨 高 温 前',
  '謂 去 還 常 則 莫 衆 单 逢 卒 斷 設 流 盡 孤 望 術 色 直 斯',
  '或 顯 老 疑 說 揔 酸 識 湌 務 異 處 然 對 州',
];

/**
 * 默认字库 · 楷书
 * 写法与 DEFAULT_CHARACTERS_cao 相同，粘贴汉字即可
 */
const DEFAULT_CHARACTERS_kai = [
  // 例如：'永 和 九 年',
];

/**
 * 默认字库 · 明体（预留）
 */
const DEFAULT_CHARACTERS_ming = [
];

/**
 * 默认字库 · 黑体（预留）
 */
const DEFAULT_CHARACTERS_hei = [
];

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
 * 将字库源数组编译为单字数组
 * 先把所有元素拼成一段无空格的文本，再逐字拆分为汉字列表
 */
function compileCharacters(sources) {
  if (!Array.isArray(sources)) return [];

  const paragraph = sources
    .map((item) => String(item).replace(/\s+/g, ''))
    .join('');

  return parseCharacters(paragraph);
}

/** 兼容旧版 script 标识 */
function normalizeScript(script) {
  if (script === 'cursive' || script === 'cao' || !script) return SCRIPT.cao;
  if (script === 'song') return SCRIPT.ming;
  return script;
}

/** 条目唯一键：草体用汉字本身，其他书体为「字@script」 */
function entryKey(entry) {
  if (!entry) return '';
  const script = normalizeScript(entry.script);
  if (script === SCRIPT.cao) return entry.char;
  return `${entry.char}@${script}`;
}

/** 将汉字列表转为指定书体的条目 */
function toEntries(chars, script) {
  return chars.map((ch) => ({ char: ch, script }));
}

/**
 * 合并各书体字库为完整练习条目列表
 * @param {string[]} caoChars 草体/自定义池（可被设置面板覆盖）
 */
function buildLibrary(caoChars) {
  return [
    ...toEntries(caoChars, SCRIPT.cao),
    ...toEntries(compileCharacters(DEFAULT_CHARACTERS_kai), SCRIPT.kai),
    ...toEntries(compileCharacters(DEFAULT_CHARACTERS_ming), SCRIPT.ming),
    ...toEntries(compileCharacters(DEFAULT_CHARACTERS_hei), SCRIPT.hei),
  ];
}

/** 按书体筛选练习库；集 = 全部 */
function filterLibrary(entries, filter) {
  if (!filter || filter === SCRIPT_FILTER.all) return entries;
  return entries.filter((entry) => normalizeScript(entry.script) === filter);
}

/** 从 localStorage 读取可编辑草体池；若无则使用默认草体 */
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
            const script = normalizeScript(item.script);
            return script === SCRIPT.cao;
          })
          .map((item) => item.char);
      }
    } catch {
      // 降级到默认字库
    }
  }
  return compileCharacters(DEFAULT_CHARACTERS_cao);
}

/** 加载完整练习字库（草体池 + 各 DEFAULT_* 书体表） */
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
  return buildLibrary(compileCharacters(DEFAULT_CHARACTERS_cao)).map(entryKey);
}

/**
 * 构建时间模式的权重表
 * 头合计 1/10 平分；尾（最多 8 字）合计 9/10，按 TIME_TAIL_PROBS 分配
 * 字库短于 8 时，取最靠近的若干尾权并按有无「头」缩放到 9/10 或 1
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

/** 读取学习模式：'default' | 'time' */
function loadLearningMode() {
  const stored = localStorage.getItem(MODE_STORAGE_KEY);
  return stored === 'time' ? 'time' : 'default';
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
