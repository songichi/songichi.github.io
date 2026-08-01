/**
 * 字库管理模块
 * 支持有空格 / 无空格两种输入方式
 */

const STORAGE_KEY = 'caoshu-characters';
const MODE_STORAGE_KEY = 'caoshu-learning-mode';

/** 时间模式下，倒数第 n 个字的固定概率（倒数第七 → 1/10，倒数第一～第三 → 1/7） */
const TIME_TAIL_PROBS = [1 / 10, 1 / 9, 1 / 8, 1 / 7, 1 / 7, 1 / 7, 1 / 7];
const TIME_TAIL_COUNT = TIME_TAIL_PROBS.length;

/**
 * 默认字库（可直接修改此数组）
 * 每个元素可以是单个汉字，也可以是多个汉字组成的字符串
 */
const DEFAULT_CHARACTERS = [
  '是 地 明 有',

  '心 長 分 令 專 風 相 須 与 使 即 所 解 節 等 問 巴 五 交 此',
  '聞 猶 服 器 章 甚 鳥 永 成 既 記 欲 乖 具 劳 属 巨 高 温 前',
  '謂 去 還 常 則 莫 衆 单 逢 卒 斷 設 流 盡',
 
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

/** 从 localStorage 读取字库，若无则使用默认值 */
function loadCharacters() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      // 降级到默认字库
    }
  }
  return compileCharacters(DEFAULT_CHARACTERS);
}

/** 保存字库到 localStorage */
function saveCharacters(characters) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(characters));
}

/** 获取 DEFAULT_CHARACTERS 编译后的顺序列表 */
function getDefaultOrder() {
  return compileCharacters(DEFAULT_CHARACTERS);
}

/**
 * 构建时间模式的权重表
 * 最后 7 字固定概率，其余汉字平分剩余概率
 */
function buildTimeWeights(order) {
  const weights = new Map();
  if (order.length === 0) return weights;

  const tailCount = Math.min(TIME_TAIL_COUNT, order.length);
  const headCount = order.length - tailCount;
  const fixedSum = TIME_TAIL_PROBS.slice(TIME_TAIL_COUNT - tailCount).reduce((sum, p) => sum + p, 0);
  const remainder = Math.max(0, 1 - fixedSum);
  const headWeight = headCount > 0 ? remainder / headCount : 0;

  for (let i = 0; i < headCount; i++) {
    weights.set(order[i], headWeight);
  }

  for (let i = 0; i < tailCount; i++) {
    const index = order.length - tailCount + i;
    weights.set(order[index], TIME_TAIL_PROBS[TIME_TAIL_COUNT - tailCount + i]);
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
