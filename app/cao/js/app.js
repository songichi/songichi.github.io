/**
 * 练字 — 主应用逻辑
 */

/** Mulberry32：由种子生成 [0, 1) */
function createRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 用当前时间生成种子（每次刷新页面都会换） */
function createRandomSeed() {
  return Date.now() >>> 0;
}

function hashSeedString(text) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function parseSeedInput(raw) {
  const text = String(raw ?? '').trim();
  if (!text) return createRandomSeed();
  if (/^\d+$/.test(text)) return Number(text) >>> 0;
  return hashSeedString(text);
}

/** 设置面板可编辑的草体池 */
let editableCharacters = loadEditableCharacters();
/** 完整字库（含各书体，未筛选） */
let fullLibrary = buildLibrary(editableCharacters);
/** 当前书体筛选 */
let scriptFilter = loadScriptFilter();
/** 当前练习库（已按书体筛选） */
let characters = filterLibrary(fullLibrary, scriptFilter);
/** 当前条目 { char, script } */
let currentEntry = null;
let glyphVisible = false;
/** 当前字是否有答案字形图 */
let glyphImageAvailable = false;
let glyphAvailabilityToken = 0;
/** 字形图是否存在缓存（键：id 或 char） */
const glyphImageExistsCache = new Map();
let learningMode = loadLearningMode();
/** 最近显示过的条目键，最新在前，最多保留 2 个 */
let recentHistory = [];
/** 切换汉字时的淡入定时器 */
let showCharacterTimer = null;
/** 本轮会话（含书体、次数、时间戳；可导出为 versioned JSON） */
const session = createSessionState();
const STATS_ROW_COUNT = 12;
/** 仅出现一次的汉字，每行最多容纳个数 */
const STATS_PACK_SIZE = 4;

/** 随机种子与生成器（刷新页面时按当前时间重置） */
let rngSeed = createRandomSeed();
let rngNext = createRng(rngSeed);

function random() {
  return rngNext();
}

function applySeed(seed, { refresh = true } = {}) {
  rngSeed = seed >>> 0;
  rngNext = createRng(rngSeed);
  if (refresh) {
    recentHistory = [];
    refreshCharacter();
  }
}

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp'];

const SCRIPT_FILTER_OPTIONS = [
  SCRIPT_FILTER.cao,
  SCRIPT_FILTER.kai,
  SCRIPT_FILTER.ming,
  SCRIPT_FILTER.hei,
  SCRIPT_FILTER.all,
];

const el = {
  display: document.getElementById('character-display'),
  glyphImage: document.getElementById('glyph-image'),
  glyphPlaceholder: document.getElementById('glyph-placeholder'),
  btnShow: document.getElementById('btn-show'),
  btnRefresh: document.getElementById('btn-refresh'),
  btnSkip: document.getElementById('btn-skip'),
  btnSettlementCopy: document.getElementById('btn-settlement-copy'),
  btnSessionAction: document.getElementById('btn-session-action'),
  characterStage: document.getElementById('character-stage'),
  settlementPanel: document.getElementById('settlement-panel'),
  settlementMeta: document.getElementById('settlement-meta'),
  settlementChars: document.getElementById('settlement-chars'),
  noRepeatHint: document.getElementById('no-repeat-hint'),
  btnScript: document.getElementById('btn-script'),
  scriptLabel: document.getElementById('script-label'),
  scriptMenu: document.getElementById('script-menu'),
  scriptSwitch: document.getElementById('script-switch'),
  btnSnapshotCopy: document.getElementById('btn-snapshot-copy'),
  btnSnapshotView: document.getElementById('btn-snapshot-view'),
  snapshotDialog: document.getElementById('snapshot-dialog'),
  snapshotReadable: document.getElementById('snapshot-readable'),
  snapshotJson: document.getElementById('snapshot-json'),
  btnSnapshotClose: document.getElementById('btn-snapshot-close'),
  btnSnapshotDialogClose: document.getElementById('btn-snapshot-dialog-close'),
  btnSnapshotDialogCopy: document.getElementById('btn-snapshot-dialog-copy'),
  btnSeed: document.getElementById('btn-seed'),
  seedDialog: document.getElementById('seed-dialog'),
  seedInput: document.getElementById('seed-input'),
  btnSeedClose: document.getElementById('btn-seed-close'),
  btnSeedRandom: document.getElementById('btn-seed-random'),
  btnSeedCancel: document.getElementById('btn-seed-cancel'),
  btnSeedApply: document.getElementById('btn-seed-apply'),
  btnBrowse: document.getElementById('btn-browse'),
  btnBrowseClose: document.getElementById('btn-browse-close'),
  browseDialog: document.getElementById('browse-dialog'),
  charGrid: document.getElementById('char-grid'),
  browseCount: document.getElementById('browse-count'),
  btnSettings: document.getElementById('btn-settings'),
  settingsDialog: document.getElementById('settings-dialog'),
  charactersInput: document.getElementById('characters-input'),
  charCount: document.getElementById('char-count'),
  btnSave: document.getElementById('btn-save'),
  btnCancel: document.getElementById('btn-cancel'),
  modeDefault: document.getElementById('mode-default'),
  modeTime: document.getElementById('mode-time'),
  statsRows: [...document.querySelectorAll('.stats-row')],
  statsInkGain: document.getElementById('stats-ink-gain'),
  practiceUserId: document.getElementById('practice-user-id'),
};

/** 当前 local 用户 id（保存时用；null 表示未找到） */
let practiceUserId = null;

async function refreshPracticeUserBadge() {
  const result = await resolveLocalPracticeUser();
  practiceUserId = result.userId;
  if (!el.practiceUserId) return;
  if (!result.userId) {
    el.practiceUserId.textContent = '';
    el.practiceUserId.title = '';
    el.practiceUserId.hidden = true;
    el.practiceUserId.classList.add('is-empty');
    el.practiceUserId.classList.remove('is-resolved');
    return;
  }
  el.practiceUserId.hidden = false;
  el.practiceUserId.classList.remove('is-empty');
  el.practiceUserId.textContent = result.display;
  el.practiceUserId.classList.add('is-resolved');
  el.practiceUserId.title = `local 用户：user-${result.userId}.json`;
}

/** 重建当前练习库 */
function rebuildCharacters() {
  fullLibrary = buildLibrary(editableCharacters);
  characters = filterLibrary(fullLibrary, scriptFilter);
}

/** 生成本轮快照对象 */
function getCurrentSnapshot() {
  return buildSessionSnapshot(session, {
    filter: scriptFilter,
    mode: learningMode,
    librarySize: characters.length,
    dropRng: random,
  });
}

/** 导出/复制用：已完成则用冻结快照 */
function getSnapshotForExport() {
  if (sessionCompleted && completedSnapshot) return completedSnapshot;
  return getCurrentSnapshot();
}

/** 本轮是否已点「结算」（等待「结束」写入） */
let sessionCompleted = false;
/** 点「结算」时冻结的快照 */
let completedSnapshot = null;

function updateSessionActionButton() {
  const btn = el.btnSessionAction;
  if (!btn) return;
  btn.textContent = '结算';
  btn.setAttribute('aria-label', '结算');
  if (sessionCompleted) {
    btn.title = '当前处于结算模式';
    btn.classList.add('is-settling');
  } else {
    btn.title = '结算本轮练习（不写入数据）';
    btn.classList.remove('is-settling');
  }
}

function updateFooterForPhase() {
  if (!el.btnRefresh || !el.btnSkip) return;
  if (sessionCompleted) {
    el.btnRefresh.textContent = '结束';
    el.btnRefresh.title = '写入本轮练习到 local JSON 并打开等级页';
    el.btnRefresh.setAttribute('aria-label', '结束');
    el.btnSkip.textContent = '返回';
    el.btnSkip.title = '取消结算，继续练字';
    el.btnSkip.setAttribute('aria-label', '返回');
    if (el.btnSettlementCopy) {
      el.btnSettlementCopy.classList.remove('hidden');
      el.btnSettlementCopy.textContent = '复制结果';
      el.btnSettlementCopy.disabled = false;
    }
  } else {
    el.btnRefresh.textContent = '完成';
    el.btnRefresh.title = '完成当前字并进入下一个';
    el.btnRefresh.setAttribute('aria-label', '完成');
    el.btnSkip.textContent = '跳过';
    el.btnSkip.title = '跳过当前字';
    el.btnSkip.setAttribute('aria-label', '跳过');
    if (el.btnSettlementCopy) {
      el.btnSettlementCopy.classList.add('hidden');
      el.btnSettlementCopy.textContent = '复制结果';
      el.btnSettlementCopy.disabled = false;
    }
  }
}

function renderSettlementPanel(snapshot) {
  if (!el.settlementPanel || !el.settlementMeta || !el.settlementChars) return;

  const summary = snapshot?.summary || {};
  const filterLabel = (typeof SCRIPT_FILTER_LABEL !== 'undefined'
    && SCRIPT_FILTER_LABEL[snapshot?.meta?.filter])
    || snapshot?.meta?.filter
    || '—';
  const modeLabel = snapshot?.meta?.mode === 'time' ? '时间' : '默认';
  const durationLabel = typeof formatStrokeDuration === 'function'
    ? formatStrokeDuration(summary.totalDurationMs)
    : `${summary.totalDurationMs || 0}ms`;
  const inkDrop = Math.max(0, Math.floor(Number(summary.inkDrop) || 0));

  el.settlementMeta.textContent = [
    `${summary.uniqueChars ?? 0} 字 / ${summary.totalAppearances ?? 0} 次 / ${durationLabel}`,
    `书体 ${filterLabel} · 模式 ${modeLabel}`,
    inkDrop > 0 ? `墨 +${inkDrop}` : null,
  ].filter(Boolean).join('　');

  el.settlementChars.replaceChildren();
  const items = Array.isArray(snapshot?.items) ? [...snapshot.items] : [];
  items.sort(
    (a, b) => (b.count || 0) - (a.count || 0)
      || String(a.id || '').localeCompare(String(b.id || '')),
  );

  if (items.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'settlement-empty';
    empty.textContent = '本轮还没有练过字';
    el.settlementChars.appendChild(empty);
    return;
  }

  const uniqueIds = new Set();
  for (const stroke of snapshot?.strokes || []) {
    if (stroke?.isUnique && stroke.id) uniqueIds.add(String(stroke.id));
  }

  for (const item of items) {
    const wrap = document.createElement('span');
    wrap.className = 'settlement-char';
    if (item?.id && uniqueIds.has(String(item.id))) wrap.classList.add('is-unique');

    const label = document.createElement('span');
    label.className = 'settlement-char-label';
    label.textContent = typeof formatSessionItemLabel === 'function'
      ? formatSessionItemLabel(item)
      : (item.char || item.id || '—');

    wrap.appendChild(label);
    if ((item.count || 0) > 1) {
      const countEl = document.createElement('span');
      countEl.className = 'settlement-char-count';
      countEl.textContent = `×${item.count}`;
      wrap.appendChild(countEl);
    }
    el.settlementChars.appendChild(wrap);
  }
}

function setSettlementView(active) {
  document.body.classList.toggle('is-session-completed', active);
  el.characterStage?.classList.toggle('hidden', active);
  el.settlementPanel?.classList.toggle('hidden', !active);
  updateSessionActionButton();
  updateFooterForPhase();
  updateNoRepeatHint();
}

function resetSessionPhase() {
  sessionCompleted = false;
  completedSnapshot = null;
  setSettlementView(false);
  if (el.btnSessionAction) el.btnSessionAction.disabled = false;
  if (el.btnRefresh) el.btnRefresh.disabled = false;
  if (el.btnSkip) el.btnSkip.disabled = false;
}

/** 重置本轮会话统计 */
function resetSession() {
  resetSessionState(session);
  resetSessionPhase();
  updateStatsTable();
}

/** 记录条目出现 */
function recordAppearance(entry, options = null) {
  recordSessionItem(session, entry, options);
  updateStatsTable();
}

/** 撤销条目一次出现 */
function unrecordAppearance(entry) {
  if (!entry) return;
  unrecordSessionItem(session, entry);
  updateStatsTable();
}

/** 将统计结果编排为行：≥2 次独占一行；仅 1 次每行最多 4 字 */
function buildStatsRows(items, uniqueIds = new Set()) {
  const multi = [];
  const singles = [];

  for (const item of items) {
    if (item.count >= 2) multi.push(item);
    else singles.push(item);
  }

  const rows = [];
  for (const item of multi) {
    rows.push({
      type: 'counted',
      id: item.id,
      label: formatSessionItemLabel(item),
      count: item.count,
      isUnique: uniqueIds.has(String(item.id)),
    });
  }
  for (let i = 0; i < singles.length; i += STATS_PACK_SIZE) {
    rows.push({
      type: 'pack',
      entries: singles.slice(i, i + STATS_PACK_SIZE).map((item) => ({
        id: item.id,
        label: formatSessionItemLabel(item),
        isUnique: uniqueIds.has(String(item.id)),
      })),
    });
  }
  return rows.slice(0, STATS_ROW_COUNT);
}

/** 已定稿 strokes 中的 unique id（进行中的 activeStroke 不算） */
function collectRevealedUniqueIds(state) {
  const ids = new Set();
  for (const stroke of state?.strokes || []) {
    if (stroke?.isUnique && stroke.id) ids.add(String(stroke.id));
  }
  return ids;
}

/** 已定稿 strokes 中的墨掉落：字 id 集合 + 合计 */
function collectRevealedInkDrops(state) {
  const ids = new Set();
  let total = 0;
  for (const stroke of state?.strokes || []) {
    const n = Math.floor(Number(stroke?.inkDrop) || 0);
    if (n <= 0 || !stroke?.id) continue;
    ids.add(String(stroke.id));
    total += n;
  }
  return { ids, total };
}

/** 更新右侧统计列表（unique / 墨：定稿进 strokes 后才显示；账户仍待结算写入） */
function updateStatsTable() {
  const items = [...session.items.values()].sort(
    (a, b) => b.count - a.count
      || String(a.id || '').localeCompare(String(b.id || '')),
  );
  const uniqueIds = collectRevealedUniqueIds(session);
  const inkDrops = collectRevealedInkDrops(session);
  const rows = buildStatsRows(items, uniqueIds);

  if (el.statsInkGain) {
    const show = inkDrops.total > 0;
    el.statsInkGain.classList.toggle('hidden', !show);
    el.statsInkGain.textContent = show ? `${inkDrops.total}墨` : '';
    el.statsInkGain.setAttribute('aria-hidden', show ? 'false' : 'true');
  }

  el.statsRows.forEach((row, index) => {
    const data = rows[index];
    row.replaceChildren();
    row.className = 'stats-row';

    if (!data) {
      row.classList.add('is-empty');
      return;
    }

    if (data.type === 'counted') {
      row.classList.add('stats-row-counted');
      const charEl = document.createElement('span');
      charEl.className = 'stats-char';
      if (data.isUnique) charEl.classList.add('is-unique');
      if (data.id && inkDrops.ids.has(String(data.id))) charEl.classList.add('has-ink-drop');
      charEl.textContent = data.label;
      const countEl = document.createElement('span');
      countEl.className = 'stats-count';
      countEl.textContent = String(data.count);
      row.append(charEl, countEl);
      return;
    }

    row.classList.add('stats-row-pack');
    for (const entry of data.entries) {
      const charEl = document.createElement('span');
      charEl.className = 'stats-char';
      if (entry.isUnique) charEl.classList.add('is-unique');
      if (entry.id && inkDrops.ids.has(String(entry.id))) charEl.classList.add('has-ink-drop');
      charEl.textContent = entry.label;
      row.appendChild(charEl);
    }
  });

  updateNoRepeatHint();
}

/** 均匀随机选取 */
function pickUniform(pool) {
  const index = Math.floor(random() * pool.length);
  return pool[index];
}

/** 按权重随机选取（时间模式）；weights 的键为 entryKey */
function pickWeighted(pool, weights) {
  const otherWeight = weights.get('__other__') ?? 0;
  let total = 0;

  const items = pool.map((entry) => {
    const key = entryKey(entry);
    const weight = weights.has(key) ? weights.get(key) : otherWeight;
    total += weight;
    return { entry, weight };
  });

  if (total <= 0) return pickUniform(pool);

  let roll = random() * total;
  for (const { entry, weight } of items) {
    roll -= weight;
    if (roll < 0) return entry;
  }

  return items[items.length - 1].entry;
}

/** 字库大于此值时启用「禁止重复」选字 */
const NO_REPEAT_LIBRARY_MIN = 50;
/** 本轮已完成（含当前字）达到此数后允许重复 */
const NO_REPEAT_UNTIL_COMPLETED = 50;

/** 本轮已完成字数：已定稿 strokes + 当前进行中的字 */
function getSessionCompletedCount() {
  const strokes = session?.strokes?.length || 0;
  return strokes + (session?.activeStroke?.id ? 1 : 0);
}

/** 本轮已出现过的条目键（strokes + 当前字） */
function getSessionSeenKeys() {
  const seen = new Set();
  for (const stroke of session?.strokes || []) {
    if (stroke?.id) seen.add(String(stroke.id));
  }
  if (session?.activeStroke?.id) seen.add(String(session.activeStroke.id));
  return seen;
}

/** 是否处于禁止重复选字状态 */
function isNoRepeatMode() {
  return characters.length > NO_REPEAT_LIBRARY_MIN
    && getSessionCompletedCount() < NO_REPEAT_UNTIL_COMPLETED;
}

function updateNoRepeatHint() {
  const active = isNoRepeatMode() && !sessionCompleted;
  el.noRepeatHint?.classList.toggle('hidden', !active);
}

/** 构建候选池：排除最近两次；禁止重复模式下再排除本轮已出现的字 */
function getCandidatePool() {
  const excluded = new Set(recentHistory);
  if (isNoRepeatMode()) {
    for (const key of getSessionSeenKeys()) excluded.add(key);
  }
  const candidates = characters.filter((entry) => !excluded.has(entryKey(entry)));
  if (candidates.length > 0) return candidates;
  // 禁止重复把池抽空时回退到仅排除 recentHistory
  if (isNoRepeatMode()) {
    const soft = characters.filter((entry) => !recentHistory.includes(entryKey(entry)));
    return soft.length > 0 ? soft : characters;
  }
  return characters;
}

/** 从字库中随机选取一个条目 */
function pickRandom() {
  if (characters.length === 0) return null;

  const pool = getCandidatePool();
  if (learningMode === 'default') return pickUniform(pool);

  const order = getDefaultOrder();
  const weights = buildTimeWeights(order);
  const headWeight = order.length > TIME_TAIL_COUNT
    ? weights.get(order[0])
    : 0;
  weights.set('__other__', headWeight ?? 0);

  return pickWeighted(pool, weights);
}

/** 更新学习模式 UI */
function updateModeUI() {
  el.modeDefault.classList.toggle('is-active', learningMode === 'default');
  el.modeTime.classList.toggle('is-active', learningMode === 'time');
}

/** 切换学习模式 */
function setLearningMode(mode) {
  if (mode === learningMode) return;
  learningMode = mode;
  saveLearningMode(mode);
  updateModeUI();
  recentHistory = [];
  resetSession();
  refreshCharacter();
}

/** 更新书体筛选按钮与菜单 */
function updateScriptFilterUI() {
  el.scriptLabel.textContent = SCRIPT_FILTER_LABEL[scriptFilter] || '集';
  el.btnScript.setAttribute(
    'aria-label',
    `书体：${SCRIPT_FILTER_LABEL[scriptFilter] || '集'}`,
  );
  el.btnScript.title = `书体：${SCRIPT_FILTER_LABEL[scriptFilter] || '集'}`;

  el.scriptMenu.querySelectorAll('[data-filter]').forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.filter === scriptFilter);
  });
}

/** 打开/关闭书体菜单 */
function setScriptMenuOpen(open) {
  el.scriptMenu.classList.toggle('hidden', !open);
  el.btnScript.setAttribute('aria-expanded', open ? 'true' : 'false');
  el.scriptSwitch.classList.toggle('is-open', open);
}

function toggleScriptMenu() {
  const open = el.scriptMenu.classList.contains('hidden');
  setScriptMenuOpen(open);
}

/** 切换书体筛选 */
function setScriptFilter(filter) {
  if (!Object.values(SCRIPT_FILTER).includes(filter)) return;
  if (filter === scriptFilter) {
    setScriptMenuOpen(false);
    return;
  }

  scriptFilter = filter;
  saveScriptFilter(filter);
  rebuildCharacters();
  recentHistory = [];
  resetSession();
  updateScriptFilterUI();
  setScriptMenuOpen(false);
  refreshCharacter();
}

/** 记录已显示的条目到历史 */
function recordHistory(entry) {
  if (entry === null) return;
  recentHistory = [entryKey(entry), ...recentHistory].slice(0, 2);
}

/** 在练习区显示指定条目 */
function showCharacter(entry) {
  if (sessionCompleted && entry) return;

  glyphImageAvailable = false;
  hideGlyph();

  if (showCharacterTimer) {
    clearTimeout(showCharacterTimer);
    showCharacterTimer = null;
  }

  if (!entry) {
    currentEntry = null;
    // 清空展示时结束上一字：仍做掉落判定
    finalizeActiveStroke(session, Date.now(), { rng: random });
    el.display.textContent = '—';
    refreshGlyphAvailability(null);
    updateStatsTable();
    return;
  }

  // 掉落判定在完成上一字（finalize）时进行，不在切换到新字时判定
  el.display.classList.add('fade');
  showCharacterTimer = setTimeout(() => {
    showCharacterTimer = null;
    currentEntry = entry;
    recordHistory(currentEntry);
    recordAppearance(currentEntry, { rng: random });
    el.display.textContent = currentEntry.char;
    el.display.classList.remove('fade');
    refreshGlyphAvailability(currentEntry);
  }, 150);
}

/** 刷新显示一个新字 */
function refreshCharacter() {
  if (sessionCompleted) return;
  if (characters.length === 0) {
    recentHistory = [];
    resetSession();
    showCharacter(null);
    return;
  }

  showCharacter(pickRandom());
}

/** 跳过当前字：撤销本轮对它的一次记录，再刷新 */
function skipCharacter() {
  if (sessionCompleted) return;
  const toUndo = currentEntry;
  if (showCharacterTimer) {
    clearTimeout(showCharacterTimer);
    showCharacterTimer = null;
  }
  if (toUndo) unrecordAppearance(toUndo);
  refreshCharacter();
}

/** 渲染字库浏览列表 */
function renderBrowseGrid() {
  el.charGrid.replaceChildren();
  el.browseCount.textContent = characters.length;

  if (characters.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'char-grid-empty';
    empty.textContent = '字库为空';
    el.charGrid.appendChild(empty);
    return;
  }

  const currentKey = currentEntry ? entryKey(currentEntry) : null;
  const fragment = document.createDocumentFragment();
  for (const entry of characters) {
    const script = normalizeScript(entry.script);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'char-grid-item';
    if (script !== SCRIPT.cao) {
      btn.classList.add(`script-${script}`);
    }
    btn.textContent = entry.char;
    btn.title = SCRIPT_NAME[script] || '';
    btn.setAttribute('role', 'listitem');
    btn.setAttribute(
      'aria-label',
      `显示「${entry.char}」${SCRIPT_NAME[script] || ''}`,
    );
    if (entryKey(entry) === currentKey) btn.classList.add('is-current');
    btn.addEventListener('click', () => selectCharacterFromBrowse(entry));
    fragment.appendChild(btn);
  }
  el.charGrid.appendChild(fragment);
}

/** 打开字库浏览 */
function openBrowse() {
  renderBrowseGrid();
  el.browseDialog.showModal();
}

/** 从浏览列表选择条目并显示到练习区 */
function selectCharacterFromBrowse(entry) {
  el.browseDialog.close();
  showCharacter(entry);
}

/** 获取字形图片候选路径（主字优先，再 alternatives；按书体分目录） */
function getGlyphImageCandidates(entry) {
  const script = normalizeScript(entry.script);
  const dir = SCRIPT_IMAGE_DIR[script] || SCRIPT_IMAGE_DIR[SCRIPT.cao];
  const forms = typeof glyphImageCharForms === 'function'
    ? glyphImageCharForms(entry.char, entry)
    : [entry.char, ...(entry.alternatives || [])].filter(Boolean);
  const paths = [];
  const seen = new Set();
  for (const form of forms) {
    const ch = String(form || '').trim();
    if (!ch) continue;
    for (const ext of IMAGE_EXTENSIONS) {
      const path = `${dir}/${ch}.${ext}`;
      if (seen.has(path)) continue;
      seen.add(path);
      paths.push(path);
    }
  }
  return paths;
}

/** 按扩展名顺序尝试加载字形图片 */
function loadGlyphImage(entry) {
  const candidates = getGlyphImageCandidates(entry);
  let index = 0;

  el.glyphImage.onload = null;
  el.glyphImage.onerror = null;

  const tryNext = () => {
    if (index >= candidates.length) {
      el.glyphImage.src = '';
      el.glyphImage.classList.add('hidden');
      el.glyphPlaceholder.classList.remove('hidden');
      return;
    }

    const path = candidates[index++];
    el.glyphImage.onload = () => {
      el.glyphImage.classList.remove('hidden');
      el.glyphPlaceholder.classList.add('hidden');
    };
    el.glyphImage.onerror = tryNext;
    el.glyphImage.src = path;
  };

  tryNext();
}

/** 显示字形图片：直接替代中间文字 */
function showGlyph() {
  if (!currentEntry || !glyphImageAvailable) return;

  glyphVisible = true;
  el.display.classList.add('hidden');
  const scriptName = SCRIPT_NAME[normalizeScript(currentEntry.script)] || '';
  el.glyphImage.alt = `${currentEntry.char} ${scriptName}`;
  loadGlyphImage(currentEntry);
  updateShowButton();
}

function glyphAvailabilityCacheKey(entry) {
  if (!entry) return '';
  return entry.id || `${normalizeScript(entry.script)}:${entry.char}`;
}

/** 探测当前字是否有答案字形图（主字 + alternatives） */
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
      const probe = new Image();
      probe.onload = () => {
        glyphImageExistsCache.set(key, true);
        resolve(true);
      };
      probe.onerror = () => {
        index += 1;
        tryNext();
      };
      probe.src = candidates[index];
      index += 1;
    };
    tryNext();
  });
}

function refreshGlyphAvailability(entry) {
  const token = ++glyphAvailabilityToken;
  if (!entry) {
    glyphImageAvailable = false;
    updateShowButton();
    return;
  }

  // 探测完成前先置灰，避免沿用上一字的状态
  glyphImageAvailable = false;
  updateShowButton();

  probeGlyphImageExists(entry).then((hasImage) => {
    if (token !== glyphAvailabilityToken) return;
    if (currentEntry !== entry) return;
    glyphImageAvailable = hasImage;
    updateShowButton();
  });
}

/** 更新显示按钮状态 */
function updateShowButton() {
  const available = Boolean(currentEntry && glyphImageAvailable);
  el.btnShow.classList.toggle('is-active', glyphVisible && available);
  el.btnShow.classList.toggle('is-unavailable', !available);
  el.btnShow.disabled = !available;
  el.btnShow.setAttribute('aria-disabled', available ? 'false' : 'true');
  if (!available) {
    el.btnShow.setAttribute('aria-label', '暂无字形图片');
    el.btnShow.title = '暂无字形图片';
    return;
  }
  el.btnShow.setAttribute('aria-label', glyphVisible ? '隐藏字形' : '显示字形');
  el.btnShow.title = glyphVisible ? '隐藏字形' : '显示字形';
}

/** 隐藏字形，恢复中间文字 */
function hideGlyph() {
  glyphVisible = false;
  el.display.classList.remove('hidden');
  el.glyphImage.onload = null;
  el.glyphImage.onerror = null;
  el.glyphImage.src = '';
  el.glyphImage.classList.add('hidden');
  el.glyphPlaceholder.classList.add('hidden');
  updateShowButton();
}

/** 切换字形显示 */
function toggleGlyph() {
  if (!glyphImageAvailable) return;
  if (glyphVisible) {
    hideGlyph();
  } else {
    showGlyph();
  }
}

/** 打开字库设置（仅编辑草体/自定义池） */
function openSettings() {
  el.charactersInput.value = formatForInput(editableCharacters);
  updateCharCount();
  el.settingsDialog.showModal();
}

/** 更新字数统计 */
function updateCharCount() {
  const parsed = parseCharacters(el.charactersInput.value);
  el.charCount.textContent = parsed.length;
}

/** 保存字库 */
function saveSettings() {
  const parsed = parseCharacters(el.charactersInput.value);
  if (parsed.length === 0) {
    alert('请至少输入一个汉字');
    return;
  }
  editableCharacters = parsed;
  rebuildCharacters();
  recentHistory = [];
  resetSession();
  saveCharacters(editableCharacters);
  el.settingsDialog.close();
  refreshCharacter();
}

/** 短暂反馈按钮状态 */
function flashButtonTitle(button, message, restoreMs = 1500) {
  const prev = button.title;
  button.title = message;
  button.classList.add('is-flash');
  window.setTimeout(() => {
    button.title = prev;
    button.classList.remove('is-flash');
  }, restoreMs);
}

/** 复制本轮快照 JSON 到剪贴板 */
async function copySessionSnapshot(button) {
  const text = snapshotToJSON(getSnapshotForExport());
  try {
    await navigator.clipboard.writeText(text);
    if (button) flashButtonTitle(button, '已复制快照');
  } catch {
    window.prompt('复制以下 JSON 快照：', text);
  }
}

/**
 * 结算「复制结果」：生成可粘贴进 local/inbox.json 的练习快照
 * （含 strokes 时长、unique 卡面、inkDrop；本机 node merge 入账）
 */
function buildInboxMergeSnapshot() {
  let snapshot = completedSnapshot;
  if (!snapshot || !sessionHasPracticeData(snapshot)) {
    snapshot = getSnapshotForExport();
  }
  if (!snapshot || !sessionHasPracticeData(snapshot)) return null;

  if (typeof annotateSnapshotCommit === 'function') {
    return annotateSnapshotCommit(snapshot, {
      committedToLevels: false,
      commitSource: 'clipboard-copy',
    });
  }
  const meta = { ...(snapshot.meta || {}), commitSource: 'clipboard-copy' };
  delete meta.committedToLevels;
  return { ...snapshot, meta };
}

async function copySettlementResult(button) {
  const snapshot = buildInboxMergeSnapshot();
  if (!snapshot) {
    alert('本轮还没有可复制的练习结果');
    return;
  }
  const text = typeof snapshotToJSON === 'function'
    ? snapshotToJSON(snapshot)
    : JSON.stringify(snapshot, null, 2);

  const markCopied = () => {
    if (!button) return;
    const prev = button.textContent;
    button.textContent = '已复制';
    button.disabled = true;
    window.setTimeout(() => {
      button.textContent = prev || '复制结果';
      button.disabled = false;
    }, 1600);
  };

  try {
    await navigator.clipboard.writeText(text);
    markCopied();
  } catch {
    window.prompt('复制以下 JSON，粘贴进 local/inbox.json 后执行 node merge：', text);
  }
}

function sessionHasPracticeData(snapshot) {
  const strokes = snapshot?.strokes;
  if (Array.isArray(strokes) && strokes.length > 0) return true;
  const items = snapshot?.items;
  return Array.isArray(items) && items.length > 0;
}

/** 结算：冻结快照并显示小结（不写入数据） */
function enterSettlement() {
  if (sessionCompleted) return;
  const snapshot = getCurrentSnapshot();
  if (!sessionHasPracticeData(snapshot)) {
    alert('本轮还没有练过字');
    return;
  }

  sessionCompleted = true;
  completedSnapshot = snapshot;
  renderSettlementPanel(snapshot);
  updateStatsTable();
  setSettlementView(true);
}

/** 返回：取消结算，继续练字 */
function exitSettlement() {
  if (!sessionCompleted) return;
  sessionCompleted = false;
  completedSnapshot = null;
  setSettlementView(false);
  updateStatsTable();
}

/** 结束：写入 local 并跳转等级页 */
async function finishSettlementAndGoToLevel() {
  const snapshot = completedSnapshot;
  if (!snapshot || !sessionHasPracticeData(snapshot)) {
    alert('请先结算本轮练习');
    return;
  }

  if (!supportsLocalDirectoryPicker()) {
    alert('当前浏览器不支持文件夹访问。请用结算页「复制结果」→ 粘贴进 local/inbox.json → node merge');
    return;
  }

  if (el.btnRefresh) el.btnRefresh.disabled = true;
  if (el.btnSkip) el.btnSkip.disabled = true;
  if (el.btnSettlementCopy) el.btnSettlementCopy.disabled = true;
  let navigated = false;

  try {
    let handle = await loadLocalDirHandle();
    if (handle) {
      const allowed = await ensureDirPermission(handle, 'readwrite');
      if (!allowed) handle = null;
    }
    if (!handle) {
      handle = await pickLocalDirectory('readwrite');
    }

    const uid = practiceUserId || loadActiveUserId() || USER_MERGE_DEFAULT_USER_ID;
    await savePracticeSessionToLocal(handle, snapshot, uid);
    void refreshPracticeUserBadge();
    navigateToUserLevelPage();
    navigated = true;
  } catch (error) {
    if (error && error.name === 'AbortError') return;
    alert(`保存失败：${error.message || error}`);
  } finally {
    if (!navigated) {
      if (el.btnRefresh) el.btnRefresh.disabled = false;
      if (el.btnSkip) el.btnSkip.disabled = false;
      if (el.btnSettlementCopy) el.btnSettlementCopy.disabled = false;
    }
  }
}

function getUserLevelPageUrlRelative() {
  return `user/index.html?view=level`;
}

function navigateToUserLevelPage() {
  // 异步保存后用户手势已失效，合成 <a>.click() 常被拦截；用 location 跳转更稳
  window.location.href = getUserLevelPageUrlRelative();
  return getUserLevelPageUrlRelative();
}

function onSessionActionClick() {
  enterSettlement();
}

function onPrimaryFooterClick() {
  if (sessionCompleted) {
    finishSettlementAndGoToLevel();
  } else {
    refreshCharacter();
  }
}

function onSecondaryFooterClick() {
  if (sessionCompleted) {
    exitSettlement();
  } else {
    skipCharacter();
  }
}

/** 打开快照查看面板 */
function openSnapshotView() {
  const snapshot = getSnapshotForExport();
  el.snapshotReadable.textContent = snapshotToReadable(snapshot);
  el.snapshotJson.textContent = snapshotToJSON(snapshot);
  el.snapshotDialog.showModal();
}

/** 打开随机种子面板 */
function openSeedDialog() {
  el.seedInput.value = String(rngSeed);
  el.seedDialog.showModal();
  el.seedInput.focus();
  el.seedInput.select();
}

/** 应用面板中的种子 */
function applySeedFromDialog() {
  const next = parseSeedInput(el.seedInput.value);
  applySeed(next, { refresh: true });
  el.seedDialog.close();
  flashButtonTitle(el.btnSeed, `种子 ${rngSeed}`);
}

// 事件绑定
el.btnRefresh.addEventListener('click', onPrimaryFooterClick);
el.btnSkip.addEventListener('click', onSecondaryFooterClick);
el.btnSettlementCopy?.addEventListener('click', () => {
  void copySettlementResult(el.btnSettlementCopy);
});
el.btnSessionAction?.addEventListener('click', onSessionActionClick);
el.btnShow.addEventListener('click', toggleGlyph);
el.btnScript.addEventListener('click', (event) => {
  event.stopPropagation();
  toggleScriptMenu();
});
el.scriptMenu.addEventListener('click', (event) => {
  const btn = event.target.closest('[data-filter]');
  if (!btn) return;
  setScriptFilter(btn.dataset.filter);
});
document.addEventListener('click', (event) => {
  if (!el.scriptSwitch.contains(event.target)) {
    setScriptMenuOpen(false);
  }
});
el.btnSnapshotCopy.addEventListener('click', () => copySessionSnapshot(el.btnSnapshotCopy));
el.btnSnapshotView.addEventListener('click', openSnapshotView);
el.btnSnapshotClose.addEventListener('click', () => el.snapshotDialog.close());
el.btnSnapshotDialogClose.addEventListener('click', () => el.snapshotDialog.close());
el.btnSnapshotDialogCopy.addEventListener('click', () => {
  copySessionSnapshot(el.btnSnapshotDialogCopy);
});
el.snapshotDialog.addEventListener('click', (event) => {
  if (event.target === el.snapshotDialog) el.snapshotDialog.close();
});
el.btnSeed.addEventListener('click', openSeedDialog);
el.btnSeedClose.addEventListener('click', () => el.seedDialog.close());
el.btnSeedCancel.addEventListener('click', () => el.seedDialog.close());
el.btnSeedRandom.addEventListener('click', () => {
  el.seedInput.value = String(createRandomSeed());
  el.seedInput.focus();
  el.seedInput.select();
});
el.btnSeedApply.addEventListener('click', applySeedFromDialog);
el.seedInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    applySeedFromDialog();
  }
});
el.seedDialog.addEventListener('click', (event) => {
  if (event.target === el.seedDialog) el.seedDialog.close();
});
el.btnBrowse.addEventListener('click', openBrowse);
el.btnBrowseClose.addEventListener('click', () => el.browseDialog.close());
el.browseDialog.addEventListener('click', (event) => {
  if (event.target === el.browseDialog) el.browseDialog.close();
});
el.btnSettings.addEventListener('click', openSettings);
el.btnSave.addEventListener('click', saveSettings);
el.btnCancel.addEventListener('click', () => el.settingsDialog.close());
el.charactersInput.addEventListener('input', updateCharCount);
el.modeDefault.addEventListener('click', () => setLearningMode('default'));
el.modeTime.addEventListener('click', () => setLearningMode('time'));

// 初始化书体菜单选项（若 HTML 已写好则只同步状态）
if (!el.scriptMenu.querySelector('[data-filter]')) {
  const fragment = document.createDocumentFragment();
  for (const filter of SCRIPT_FILTER_OPTIONS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'script-menu-btn';
    btn.dataset.filter = filter;
    btn.textContent = SCRIPT_FILTER_LABEL[filter];
    btn.setAttribute('role', 'option');
    fragment.appendChild(btn);
  }
  el.scriptMenu.appendChild(fragment);
}

// 初始化
updateSessionActionButton();
updateFooterForPhase();
updateModeUI();
updateScriptFilterUI();
updateStatsTable();
refreshCharacter();
void refreshPracticeUserBadge();
