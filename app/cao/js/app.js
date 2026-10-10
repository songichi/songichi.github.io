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

/** unique 掉落音效（音量与用户页「音效音量」共用） */
const UNIQUE_DROP_SFX_URL = new URL('sound/sfx_uniqueDrop.mp3', window.location.href).href;
const SFX_VOLUME_STORAGE_KEY = 'cao-card-sfx-volume';
const SFX_VOLUME_DEFAULT = 70;
/** 相对 sfx_card：源文件更轻，播放时额外增益（用户音量滑条仍生效） */
const UNIQUE_DROP_SFX_GAIN = 5;

/** @type {AudioContext | null} */
let uniqueDropAudioCtx = null;
/** @type {AudioBuffer | null} */
let uniqueDropBuffer = null;
/** @type {ArrayBuffer | null} */
let uniqueDropRawData = null;
/** @type {Promise<ArrayBuffer | null> | null} */
let uniqueDropRawPromise = null;
/** @type {Promise<AudioBuffer | null> | null} */
let uniqueDropBufferPromise = null;

function uniqueDropVolume() {
  try {
    const raw = localStorage.getItem(SFX_VOLUME_STORAGE_KEY);
    // 未设置过时 getItem 为 null；Number(null) === 0，不能当成静音
    if (raw == null || raw === '') return SFX_VOLUME_DEFAULT;
    const n = Math.round(Number(raw));
    if (!Number.isFinite(n)) return SFX_VOLUME_DEFAULT;
    return Math.min(100, Math.max(0, n));
  } catch {
    return SFX_VOLUME_DEFAULT;
  }
}

/** 实际播放增益：滑条 0–100 × 额外增益。HTMLAudio 上限 1；Web Audio 可略超 1 */
function uniqueDropPlaybackGain({ forHtmlAudio = false } = {}) {
  const volume = uniqueDropVolume();
  if (volume <= 0) return 0;
  const gain = (volume / 100) * UNIQUE_DROP_SFX_GAIN;
  if (forHtmlAudio) return Math.min(1, gain);
  // 源峰值约 0.25，×5 ≈ 1.25；再封顶避免极端
  return Math.min(2.5, gain);
}

function prefetchUniqueDropSfx() {
  if (uniqueDropRawData) return Promise.resolve(uniqueDropRawData);
  if (uniqueDropRawPromise) return uniqueDropRawPromise;
  uniqueDropRawPromise = (async () => {
    const response = await fetch(UNIQUE_DROP_SFX_URL);
    if (!response.ok) throw new Error(`sfx http ${response.status}`);
    uniqueDropRawData = await response.arrayBuffer();
    return uniqueDropRawData;
  })().catch((error) => {
    console.warn('[cao] unique drop sfx fetch failed', error);
    uniqueDropRawPromise = null;
    return null;
  });
  return uniqueDropRawPromise;
}

function getUniqueDropAudioContext() {
  if (uniqueDropAudioCtx) return uniqueDropAudioCtx;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  uniqueDropAudioCtx = new Ctx();
  return uniqueDropAudioCtx;
}

function loadUniqueDropBuffer() {
  if (uniqueDropBuffer) return Promise.resolve(uniqueDropBuffer);
  if (uniqueDropBufferPromise) return uniqueDropBufferPromise;
  uniqueDropBufferPromise = (async () => {
    const ctx = getUniqueDropAudioContext();
    if (!ctx) return null;
    const data = await prefetchUniqueDropSfx();
    if (!data) return null;
    uniqueDropBuffer = await ctx.decodeAudioData(data.slice(0));
    return uniqueDropBuffer;
  })().catch((error) => {
    console.warn('[cao] unique drop sfx decode failed', error);
    uniqueDropBufferPromise = null;
    return null;
  });
  return uniqueDropBufferPromise;
}

function startUniqueDropBuffer(buffer) {
  const ctx = getUniqueDropAudioContext();
  if (!ctx || ctx.state !== 'running' || !buffer) return false;
  const gainValue = uniqueDropPlaybackGain();
  if (gainValue <= 0) return true;
  const source = ctx.createBufferSource();
  const gain = ctx.createGain();
  gain.gain.value = gainValue;
  source.buffer = buffer;
  source.connect(gain);
  gain.connect(ctx.destination);
  try {
    source.start(0);
  } catch {
    source.start();
  }
  return true;
}

/** @type {HTMLAudioElement | null} */
let uniqueDropAudio = null;
let uniqueDropUnlocked = false;

function getUniqueDropAudio() {
  if (!uniqueDropAudio) {
    uniqueDropAudio = new Audio(UNIQUE_DROP_SFX_URL);
    uniqueDropAudio.preload = 'auto';
  }
  return uniqueDropAudio;
}

/** 在用户手势里解锁：resume AudioContext + 解码缓冲 + 丢弃式静音 play */
function unlockUniqueDropSfx() {
  const ctx = getUniqueDropAudioContext();
  if (ctx && ctx.state !== 'running') {
    const resumePromise = ctx.resume();
    if (resumePromise && typeof resumePromise.catch === 'function') {
      resumePromise.catch(() => {});
    }
  }
  void loadUniqueDropBuffer();

  // 预热共享元素，提高首次真正播放成功率
  try {
    getUniqueDropAudio().load();
  } catch {
    // ignore
  }

  if (uniqueDropUnlocked) return;
  try {
    const silent = new Audio(UNIQUE_DROP_SFX_URL);
    silent.volume = 0;
    const pending = silent.play();
    if (pending && typeof pending.then === 'function') {
      pending.then(() => {
        uniqueDropUnlocked = true;
        silent.pause();
      }).catch(() => {});
    } else {
      uniqueDropUnlocked = true;
    }
  } catch {
    // ignore
  }
}

function playUniqueDropSfxWebAudio() {
  try {
    const ctx = getUniqueDropAudioContext();
    if (!ctx) return false;
    const playReady = (buffer) => {
      if (!buffer) return false;
      if (ctx.state === 'running') return startUniqueDropBuffer(buffer);
      const resumePromise = ctx.resume();
      if (resumePromise && typeof resumePromise.then === 'function') {
        resumePromise.then(() => {
          if (ctx.state === 'running') startUniqueDropBuffer(buffer);
        }).catch(() => {});
      }
      return false;
    };
    if (uniqueDropBuffer) return playReady(uniqueDropBuffer);
    void loadUniqueDropBuffer().then(playReady);
    return false;
  } catch (error) {
    console.warn('[cao] unique drop sfx play failed', error);
    return false;
  }
}

function playUniqueDropSfx() {
  const volume = uniqueDropVolume();
  if (volume <= 0) return;

  // 1) 缓冲已就绪时：在点击栈内同步走 Web Audio（最稳，可 >1 增益）
  if (uniqueDropBuffer && uniqueDropAudioCtx && uniqueDropAudioCtx.state === 'running') {
    if (startUniqueDropBuffer(uniqueDropBuffer)) return;
  }

  // 2) 每次新建 Audio，避免和解锁用的静音 play 抢同一个元素
  try {
    const audio = new Audio(UNIQUE_DROP_SFX_URL);
    audio.volume = uniqueDropPlaybackGain({ forHtmlAudio: true });
    const pending = audio.play();
    if (pending && typeof pending.then === 'function') {
      pending.then(() => {
        uniqueDropUnlocked = true;
      }).catch(() => {
        playUniqueDropSfxWebAudio();
      });
      return;
    }
  } catch (error) {
    console.warn('[cao] unique drop sfx play failed', error);
  }
  playUniqueDropSfxWebAudio();
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
/** 当前字是否曾翻开过原型（影响 unique 门控；切字时清零） */
let currentGlyphRevealed = false;
/** 当前字是否有答案字形图 */
let glyphImageAvailable = false;
let glyphAvailabilityToken = 0;
let learningMode = loadLearningMode();
/** 识字模式：历史最近识别过的 id（新在前），默认剔除 50 个 */
const RECOGNIZE_HISTORY_EXCLUDE = 50;
let recognizeRecentIds = [];
let recognizeAnswerRevealed = false;
let recognizeShownAt = 0;
let recognizeRoundToken = 0;
/** @type {Promise<void> | null} */
let recognizeGlyphPoolPromise = null;
/** 最近显示过的条目键，最新在前，最多保留 2 个 */
let recentHistory = [];
/** 本轮已跳过的条目键（本轮内不再出现） */
let sessionSkippedKeys = new Set();
/** 本轮字库已全部完成/跳过：底部双钮变为「结算」 */
let libraryExhausted = false;
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

const SCRIPT_FILTER_OPTIONS = [
  SCRIPT_FILTER.cao,
  SCRIPT_FILTER.zhen,
  SCRIPT_FILTER.all,
];

const el = {
  display: document.getElementById('character-display'),
  glyphImage: document.getElementById('glyph-image'),
  glyphPlaceholder: document.getElementById('glyph-placeholder'),
  recognizeBar: document.getElementById('recognize-bar'),
  recognizeInput: document.getElementById('recognize-input'),
  recognizeAnswer: document.getElementById('recognize-answer'),
  recognizeAnswerChar: document.getElementById('recognize-answer-char'),
  btnShow: document.getElementById('btn-show'),
  zhenPracticeMeta: document.getElementById('zhen-practice-meta'),
  zhenPracticeForm: document.getElementById('zhen-practice-form'),
  zhenPracticeVariation: document.getElementById('zhen-practice-variation'),
  zhenStageBg: document.getElementById('zhen-stage-bg'),
  btnRefresh: document.getElementById('btn-refresh'),
  btnSkip: document.getElementById('btn-skip'),
  btnSettlementCopy: document.getElementById('btn-settlement-copy'),
  btnSessionAction: document.getElementById('btn-session-action'),
  characterStage: document.getElementById('character-stage'),
  settlementPanel: document.getElementById('settlement-panel'),
  settlementMeta: document.getElementById('settlement-meta'),
  settlementChars: document.getElementById('settlement-chars'),
  chancePanel: document.getElementById('chance-panel'),
  chanceRules: document.getElementById('chance-rules'),
  chanceRulesList: document.getElementById('chance-rules-list'),
  uniqueChanceDots: document.getElementById('unique-chance-dots'),
  btnUniqueSfxTest: document.getElementById('btn-unique-sfx-test'),
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
  browseExcludeCount: document.getElementById('browse-exclude-count'),
  btnSettings: document.getElementById('btn-settings'),
  settingsDialog: document.getElementById('settings-dialog'),
  charactersInput: document.getElementById('characters-input'),
  charCount: document.getElementById('char-count'),
  btnSave: document.getElementById('btn-save'),
  btnCancel: document.getElementById('btn-cancel'),
  modeDefault: document.getElementById('mode-default'),
  modeRandom: document.getElementById('mode-random'),
  modeTime: document.getElementById('mode-time'),
  modeRecognize: document.getElementById('mode-recognize'),
  statsRows: [...document.querySelectorAll('.stats-row')],
  statsInkGain: document.getElementById('stats-ink-gain'),
  practiceUserId: document.getElementById('practice-user-id'),
};

/** 当前 local 用户 id（保存时用；null 表示未找到） */
let practiceUserId = null;
let practiceIsTestUser = false;

function updateUniqueSfxTestButton() {
  const btn = el.btnUniqueSfxTest;
  if (!btn) return;
  const show = Boolean(practiceIsTestUser);
  btn.hidden = !show;
  btn.classList.toggle('hidden', !show);
  btn.setAttribute('aria-hidden', show ? 'false' : 'true');
}

/** testUser 左下角试听：强制可听，排查掉落静音问题 */
function playUniqueDropSfxTest() {
  unlockUniqueDropSfx();
  const saved = uniqueDropVolume();
  // 与正式掉落同一套增益；音量为 0 时临时按默认滑条算
  const slider = saved <= 0 ? SFX_VOLUME_DEFAULT : saved;
  try {
    const audio = new Audio(UNIQUE_DROP_SFX_URL);
    audio.volume = Math.min(1, (slider / 100) * UNIQUE_DROP_SFX_GAIN);
    const pending = audio.play();
    if (pending && typeof pending.then === 'function') {
      pending.then(() => {
        flashButtonTitle(
          el.btnUniqueSfxTest,
          saved <= 0
            ? `已播放（音量原为 0，本次用 ${slider}×${UNIQUE_DROP_SFX_GAIN}）`
            : `已播放 · ${slider}×${UNIQUE_DROP_SFX_GAIN}`,
        );
      }).catch((error) => {
        playUniqueDropSfxWebAudio();
        flashButtonTitle(el.btnUniqueSfxTest, `播放失败，已回退 WebAudio：${error?.message || error}`);
      });
      return;
    }
  } catch (error) {
    console.warn('[cao] unique drop sfx test failed', error);
  }
  playUniqueDropSfxWebAudio();
  flashButtonTitle(el.btnUniqueSfxTest, '已尝试播放');
}

async function refreshPracticeUserBadge() {
  const result = await resolveLocalPracticeUser();
  practiceUserId = result.userId;
  practiceIsTestUser = false;
  if (!el.practiceUserId) {
    updateUniqueSfxTestButton();
    return;
  }
  if (!result.userId) {
    el.practiceUserId.textContent = '';
    el.practiceUserId.title = '';
    el.practiceUserId.hidden = true;
    el.practiceUserId.classList.add('is-empty');
    el.practiceUserId.classList.remove('is-resolved');
    updateUniqueSfxTestButton();
    return;
  }
  el.practiceUserId.hidden = false;
  el.practiceUserId.classList.remove('is-empty');
  el.practiceUserId.textContent = result.display;
  el.practiceUserId.classList.add('is-resolved');
  el.practiceUserId.title = `local 用户：user-${result.userId}.json`;
  updateUniqueSfxTestButton();
}

function clearRecognizeHistory() {
  recognizeRecentIds = [];
}

/** 最近识别过的字（新在前），最多 40 个不重复 id */
function loadRecognizeHistoryFromStats(stats) {
  const ordered = [];
  for (const session of stats?.sessions || []) {
    if (session?.mode !== 'recognize') continue;
    for (const stroke of session.strokes || []) {
      if (stroke?.id) ordered.push(String(stroke.id));
    }
  }
  const seen = new Set();
  const recent = [];
  for (let i = ordered.length - 1; i >= 0; i -= 1) {
    const id = ordered[i];
    if (seen.has(id)) continue;
    seen.add(id);
    recent.push(id);
    if (recent.length >= RECOGNIZE_HISTORY_EXCLUDE) break;
  }
  recognizeRecentIds = recent;
}

/** 从 local 用户账本加载默认模式所需的练习历史（lastSeen / 最近 50） */
async function loadDefaultModeHistory() {
  if (typeof defaultModeChance === 'undefined') {
    clearRecognizeHistory();
    practiceIsTestUser = false;
    updateUniqueSfxTestButton();
    return;
  }

  try {
    if (!supportsLocalDirectoryPicker()) {
      defaultModeChance.clearHistory();
      clearRecognizeHistory();
      practiceIsTestUser = false;
      updateUniqueSfxTestButton();
      return;
    }

    const handle = await loadLocalDirHandle();
    if (!handle) {
      defaultModeChance.clearHistory();
      clearRecognizeHistory();
      practiceIsTestUser = false;
      updateUniqueSfxTestButton();
      return;
    }

    const allowed = await ensureDirPermission(handle, 'read');
    if (!allowed) {
      defaultModeChance.clearHistory();
      clearRecognizeHistory();
      practiceIsTestUser = false;
      updateUniqueSfxTestButton();
      return;
    }

    const uid = practiceUserId || loadActiveUserId();
    if (!uid) {
      defaultModeChance.clearHistory();
      clearRecognizeHistory();
      practiceIsTestUser = false;
      updateUniqueSfxTestButton();
      return;
    }

    const raw = await readJsonFromDir(handle, userStatsFileName(uid));
    if (!raw) {
      defaultModeChance.clearHistory();
      clearRecognizeHistory();
      practiceIsTestUser = false;
      updateUniqueSfxTestButton();
      return;
    }

    const stats = typeof unpackUserStatsFromDisk === 'function'
      ? unpackUserStatsFromDisk(raw, uid)
      : (typeof normalizeUserStats === 'function' ? normalizeUserStats(raw, uid) : raw);
    defaultModeChance.loadFromUserStats(stats);
    loadRecognizeHistoryFromStats(stats);
    practiceIsTestUser = Boolean(stats?.isTestUser);
    updateUniqueSfxTestButton();
  } catch {
    defaultModeChance.clearHistory();
    clearRecognizeHistory();
    practiceIsTestUser = false;
    updateUniqueSfxTestButton();
  }
}

/** 重建当前练习库（真书仅保留有字形图的条目） */
let rebuildCharactersToken = 0;

async function rebuildCharacters() {
  const token = ++rebuildCharactersToken;
  fullLibrary = buildLibrary(editableCharacters);
  const filtered = filterLibrary(fullLibrary, scriptFilter);
  const withGlyph = typeof filterPracticeEntriesByGlyph === 'function'
    ? await filterPracticeEntriesByGlyph(filtered)
    : filtered;
  if (token !== rebuildCharactersToken) return;
  characters = withGlyph;
  recognizeGlyphPoolPromise = null;
}

/** 真书练习：无 unique / 墨掉落（与识字一样跳过掉落判定） */
function isZhenPracticeEntry(entry) {
  if (!entry) return false;
  return typeof normalizeScript === 'function'
    && normalizeScript(entry.script) === SCRIPT.zhen;
}

function shouldSkipDropForEntry(entry) {
  return learningMode === 'recognize' || isZhenPracticeEntry(entry);
}

/** 生成本轮快照对象。仅结算时把当前未完成的字定稿写入。 */
function getCurrentSnapshot({ commitActive = false } = {}) {
  return buildSessionSnapshot(session, {
    filter: scriptFilter,
    mode: learningMode,
    librarySize: characters.length,
    dropRng: random,
    commitActive,
    skipDrop: shouldSkipDropForEntry(currentEntry),
    glyphRevealed: currentGlyphRevealed,
  });
}

/** 导出/复制用：未结算不生成可入账快照 */
function getSnapshotForExport() {
  if (sessionCompleted && completedSnapshot) return completedSnapshot;
  return null;
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
    el.btnRefresh.disabled = false;
    el.btnSkip.disabled = false;
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
  } else if (libraryExhausted) {
    el.btnRefresh.disabled = false;
    el.btnSkip.disabled = false;
    el.btnRefresh.textContent = '结算';
    el.btnRefresh.title = '结算本轮练习（不写入数据）';
    el.btnRefresh.setAttribute('aria-label', '结算');
    el.btnSkip.textContent = '结算';
    el.btnSkip.title = '结算本轮练习（不写入数据）';
    el.btnSkip.setAttribute('aria-label', '结算');
    if (el.btnSettlementCopy) {
      el.btnSettlementCopy.classList.add('hidden');
      el.btnSettlementCopy.textContent = '复制结果';
      el.btnSettlementCopy.disabled = false;
    }
  } else if (learningMode === 'recognize') {
    const hasEntry = Boolean(currentEntry);
    el.btnRefresh.disabled = !hasEntry || recognizeAnswerRevealed;
    el.btnRefresh.textContent = '检查';
    el.btnRefresh.title = '检查输入是否为这个草书的汉字';
    el.btnRefresh.setAttribute('aria-label', '检查');
    el.btnSkip.disabled = !hasEntry;
    el.btnSkip.textContent = '跳过';
    el.btnSkip.title = recognizeAnswerRevealed ? '下一字' : '跳过当前字';
    el.btnSkip.setAttribute('aria-label', '跳过');
    if (el.btnSettlementCopy) {
      el.btnSettlementCopy.classList.add('hidden');
      el.btnSettlementCopy.textContent = '复制结果';
      el.btnSettlementCopy.disabled = false;
    }
  } else {
    el.btnRefresh.disabled = false;
    el.btnSkip.disabled = false;
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
  const modeLabel = typeof formatLearningModeLabel === 'function'
    ? formatLearningModeLabel(snapshot?.meta?.mode)
    : (snapshot?.meta?.mode === 'time'
      ? '时间'
      : (snapshot?.meta?.mode === 'recognize'
        ? '识字'
        : (snapshot?.meta?.mode === 'random' ? '随机' : '默认')));
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
    empty.textContent = snapshot?.meta?.mode === 'recognize'
      ? '本轮还没有识别过字'
      : '本轮还没有练过字';
    el.settlementChars.appendChild(empty);
    return;
  }

  const uniqueIds = new Set();
  for (const stroke of snapshot?.strokes || []) {
    if (stroke?.isUnique && stroke.id) uniqueIds.add(String(stroke.id));
  }
  const sealsById = collectRevealedSeals({ strokes: snapshot?.strokes || [] });

  for (const item of items) {
    const wrap = document.createElement('span');
    wrap.className = 'settlement-char';
    if (item?.id && uniqueIds.has(String(item.id))) wrap.classList.add('is-unique');

    const labelText = typeof formatSessionItemLabel === 'function'
      ? formatSessionItemLabel(item)
      : (item.char || item.id || '—');
    const seal = item?.id ? sealsById.get(String(item.id)) : null;
    const normalizedSeal = typeof normalizeZhenSeal === 'function'
      ? normalizeZhenSeal(seal)
      : seal;

    if (normalizedSeal) {
      wrap.classList.add('has-seal', `has-seal-${normalizedSeal}`);
      const sealLabel = (typeof ZHEN_SEAL_LABEL !== 'undefined' && ZHEN_SEAL_LABEL[normalizedSeal])
        || normalizedSeal;
      wrap.title = sealLabel;
      const sealFrame = createStatsSealFrameSvg(normalizedSeal);
      if (sealFrame) wrap.appendChild(sealFrame);
      const glyph = document.createElement('span');
      glyph.className = 'settlement-char-label settlement-seal-glyph';
      glyph.textContent = labelText;
      wrap.appendChild(glyph);
    } else {
      const label = document.createElement('span');
      label.className = 'settlement-char-label';
      label.textContent = labelText;
      wrap.appendChild(label);
    }

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
  updateModeUI();
}

function resetSessionPhase() {
  sessionCompleted = false;
  completedSnapshot = null;
  allowPracticeUnload = false;
  libraryExhausted = false;
  setSettlementView(false);
  if (el.btnSessionAction) el.btnSessionAction.disabled = false;
  if (el.btnRefresh) el.btnRefresh.disabled = false;
  if (el.btnSkip) el.btnSkip.disabled = false;
}

/** 重置本轮会话统计 */
function resetSession() {
  sessionSkippedKeys = new Set();
  libraryExhausted = false;
  resetSessionState(session);
  resetSessionPhase();
  updateStatsTable();
}

/** 当前模式用的字库（识字仅含有字形图的草体） */
function getPracticeLibraryEntries() {
  if (learningMode === 'recognize') {
    return listCaoEntries().filter((entry) => {
      const key = glyphAvailabilityCacheKey(entry);
      return Boolean(key) && glyphImageExistsCache.get(key) === true;
    });
  }
  return Array.isArray(characters) ? characters : [];
}

/** 本轮已消耗键：已定稿 + 已跳过；可选把当前字也算进去 */
function getConsumedSessionKeys({ includeCurrent = false } = {}) {
  const consumed = new Set(sessionSkippedKeys);
  for (const stroke of session?.strokes || []) {
    if (stroke?.id) consumed.add(String(stroke.id));
  }
  if (includeCurrent) {
    if (session?.activeStroke?.id) consumed.add(String(session.activeStroke.id));
    const currentKey = entryKey(currentEntry);
    if (currentKey) consumed.add(currentKey);
  }
  return consumed;
}

function getRemainingLibraryEntries({ includeCurrent = false } = {}) {
  const consumed = getConsumedSessionKeys({ includeCurrent });
  return getPracticeLibraryEntries().filter((entry) => {
    const key = entryKey(entry);
    return Boolean(key) && !consumed.has(key);
  });
}

/**
 * 当前字完成后若字库已空：定稿本字、提示耗尽，底部双钮变为「结算」
 * @returns {boolean} 是否已进入耗尽态
 */
function tryEnterLibraryExhausted(message) {
  const library = getPracticeLibraryEntries();
  if (library.length === 0) return false;
  if (getRemainingLibraryEntries({ includeCurrent: true }).length > 0) return false;

  const previousGlyphRevealed = currentGlyphRevealed;
  if (showCharacterTimer) {
    clearTimeout(showCharacterTimer);
    showCharacterTimer = null;
  }

  if (session?.activeStroke?.id) {
    finalizeActiveStroke(session, Date.now(), {
      rng: random,
      glyphRevealed: previousGlyphRevealed,
      skipDrop: shouldSkipDropForEntry(currentEntry),
    });
  }

  currentEntry = null;
  currentGlyphRevealed = false;
  glyphImageAvailable = false;
  recognizeAnswerRevealed = false;
  hideGlyph();
  if (typeof updateZhenPracticeMeta === 'function') updateZhenPracticeMeta(null);
  if (el.display) {
    el.display.classList.remove('hidden', 'fade');
    el.display.textContent = message
      || (learningMode === 'recognize' ? '本轮可识别的字已经用完' : '本轮字库已练完');
  }
  if (el.recognizeAnswer) el.recognizeAnswer.classList.add('hidden');
  if (el.recognizeInput) {
    el.recognizeInput.value = '';
    el.recognizeInput.disabled = true;
  }

  libraryExhausted = true;
  updateStatsTable();
  updateShowButton();
  renderUniqueChanceDotsUI();
  updateFooterForPhase();
  return true;
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

/** 已定稿真书印记：每 id 取最高稀有度 */
function collectRevealedSeals(state) {
  const byId = new Map();
  const rank = (typeof ZHEN_SEAL_RANK !== 'undefined' && ZHEN_SEAL_RANK)
    ? ZHEN_SEAL_RANK
    : { common: 1, rare: 2, absolute: 3 };
  for (const stroke of state?.strokes || []) {
    if (!stroke?.id || !stroke.seal) continue;
    const seal = typeof normalizeZhenSeal === 'function'
      ? normalizeZhenSeal(stroke.seal)
      : stroke.seal;
    if (!seal) continue;
    const id = String(stroke.id);
    const prev = byId.get(id);
    if (!prev || (rank[seal] || 0) > (rank[prev] || 0)) byId.set(id, seal);
  }
  return byId;
}

/** 右侧统计 / 结算：印记红框（普通单层 · 稀有双层 · 绝对三层） */
function createStatsSealFrameSvg(seal) {
  if (typeof createZhenSealFrameSvg === 'function') {
    return createZhenSealFrameSvg(seal, {
      size: 52,
      className: 'zhen-seal-frame stats-seal-frame',
    });
  }
  return null;
}

function createStatsCharEl(label, {
  isUnique = false,
  hasInkDrop = false,
  seal = null,
} = {}) {
  const charEl = document.createElement('span');
  charEl.className = 'stats-char';
  if (isUnique) charEl.classList.add('is-unique');
  if (hasInkDrop) charEl.classList.add('has-ink-drop');
  const normalizedSeal = typeof normalizeZhenSeal === 'function'
    ? normalizeZhenSeal(seal)
    : seal;
  if (normalizedSeal) {
    charEl.classList.add('has-seal', `has-seal-${normalizedSeal}`);
    const labelText = (typeof ZHEN_SEAL_LABEL !== 'undefined' && ZHEN_SEAL_LABEL[normalizedSeal])
      || normalizedSeal;
    charEl.title = labelText;
    const frame = createStatsSealFrameSvg(normalizedSeal);
    if (frame) charEl.appendChild(frame);
    const glyph = document.createElement('span');
    glyph.className = 'stats-seal-glyph';
    glyph.textContent = label;
    charEl.appendChild(glyph);
  } else {
    charEl.textContent = label;
  }
  return charEl;
}

/** 更新右侧统计列表（unique / 墨 / 印记：定稿进 strokes 后才显示；账户仍待结算写入） */
function updateStatsTable() {
  const items = [...session.items.values()].sort(
    (a, b) => b.count - a.count
      || String(a.id || '').localeCompare(String(b.id || '')),
  );
  const uniqueIds = collectRevealedUniqueIds(session);
  const inkDrops = collectRevealedInkDrops(session);
  const sealsById = collectRevealedSeals(session);
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
      const charEl = createStatsCharEl(data.label, {
        isUnique: data.isUnique,
        hasInkDrop: Boolean(data.id && inkDrops.ids.has(String(data.id))),
        seal: data.id ? sealsById.get(String(data.id)) : null,
      });
      const countEl = document.createElement('span');
      countEl.className = 'stats-count';
      countEl.textContent = String(data.count);
      row.append(charEl, countEl);
      return;
    }

    row.classList.add('stats-row-pack');
    for (const entry of data.entries) {
      row.appendChild(createStatsCharEl(entry.label, {
        isUnique: entry.isUnique,
        hasInkDrop: Boolean(entry.id && inkDrops.ids.has(String(entry.id))),
        seal: entry.id ? sealsById.get(String(entry.id)) : null,
      }));
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

/** 本轮已定稿字数超过此值时，刷新/关闭页面前确认 */
const PRACTICE_UNLOAD_WARN_AFTER = 3;
/** 允许离开（例如已结算 / 写入成功后跳转） */
let allowPracticeUnload = false;

/** 本轮已定稿（完成并进入下一字）的字数 */
function getFinalizedStrokeCount() {
  if (sessionCompleted && completedSnapshot) {
    return Array.isArray(completedSnapshot.strokes) ? completedSnapshot.strokes.length : 0;
  }
  return Array.isArray(session?.strokes) ? session.strokes.length : 0;
}

function shouldWarnPracticeUnload() {
  // 仅练字进行中拦截；已结算 / 允许离开时不提示
  if (allowPracticeUnload || sessionCompleted) return false;
  return getFinalizedStrokeCount() > PRACTICE_UNLOAD_WARN_AFTER;
}

function onPracticeBeforeUnload(event) {
  if (!shouldWarnPracticeUnload()) return;
  event.preventDefault();
  event.returnValue = '';
}

/** 本轮抽字排除键：已定稿 / 当前字 / 已跳过 */
function getSessionSeenKeys() {
  const seen = new Set(sessionSkippedKeys);
  for (const stroke of session?.strokes || []) {
    if (stroke?.id) seen.add(String(stroke.id));
  }
  if (session?.activeStroke?.id) seen.add(String(session.activeStroke.id));
  return seen;
}

/**
 * 当前练习字库中，因「近期做过」而被剔除的字数（与抽字规则一致；无剔除时为 0）
 */
function countRecentHistoryExcludedInLibrary(library = characters) {
  const list = Array.isArray(library) ? library : [];
  if (!list.length || typeof defaultModeChance === 'undefined') return 0;
  if (typeof resolveRecentHistoryExcludeCount === 'function'
    && resolveRecentHistoryExcludeCount(list.length) <= 0) {
    return 0;
  }
  if (!defaultModeChance.getRecentHistoryExcludeSet) return 0;
  const history = defaultModeChance.getRecentHistoryExcludeSet(list.length);
  if (!history.size) return 0;
  let n = 0;
  for (const entry of list) {
    const key = entryKey(entry);
    if (key && history.has(key)) n += 1;
  }
  return n;
}

/**
 * 字库浏览里标灰的字：本轮已见/已跳过，以及默认模式因最近练过而剔除的字。
 * 近期剔除把池子抽空、规则回退时，那些字实际仍会抽到，不标灰。
 */
function getBrowseExcludedKeys() {
  const excluded = getSessionSeenKeys();
  // 默认 / 随机都走近期剔除过滤；时间（历史）与识字不在此标灰
  if (learningMode !== 'default' && learningMode !== 'random') return excluded;
  if (typeof defaultModeChance === 'undefined' || !defaultModeChance.getRecentHistoryExcludeSet) {
    return excluded;
  }
  const history = defaultModeChance.getRecentHistoryExcludeSet(characters.length);
  if (!history.size) return excluded;
  const pool = defaultModeChance.buildNormalFilteredPool(characters, excluded);
  const poolKeys = new Set((pool || []).map((entry) => entryKey(entry)).filter(Boolean));
  for (const key of history) {
    if (key && !poolKeys.has(key)) excluded.add(key);
  }
  return excluded;
}

/** 构建候选池（时间模式）：排除最近两次显示的字 + 本轮已跳过 */
function getCandidatePool() {
  const excluded = new Set(recentHistory);
  for (const key of sessionSkippedKeys) excluded.add(key);
  const candidates = characters.filter((entry) => !excluded.has(entryKey(entry)));
  return candidates.length > 0 ? candidates : characters;
}

/** 从字库中随机选取一个条目 */
function pickRandom() {
  if (characters.length === 0) return null;

  if (typeof defaultModeChance !== 'undefined'
    && (learningMode === 'default' || learningMode === 'random' || learningMode === 'time')) {
    const result = defaultModeChance.pick({
      library: characters,
      sessionSeenKeys: getSessionSeenKeys(),
      rng: random,
      profile: learningMode === 'random'
        ? 'random'
        : (learningMode === 'time' ? 'time' : 'default'),
      // 时间模式（历史/隐藏）：10/10 强制近期（D）
      ...(learningMode === 'time' ? { forceRuleId: 'D' } : {}),
    });
    updateActiveChanceRule(result?.ruleId || null, Boolean(result?.fellBack));
    return result?.entry || pickUniform(characters);
  }

  updateActiveChanceRule(null, false);
  return pickUniform(getCandidatePool());
}

/** 当前抽中的规则（回退时仍标原规则，用虚线框） */
let activeChanceRuleId = null;
let activeChanceRuleFellBack = false;

function updateActiveChanceRule(ruleId, fellBack = false) {
  activeChanceRuleId = ruleId || null;
  activeChanceRuleFellBack = Boolean(activeChanceRuleId) && Boolean(fellBack);
  if (!el.chanceRulesList) return;
  el.chanceRulesList.querySelectorAll('.chance-rule').forEach((item) => {
    const on = Boolean(activeChanceRuleId) && item.dataset.rule === activeChanceRuleId;
    item.classList.toggle('is-active', on);
    item.classList.toggle('is-fallback', on && activeChanceRuleFellBack);
    item.setAttribute('aria-current', on ? 'true' : 'false');
  });
}

/** unique 掉落门控几率（默认 8%；本字翻开过原型则 +2%） */
function getUniqueAppearanceChance() {
  if (typeof resolveUniqueAppearanceChance === 'function') {
    return resolveUniqueAppearanceChance({ glyphRevealed: currentGlyphRevealed });
  }
  const n = Number(
    typeof CARD_UNIQUE_APPEARANCE_CHANCE === 'number' ? CARD_UNIQUE_APPEARANCE_CHANCE : NaN,
  );
  const base = Number.isFinite(n) && n >= 0 ? n : 0;
  const bonus = Number(
    typeof CARD_UNIQUE_GLYPH_REVEAL_BONUS === 'number' ? CARD_UNIQUE_GLYPH_REVEAL_BONUS : 0,
  );
  if (!currentGlyphRevealed || !Number.isFinite(bonus) || bonus <= 0) return base;
  return Math.min(1, base + bonus);
}

/** 每满 2% 一颗点；不足 2% 的余数不计（11%→5，12%→6） */
function uniqueChanceDotCount(chance = getUniqueAppearanceChance()) {
  const pct = Math.max(0, Number(chance) || 0) * 100;
  return Math.floor(pct / 2);
}

/** 抽字几率上方：按门控几率显示橙色点（真书 / 识字无 unique 掉落，不显示） */
function renderUniqueChanceDotsUI() {
  const host = el.uniqueChanceDots;
  if (!host) return;
  host.replaceChildren();
  if (
    learningMode === 'recognize'
    || isZhenPracticeEntry(currentEntry)
    || scriptFilter === SCRIPT_FILTER.zhen
  ) {
    host.setAttribute('aria-label', '真书/识字无 unique 掉落');
    host.removeAttribute('title');
    host.setAttribute('aria-hidden', 'true');
    return;
  }
  host.setAttribute('aria-hidden', 'false');
  const chance = getUniqueAppearanceChance();
  const count = uniqueChanceDotCount(chance);
  const pctText = `${Math.round(chance * 1000) / 10}%`;
  host.setAttribute('aria-label', `unique 掉落门控 ${pctText}，${count} 点`);
  host.title = `unique 掉落门控 ${pctText}（每满 2% 一颗橙点）`;
  for (let i = 0; i < count; i += 1) {
    const dot = document.createElement('span');
    dot.className = 'unique-chance-dot';
    dot.setAttribute('aria-hidden', 'true');
    host.appendChild(dot);
  }
}

/** 渲染抽字规则（默认 A/B/C/D；随机 B7/A3；时间仅 D） */
function renderChanceRulesUI() {
  renderUniqueChanceDotsUI();
  if (!el.chanceRulesList) return;
  el.chanceRulesList.replaceChildren();
  if (typeof DefaultModeChance === 'undefined') return;

  const sharesTotal = typeof DEFAULT_CHANCE_SHARES === 'number' ? DEFAULT_CHANCE_SHARES : 10;
  let rules;
  if (learningMode === 'time') {
    rules = [{
      id: 'D',
      label: '强制近期',
      shares: sharesTotal,
      detail: '时间模式：始终走强制近期。无视历史最近 N 字过滤，仅排除本轮已出现；从加入最晚的 10 字中选，触发几率 = 本轮尚未练到的近期字数 / 10。未触发时回退为默认随机。',
    }];
  } else if (learningMode === 'random') {
    rules = typeof DefaultModeChance.getRandomModeRulesMeta === 'function'
      ? DefaultModeChance.getRandomModeRulesMeta()
      : DefaultModeChance.getRulesMeta().filter((r) => r.id === 'B' || r.id === 'A');
  } else {
    rules = DefaultModeChance.getRulesMeta();
  }

  for (const rule of rules) {
    const li = document.createElement('li');
    li.className = 'chance-rule';
    li.tabIndex = 0;
    li.dataset.rule = rule.id;

    const label = document.createElement('span');
    label.className = 'chance-rule-label';
    label.textContent = rule.label;

    const rate = document.createElement('span');
    rate.className = 'chance-rule-rate';
    rate.textContent = `${rule.shares}/${sharesTotal}`;

    const tip = document.createElement('span');
    tip.className = 'chance-rule-tip';
    tip.textContent = rule.detail;
    tip.setAttribute('role', 'tooltip');

    li.append(label, rate, tip);
    el.chanceRulesList.appendChild(li);
  }

  updateActiveChanceRule(activeChanceRuleId, activeChanceRuleFellBack);
}

/** 更新学习模式 UI */
function updateModeUI() {
  el.modeDefault?.classList.toggle('is-active', learningMode === 'default');
  el.modeRandom?.classList.toggle('is-active', learningMode === 'random');
  el.modeTime?.classList.toggle('is-active', learningMode === 'time');
  el.modeRecognize?.classList.toggle('is-active', learningMode === 'recognize');
  document.body.classList.toggle('is-recognize-mode', learningMode === 'recognize');
  const inRecognize = learningMode === 'recognize' && !sessionCompleted;
  el.recognizeBar?.classList.toggle('hidden', !inRecognize);

  renderChanceRulesUI();
  const showChance = (
    learningMode === 'default'
    || learningMode === 'random'
    || learningMode === 'time'
  ) && !sessionCompleted;
  if (el.chancePanel) {
    el.chancePanel.classList.toggle('hidden', !showChance);
    el.chancePanel.setAttribute('aria-hidden', showChance ? 'false' : 'true');
  } else if (el.chanceRules) {
    el.chanceRules.classList.toggle('hidden', !showChance);
    el.chanceRules.setAttribute('aria-hidden', showChance ? 'false' : 'true');
  }
}

/** 切换学习模式（时间模式入口已隐藏，不可再切入；历史 session.mode=time 仍可读） */
function setLearningMode(mode) {
  const allowed = typeof LEARNING_MODE_SELECTABLE !== 'undefined'
    ? LEARNING_MODE_SELECTABLE
    : ['default', 'random', 'recognize'];
  if (!allowed.includes(mode)) return;
  if (mode === learningMode) return;
  learningMode = mode;
  saveLearningMode(mode);
  updateModeUI();
  recentHistory = [];
  resetSession();
  if (mode === 'recognize') beginRecognizeRound();
  else refreshCharacter();
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
async function setScriptFilter(filter) {
  if (!Object.values(SCRIPT_FILTER).includes(filter)) return;
  if (filter === scriptFilter) {
    setScriptMenuOpen(false);
    return;
  }

  scriptFilter = filter;
  saveScriptFilter(filter);
  await rebuildCharacters();
  recentHistory = [];
  resetSession();
  updateScriptFilterUI();
  setScriptMenuOpen(false);
  if (learningMode === 'recognize') beginRecognizeRound();
  else refreshCharacter();
}

/** 记录已显示的条目到历史 */
function recordHistory(entry) {
  if (entry === null) return;
  recentHistory = [entryKey(entry), ...recentHistory].slice(0, 2);
}

/** 在练习区显示指定条目 */
function showCharacter(entry) {
  if (sessionCompleted && entry) return;

  const previousGlyphRevealed = currentGlyphRevealed;
  const previousEntry = currentEntry;
  const skipDrop = shouldSkipDropForEntry(previousEntry);
  glyphImageAvailable = false;
  currentGlyphRevealed = false;
  hideGlyph();

  if (showCharacterTimer) {
    clearTimeout(showCharacterTimer);
    showCharacterTimer = null;
  }

  if (!entry) {
    currentEntry = null;
    // 清空展示时结束上一字（真书 / 识字跳过掉落判定）
    finalizeActiveStroke(session, Date.now(), {
      rng: random,
      glyphRevealed: previousGlyphRevealed,
      skipDrop,
    });
    el.display.textContent = '—';
    updateZhenPracticeMeta(null);
    refreshGlyphAvailability(null);
    renderUniqueChanceDotsUI();
    updateStatsTable();
    return;
  }

  // 掉落判定和音效必须留在这次点击/按键里。放进下面的淡入计时器会丢掉用户手势，浏览器会把声音静音。
  // skipDrop 针对上一字（正在 finalize 的那笔）；真书字永不进 unique / 墨掉落。
  currentEntry = entry;
  recordHistory(currentEntry);
  recordAppearance(currentEntry, {
    rng: random,
    glyphRevealed: previousGlyphRevealed,
    skipDrop,
  });
  updateZhenPracticeMeta(currentEntry);
  renderUniqueChanceDotsUI();
  el.display.classList.add('fade');
  showCharacterTimer = setTimeout(() => {
    showCharacterTimer = null;
    if (currentEntry !== entry) return;
    el.display.textContent = currentEntry.char;
    el.display.classList.remove('fade');
    refreshGlyphAvailability(currentEntry);
  }, 150);
}

/** 刷新显示一个新字 */
function refreshCharacter() {
  if (sessionCompleted) return;
  if (learningMode === 'recognize') {
    void ensureRecognizeGlyphPool().then(() => {
      if (learningMode !== 'recognize' || sessionCompleted) return;
      refreshRecognizeCharacter();
    });
    return;
  }
  if (characters.length === 0) {
    recentHistory = [];
    resetSession();
    showCharacter(null);
    return;
  }

  if (tryEnterLibraryExhausted('本轮字库已练完')) return;

  libraryExhausted = false;
  showCharacter(pickRandom());
}

/** 跳过当前字：撤销本轮记录，本轮内不再抽到该字 */
function skipCharacter() {
  if (sessionCompleted) return;
  const toUndo = currentEntry;
  if (showCharacterTimer) {
    clearTimeout(showCharacterTimer);
    showCharacterTimer = null;
  }
  if (toUndo) {
    const key = entryKey(toUndo);
    if (key) sessionSkippedKeys.add(key);
    unrecordAppearance(toUndo);
  }
  refreshCharacter();
}

function listCaoEntries() {
  return (fullLibrary || []).filter((entry) => normalizeScript(entry?.script) === SCRIPT.cao);
}

function ensureRecognizeGlyphPool() {
  if (recognizeGlyphPoolPromise) return recognizeGlyphPoolPromise;
  const entries = listCaoEntries().filter((entry) => {
    const key = glyphAvailabilityCacheKey(entry);
    return key && !glyphImageExistsCache.has(key);
  });
  recognizeGlyphPoolPromise = (async () => {
    const queue = entries.slice();
    const workers = Math.min(6, queue.length);
    if (workers === 0) return;
    await Promise.all(Array.from({ length: workers }, async () => {
      while (queue.length > 0) {
        const entry = queue.shift();
        if (!entry) break;
        await probeGlyphImageExists(entry);
      }
    }));
  })();
  return recognizeGlyphPoolPromise;
}

function recognizeAnswerForms(entry) {
  if (!entry) return [];
  if (typeof glyphImageCharForms === 'function') {
    return glyphImageCharForms(entry.char, entry);
  }
  return [entry.char, ...(entry.alternatives || [])].filter(Boolean);
}

function isRecognizeAnswerCorrect(entry, raw) {
  const text = String(raw || '').trim().replace(/\s+/g, '');
  if (!text || !entry) return false;
  return recognizeAnswerForms(entry).some((form) => form === text);
}

function pickRecognizeEntry() {
  const withGlyph = listCaoEntries().filter((entry) => {
    const key = glyphAvailabilityCacheKey(entry);
    return Boolean(key) && glyphImageExistsCache.get(key) === true;
  });
  if (withGlyph.length === 0) return { entry: null, reason: 'no-glyph' };

  const historyExclude = new Set(recognizeRecentIds.slice(0, RECOGNIZE_HISTORY_EXCLUDE));
  const sessionSeen = getSessionSeenKeys();
  const fresh = withGlyph.filter((entry) => {
    const key = entryKey(entry);
    return key && !sessionSeen.has(key) && !historyExclude.has(key);
  });
  const pool = fresh.length > 0
    ? fresh
    : withGlyph.filter((entry) => {
      const key = entryKey(entry);
      return key && !sessionSeen.has(key);
    });
  if (pool.length === 0) return { entry: null, reason: 'exhausted' };
  return { entry: pickUniform(pool), reason: '' };
}

function clearRecognizeAnswer() {
  recognizeAnswerRevealed = false;
  if (el.recognizeInput) {
    el.recognizeInput.value = '';
    el.recognizeInput.disabled = false;
  }
  el.recognizeAnswer?.classList.add('hidden');
  if (el.recognizeAnswerChar) el.recognizeAnswerChar.textContent = '';
}

function showRecognizeCharacter(entry, reason = '') {
  recognizeAnswerRevealed = false;
  clearRecognizeAnswer();
  currentEntry = entry || null;
  recognizeShownAt = entry ? Date.now() : 0;
  glyphImageAvailable = Boolean(entry);
  if (el.display) el.display.textContent = '';
  hideGlyph();

  if (!entry) {
    el.display.classList.remove('hidden');
    if (reason === 'exhausted') {
      libraryExhausted = true;
      el.display.textContent = '本轮可识别的字已经用完';
    } else {
      libraryExhausted = false;
      el.display.textContent = reason === 'no-glyph'
        ? '没有可用的草书字形'
        : '本轮可识别的字已经用完';
    }
    updateFooterForPhase();
    return;
  }

  libraryExhausted = false;
  el.display.textContent = '';
  el.display.classList.add('hidden');
  glyphVisible = true;
  const scriptName = SCRIPT_NAME[normalizeScript(entry.script)] || '';
  el.glyphImage.alt = `${entry.char} ${scriptName}`.trim();
  loadGlyphImage(entry);
  updateFooterForPhase();
  el.recognizeInput?.focus();
}

function refreshRecognizeCharacter() {
  if (sessionCompleted || learningMode !== 'recognize') return;
  if (tryEnterLibraryExhausted('本轮可识别的字已经用完')) return;
  const picked = pickRecognizeEntry();
  showRecognizeCharacter(picked.entry, picked.reason);
}

async function beginRecognizeRound() {
  const token = ++recognizeRoundToken;
  recognizeAnswerRevealed = false;
  currentEntry = null;
  clearRecognizeAnswer();
  hideGlyph();
  if (el.display) {
    el.display.classList.remove('hidden');
    el.display.textContent = '…';
  }
  updateModeUI();
  updateFooterForPhase();
  await ensureRecognizeGlyphPool();
  if (token !== recognizeRoundToken || learningMode !== 'recognize' || sessionCompleted) return;
  refreshRecognizeCharacter();
}

function commitRecognizeSuccess(entry) {
  if (!entry?.id || !session?.items) return;
  const startedAt = recognizeShownAt || Date.now();
  session.strokes.push({
    id: entry.id,
    durationMs: Math.max(0, Date.now() - startedAt),
  });
  const now = new Date().toISOString();
  const existing = session.items.get(entry.id);
  if (existing) {
    existing.count += 1;
    existing.lastSeenAt = now;
  } else {
    session.items.set(entry.id, {
      id: entry.id,
      count: 1,
      firstSeenAt: now,
      lastSeenAt: now,
    });
  }
  updateStatsTable();
}

function revealRecognizeAnswer() {
  if (!currentEntry || recognizeAnswerRevealed) return;
  recognizeAnswerRevealed = true;
  if (el.recognizeAnswerChar) el.recognizeAnswerChar.textContent = currentEntry.char || '—';
  el.recognizeAnswer?.classList.remove('hidden');
  if (el.recognizeInput) {
    el.recognizeInput.disabled = true;
    el.recognizeInput.blur();
  }
  updateFooterForPhase();
}

function checkRecognizeAnswer() {
  if (sessionCompleted || learningMode !== 'recognize' || !currentEntry || recognizeAnswerRevealed) return;
  const raw = el.recognizeInput?.value || '';
  if (isRecognizeAnswerCorrect(currentEntry, raw)) {
    commitRecognizeSuccess(currentEntry);
    refreshRecognizeCharacter();
    return;
  }
  revealRecognizeAnswer();
}

function skipRecognizeCharacter() {
  if (sessionCompleted || learningMode !== 'recognize' || !currentEntry) return;
  const key = entryKey(currentEntry);
  if (key) sessionSkippedKeys.add(key);
  refreshRecognizeCharacter();
}

/** 渲染字库浏览列表 */
function renderBrowseGrid() {
  el.charGrid.replaceChildren();
  el.browseCount.textContent = characters.length;
  if (el.browseExcludeCount) {
    el.browseExcludeCount.textContent = String(countRecentHistoryExcludedInLibrary(characters));
  }

  if (characters.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'char-grid-empty';
    empty.textContent = '字库为空';
    el.charGrid.appendChild(empty);
    return;
  }

  const currentKey = currentEntry ? entryKey(currentEntry) : null;
  const excludedKeys = getBrowseExcludedKeys();
  const newestKeys = new Set(
    (typeof defaultModeChance !== 'undefined' && defaultModeChance.getRecentJoinEntries
      ? defaultModeChance.getRecentJoinEntries(characters, 10)
      : []
    ).map((entry) => entryKey(entry)).filter(Boolean),
  );
  const fragment = document.createDocumentFragment();
  for (const entry of characters) {
    const script = normalizeScript(entry.script);
    const key = entryKey(entry);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'char-grid-item';
    if (script === SCRIPT.zhen) {
      btn.classList.add('script-zhen');
      const form = typeof normalizeZhenForm === 'function'
        ? normalizeZhenForm(entry.form || entry.script)
        : '';
      if (form) btn.classList.add(`script-${form}`);
    } else if (script !== SCRIPT.cao) {
      btn.classList.add(`script-${script}`);
    }
    btn.textContent = entry.char;
    const scriptTitle = script === SCRIPT.zhen && typeof ZHEN_FORM_LABEL !== 'undefined'
      ? (ZHEN_FORM_LABEL[typeof normalizeZhenForm === 'function'
        ? normalizeZhenForm(entry.form || entry.script)
        : ZHEN_FORM.kai] || SCRIPT_NAME[script] || '')
      : (SCRIPT_NAME[script] || '');
    btn.title = scriptTitle;
    btn.setAttribute('role', 'listitem');
    btn.setAttribute(
      'aria-label',
      `显示「${entry.char}」${scriptTitle}`,
    );
    if (key && excludedKeys.has(key) && key !== currentKey) {
      btn.classList.add('is-excluded');
      btn.title = `${btn.title ? `${btn.title} · ` : ''}当前不会抽到`;
    }
    if (key === currentKey) btn.classList.add('is-current');
    if (key && newestKeys.has(key)) btn.classList.add('is-newest');
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
  if (learningMode === 'recognize') return;
  showCharacter(entry);
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
  if (!currentGlyphRevealed) {
    currentGlyphRevealed = true;
    renderUniqueChanceDotsUI();
  }
  el.display.classList.add('hidden');
  const scriptName = SCRIPT_NAME[normalizeScript(currentEntry.script)] || '';
  el.glyphImage.alt = `${currentEntry.char} ${scriptName}`;
  loadGlyphImage(currentEntry);
  updateShowButton();
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

/** 真书练习：眼睛图标下居中显示「X体」+ variation */
function zhenFormTiLabel(form) {
  const key = typeof normalizeZhenForm === 'function' ? normalizeZhenForm(form) : form;
  const base = (typeof ZHEN_FORM_LABEL !== 'undefined' && ZHEN_FORM_LABEL[key]) || '';
  if (!base) return '';
  if (base.endsWith('体')) return base;
  if (base.endsWith('书')) return `${base.slice(0, -1)}体`;
  return `${base}体`;
}

function isZhenPracticeEntry(entry) {
  return Boolean(entry)
    && typeof normalizeScript === 'function'
    && typeof SCRIPT !== 'undefined'
    && normalizeScript(entry.script) === SCRIPT.zhen;
}

/** 真书练习：格线底图 + 字形叠在上面 */
function updateZhenStageBackground(entry) {
  const show = isZhenPracticeEntry(entry)
    || (
      !entry
      && scriptFilter === SCRIPT_FILTER.zhen
      && learningMode !== 'recognize'
    );
  el.zhenStageBg?.classList.toggle('hidden', !show);
  el.characterStage?.classList.toggle('has-zhen-bg', show);
}

function updateZhenPracticeMeta(entry) {
  updateZhenStageBackground(entry);

  const meta = el.zhenPracticeMeta;
  const formEl = el.zhenPracticeForm;
  const varEl = el.zhenPracticeVariation;
  if (!meta || !formEl || !varEl) return;

  const isZhen = isZhenPracticeEntry(entry);

  if (!isZhen) {
    meta.classList.add('hidden');
    formEl.textContent = '';
    varEl.textContent = '';
    varEl.classList.add('hidden');
    return;
  }

  const formLabel = zhenFormTiLabel(entry.form);
  const variation = String(entry.variation || entry.work || '').trim();
  formEl.textContent = formLabel;
  varEl.textContent = variation;
  varEl.classList.toggle('hidden', !variation);
  meta.classList.toggle('hidden', !formLabel && !variation);
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
async function saveSettings() {
  const parsed = parseCharacters(el.charactersInput.value);
  if (parsed.length === 0) {
    alert('请至少输入一个汉字');
    return;
  }
  editableCharacters = parsed;
  await rebuildCharacters();
  recentHistory = [];
  resetSession();
  saveCharacters(editableCharacters);
  el.settingsDialog.close();
  if (learningMode === 'recognize') beginRecognizeRound();
  else refreshCharacter();
}

/** 短暂反馈按钮状态 */
function flashButtonTitle(button, message, restoreMs = 1500) {
  if (!button) return;
  const prev = button.title;
  button.title = message;
  button.classList.add('is-flash');
  window.setTimeout(() => {
    button.title = prev;
    button.classList.remove('is-flash');
  }, restoreMs);
}

/** 复制本轮快照 JSON 到剪贴板（仅已结算） */
async function copySessionSnapshot(button) {
  const snapshot = getSnapshotForExport();
  if (!snapshot) {
    alert('请先结算。未结算的练习不会记入快照。');
    return;
  }
  const text = snapshotToJSON(snapshot);
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
  const snapshot = completedSnapshot;
  if (!sessionCompleted || !snapshot || !sessionHasPracticeData(snapshot)) return null;

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
  const snapshot = getCurrentSnapshot({ commitActive: true });
  if (!sessionHasPracticeData(snapshot)) {
    alert('本轮还没有练过字');
    return;
  }

  sessionCompleted = true;
  completedSnapshot = snapshot;
  // 已进入结算态：离开 / 刷新不再提示
  allowPracticeUnload = true;
  renderSettlementPanel(snapshot);
  updateStatsTable();
  setSettlementView(true);
}

/** 返回：取消结算，继续练字 */
function exitSettlement() {
  if (!sessionCompleted) return;
  sessionCompleted = false;
  completedSnapshot = null;
  allowPracticeUnload = false;
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

  // 主动结束练习：导航前不再触发离开提示
  allowPracticeUnload = true;

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

/** @param {{ overview?: boolean }} [options] 结算后强制总览 tab */
function getUserLevelPageUrlRelative({ overview = false } = {}) {
  return overview
    ? 'user/index.html?view=level&mode=overview'
    : 'user/index.html?view=level';
}

function navigateToUserLevelPage() {
  // 异步保存后用户手势已失效，合成 <a>.click() 常被拦截；用 location 跳转更稳
  // 结算结束一律进总览，避免停在真书/独特等上次 tab
  const url = getUserLevelPageUrlRelative({ overview: true });
  window.location.href = url;
  return url;
}

function onSessionActionClick() {
  enterSettlement();
}

function onPrimaryFooterClick() {
  if (sessionCompleted) {
    finishSettlementAndGoToLevel();
  } else if (libraryExhausted) {
    enterSettlement();
  } else if (learningMode === 'recognize') {
    checkRecognizeAnswer();
  } else {
    unlockUniqueDropSfx();
    refreshCharacter();
  }
}

function onSecondaryFooterClick() {
  if (sessionCompleted) {
    exitSettlement();
  } else if (libraryExhausted) {
    enterSettlement();
  } else if (learningMode === 'recognize') {
    skipRecognizeCharacter();
  } else {
    skipCharacter();
  }
}

/** 输入框 / 对话框打开时不响应练字快捷键 */
function isPracticeHotkeyBlocked() {
  if (document.querySelector('dialog[open]')) return true;
  const active = document.activeElement;
  if (!active) return false;
  const tag = active.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (active.isContentEditable) return true;
  return false;
}

function isPageToggleHotkey(event) {
  if (event.ctrlKey || event.metaKey || event.altKey) return false;
  const key = event.key;
  return key === 'Tab' || key === 'q' || key === 'Q';
}

function isGlyphHotkey(event) {
  if (event.ctrlKey || event.metaKey || event.altKey) return false;
  const key = event.key;
  return key === 'f' || key === 'F' || key === 'd' || key === 'D';
}

/** [] / 【】 同时按下 → 切到用户页（与 Tab 相同） */
const practiceBracketDown = new Set();
let practiceBracketComboConsumed = false;

function practiceBracketSide(key) {
  if (key === '[' || key === '【') return 'left';
  if (key === ']' || key === '】') return 'right';
  return null;
}

function goToUserPage() {
  window.location.href = getUserLevelPageUrlRelative();
}

function onPracticeBracketKeyUp(event) {
  const side = practiceBracketSide(event.key);
  if (!side) return;
  practiceBracketDown.delete(side);
  if (!practiceBracketDown.size) practiceBracketComboConsumed = false;
}

function tryPracticeBracketCombo(event) {
  if (event.ctrlKey || event.metaKey || event.altKey) return false;
  const side = practiceBracketSide(event.key);
  if (!side) return false;
  practiceBracketDown.add(side);
  if (!(practiceBracketDown.has('left') && practiceBracketDown.has('right'))) return false;
  event.preventDefault();
  if (!practiceBracketComboConsumed) {
    practiceBracketComboConsumed = true;
    goToUserPage();
  }
  return true;
}

function onPracticeHotkey(event) {
  if (isPracticeHotkeyBlocked()) return;

  const key = event.key;

  if (tryPracticeBracketCombo(event)) return;

  if (isPageToggleHotkey(event)) {
    event.preventDefault();
    goToUserPage();
    return;
  }

  // 结算态：Enter = 结束，j/k = 返回
  if (sessionCompleted) {
    if (key === 'Enter') {
      event.preventDefault();
      onPrimaryFooterClick();
      return;
    }
    if (key === 'j' || key === 'J' || key === 'k' || key === 'K') {
      event.preventDefault();
      onSecondaryFooterClick();
    }
    return;
  }

  if (isGlyphHotkey(event)) {
    if (learningMode === 'recognize') return;
    event.preventDefault();
    toggleGlyph();
    return;
  }

  if (key === ' ') {
    event.preventDefault();
    onPrimaryFooterClick();
    return;
  }
  if (key === 'j' || key === 'J' || key === 'k' || key === 'K') {
    event.preventDefault();
    onSecondaryFooterClick();
    return;
  }
  if (key === 'Enter') {
    event.preventDefault();
    onSessionActionClick();
  }
}

/** 打开快照查看面板 */
function openSnapshotView() {
  const snapshot = (sessionCompleted && completedSnapshot)
    ? completedSnapshot
    : getCurrentSnapshot({ commitActive: false });
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
void prefetchUniqueDropSfx();
const armUniqueDropSfx = () => unlockUniqueDropSfx();
document.addEventListener('pointerdown', armUniqueDropSfx, { capture: true, passive: true });
document.addEventListener('keydown', armUniqueDropSfx, { capture: true });
el.btnRefresh.addEventListener('click', onPrimaryFooterClick);
el.btnSkip.addEventListener('click', onSecondaryFooterClick);
el.btnUniqueSfxTest?.addEventListener('click', () => {
  playUniqueDropSfxTest();
});
el.btnUniqueSfxTest?.addEventListener('pointerdown', unlockUniqueDropSfx, { passive: true });
el.btnSettlementCopy?.addEventListener('click', () => {
  void copySettlementResult(el.btnSettlementCopy);
});
el.btnSessionAction?.addEventListener('click', onSessionActionClick);
document.addEventListener('keydown', onPracticeHotkey);
document.addEventListener('keyup', onPracticeBracketKeyUp);
window.addEventListener('blur', () => {
  practiceBracketDown.clear();
  practiceBracketComboConsumed = false;
});
window.addEventListener('beforeunload', onPracticeBeforeUnload);
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
el.btnSave?.addEventListener('click', saveSettings);
el.btnCancel.addEventListener('click', () => el.settingsDialog.close());
el.charactersInput.addEventListener('input', updateCharCount);
el.modeDefault?.addEventListener('click', () => setLearningMode('default'));
el.modeRandom?.addEventListener('click', () => setLearningMode('random'));
el.modeRecognize?.addEventListener('click', () => setLearningMode('recognize'));
// 时间模式入口已隐藏；历史 session.mode=time 仍可读
el.recognizeInput?.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' || event.isComposing) return;
  event.preventDefault();
  if (recognizeAnswerRevealed) skipRecognizeCharacter();
  else checkRecognizeAnswer();
});

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

// 初始化：先拉用户历史，再抽首字（默认模式依赖 lastSeen / 近 40）
renderChanceRulesUI();
updateSessionActionButton();
updateFooterForPhase();
updateModeUI();
updateScriptFilterUI();
updateStatsTable();

async function initPracticePage() {
  if (typeof applyCaoAppVersionLabels === 'function') applyCaoAppVersionLabels();
  await refreshPracticeUserBadge();
  await loadDefaultModeHistory();
  await rebuildCharacters();
  if (learningMode === 'recognize') beginRecognizeRound();
  else refreshCharacter();
}

void initPracticePage();
