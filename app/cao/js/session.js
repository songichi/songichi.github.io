/**
 * 练习会话快照
 * versioned JSON，便于日后扩展字段而不破坏旧数据
 */

const SNAPSHOT_VERSION = 1;
const SNAPSHOT_TYPE = 'practice-session-snapshot';

/**
 * 创建空会话状态
 * @returns {{ startedAt: string, items: Map<string, object> }}
 */
function createSessionState() {
  return {
    startedAt: new Date().toISOString(),
    items: new Map(),
  };
}

/** 清空本轮会话（新一轮） */
function resetSessionState(state) {
  state.startedAt = new Date().toISOString();
  state.items.clear();
}

/**
 * 记录一次出现
 * @param {{ startedAt: string, items: Map }} state
 * @param {{ char: string, script: string }} entry
 */
function recordSessionItem(state, entry) {
  if (!entry || !entry.char) return;

  const script = normalizeScript(entry.script);
  const key = entryKey({ char: entry.char, script });
  const now = new Date().toISOString();
  const existing = state.items.get(key);

  if (existing) {
    existing.count += 1;
    existing.lastSeenAt = now;
    return;
  }

  state.items.set(key, {
    char: entry.char,
    script,
    count: 1,
    firstSeenAt: now,
    lastSeenAt: now,
  });
}

/**
 * 撤销一次出现（用于「跳过」）
 * count 减到 0 时从会话中移除该条目
 */
function unrecordSessionItem(state, entry) {
  if (!entry || !entry.char || !state?.items) return false;

  const script = normalizeScript(entry.script);
  const key = entryKey({ char: entry.char, script });
  const existing = state.items.get(key);
  if (!existing) return false;

  if (existing.count <= 1) {
    state.items.delete(key);
  } else {
    existing.count -= 1;
    existing.lastSeenAt = new Date().toISOString();
  }
  return true;
}

/** 条目展示标签（草体仅汉字，其他附短标签） */
function formatSessionItemLabel(item) {
  if (!item) return '';
  const tag = SCRIPT_LABEL[item.script] || '';
  return tag ? `${item.char}${tag}` : item.char;
}

/**
 * 构建可扩展会话快照
 * @param {{ startedAt: string, items: Map }} state
 * @param {object} meta 可扩展元数据（filter / mode / librarySize 及未来字段）
 */
function buildSessionSnapshot(state, meta = {}) {
  const items = [...state.items.values()].sort(
    (a, b) => b.count - a.count
      || a.script.localeCompare(b.script)
      || a.char.localeCompare(b.char, 'zh'),
  );

  const totalAppearances = items.reduce((sum, item) => sum + item.count, 0);
  const { filter = null, mode = null, librarySize = null, ...restMeta } = meta;

  return {
    version: SNAPSHOT_VERSION,
    type: SNAPSHOT_TYPE,
    createdAt: new Date().toISOString(),
    startedAt: state.startedAt,
    meta: {
      filter,
      mode,
      librarySize,
      ...restMeta,
    },
    summary: {
      uniqueChars: items.length,
      totalAppearances,
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
 * 不替代 JSON，仅便于浏览
 */
function snapshotToReadable(snapshot) {
  const filterLabel = SCRIPT_FILTER_LABEL[snapshot.meta?.filter] || snapshot.meta?.filter || '—';
  const modeLabel = snapshot.meta?.mode === 'time' ? '时间' : '默认';
  const lines = [
    `本轮快照  v${snapshot.version}`,
    `开始：${formatSnapshotTime(snapshot.startedAt)}`,
    `导出：${formatSnapshotTime(snapshot.createdAt)}`,
    `书体：${filterLabel}　模式：${modeLabel}　字库：${snapshot.meta?.librarySize ?? '—'}`,
    `合计：${snapshot.summary.uniqueChars} 字 / ${snapshot.summary.totalAppearances} 次`,
    '',
  ];

  if (snapshot.items.length === 0) {
    lines.push('（本轮尚未记录任何字）');
    return lines.join('\n');
  }

  for (const item of snapshot.items) {
    const scriptName = SCRIPT_NAME[item.script] || item.script;
    lines.push(`${item.char}　${scriptName}　×${item.count}`);
  }

  return lines.join('\n');
}

function formatSnapshotTime(iso) {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}
