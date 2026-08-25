/**
 * cao/user — 连接 local 文件夹，自动列出并选择 user*.json（无需服务器）
 */

const IDB_NAME = 'cao-user-viewer';
const IDB_STORE = 'handles';
const IDB_KEY = 'local-dir';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const el = {
  hint: document.getElementById('status-hint'),
  dropRoot: document.getElementById('drop-root'),
  btnConnect: document.getElementById('btn-connect'),
  btnRefresh: document.getElementById('btn-refresh'),
  btnDisconnect: document.getElementById('btn-disconnect'),
  btnFallback: document.getElementById('btn-fallback'),
  btnHistoryFilter: document.getElementById('btn-history-filter'),
  fileInput: document.getElementById('file-input'),
  fileList: document.getElementById('file-list'),
  panel: document.getElementById('user-panel'),
  meta: document.getElementById('user-meta'),
  board: document.getElementById('char-board'),
  levelPanel: document.getElementById('level-panel'),
  levelSummary: document.getElementById('level-summary'),
  levelList: document.getElementById('level-list'),
  toolbar: document.getElementById('toolbar'),
  viewStats: document.getElementById('view-stats'),
  viewLevel: document.getElementById('view-level'),
};

/** @type {FileSystemDirectoryHandle | null} */
let dirHandle = null;

/** @type {{ id: string, file: string, name: string, handle?: FileSystemFileHandle, data?: object }[]} */
let fileEntries = [];
let activeId = null;
/** 历史筛选：week = 最近一周（默认），all = 全部 */
let historyFilter = 'week';
/** 当前界面：stats | level */
let currentView = 'level';

const MAX_CHAR_LEVEL = 10;

const supportsDirPicker = typeof window.showDirectoryPicker === 'function';

function setHint(text, isError = false) {
  el.hint.textContent = text;
  el.hint.classList.toggle('is-error', isError);
}

function formatTime(iso) {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function isUserJsonName(name) {
  return /^user(-[\w.-]+)?\.json$/i.test(name) && !/\.example\.json$/i.test(name);
}

function userIdFromFile(fileName) {
  const match = /^user-(.+)\.json$/i.exec(fileName);
  if (match) return match[1];
  if (/^user\.json$/i.test(fileName)) return 'default';
  return fileName.replace(/\.json$/i, '');
}

function openIdb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

async function saveDirHandle(handle) {
  const db = await openIdb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(handle, IDB_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function loadDirHandle() {
  const db = await openIdb();
  const handle = await new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const request = tx.objectStore(IDB_STORE).get(IDB_KEY);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return handle;
}

async function clearDirHandle() {
  const db = await openIdb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).delete(IDB_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function ensurePermission(handle, mode = 'read') {
  if (!handle) return false;
  const options = { mode };
  if ((await handle.queryPermission(options)) === 'granted') return true;
  if ((await handle.requestPermission(options)) === 'granted') return true;
  return false;
}

async function connectDirectory() {
  if (!supportsDirPicker) {
    setHint('当前浏览器不支持文件夹授权，请改用「手动选文件」。建议使用 Chrome / Edge。', true);
    el.btnFallback.hidden = false;
    return;
  }

  try {
    const handle = await window.showDirectoryPicker({
      id: 'cao-local',
      mode: 'read',
      startIn: 'documents',
    });
    dirHandle = handle;
    await saveDirHandle(handle);
    await scanDirectory();
  } catch (error) {
    if (error && error.name === 'AbortError') return;
    setHint(`连接失败：${error.message || error}`, true);
  }
}

async function scanDirectory() {
  if (!dirHandle) {
    setHint('尚未连接 local 文件夹。', true);
    return;
  }

  const allowed = await ensurePermission(dirHandle, 'read');
  if (!allowed) {
    setHint('没有读取权限，请重新连接 local 文件夹。', true);
    el.btnRefresh.hidden = true;
    el.btnDisconnect.hidden = true;
    return;
  }

  setHint('正在扫描 user*.json …');
  const next = [];

  for await (const [name, handle] of dirHandle.entries()) {
    if (handle.kind !== 'file' || !isUserJsonName(name)) continue;
    const id = userIdFromFile(name);
    next.push({
      id,
      file: name,
      name: id,
      handle,
    });
  }

  next.sort((a, b) => a.file.localeCompare(b.file, 'en'));
  fileEntries = next;

  el.btnRefresh.hidden = false;
  el.btnDisconnect.hidden = false;
  el.btnConnect.textContent = '重新连接';

  renderFileList();

  if (fileEntries.length === 0) {
    document.body.classList.remove('has-user-data');
    el.panel.classList.add('hidden');
    el.levelPanel.classList.add('hidden');
    setHint('已连接文件夹，但未找到 user*.json（例如 user-yi.json）。', true);
    return;
  }

  setHint(`已找到 ${fileEntries.length} 个用户文件，点击下方名称查看。`);

  const preferred = fileEntries.find((item) => item.id === 'yi')
    || fileEntries.find((item) => item.id === activeId)
    || fileEntries[0];
  await openEntry(preferred.id);
}

function renderFileList() {
  el.fileList.replaceChildren();

  if (fileEntries.length === 0) {
    el.fileList.classList.add('hidden');
    return;
  }

  el.fileList.classList.remove('hidden');
  const fragment = document.createDocumentFragment();

  for (const entry of fileEntries) {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'file-item';
    btn.classList.toggle('is-active', entry.id === activeId);
    btn.innerHTML = `<span class="file-item-name">${entry.name}</span><span class="file-item-path">${entry.file}</span>`;
    btn.addEventListener('click', () => openEntry(entry.id));
    li.appendChild(btn);
    fragment.appendChild(li);
  }

  el.fileList.appendChild(fragment);
}

async function readEntryData(entry) {
  if (entry.data) return entry.data;

  if (entry.handle) {
    const file = await entry.handle.getFile();
    const text = await file.text();
    const data = JSON.parse(text);
    validateUserData(data);
    entry.data = data;
    return data;
  }

  throw new Error('无法读取该文件');
}

function validateUserData(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('不是有效的用户总账对象');
  }
  if (!data.chars || typeof data.chars !== 'object') {
    throw new Error('缺少 chars 字段');
  }
}

function normalizeItemScript(script) {
  if (!script || script === 'cursive' || script === 'cao') return 'cao';
  if (script === 'song') return 'ming';
  return script;
}

function formatCharChipLabel(item) {
  const ch = item.char || '—';
  const count = item.count ?? 0;
  const script = normalizeItemScript(item.script);
  if (script === 'cao') return { char: ch, count, tag: '' };
  const tag = SCRIPT_NAME[script] ? SCRIPT_NAME[script].charAt(0) : script;
  return { char: ch, count, tag };
}

/** 是否在最近一周内出现过（按 lastSeenAt，缺省则 firstSeenAt） */
function isWithinLastWeek(item, now = Date.now()) {
  const iso = item.lastSeenAt || item.firstSeenAt;
  if (!iso) return false;
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return false;
  return now - time <= WEEK_MS;
}

function filterHistoryItems(items) {
  if (historyFilter === 'all') return items;
  const now = Date.now();
  return items.filter((item) => isWithinLastWeek(item, now));
}

function updateHistoryFilterUI() {
  const isWeek = historyFilter === 'week';
  el.btnHistoryFilter.textContent = isWeek ? '最近一周' : '全部历史';
  el.btnHistoryFilter.classList.toggle('is-week', isWeek);
  el.btnHistoryFilter.classList.toggle('is-all', !isWeek);
  el.btnHistoryFilter.setAttribute('aria-pressed', isWeek ? 'true' : 'false');
  el.btnHistoryFilter.title = isWeek ? '当前：最近一周（点击查看全部）' : '当前：全部历史（点击只看最近一周）';
}

function toggleHistoryFilter() {
  historyFilter = historyFilter === 'week' ? 'all' : 'week';
  updateHistoryFilterUI();
  const entry = fileEntries.find((item) => item.id === activeId);
  if (entry?.data) renderActiveView(entry);
}

/**
 * 由次数计算等级（不写入 JSON）
 * 0 次 = 0 级；1→2 需 2 次，2→3 需 3 次，…，9→10 需 10 次
 * 例如 5 次 = 2+3，正好 3 级，经验条 0%
 */
function getLevelFromCount(count) {
  const total = Math.max(0, Number(count) || 0);
  if (total <= 0) {
    return {
      level: 0,
      xp: 0,
      need: 1,
      ratio: 0,
    };
  }

  let remaining = total;
  let level = 1;

  while (level < MAX_CHAR_LEVEL) {
    const need = level + 1;
    if (remaining < need) {
      return {
        level,
        xp: remaining,
        need,
        ratio: need > 0 ? remaining / need : 0,
      };
    }
    remaining -= need;
    level += 1;
  }

  return {
    level: MAX_CHAR_LEVEL,
    xp: 0,
    need: 0,
    ratio: 1,
  };
}

function charEntryKey(item) {
  const script = normalizeItemScript(item?.script);
  const ch = item?.char || '';
  if (script === 'cao') return ch;
  return `${ch}@${script}`;
}

/** 练习字库中尚未练过的字 → LVL. 0 */
function getLibraryEntries() {
  if (typeof buildLibrary !== 'function' || typeof compileCharacters !== 'function') {
    return [];
  }
  const caoChars = typeof loadEditableCharacters === 'function'
    ? loadEditableCharacters()
    : compileCharacters(DEFAULT_CHARACTERS_cao);
  return buildLibrary(caoChars);
}

function collectLevelChars(data) {
  const byKey = new Map();
  const raw = data.chars && typeof data.chars === 'object' ? Object.values(data.chars) : [];

  for (const item of raw) {
    if (!item || !item.char) continue;
    byKey.set(charEntryKey(item), {
      char: item.char,
      script: normalizeItemScript(item.script),
      count: item.count || 0,
      firstSeenAt: item.firstSeenAt,
      lastSeenAt: item.lastSeenAt,
    });
  }

  for (const entry of getLibraryEntries()) {
    const key = charEntryKey(entry);
    if (!key || byKey.has(key)) continue;
    byKey.set(key, {
      char: entry.char,
      script: normalizeItemScript(entry.script),
      count: 0,
    });
  }

  return [...byKey.values()];
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** 0 深灰；1–5 绿→蓝，5–10 蓝→红 */
function levelFrameColor(level) {
  if (level <= 0) return '#4a4a4a';
  const green = [46, 170, 98];
  const blue = [52, 110, 214];
  const red = [214, 62, 52];
  const lv = Math.min(MAX_CHAR_LEVEL, Math.max(1, level));
  const from = lv <= 5 ? green : blue;
  const to = lv <= 5 ? blue : red;
  const t = lv <= 5 ? (lv - 1) / 4 : (lv - 5) / 5;
  const r = Math.round(lerp(from[0], to[0], t));
  const g = Math.round(lerp(from[1], to[1], t));
  const b = Math.round(lerp(from[2], to[2], t));
  return `rgb(${r}, ${g}, ${b})`;
}

function setView(view) {
  currentView = view === 'level' ? 'level' : 'stats';
  el.viewStats.classList.toggle('is-active', currentView === 'stats');
  el.viewLevel.classList.toggle('is-active', currentView === 'level');

  const hasData = Boolean(fileEntries.find((item) => item.id === activeId)?.data);
  document.body.classList.toggle('is-level-view', currentView === 'level');
  document.body.classList.toggle('has-user-data', hasData);

  el.panel.classList.toggle('hidden', currentView !== 'stats' || !hasData);
  el.levelPanel.classList.toggle('hidden', currentView !== 'level' || !hasData);

  const entry = fileEntries.find((item) => item.id === activeId);
  if (entry?.data) renderActiveView(entry);
}

function renderActiveView(entry) {
  if (currentView === 'level') renderLevelView(entry);
  else renderUser(entry);
}

function createLevelCard(item, info, color) {
  const script = normalizeItemScript(item.script);
  const card = document.createElement('div');
  card.className = 'level-card';

  const frame = document.createElement('div');
  frame.className = `level-frame script-${script}`;
  frame.style.background = color;
  frame.style.borderColor = color;

  const glyph = document.createElement('span');
  glyph.className = 'char-glyph';
  glyph.textContent = item.char || '—';

  const badge = document.createElement('span');
  badge.className = 'level-badge';
  badge.textContent = `LVL. ${info.level}`;

  frame.append(glyph, badge);

  const track = document.createElement('div');
  track.className = 'level-track';

  const bar = document.createElement('div');
  bar.className = 'level-bar';
  const fill = document.createElement('div');
  fill.className = 'level-bar-fill';
  fill.style.width = `${Math.round(info.ratio * 1000) / 10}%`;
  fill.style.background = color;
  bar.appendChild(fill);

  const xp = document.createElement('div');
  xp.className = 'level-xp';
  xp.textContent = info.level >= MAX_CHAR_LEVEL
    ? '满级'
    : `${info.xp} / ${info.need}`;

  track.append(bar, xp);
  card.append(frame, track);
  return card;
}

function renderLevelSummary(chars) {
  let levelSum = 0;
  let xpSum = 0;
  let countSum = 0;

  for (const item of chars) {
    const info = getLevelFromCount(item.count);
    levelSum += info.level;
    xpSum += info.level >= MAX_CHAR_LEVEL ? 0 : info.xp;
    countSum += item.count || 0;
  }

  const stats = [
    ['字', chars.length],
    ['等级', levelSum],
    ['经验', xpSum],
    ['次数', countSum],
  ];

  el.levelSummary.replaceChildren();
  for (const [label, value] of stats) {
    const item = document.createElement('div');
    item.className = 'level-summary-item';
    const num = document.createElement('span');
    num.className = 'level-summary-value';
    num.textContent = String(value);
    const tag = document.createElement('span');
    tag.className = 'level-summary-label';
    tag.textContent = label;
    item.append(num, tag);
    el.levelSummary.appendChild(item);
  }
}

function renderLevelView(entry) {
  const data = entry.data || {};
  const chars = collectLevelChars(data);

  chars.sort((a, b) => {
    const la = getLevelFromCount(a.count);
    const lb = getLevelFromCount(b.count);
    return lb.level - la.level
      || lb.ratio - la.ratio
      || (b.count || 0) - (a.count || 0)
      || String(a.char || '').localeCompare(String(b.char || ''), 'zh');
  });

  renderLevelSummary(chars);
  el.levelList.replaceChildren();

  if (chars.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = '暂无字记录';
    el.levelList.appendChild(empty);
    el.levelPanel.classList.remove('hidden');
    el.panel.classList.add('hidden');
    return;
  }

  const groups = new Map();
  for (const item of chars) {
    const info = getLevelFromCount(item.count);
    if (!groups.has(info.level)) groups.set(info.level, []);
    groups.get(info.level).push({ item, info });
  }

  const fragment = document.createDocumentFragment();
  for (const [level, members] of groups) {
    const section = document.createElement('section');
    section.className = 'level-section';
    section.dataset.level = String(level);

    const head = document.createElement('div');
    head.className = 'level-section-head';

    const title = document.createElement('div');
    title.className = 'level-section-title';
    title.textContent = `LEVEL. ${level}`;

    const rule = document.createElement('div');
    rule.className = 'level-section-rule';

    head.append(title, rule);

    const group = document.createElement('div');
    group.className = 'level-group';

    for (const { item, info } of members) {
      group.appendChild(createLevelCard(item, info, levelFrameColor(info.level)));
    }

    section.append(head, group);
    fragment.appendChild(section);
  }

  el.levelList.appendChild(fragment);
  el.levelPanel.classList.remove('hidden');
  el.panel.classList.add('hidden');
}

function renderUser(entry) {
  const data = entry.data || {};
  const summary = data.summary || {};
  const allChars = data.chars && typeof data.chars === 'object' ? Object.values(data.chars) : [];
  const chars = filterHistoryItems(allChars);

  chars.sort((a, b) => (b.count || 0) - (a.count || 0)
    || String(normalizeItemScript(a.script)).localeCompare(String(normalizeItemScript(b.script)))
    || String(a.char || '').localeCompare(String(b.char || ''), 'zh'));

  const shownAppearances = chars.reduce((sum, item) => sum + (item.count || 0), 0);
  const rangeLabel = historyFilter === 'week' ? '最近一周' : '全部';

  el.meta.innerHTML = [
    `<div>用户：<strong>${data.user || entry.name}</strong>（${entry.file}）</div>`,
    `<div>更新：${formatTime(data.updatedAt)}</div>`,
    `<div>合计：<strong>${summary.uniqueChars ?? allChars.length}</strong> 字 / <strong>${summary.totalAppearances ?? 0}</strong> 次 / <strong>${summary.sessionCount ?? 0}</strong> 轮</div>`,
    `<div>当前筛选（${rangeLabel}）：<strong>${chars.length}</strong> 字 / <strong>${shownAppearances}</strong> 次</div>`,
  ].join('');

  el.board.replaceChildren();

  if (chars.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = historyFilter === 'week' ? '最近一周暂无字记录' : '暂无字记录';
    el.board.appendChild(empty);
  } else {
    const fragment = document.createDocumentFragment();
    for (const item of chars) {
      const script = normalizeItemScript(item.script);
      const { char, count, tag } = formatCharChipLabel(item);

      const unit = document.createElement('span');
      unit.className = `char-unit script-${script}`;
      unit.title = script === 'cao'
        ? `${char} × ${count}`
        : `${char} · ${SCRIPT_NAME[script] || script} × ${count}`;

      const glyph = document.createElement('span');
      glyph.className = 'char-glyph';
      glyph.textContent = char;

      const meta = document.createElement('span');
      meta.className = 'char-meta';
      meta.textContent = tag ? `×${count}${tag}` : `×${count}`;

      unit.append(glyph, meta);
      fragment.appendChild(unit);
    }
    el.board.appendChild(fragment);
  }

  el.panel.classList.remove('hidden');
  el.levelPanel.classList.add('hidden');
  updateHistoryFilterUI();
}

async function openEntry(id) {
  const entry = fileEntries.find((item) => item.id === id);
  if (!entry) return;

  activeId = id;
  renderFileList();
  setHint(`正在读取 ${entry.file} …`);

  try {
    // 刷新时重新读盘：清掉缓存再读
    entry.data = undefined;
    await readEntryData(entry);
    document.body.classList.add('has-user-data');
    renderActiveView(entry);
    setHint(`已找到 ${fileEntries.length} 个用户文件。当前：${entry.file}`);
  } catch (error) {
    document.body.classList.remove('has-user-data');
    el.panel.classList.add('hidden');
    el.levelPanel.classList.add('hidden');
    setHint(`读取 ${entry.file} 失败：${error.message || error}`, true);
  }
}

async function disconnect() {
  dirHandle = null;
  fileEntries = [];
  activeId = null;
  document.body.classList.remove('has-user-data');
  await clearDirHandle();
  el.fileList.classList.add('hidden');
  el.panel.classList.add('hidden');
  el.levelPanel.classList.add('hidden');
  el.btnRefresh.hidden = true;
  el.btnDisconnect.hidden = true;
  el.btnConnect.textContent = '连接 local';
  setHint('已断开。请重新连接 app/cao/local 文件夹。');
}

async function ingestManualFiles(fileList) {
  const files = [...fileList].filter((file) => file.name.toLowerCase().endsWith('.json'));
  if (files.length === 0) {
    setHint('请选择 .json 文件', true);
    return;
  }

  const next = [];
  const errors = [];

  for (const file of files) {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      validateUserData(data);
      const id = data.user || (isUserJsonName(file.name) ? userIdFromFile(file.name) : file.name.replace(/\.json$/i, ''));
      next.push({
        id: String(id),
        file: file.name,
        name: String(id),
        data,
      });
    } catch (error) {
      errors.push(`${file.name}：${error.message || error}`);
    }
  }

  if (next.length === 0) {
    setHint(errors.join('；') || '没有可读文件', true);
    return;
  }

  fileEntries = next.sort((a, b) => a.file.localeCompare(b.file, 'en'));
  renderFileList();
  const preferred = fileEntries.find((item) => item.id === 'yi') || fileEntries[0];
  await openEntry(preferred.id);
  if (errors.length) {
    setHint(`已加载 ${fileEntries.length} 个；部分失败：${errors.join('；')}`, true);
  }
}

async function tryRestoreDirectory() {
  if (!supportsDirPicker) {
    el.btnFallback.hidden = false;
    setHint('当前浏览器不支持自动扫描文件夹。请用 Chrome / Edge，或改用「手动选文件」。', true);
    return;
  }

  try {
    const saved = await loadDirHandle();
    if (!saved) return;

    dirHandle = saved;
    const allowed = await ensurePermission(dirHandle, 'read');
    if (!allowed) {
      setHint('已记住文件夹，但需要重新授权。请点击「连接 local 文件夹」。');
      return;
    }

    el.btnConnect.textContent = '重新连接';
    await scanDirectory();
  } catch {
    // ignore restore errors
  }
}

function init() {
  el.btnConnect.addEventListener('click', connectDirectory);
  el.btnRefresh.addEventListener('click', async () => {
    // 清缓存后重扫并重读当前
    for (const entry of fileEntries) entry.data = undefined;
    await scanDirectory();
  });
  el.btnDisconnect.addEventListener('click', disconnect);
  el.btnHistoryFilter.addEventListener('click', toggleHistoryFilter);
  el.viewStats.addEventListener('click', () => setView('stats'));
  el.viewLevel.addEventListener('click', () => setView('level'));

  el.btnFallback.addEventListener('click', () => el.fileInput.click());
  el.fileInput.addEventListener('change', () => {
    if (el.fileInput.files && el.fileInput.files.length > 0) {
      ingestManualFiles(el.fileInput.files);
    }
  });

  updateHistoryFilterUI();
  document.body.classList.toggle('is-level-view', currentView === 'level');

  if (!supportsDirPicker) {
    el.btnFallback.hidden = false;
  }

  // 拖放仍可用作后备
  const onDrag = (event) => {
    event.preventDefault();
    el.dropRoot.classList.add('is-dragover');
  };
  const onDragEnd = (event) => {
    event.preventDefault();
    el.dropRoot.classList.remove('is-dragover');
  };
  el.dropRoot.addEventListener('dragenter', onDrag);
  el.dropRoot.addEventListener('dragover', onDrag);
  el.dropRoot.addEventListener('dragleave', onDragEnd);
  el.dropRoot.addEventListener('drop', (event) => {
    onDragEnd(event);
    const files = event.dataTransfer && event.dataTransfer.files;
    if (files && files.length > 0) ingestManualFiles(files);
  });

  tryRestoreDirectory();
}

init();
