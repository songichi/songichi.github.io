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
};

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
  });
}

/** 重置本轮会话统计 */
function resetSession() {
  resetSessionState(session);
  updateStatsTable();
}

/** 记录条目出现 */
function recordAppearance(entry) {
  recordSessionItem(session, entry);
  updateStatsTable();
}

/** 撤销条目一次出现 */
function unrecordAppearance(entry) {
  if (!entry) return;
  unrecordSessionItem(session, entry);
  updateStatsTable();
}

/** 将统计结果编排为行：≥2 次独占一行；仅 1 次每行最多 4 字 */
function buildStatsRows(items) {
  const multi = [];
  const singles = [];

  for (const item of items) {
    if (item.count >= 2) multi.push(item);
    else singles.push(item);
  }

  const rows = [];
  for (const item of multi) {
    rows.push({ type: 'counted', label: formatSessionItemLabel(item), count: item.count });
  }
  for (let i = 0; i < singles.length; i += STATS_PACK_SIZE) {
    rows.push({
      type: 'pack',
      labels: singles.slice(i, i + STATS_PACK_SIZE).map(formatSessionItemLabel),
    });
  }
  return rows.slice(0, STATS_ROW_COUNT);
}

/** 更新右侧统计列表 */
function updateStatsTable() {
  const items = [...session.items.values()].sort(
    (a, b) => b.count - a.count
      || a.script.localeCompare(b.script)
      || a.char.localeCompare(b.char, 'zh'),
  );
  const rows = buildStatsRows(items);

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
      charEl.textContent = data.label;
      const countEl = document.createElement('span');
      countEl.className = 'stats-count';
      countEl.textContent = String(data.count);
      row.append(charEl, countEl);
      return;
    }

    row.classList.add('stats-row-pack');
    for (const label of data.labels) {
      const charEl = document.createElement('span');
      charEl.className = 'stats-char';
      charEl.textContent = label;
      row.appendChild(charEl);
    }
  });
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

/** 构建候选池，排除最近两次已显示的条目 */
function getCandidatePool() {
  const excluded = new Set(recentHistory);
  const candidates = characters.filter((entry) => !excluded.has(entryKey(entry)));
  return candidates.length > 0 ? candidates : characters;
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
  hideGlyph();

  if (showCharacterTimer) {
    clearTimeout(showCharacterTimer);
    showCharacterTimer = null;
  }

  if (!entry) {
    currentEntry = null;
    el.display.textContent = '—';
    return;
  }

  el.display.classList.add('fade');
  showCharacterTimer = setTimeout(() => {
    showCharacterTimer = null;
    currentEntry = entry;
    recordHistory(currentEntry);
    recordAppearance(currentEntry);
    el.display.textContent = currentEntry.char;
    el.display.classList.remove('fade');
  }, 150);
}

/** 刷新显示一个新字 */
function refreshCharacter() {
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

/** 获取字形图片候选路径（按书体分目录；优先 png，兼容 jpg / jpeg / webp） */
function getGlyphImageCandidates(entry) {
  const script = normalizeScript(entry.script);
  const dir = SCRIPT_IMAGE_DIR[script] || SCRIPT_IMAGE_DIR[SCRIPT.cao];
  return IMAGE_EXTENSIONS.map((ext) => `${dir}/${entry.char}.${ext}`);
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
  if (!currentEntry) return;

  glyphVisible = true;
  el.display.classList.add('hidden');
  const scriptName = SCRIPT_NAME[normalizeScript(currentEntry.script)] || '';
  el.glyphImage.alt = `${currentEntry.char} ${scriptName}`;
  loadGlyphImage(currentEntry);
  updateShowButton();
}

/** 更新显示按钮状态 */
function updateShowButton() {
  el.btnShow.classList.toggle('is-active', glyphVisible);
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
  const text = snapshotToJSON(getCurrentSnapshot());
  try {
    await navigator.clipboard.writeText(text);
    if (button) flashButtonTitle(button, '已复制快照');
  } catch {
    window.prompt('复制以下 JSON 快照：', text);
  }
}

/** 打开快照查看面板 */
function openSnapshotView() {
  const snapshot = getCurrentSnapshot();
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
el.btnRefresh.addEventListener('click', refreshCharacter);
el.btnSkip.addEventListener('click', skipCharacter);
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
updateModeUI();
updateScriptFilterUI();
updateStatsTable();
refreshCharacter();
