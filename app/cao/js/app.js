/**
 * 草书练习 — 主应用逻辑
 */

let characters = loadCharacters();
let currentChar = null;
let cursiveVisible = false;
let learningMode = loadLearningMode();
/** 最近显示过的汉字，最新在前，最多保留 2 个 */
let recentHistory = [];
/** 本次会话中各汉字出现次数 */
const appearanceCounts = new Map();
const STATS_ROW_COUNT = 12;

const el = {
  display: document.getElementById('character-display'),
  cursivePreview: document.getElementById('cursive-preview'),
  cursiveImage: document.getElementById('cursive-image'),
  cursivePlaceholder: document.getElementById('cursive-placeholder'),
  btnShow: document.getElementById('btn-show'),
  btnRefresh: document.getElementById('btn-refresh'),
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

/** 重置出现次数统计 */
function resetAppearanceCounts() {
  appearanceCounts.clear();
  updateStatsTable();
}

/** 记录汉字出现次数 */
function recordAppearance(char) {
  if (!char) return;
  appearanceCounts.set(char, (appearanceCounts.get(char) || 0) + 1);
  updateStatsTable();
}

/** 更新右侧统计表格 */
function updateStatsTable() {
  const entries = [...appearanceCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh'))
    .slice(0, STATS_ROW_COUNT);

  el.statsRows.forEach((row, index) => {
    const charCell = row.querySelector('.stats-char');
    const countCell = row.querySelector('.stats-count');
    const entry = entries[index];

    if (entry) {
      charCell.textContent = entry[0];
      countCell.textContent = entry[1];
      row.classList.remove('is-empty');
    } else {
      charCell.textContent = '';
      countCell.textContent = '';
      row.classList.add('is-empty');
    }
  });
}

/** 均匀随机选取 */
function pickUniform(pool) {
  const index = Math.floor(Math.random() * pool.length);
  return pool[index];
}

/** 按权重随机选取（时间模式） */
function pickWeighted(pool, weights) {
  const otherWeight = weights.get('__other__') ?? 0;
  let total = 0;

  const entries = pool.map((ch) => {
    const weight = weights.has(ch) ? weights.get(ch) : otherWeight;
    total += weight;
    return { ch, weight };
  });

  if (total <= 0) return pickUniform(pool);

  let roll = Math.random() * total;
  for (const { ch, weight } of entries) {
    roll -= weight;
    if (roll < 0) return ch;
  }

  return entries[entries.length - 1].ch;
}

/** 构建候选池，排除最近两次已显示的字 */
function getCandidatePool() {
  const excluded = new Set(recentHistory);
  const candidates = characters.filter((ch) => !excluded.has(ch));
  return candidates.length > 0 ? candidates : characters;
}

/** 从字库中随机选取一个汉字 */
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
  refreshCharacter();
}

/** 记录已显示的汉字到历史 */
function recordHistory(char) {
  if (char === null) return;
  recentHistory = [char, ...recentHistory].slice(0, 2);
}

/** 刷新显示一个新字 */
function refreshCharacter() {
  hideCursive();

  if (characters.length === 0) {
    currentChar = null;
    recentHistory = [];
    resetAppearanceCounts();
    el.display.textContent = '—';
    return;
  }

  el.display.classList.add('fade');
  setTimeout(() => {
    currentChar = pickRandom();
    recordHistory(currentChar);
    recordAppearance(currentChar);
    el.display.textContent = currentChar;
    el.display.classList.remove('fade');
  }, 150);
}

/** 获取草书图片路径（图片命名规则：images/characters/{汉字}.png） */
function getCursiveImagePath(char) {
  return `images/characters/${char}.png`;
}

/** 显示草书预览 */
function showCursive() {
  if (!currentChar) return;

  cursiveVisible = true;
  el.cursivePreview.classList.remove('hidden');

  const imgPath = getCursiveImagePath(currentChar);
  el.cursiveImage.src = imgPath;
  el.cursiveImage.alt = `${currentChar} 草书`;

  el.cursiveImage.onload = () => {
    el.cursiveImage.classList.remove('hidden');
    el.cursivePlaceholder.classList.add('hidden');
  };

  el.cursiveImage.onerror = () => {
    el.cursiveImage.classList.add('hidden');
    el.cursivePlaceholder.classList.remove('hidden');
  };

  updateShowButton();
}

/** 更新显示按钮状态 */
function updateShowButton() {
  el.btnShow.classList.toggle('is-active', cursiveVisible);
  el.btnShow.setAttribute('aria-label', cursiveVisible ? '隐藏草书' : '显示草书');
  el.btnShow.title = cursiveVisible ? '隐藏草书' : '显示草书';
}

/** 隐藏草书预览 */
function hideCursive() {
  cursiveVisible = false;
  el.cursivePreview.classList.add('hidden');
  el.cursiveImage.src = '';
  el.cursiveImage.classList.add('hidden');
  el.cursivePlaceholder.classList.remove('hidden');
  updateShowButton();
}

/** 切换草书显示 */
function toggleCursive() {
  if (cursiveVisible) {
    hideCursive();
  } else {
    showCursive();
  }
}

/** 打开字库设置 */
function openSettings() {
  el.charactersInput.value = formatForInput(characters);
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
  characters = parsed;
  recentHistory = [];
  resetAppearanceCounts();
  saveCharacters(characters);
  el.settingsDialog.close();
  refreshCharacter();
}

// 事件绑定
el.btnRefresh.addEventListener('click', refreshCharacter);
el.btnShow.addEventListener('click', toggleCursive);
el.btnSettings.addEventListener('click', openSettings);
el.btnSave.addEventListener('click', saveSettings);
el.btnCancel.addEventListener('click', () => el.settingsDialog.close());
el.charactersInput.addEventListener('input', updateCharCount);
el.modeDefault.addEventListener('click', () => setLearningMode('default'));
el.modeTime.addEventListener('click', () => setLearningMode('time'));

// 初始化
updateModeUI();
updateStatsTable();
refreshCharacter();
