/**
 * 默认字库 · 真书（Zi 结构）
 *
 * 真书与草书不同：字池只有大约 10–20 个字，靠大量 style 展开。
 * 本文件分两处维护：
 * - ZHEN_ZI_CHARS：字池（主字 / unicode / 异体）
 * - ZHEN_ZI_STYLES：风格（id、form 书体、calligrapher 书法家、variation 碑帖/风格名）
 *
 * 练习条目 = 每个 style × 字池全部字。
 * form：kai | print-kai | ming | song | hei
 * 风格辨认 id：zk / zs / zm / zh / zp + 三位序号（如 zk001、zs003、zm020、zh090）
 * 用户记录键：字 unicode 码位（5 位十六进制）+ 风格 id，如 06C38+zk001
 * 字形图：images/characters/zhen/{styleId}_{字}.png（仅有图的条目可被练习选中）
 */

const ZHEN_ZI_DEFAULTS = {
  style: 'zhen',
  form: 'kai',
  calligrapher: '未录入',
  variation: '未录入',
  work: '未录入',
};

/** 风格 id 前缀：楷 zk / 印刷楷 zp / 明 zm / 宋 zs / 黑 zh */
const ZHEN_FORM_STYLE_PREFIX = {
  kai: 'zk',
  'print-kai': 'zp',
  ming: 'zm',
  song: 'zs',
  hei: 'zh',
};

/**
 * 真书字池（各 style 默认都会展示这些字）
 * 所有 unicode 必须为正确 unicode
 */
const ZHEN_ZI_CHARS = [
  { char: '永', unicode: 'U+6C38' },
  { char: '無', unicode: 'U+7121', alternatives: ['无'] },
  { char: '道', unicode: 'U+9053' },
  { char: '法', unicode: 'U+6CD5' },
  { char: '今', unicode: 'U+4ECA' },
  { char: '書', unicode: 'U+66F8' },
  { char: '之', unicode: 'U+4E4B' },
  { char: '國', unicode: 'U+570B' },
  { char: '安', unicode: 'U+5B89' },
  { char: '萬', unicode: 'U+842C' },
  { char: '感', unicode: 'U+611F' },
  { char: '也', unicode: 'U+4E5F' },
  { char: '故', unicode: 'U+6545' },
  { char: '陽', unicode: 'U+967D' },

];

/**
 * 真书风格
 * id：辨认 id（手写优先；缺省按 form 前缀顺序补全）
 * form：书体；calligrapher：书法家；variation：风格（一般为碑帖名）
 */
const ZHEN_ZI_STYLES = [
  { id: 'zk001', form: 'kai', calligrapher: '颜真卿', variation: '多寶塔碑' },
  { id: 'zm001', form: 'ming', calligrapher: '森澤', variation: '龍明體' },
];

function normalizeZhenStyleForm(form) {
  const raw = String(form || '').trim().toLowerCase();
  if (raw === 'printkai' || raw === 'print-kai' || raw === '印刷楷书') return 'print-kai';
  if (raw === 'ming' || raw === '明' || raw === '明体') return 'ming';
  if (raw === 'song' || raw === '宋' || raw === '宋体') return 'song';
  if (raw === 'hei' || raw === '黑' || raw === '黑体') return 'hei';
  if (raw === 'kai' || raw === '楷' || raw === '楷书' || !raw) return 'kai';
  return raw;
}

function parseZhenStyleId(id) {
  const m = /^z([kpmsh])(\d{3})$/i.exec(String(id || '').trim());
  if (!m) return null;
  return { prefix: `z${m[1].toLowerCase()}`, n: parseInt(m[2], 10) };
}

function formatZhenStyleId(prefix, n) {
  return `${prefix}${String(Math.max(1, Math.floor(Number(n) || 1))).padStart(3, '0')}`;
}

function zhenFormStylePrefix(form) {
  return ZHEN_FORM_STYLE_PREFIX[normalizeZhenStyleForm(form)] || 'zk';
}

/** 为未手写 id 的风格按 form 前缀补全，已占用序号跳过 */
function assignZhenStyleIds(styles) {
  const list = Array.isArray(styles) ? styles : [];
  const used = new Set();
  const next = { zk: 1, zp: 1, zm: 1, zs: 1, zh: 1 };
  for (const style of list) {
    const parsed = parseZhenStyleId(style?.id);
    if (!parsed) continue;
    const id = formatZhenStyleId(parsed.prefix, parsed.n);
    used.add(id);
    if (parsed.n >= next[parsed.prefix]) next[parsed.prefix] = parsed.n + 1;
  }
  for (const style of list) {
    const parsed = parseZhenStyleId(style?.id);
    if (parsed) {
      style.id = formatZhenStyleId(parsed.prefix, parsed.n);
      continue;
    }
    const prefix = zhenFormStylePrefix(style?.form);
    let n = next[prefix] || 1;
    let id = formatZhenStyleId(prefix, n);
    while (used.has(id)) {
      n += 1;
      id = formatZhenStyleId(prefix, n);
    }
    style.id = id;
    used.add(id);
    next[prefix] = n + 1;
  }
  return list;
}

assignZhenStyleIds(ZHEN_ZI_STYLES);

function zhenStyleKey(style) {
  const sid = String(style?.styleId || '').trim().toLowerCase();
  if (parseZhenStyleId(sid)) return sid;
  const id = String(style?.id || '').trim().toLowerCase();
  if (parseZhenStyleId(id)) return id;
  const form = normalizeZhenStyleForm(style?.form);
  const calligrapher = String(style?.calligrapher || '').trim();
  const variation = String(style?.variation || style?.work || '').trim();
  return `${form}\0${calligrapher}\0${variation}`;
}

/** 用户记录键：unicode 码位 5 位 + 风格 id，如 06C38+zk001 */
function zhenPracticeKey(unicodeOrChar, styleId) {
  const sid = String(styleId || '').trim().toLowerCase();
  let code5 = '';
  const raw = String(unicodeOrChar || '').trim();
  const hex = raw.replace(/^U\+/i, '');
  if (/^[0-9A-F]{4,5}$/i.test(hex)) {
    code5 = hex.toUpperCase().padStart(5, '0');
  } else if (raw) {
    const cp = raw.codePointAt(0) || 0;
    code5 = cp.toString(16).toUpperCase().padStart(5, '0');
  }
  if (!code5 || !sid) return '';
  return `${code5}+${sid}`;
}

function zhenStyleLabel(style) {
  const form = normalizeZhenStyleForm(style?.form);
  const formLabel = (typeof ZHEN_FORM_LABEL !== 'undefined' && ZHEN_FORM_LABEL[form])
    ? ZHEN_FORM_LABEL[form]
    : form;
  const calligrapher = String(style?.calligrapher || '').trim();
  const variation = String(style?.variation || style?.work || '').trim();
  return [formLabel, calligrapher, variation].filter(Boolean).join(' · ');
}

/** 简写：创建一条真书 Zi（unicode 未写时由 char 自动补全） */
function zhenZi(char, extras = {}) {
  const cp = char.codePointAt(0) || 0;
  const unicode = extras.unicode || `U+${cp.toString(16).toUpperCase()}`;
  const codePoint = extras.codePoint || cp;
  const form = normalizeZhenStyleForm(extras.form);
  const variation = extras.variation || extras.work || ZHEN_ZI_DEFAULTS.variation;
  const styleId = extras.styleId || '';
  return createZi({
    char,
    codePoint,
    unicode,
    ...ZHEN_ZI_DEFAULTS,
    ...extras,
    style: 'zhen',
    form,
    variation,
    work: extras.work || variation,
    styleId,
  });
}

/** 字池 × 风格 → 练习 / 记录用 Zi 列表 */
function expandZhenCatalog(chars = ZHEN_ZI_CHARS, styles = ZHEN_ZI_STYLES) {
  return styles.flatMap((style) => (
    chars.map((ch) => zhenZi(ch.char, {
      unicode: ch.unicode,
      alternatives: ch.alternatives || [],
      form: style.form,
      calligrapher: style.calligrapher,
      variation: style.variation,
      work: style.variation,
      styleId: style.id,
    }))
  ));
}

/**
 * 默认真书字库（每个 style 含字池全部字；顺序：风格序，再字池序）
 */
const DEFAULT_ZI_ZHEN = createZiList(expandZhenCatalog());

function getZhenZiChars() {
  return ZHEN_ZI_CHARS;
}

function getZhenZiStyles() {
  return ZHEN_ZI_STYLES;
}

function getDefaultZiZhenEntries() {
  return DEFAULT_ZI_ZHEN.map((zi) => zi.toEntry());
}

/** 按风格分组（用于真书记录 tab） */
function groupZhenEntriesByStyle(entries) {
  const styles = getZhenZiStyles();
  const list = Array.isArray(entries) ? entries : getDefaultZiZhenEntries();
  return styles.map((style) => {
    const key = zhenStyleKey(style);
    const items = list.filter((entry) => zhenStyleKey(entry) === key);
    return {
      style,
      key,
      styleId: style.id,
      label: zhenStyleLabel(style),
      items,
    };
  });
}
