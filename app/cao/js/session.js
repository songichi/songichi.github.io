/**
 * 练习会话 — 逐字记录 + 快照导出
 *
 * PracticeStroke：单次停留（id + durationMs，可扩展）
 * PracticeSession：一轮练习（strokes 序列 + 元数据）
 * 快照 version 3 含 strokes；items 聚合保留供 merge 更新 chars 总账
 */

const SNAPSHOT_VERSION = 3;
const SNAPSHOT_TYPE = 'practice-session-snapshot';
const PRACTICE_SESSION_TYPE = 'practice-session';

/** 单次字停留记录 */
class PracticeStroke {
  constructor({ id, durationMs = 0, ...extras } = {}) {
    this.id = id || '';
    this.durationMs = Math.max(0, Number(durationMs) || 0);
    Object.assign(this, extras);
  }

  toJSON() {
    if (typeof serializeStrokeForSnapshot === 'function') {
      return serializeStrokeForSnapshot(this);
    }
    const out = {
      id: this.id,
      durationMs: this.durationMs,
    };
    if (this.isUnique && this.cardStyle) {
      out.isUnique = true;
      out.ciHao = resolveCiHao(this);
      out.cardStyle = typeof normalizeCardStyleRecord === 'function'
        ? normalizeCardStyleRecord(this.cardStyle)
        : {
          colorSchemeId: this.cardStyle.colorSchemeId || null,
          decorationId: this.cardStyle.decorationId || null,
          cardBase: this.cardStyle.cardBase || null,
          cardModifier: this.cardStyle.cardModifier || null,
          tags: Array.isArray(this.cardStyle.tags) ? [...this.cardStyle.tags] : [],
        };
    }
    const inkDrop = Math.floor(Number(this.inkDrop) || 0);
    if (inkDrop > 0) out.inkDrop = inkDrop;
    const seal = typeof normalizeZhenSeal === 'function'
      ? normalizeZhenSeal(this.seal)
      : (this.seal || null);
    if (seal) out.seal = seal;
    return out;
  }

  static fromJSON(data) {
    if (!data || typeof data !== 'object') return null;
    return new PracticeStroke(data);
  }
}

/** 一轮完整练习（合并进 user JSON 的 sessions 条目） */
class PracticeSession {
  constructor({
    type = PRACTICE_SESSION_TYPE,
    version = 1,
    startedAt = null,
    endedAt = null,
    filter = null,
    mode = null,
    librarySize = null,
    strokes = [],
    summary = null,
    ...extras
  } = {}) {
    this.type = type;
    this.version = version;
    this.startedAt = startedAt;
    this.endedAt = endedAt;
    this.filter = filter;
    this.mode = mode;
    this.librarySize = librarySize;
    this.strokes = Array.isArray(strokes)
      ? strokes.map((s) => (s instanceof PracticeStroke ? s : PracticeStroke.fromJSON(s))).filter(Boolean)
      : [];
    this.summary = summary;
    Object.assign(this, extras);
  }

  computeSummary() {
    const ids = new Set();
    let totalDurationMs = 0;
    for (const stroke of this.strokes) {
      ids.add(stroke.id);
      totalDurationMs += stroke.durationMs || 0;
    }
    return {
      uniqueChars: ids.size,
      totalAppearances: this.strokes.length,
      totalDurationMs,
    };
  }

  toJSON() {
    return {
      type: this.type,
      version: this.version,
      startedAt: this.startedAt,
      endedAt: this.endedAt,
      filter: this.filter,
      mode: this.mode,
      librarySize: this.librarySize,
      strokes: this.strokes.map((s) => s.toJSON()),
      summary: this.summary || this.computeSummary(),
    };
  }

  static fromSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') return null;
    const strokes = normalizeSnapshotStrokes(snapshot);
    const meta = snapshot.meta || {};
    return new PracticeSession({
      startedAt: snapshot.startedAt || null,
      endedAt: snapshot.endedAt || snapshot.createdAt || null,
      filter: meta.filter ?? null,
      mode: meta.mode ?? null,
      librarySize: meta.librarySize ?? null,
      strokes,
      summary: snapshot.summary || null,
    });
  }
}

/**
 * 运行时本轮状态
 * @returns {{ startedAt: string, items: Map, strokes: object[], activeStroke: object|null }}
 */
function createSessionState() {
  return {
    startedAt: new Date().toISOString(),
    items: new Map(),
    strokes: [],
    activeStroke: null,
  };
}

/** 清空本轮会话（新一轮） */
function resetSessionState(state) {
  state.startedAt = new Date().toISOString();
  state.items.clear();
  state.strokes = [];
  state.activeStroke = null;
}

/**
 * 将掉落判定结果写到 stroke（unique 与/或 inkDrop）
 * @param {object} stroke
 * @param {{ isUnique?: boolean, cardStyle?: object|null, inkDrop?: number }|null} drop
 */
function applyDropJudgmentToStroke(stroke, drop) {
  if (!stroke || !drop || typeof drop !== 'object') return stroke;
  const hasUniqueStyle = Boolean(
    drop.isUnique
    && drop.cardStyle
    && (drop.cardStyle.colorSchemeId
      || drop.cardStyle.decorationId
      || drop.cardStyle.cardBase
      || drop.cardStyle.cardModifier),
  );
  if (hasUniqueStyle) {
    stroke.isUnique = true;
    stroke.cardStyle = typeof normalizeCardStyleRecord === 'function'
      ? normalizeCardStyleRecord(drop.cardStyle)
      : {
        colorSchemeId: drop.cardStyle.colorSchemeId || null,
        decorationId: drop.cardStyle.decorationId || null,
        cardBase: drop.cardStyle.cardBase || null,
        cardModifier: drop.cardStyle.cardModifier || null,
        tags: Array.isArray(drop.cardStyle.tags) ? [...drop.cardStyle.tags] : [],
      };
  }
  const inkDrop = Math.floor(Number(drop.inkDrop) || 0);
  if (inkDrop > 0) stroke.inkDrop = inkDrop;
  return stroke;
}

/**
 * 结束当前字的计时并写入 strokes。
 * 掉落判定在此时进行（完成该字时），勿在 beginStroke 时判定。
 * @param {object} state
 * @param {number} [endAt]
 * @param {{ drop?: object|null, rng?: function, skipDrop?: boolean, glyphRevealed?: boolean }} [options]
 *   - drop: 显式传入判定结果（优先）
 *   - rng: 未传 drop 且未 skipDrop 时用于 rollDropJudgment
 *   - skipDrop: true 时不做掉落判定（极少用）
 *   - glyphRevealed: 本字曾翻开原型，门控 +2%
 */
function finalizeActiveStroke(state, endAt = Date.now(), options = {}) {
  if (!state?.activeStroke?.id) return;

  const durationMs = Math.max(0, endAt - state.activeStroke.startedAt);
  const stroke = {
    id: state.activeStroke.id,
    durationMs,
  };

  let drop = options?.drop;
  if (drop === undefined && !options?.skipDrop) {
    const dropOpts = { glyphRevealed: Boolean(options?.glyphRevealed) };
    if (typeof rollDropJudgment === 'function') {
      drop = rollDropJudgment(options?.rng, dropOpts);
    } else if (typeof rollCardStyleForAppearance === 'function') {
      drop = { ...rollCardStyleForAppearance(options?.rng, dropOpts), inkDrop: 0 };
    }
  }
  applyDropJudgmentToStroke(stroke, drop || null);

  if (stroke.isUnique && stroke.cardStyle) {
    stroke.ciHao = (Array.isArray(state.strokes) ? state.strokes.length : 0) + 1;
    if (typeof playUniqueDropSfx === 'function') playUniqueDropSfx();
  }

  // 真书印记：与 unique 无关；skipDrop 只跳过 unique/墨
  if (!options?.skipZhenSeal && typeof rollZhenSealJudgment === 'function') {
    const catalog = typeof findZiEntry === 'function' ? findZiEntry(stroke.id) : null;
    const script = catalog
      ? (typeof normalizeScript === 'function'
        ? normalizeScript(catalog.script || catalog.style)
        : catalog.script)
      : '';
    const isZhen = script === 'zhen'
      || (typeof SCRIPT !== 'undefined' && script === SCRIPT.zhen);
    if (isZhen) {
      let sealDrop = options?.sealDrop;
      if (sealDrop === undefined) {
        sealDrop = rollZhenSealJudgment(options?.rng);
      }
      const seal = typeof normalizeZhenSeal === 'function'
        ? normalizeZhenSeal(sealDrop?.seal)
        : (sealDrop?.seal || null);
      if (seal) {
        stroke.seal = seal;
        if (typeof playUniqueDropSfx === 'function') playUniqueDropSfx();
      }
    }
  }

  state.strokes.push(stroke);
  state.activeStroke = null;
}

/** 开始新字的计时（会先结束上一字；上一字在 finalize 时做掉落判定） */
function beginStroke(state, entry, startedAt = Date.now(), options = {}) {
  finalizeActiveStroke(state, startedAt, options);
  if (!entry?.id) return;
  // 新字只开始计时，不做掉落判定
  state.activeStroke = { id: entry.id, startedAt };
}

/** 从 catalog 解析 id 对应的主字（展示用） */
function resolveSessionItemChar(item) {
  if (!item) return '—';
  if (item.char) return item.char;
  if (item.id && typeof findZiEntry === 'function') {
    return findZiEntry(item.id)?.char || item.id;
  }
  return item.id || '—';
}

/** 从 catalog 解析书体（展示用） */
function resolveSessionItemScript(item) {
  if (!item) return SCRIPT.cao;
  if (item.script) return normalizeScript(item.script);
  if (item.id && typeof findZiEntry === 'function') {
    const hit = findZiEntry(item.id);
    if (hit?.script) return normalizeScript(hit.script);
  }
  return SCRIPT.cao;
}

/**
 * 记录一次出现（开始在该字上的停留计时，并更新聚合 items）
 * 上一字若存在，会在 beginStroke → finalize 时做掉落判定。
 * @param {object} [options] 传给 finalizeActiveStroke（如 { rng }）
 */
function recordSessionItem(state, entry, options = null) {
  if (!entry?.id || !state?.items) return;

  const finalizeOpts = options && typeof options === 'object' ? options : {};
  beginStroke(state, entry, Date.now(), finalizeOpts);

  const key = entry.id;
  const now = new Date().toISOString();
  const existing = state.items.get(key);

  if (existing) {
    existing.count += 1;
    existing.lastSeenAt = now;
    return;
  }

  state.items.set(key, {
    id: entry.id,
    count: 1,
    firstSeenAt: now,
    lastSeenAt: now,
  });
}

/** 按当前已完成 strokes 顺序重算 unique 次号（跳过撤销后调用） */
function refreshUniqueStrokeCiHao(state) {
  const strokes = state?.strokes;
  if (!Array.isArray(strokes)) return;
  for (let i = 0; i < strokes.length; i += 1) {
    const stroke = strokes[i];
    if (stroke?.isUnique) stroke.ciHao = i + 1;
  }
}

/** 撤销一次出现（跳过）；同步去掉最后一次同 id 的 stroke 或取消进行中的 stroke */
function unrecordSessionItem(state, entry) {
  if (!entry?.id || !state?.items) return false;

  if (state.activeStroke?.id === entry.id) {
    state.activeStroke = null;
  } else {
    for (let i = state.strokes.length - 1; i >= 0; i -= 1) {
      if (state.strokes[i].id === entry.id) {
        state.strokes.splice(i, 1);
        break;
      }
    }
    refreshUniqueStrokeCiHao(state);
  }

  const existing = state.items.get(entry.id);
  if (!existing) return false;

  if (existing.count <= 1) {
    state.items.delete(entry.id);
  } else {
    existing.count -= 1;
    existing.lastSeenAt = new Date().toISOString();
  }
  return true;
}

/** strokes → 聚合 items（兼容无 items 的旧快照） */
function aggregateStrokesToItems(strokes) {
  const byId = new Map();
  for (const stroke of strokes || []) {
    if (!stroke?.id) continue;
    const existing = byId.get(stroke.id);
    if (!existing) {
      byId.set(stroke.id, {
        id: stroke.id,
        count: 1,
        firstSeenAt: null,
        lastSeenAt: null,
      });
    } else {
      existing.count += 1;
    }
  }
  return [...byId.values()].sort(
    (a, b) => b.count - a.count || String(a.id).localeCompare(String(b.id)),
  );
}

/** 规范化快照中的 strokes（v3 或从 v2 items 展开，durationMs=0） */
function normalizeSnapshotStrokes(snapshot) {
  if (Array.isArray(snapshot?.strokes) && snapshot.strokes.length > 0) {
    return snapshot.strokes
      .filter((s) => s?.id)
      .map((s) => {
        const extras = {};
        if (s.isUnique && s.cardStyle) {
          extras.isUnique = true;
          extras.ciHao = resolveCiHao(s);
          extras.cardStyle = typeof normalizeCardStyleRecord === 'function'
            ? normalizeCardStyleRecord(s.cardStyle)
            : {
              colorSchemeId: s.cardStyle.colorSchemeId || null,
              decorationId: s.cardStyle.decorationId || null,
              cardBase: s.cardStyle.cardBase || null,
              cardModifier: s.cardStyle.cardModifier || null,
              tags: Array.isArray(s.cardStyle.tags) ? [...s.cardStyle.tags] : [],
            };
        }
        const inkDrop = Math.floor(Number(s.inkDrop) || 0);
        if (inkDrop > 0) extras.inkDrop = inkDrop;
        return new PracticeStroke({
          id: s.id,
          durationMs: s.durationMs,
          ...extras,
        });
      });
  }

  if (!Array.isArray(snapshot?.items)) return [];

  const strokes = [];
  for (const item of snapshot.items) {
    const id = item?.id;
    if (!id) continue;
    const count = Math.max(0, Number(item.count) || 0);
    for (let i = 0; i < count; i += 1) {
      strokes.push(new PracticeStroke({ id, durationMs: 0 }));
    }
  }
  return strokes;
}

function computeStrokesSummary(strokes) {
  const ids = new Set();
  let totalDurationMs = 0;
  for (const stroke of strokes || []) {
    const id = stroke?.id;
    if (!id) continue;
    ids.add(id);
    totalDurationMs += Number(stroke.durationMs) || 0;
  }
  return {
    uniqueChars: ids.size,
    totalAppearances: (strokes || []).length,
    totalDurationMs,
  };
}

/** 条目展示标签（右侧统计只显示汉字，不加「X真」等后缀） */
function formatSessionItemLabel(item) {
  if (!item) return '';
  return resolveSessionItemChar(item);
}

function formatStrokeDuration(ms) {
  const n = Math.max(0, Number(ms) || 0);
  if (n < 1000) return `${n}ms`;
  const sec = Math.round(n / 100) / 10;
  return `${sec}s`;
}

/**
 * 构建会话快照。
 * 默认不结束当前未完成的字（未结算不记入）。
 * 仅结算时传 commitActive: true，把屏上这一字定稿进快照。
 */
function buildSessionSnapshot(state, meta = {}) {
  const exportAt = Date.now();
  const { dropRng, commitActive = false, skipDrop = false, glyphRevealed = false, ...restMetaIn } = meta;
  if (commitActive) {
    finalizeActiveStroke(state, exportAt, {
      rng: dropRng,
      skipDrop: Boolean(skipDrop),
      glyphRevealed: Boolean(glyphRevealed),
    });
  }

  const endedAt = new Date(exportAt).toISOString();
  const strokes = state.strokes.map((s) => (
    typeof serializeStrokeForSnapshot === 'function'
      ? serializeStrokeForSnapshot(s)
      : {
        id: s.id,
        durationMs: s.durationMs,
        ...(s.isUnique && s.cardStyle
          ? {
            isUnique: true,
            ciHao: typeof resolveCiHao === 'function' ? resolveCiHao(s) : (Number(s.ciHao) || 1),
            cardStyle: typeof normalizeCardStyleRecord === 'function'
              ? normalizeCardStyleRecord(s.cardStyle)
              : {
                colorSchemeId: s.cardStyle.colorSchemeId || null,
                decorationId: s.cardStyle.decorationId || null,
                cardBase: s.cardStyle.cardBase || null,
                cardModifier: s.cardStyle.cardModifier || null,
                tags: Array.isArray(s.cardStyle.tags) ? [...s.cardStyle.tags] : [],
              },
          }
          : {}),
        ...(Math.floor(Number(s.inkDrop) || 0) > 0
          ? { inkDrop: Math.floor(Number(s.inkDrop)) }
          : {}),
        ...((typeof normalizeZhenSeal === 'function'
          ? normalizeZhenSeal(s.seal)
          : s.seal)
          ? { seal: (typeof normalizeZhenSeal === 'function' ? normalizeZhenSeal(s.seal) : s.seal) }
          : {}),
      }
  ));

  const strokeSummary = computeStrokesSummary(strokes);
  const items = [...state.items.values()].sort(
    (a, b) => b.count - a.count
      || String(a.id || '').localeCompare(String(b.id || '')),
  );

  const { filter = null, mode = null, librarySize = null, ...restMeta } = restMetaIn;

  return {
    version: SNAPSHOT_VERSION,
    type: SNAPSHOT_TYPE,
    createdAt: endedAt,
    startedAt: state.startedAt,
    endedAt,
    meta: {
      filter,
      mode,
      librarySize,
      ...restMeta,
    },
    strokes,
    summary: {
      uniqueChars: strokeSummary.uniqueChars,
      totalAppearances: strokeSummary.totalAppearances,
      totalDurationMs: strokeSummary.totalDurationMs,
      inkDrop: strokes.reduce((sum, s) => sum + Math.max(0, Math.floor(Number(s.inkDrop) || 0)), 0),
    },
    items,
  };
}

/** 序列化为格式化 JSON 字符串 */
function snapshotToJSON(snapshot) {
  return JSON.stringify(snapshot, null, 2);
}

/**
 * 生成可读摘要文本（面板展示用）
 */
function snapshotToReadable(snapshot) {
  const filterLabel = SCRIPT_FILTER_LABEL[snapshot.meta?.filter] || snapshot.meta?.filter || '—';
  const modeLabel = typeof formatLearningModeLabel === 'function'
    ? formatLearningModeLabel(snapshot.meta?.mode)
    : (snapshot.meta?.mode === 'time'
      ? '时间'
      : (snapshot.meta?.mode === 'recognize'
        ? '识字'
        : (snapshot.meta?.mode === 'random' ? '随机' : '默认')));
  const strokes = normalizeSnapshotStrokes(snapshot);
  const summary = snapshot.summary || computeStrokesSummary(strokes);

  const lines = [
    `本轮快照  v${snapshot.version}`,
    `开始：${formatSnapshotTime(snapshot.startedAt)}`,
    `结束：${formatSnapshotTime(snapshot.endedAt || snapshot.createdAt)}`,
    `书体：${filterLabel}　模式：${modeLabel}　字库：${snapshot.meta?.librarySize ?? '—'}`,
    `合计：${summary.uniqueChars} 字 / ${summary.totalAppearances} 次 / ${formatStrokeDuration(summary.totalDurationMs)}`,
    '',
  ];

  if (strokes.length === 0) {
    lines.push('（本轮尚未记录任何字）');
    return lines.join('\n');
  }

  lines.push('顺序：');
  strokes.forEach((stroke, index) => {
    const char = resolveSessionItemChar({ id: stroke.id });
    lines.push(`${index + 1}. ${char}　${formatStrokeDuration(stroke.durationMs)}`);
  });

  return lines.join('\n');
}

function formatSnapshotTime(iso) {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}
