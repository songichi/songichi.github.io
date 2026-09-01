/**
 * 字（Zi）— 字库条目模型
 *
 * 字段：
 * - id：全局唯一标识（见 buildZiId / finalizeZiCatalog）
 * - char：主字
 * - codePoint：Unicode 码位（由 char 自动得出，写入 id 中间段）
 * - unicode：U+XXXX 字符串（便于查看）
 * - alternatives、style、calligrapher、work
 *
 * ID 格式：{prefix}.{code5}.{dup2}
 * 示例：c.0662F.01（「是」U+662F，草书第 1 个版本）
 *
 * - prefix：书体单字母 — c 草、k 楷 …
 * - code5：主字 Unicode 的 5 位十六进制（左侧补 0），由字形锁死
 * - dup2：同书体、同码位主字的版本序号（01–99）
 * - catalog 里不写 id；finalize 时按 unicode + dup 自动生成
 */

const ZI_STYLE_ID_PREFIX = {
  cao: 'c',
  kai: 'k',
};

function styleToIdPrefix(style) {
  if (ZI_STYLE_ID_PREFIX[style]) return ZI_STYLE_ID_PREFIX[style];
  if (style && /^[a-z]$/i.test(style)) return style.toLowerCase();
  return 'c';
}

function parseDupFromZiId(id) {
  if (!id) return 0;
  const m = String(id).match(/\.(\d{2})$/);
  return m ? parseInt(m[1], 10) : 0;
}

/**
 * 卡面 PNG 文件名（不含扩展名），目录 images/cardImages/{书体}/
 * - dup 01：{char}，如 服 → id c.0670D.01
 * - dup ≥2：{char}_{dup2}，如 服_02 → id c.0670D.02
 */
function cardImageBasename(char, dup = 1) {
  const ch = String(char || '').trim();
  if (!ch) return '';
  const index = Math.max(1, Math.min(99, Number(dup) || 1));
  if (index === 1) return ch;
  return `${ch}_${String(index).padStart(2, '0')}`;
}

/** 由 Zi id + 主字生成卡面文件名 */
function cardImageBasenameFromZiId(id, char) {
  return cardImageBasename(char, parseDupFromZiId(id) || 1);
}

/** 由 catalog entry 生成卡面文件名（仅主字） */
function cardImageBasenameFromEntry(entry) {
  if (!entry) return '';
  const dup = entry.dup || parseDupFromZiId(entry.id) || 1;
  return cardImageBasename(entry.char, dup);
}

/**
 * 卡面文件名候选：主字优先，再 alternatives（同一 dup）
 * 主字图不存在时可回退到异体/简繁文件名
 * @param {{ char?: string, id?: string, dup?: number, alternatives?: string[] }|null} entry
 * @returns {string[]}
 */
function cardImageBasenamesForEntry(entry) {
  if (!entry) return [];
  const dup = entry.dup || parseDupFromZiId(entry.id) || 1;
  const forms = [];
  const push = (raw) => {
    const ch = String(raw || '').trim();
    if (ch && !forms.includes(ch)) forms.push(ch);
  };
  push(entry.char);
  for (const alt of entry.alternatives || []) push(alt);
  return forms.map((ch) => cardImageBasename(ch, dup)).filter(Boolean);
}

/**
 * 字形图用字符形态：主字 + alternatives
 * @param {string} char
 * @param {{ char?: string, alternatives?: string[] }|null} [entry]
 * @returns {string[]}
 */
function glyphImageCharForms(char, entry = null) {
  const forms = [];
  const push = (raw) => {
    const ch = String(raw || '').trim();
    if (ch && !forms.includes(ch)) forms.push(ch);
  };
  push(char);
  push(entry?.char);
  for (const alt of entry?.alternatives || []) push(alt);
  return forms;
}

function charToCodePoint(char) {
  if (!char) return 0;
  return char.codePointAt(0) || 0;
}

function formatCodePoint5(codePoint) {
  return codePoint.toString(16).toUpperCase().padStart(5, '0');
}

function formatUnicodeLabel(codePoint) {
  if (!codePoint) return '';
  return `U+${codePoint.toString(16).toUpperCase()}`;
}

class Zi {
  constructor({
    id = '',
    char,
    codePoint,
    unicode = '',
    dup = 0,
    alternatives = [],
    style = 'cao',
    calligrapher = '',
    work = '',
  } = {}) {
    this.char = char || '';
    this.codePoint = codePoint || charToCodePoint(this.char);
    this.unicode = unicode || formatUnicodeLabel(this.codePoint);
    this.dup = dup;
    this.alternatives = Array.isArray(alternatives) ? [...alternatives] : [];
    this.style = style || 'cao';
    this.calligrapher = calligrapher || '';
    this.work = work || '';
    this.id = id || '';
  }

  /** 主字 + 所有别名 */
  allForms() {
    const forms = [this.char, ...this.alternatives].filter(Boolean);
    return [...new Set(forms)];
  }

  /** 转为练习库 runtime entry（与 database.js 共用） */
  toEntry() {
    return {
      id: this.id,
      char: this.char,
      codePoint: this.codePoint,
      unicode: this.unicode,
      dup: this.dup,
      script: this.style,
      alternatives: this.alternatives,
      calligrapher: this.calligrapher,
      work: this.work,
    };
  }
}

/** 生成 Zi id：{prefix}.{code5}.{dup2} */
function buildZiId(zi, dupIndex) {
  const prefix = styleToIdPrefix(zi.style || 'cao');
  const code5 = formatCodePoint5(zi.codePoint || charToCodePoint(zi.char));
  const dup2 = String(dupIndex).padStart(2, '0');
  return `${prefix}.${code5}.${dup2}`;
}

/**
 * 为 catalog 写入 dup 与 id（仅当 id 未手写时）
 * dup 按同书体 + 同 codePoint 计数，与数组顺序无关
 */
function finalizeZiCatalog(ziGroups) {
  const dupCountByStyleCode = new Map();

  for (const group of ziGroups) {
    if (!Array.isArray(group)) continue;
    for (const zi of group) {
      if (!(zi instanceof Zi)) continue;

      if (!zi.codePoint) {
        zi.codePoint = charToCodePoint(zi.char);
        zi.unicode = formatUnicodeLabel(zi.codePoint);
      }

      if (zi.id) {
        if (!zi.dup) zi.dup = parseDupFromZiId(zi.id);
        continue;
      }

      if (zi.dup) {
        zi.id = buildZiId(zi, zi.dup);
        continue;
      }

      const prefix = styleToIdPrefix(zi.style || 'cao');
      const dupKey = `${prefix}\0${zi.codePoint}`;
      const dupIndex = (dupCountByStyleCode.get(dupKey) || 0) + 1;
      dupCountByStyleCode.set(dupKey, dupIndex);
      zi.dup = dupIndex;
      zi.id = buildZiId(zi, dupIndex);
    }
  }
}

/** @deprecated 使用 finalizeZiCatalog */
function assignGlobalZiIds(ziGroups) {
  finalizeZiCatalog(ziGroups);
}

/** 工厂：从 plain object / 字符串创建 Zi */
function createZi(input, defaults = {}) {
  if (input instanceof Zi) return input;
  if (typeof input === 'string') {
    return new Zi({ char: input, ...defaults });
  }
  if (input && typeof input === 'object') {
    return new Zi({ ...defaults, ...input });
  }
  return new Zi(defaults);
}

/** 批量创建 */
function createZiList(items, defaults = {}) {
  if (!Array.isArray(items)) return [];
  return items.map((item) => createZi(item, defaults));
}

/** Zi 列表 → practice entries */
function compileZiList(items, defaults = {}) {
  return createZiList(items, defaults).map((zi) => zi.toEntry());
}

/** 由 char 列表 + catalog 补全 metadata（按主字或 alternatives 匹配） */
function enrichEntriesFromCatalog(charList, catalogEntries, defaultScript = 'cao') {
  const byChar = new Map();
  for (const entry of catalogEntries) {
    if (!entry?.char) continue;
    byChar.set(entry.char, entry);
    for (const alt of entry.alternatives || []) {
      if (!byChar.has(alt)) byChar.set(alt, entry);
    }
  }

  return charList.map((ch) => {
    const hit = byChar.get(ch);
    if (hit) {
      return {
        id: hit.id || '',
        char: ch,
        codePoint: hit.codePoint || charToCodePoint(ch),
        unicode: hit.unicode || formatUnicodeLabel(charToCodePoint(ch)),
        dup: hit.dup || 0,
        script: hit.script || defaultScript,
        alternatives: hit.alternatives || [],
        calligrapher: hit.calligrapher || '',
        work: hit.work || '',
      };
    }
    const cp = charToCodePoint(ch);
    return {
      id: '',
      char: ch,
      codePoint: cp,
      unicode: formatUnicodeLabel(cp),
      dup: 0,
      script: defaultScript,
      alternatives: [],
      calligrapher: '',
      work: '',
    };
  });
}
