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
  levelNavSlot: document.getElementById('level-nav-slot'),
  levelNavOverview: document.getElementById('level-nav-overview'),
  levelNavUnique: document.getElementById('level-nav-unique'),
  levelNavLevels: document.getElementById('level-nav-levels'),
  levelNavLast: document.getElementById('level-nav-last'),
  levelNavInk: document.getElementById('level-nav-ink'),
  levelNavCard: document.getElementById('level-nav-card'),
  levelNavGlyph: document.getElementById('level-nav-glyph'),
  levelNavShop: document.getElementById('level-nav-shop'),
  levelNavSettings: document.getElementById('level-nav-settings'),
  settingsPanel: document.getElementById('settings-panel'),
  inkHistoryPanel: document.getElementById('ink-history-panel'),
  inkHistoryList: document.getElementById('ink-history-list'),
  inkHistoryBalance: document.getElementById('ink-history-balance'),
  inkHistoryHidePractice: document.getElementById('ink-history-hide-practice'),
  shopPanel: document.getElementById('shop-panel'),
  shopRow: document.getElementById('shop-row'),
  shopDayLabel: document.getElementById('shop-day-label'),
  shopToast: document.getElementById('shop-toast'),
  sfxVolume: document.getElementById('sfx-volume'),
  sfxVolumeValue: document.getElementById('sfx-volume-value'),
  cardPreviewSlot: document.getElementById('card-preview-slot'),
  cardPreview: document.getElementById('card-preview'),
  cardPreviewBase: document.getElementById('card-preview-base'),
  cardPreviewMask: document.getElementById('card-preview-mask'),
  cardPreviewFallback: document.getElementById('card-preview-fallback'),
  cardPreviewModifier: document.getElementById('card-preview-modifier'),
  cardPreviewMeta: document.getElementById('card-preview-meta'),
  cardStyleTools: document.getElementById('card-style-tools'),
  btnCardScheme: document.getElementById('btn-card-scheme'),
  cardSchemeMenu: document.getElementById('card-scheme-menu'),
  btnCardBase: document.getElementById('btn-card-base'),
  cardBaseMenu: document.getElementById('card-base-menu'),
  btnCardModifier: document.getElementById('btn-card-modifier'),
  cardModifierMenu: document.getElementById('card-modifier-menu'),
  btnCardOverrideAll: document.getElementById('btn-card-override-all'),
  btnCardInject: document.getElementById('btn-card-inject'),
  dismantleTools: document.getElementById('dismantle-tools'),
  btnDismantleMode: document.getElementById('btn-dismantle-mode'),
  dismantleOverlay: document.getElementById('dismantle-overlay'),
  dismantleInkValue: document.getElementById('dismantle-ink-value'),
  btnDismantleConfirm: document.getElementById('btn-dismantle-confirm'),
  uniqueInjectDialog: document.getElementById('unique-inject-dialog'),
  uniqueInjectForm: document.getElementById('unique-inject-form'),
  uniqueInjectCharFilter: document.getElementById('unique-inject-char-filter'),
  uniqueInjectChar: document.getElementById('unique-inject-char'),
  uniqueInjectScheme: document.getElementById('unique-inject-scheme'),
  uniqueInjectBase: document.getElementById('unique-inject-base'),
  uniqueInjectModifier: document.getElementById('unique-inject-modifier'),
  uniqueInjectStatus: document.getElementById('unique-inject-status'),
  uniqueInjectSubmit: document.getElementById('unique-inject-submit'),
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
/** 等级子视图：overview | unique | levels | lastSession | inkHistory | cardFace | glyphImage | shop | settings */
let levelDisplayMode = 'overview';
/** 记录历史当前下标；null 表示自动落到最近一次 */
let historySessionIndex = null;

/** 卡面图是否存在（键：script:id） */
const cardImageExistsCache = new Map();
/** 草书字形图是否存在（键：char，目录 images/characters） */
const glyphImageExistsCache = new Map();

let imageFilterToken = 0;

const CARD_HOVER_SFX_URL = new URL('../sound/sfx_card.mp3', window.location.href).href;
const CARD_SFX_VOLUME_STORAGE_KEY = 'cao-card-sfx-volume';
const CARD_SFX_VOLUME_DEFAULT = 70;

/** @type {AudioContext | null} */
let cardSfxAudioCtx = null;
/** @type {AudioBuffer | null} */
let cardSfxBuffer = null;
/** @type {ArrayBuffer | null} */
let cardSfxRawData = null;
/** @type {Promise<ArrayBuffer | null> | null} */
let cardSfxRawPromise = null;
/** @type {Promise<AudioBuffer | null> | null} */
let cardSfxBufferPromise = null;
/** AudioContext 仍 suspended，需用户手势 resume */
let cardSfxNeedsGesture = true;
let cardSfxVolume = CARD_SFX_VOLUME_DEFAULT;

function clampSfxVolume(value) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return CARD_SFX_VOLUME_DEFAULT;
  return Math.min(100, Math.max(0, n));
}

function loadCardSfxVolume() {
  try {
    const raw = localStorage.getItem(CARD_SFX_VOLUME_STORAGE_KEY);
    if (raw == null) return CARD_SFX_VOLUME_DEFAULT;
    return clampSfxVolume(raw);
  } catch {
    return CARD_SFX_VOLUME_DEFAULT;
  }
}

function saveCardSfxVolume(value) {
  cardSfxVolume = clampSfxVolume(value);
  try {
    localStorage.setItem(CARD_SFX_VOLUME_STORAGE_KEY, String(cardSfxVolume));
  } catch {
    // ignore quota / private mode
  }
  return cardSfxVolume;
}

/** 仅预取字节，不在无手势时创建 AudioContext */
function prefetchCardSfxData() {
  if (cardSfxRawData) return Promise.resolve(cardSfxRawData);
  if (cardSfxRawPromise) return cardSfxRawPromise;

  cardSfxRawPromise = (async () => {
    const response = await fetch(CARD_HOVER_SFX_URL);
    if (!response.ok) throw new Error(`sfx http ${response.status}`);
    cardSfxRawData = await response.arrayBuffer();
    return cardSfxRawData;
  })().catch((error) => {
    console.warn('[cao] card sfx fetch failed', error);
    cardSfxRawPromise = null;
    return null;
  });

  return cardSfxRawPromise;
}

function getCardSfxAudioContext() {
  if (cardSfxAudioCtx) return cardSfxAudioCtx;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  cardSfxAudioCtx = new Ctx();
  return cardSfxAudioCtx;
}

function loadCardSfxBuffer() {
  if (cardSfxBuffer) return Promise.resolve(cardSfxBuffer);
  if (cardSfxBufferPromise) return cardSfxBufferPromise;

  cardSfxBufferPromise = (async () => {
    const ctx = getCardSfxAudioContext();
    if (!ctx) return null;
    const data = await prefetchCardSfxData();
    if (!data) return null;
    // Safari 需要可转移的独立副本
    cardSfxBuffer = await ctx.decodeAudioData(data.slice(0));
    return cardSfxBuffer;
  })().catch((error) => {
    console.warn('[cao] card sfx decode failed', error);
    cardSfxBufferPromise = null;
    return null;
  });

  return cardSfxBufferPromise;
}

function syncCardSfxGestureFlag() {
  const ctx = cardSfxAudioCtx;
  cardSfxNeedsGesture = !ctx || ctx.state !== 'running';
}

/**
 * 必须在用户手势中调用：创建/resume AudioContext。
 * Chrome 下 muted HTMLAudio「解锁」不足以允许后续真正发声。
 */
function unlockCardHoverSfx() {
  const ctx = getCardSfxAudioContext();
  if (!ctx) {
    cardSfxNeedsGesture = true;
    return;
  }

  void loadCardSfxBuffer();

  if (ctx.state === 'running') {
    cardSfxNeedsGesture = false;
    return;
  }

  const resumePromise = ctx.resume();
  if (resumePromise && typeof resumePromise.then === 'function') {
    resumePromise
      .then(() => {
        syncCardSfxGestureFlag();
      })
      .catch(() => {
        cardSfxNeedsGesture = true;
      });
  } else {
    syncCardSfxGestureFlag();
  }
}

function startCardSfxBuffer(buffer) {
  const ctx = getCardSfxAudioContext();
  if (!ctx || ctx.state !== 'running' || !buffer) return false;
  if (cardSfxVolume <= 0) {
    cardSfxNeedsGesture = false;
    return true;
  }

  const source = ctx.createBufferSource();
  const gain = ctx.createGain();
  gain.gain.value = cardSfxVolume / 100;
  source.buffer = buffer;
  source.connect(gain);
  gain.connect(ctx.destination);
  source.start(0);
  cardSfxNeedsGesture = false;
  return true;
}

function playCardHoverSfx() {
  try {
    // 未经过点击解锁时不要新建 AudioContext（会一直 suspended）
    const ctx = cardSfxAudioCtx;
    if (!ctx) {
      cardSfxNeedsGesture = true;
      return;
    }

    if (ctx.state === 'suspended') {
      // hover 多半仍会失败；成功则立刻重试播放
      void ctx.resume().then(() => {
        syncCardSfxGestureFlag();
        if (ctx.state === 'running') playCardHoverSfx();
      }).catch(() => {
        cardSfxNeedsGesture = true;
      });
      return;
    }

    if (cardSfxBuffer) {
      startCardSfxBuffer(cardSfxBuffer);
      return;
    }

    void loadCardSfxBuffer().then((buffer) => {
      if (buffer) startCardSfxBuffer(buffer);
    });
  } catch (error) {
    console.warn('[cao] card sfx play failed', error);
    cardSfxNeedsGesture = true;
  }
}

function syncSfxVolumeUI() {
  if (el.sfxVolume) el.sfxVolume.value = String(cardSfxVolume);
  if (el.sfxVolumeValue) el.sfxVolumeValue.textContent = String(cardSfxVolume);
}

function renderSettingsView() {
  hideCardPreview();
  stopShopCountdown();
  document.body.classList.remove('is-card-face-view', 'is-glyph-image-view', 'is-unique-filter-view', 'is-levels-only-view');
  el.levelPanel?.classList.add('hidden');
  el.panel?.classList.add('hidden');
  el.shopPanel?.classList.add('hidden');
  el.inkHistoryPanel?.classList.add('hidden');
  syncSfxVolumeUI();
  el.settingsPanel?.classList.remove('hidden');
  updateLevelOverlays();
}

function formatInkHistoryReason(reason) {
  const key = String(reason || '');
  const map = {
    'unique-dismantle': '分解 unique',
    'shop-buy': '商店购买',
    'shop-buy-rollback': '购买回滚',
    'practice-ink-drop': '练字墨掉落',
  };
  return map[key] || (key || '墨变动');
}

function formatInkHistoryDetail(entry) {
  const ref = entry?.ref;
  if (!ref || typeof ref !== 'object') {
    return entry?.source ? String(entry.source) : '';
  }
  const parts = [];
  if (ref.char) parts.push(`「${ref.char}」`);
  else if (ref.ziId) parts.push(String(ref.ziId));
  if (ref.day) parts.push(String(ref.day));
  if (Number.isFinite(Number(ref.ciHao))) parts.push(`次号 ${Math.floor(Number(ref.ciHao))}`);
  if (entry.source) parts.push(String(entry.source));
  return parts.join(' · ');
}

function formatInkHistoryTime(isoOrMs) {
  if (isoOrMs == null || isoOrMs === '') return '—';
  const date = new Date(isoOrMs);
  if (Number.isNaN(date.getTime())) return String(isoOrMs);
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).format(date);
}

/** 墨历史：默认隐藏练字掉落，只看其他渠道 */
let inkHistoryHidePracticeDrops = true;

function isPracticeInkDropEntry(item) {
  return String(item?.reason || '') === 'practice-ink-drop'
    || String(item?.source || '') === 'practice-session';
}

function syncInkHistoryHidePracticeToggle() {
  if (!el.inkHistoryHidePractice) return;
  el.inkHistoryHidePractice.checked = inkHistoryHidePracticeDrops;
}

function renderInkHistoryView(entry) {
  hideCardPreview();
  stopShopCountdown();
  document.body.classList.remove('is-card-face-view', 'is-glyph-image-view', 'is-unique-filter-view', 'is-levels-only-view');
  el.levelPanel?.classList.add('hidden');
  el.panel?.classList.add('hidden');
  el.shopPanel?.classList.add('hidden');
  el.settingsPanel?.classList.add('hidden');
  el.inkHistoryPanel?.classList.remove('hidden');
  syncInkHistoryHidePracticeToggle();

  const data = entry?.data;
  const ink = typeof resolveInk === 'function' ? resolveInk(data) : (Number(data?.ink) || 0);
  if (el.inkHistoryBalance) {
    el.inkHistoryBalance.textContent = `当前余额 ${ink} 墨`;
  }

  if (!el.inkHistoryList) {
    updateLevelOverlays();
    return;
  }
  el.inkHistoryList.replaceChildren();

  let history = Array.isArray(data?.inkHistory) ? data.inkHistory.slice() : [];
  if (inkHistoryHidePracticeDrops) {
    history = history.filter((item) => !isPracticeInkDropEntry(item));
  }
  if (history.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'ink-history-empty';
    empty.textContent = inkHistoryHidePracticeDrops
      ? '暂无其他渠道记录（可关闭「隐藏练字掉落」查看）'
      : '暂无墨交易记录';
    el.inkHistoryList.appendChild(empty);
    updateLevelOverlays();
    return;
  }

  // 新记录在上
  history.reverse();
  for (const item of history) {
    const delta = Math.trunc(Number(item?.delta) || 0);
    const balance = Math.max(0, Math.floor(Number(item?.balance) || 0));
    const row = document.createElement('article');
    row.className = 'ink-history-item';
    row.setAttribute('role', 'listitem');

    const main = document.createElement('div');
    main.className = 'ink-history-item-main';

    const reason = document.createElement('div');
    reason.className = 'ink-history-reason';
    reason.textContent = formatInkHistoryReason(item?.reason);

    const detailText = formatInkHistoryDetail(item);
    if (detailText) {
      const detail = document.createElement('div');
      detail.className = 'ink-history-detail';
      detail.textContent = detailText;
      main.append(reason, detail);
    } else {
      main.appendChild(reason);
    }

    const time = document.createElement('div');
    time.className = 'ink-history-time';
    time.textContent = formatInkHistoryTime(item?.at);
    main.appendChild(time);

    const amounts = document.createElement('div');
    amounts.className = 'ink-history-amounts';

    const deltaEl = document.createElement('div');
    deltaEl.className = `ink-history-delta ${delta >= 0 ? 'is-gain' : 'is-spend'}`;
    deltaEl.textContent = delta > 0 ? `+${delta}` : String(delta);

    const after = document.createElement('div');
    after.className = 'ink-history-after';
    after.textContent = `余额 ${balance}`;

    amounts.append(deltaEl, after);
    row.append(main, amounts);
    el.inkHistoryList.appendChild(row);
  }

  updateLevelOverlays();
}

function renderShopView() {
  hideCardPreview();
  document.body.classList.remove('is-card-face-view', 'is-glyph-image-view', 'is-unique-filter-view', 'is-levels-only-view');
  el.levelPanel?.classList.add('hidden');
  el.panel?.classList.add('hidden');
  el.settingsPanel?.classList.add('hidden');
  el.inkHistoryPanel?.classList.add('hidden');
  el.shopPanel?.classList.remove('hidden');
  updateLevelOverlays();
  startShopCountdown();
  void ensureAndRenderShop();
}

function stopShopCountdown() {
  if (shopCountdownTimer != null) {
    clearInterval(shopCountdownTimer);
    shopCountdownTimer = null;
  }
  if (shopToastTimer != null) {
    clearTimeout(shopToastTimer);
    shopToastTimer = null;
  }
  el.shopToast?.classList.add('hidden');
}

function updateShopCountdownLabel() {
  if (!el.shopDayLabel) return;
  if (!dirHandle) {
    el.shopDayLabel.textContent = '请先连接 local';
    return;
  }
  if (typeof getMsUntilNextShopRefresh !== 'function' || typeof formatShopRefreshCountdown !== 'function') {
    el.shopDayLabel.textContent = '';
    return;
  }
  const ms = getMsUntilNextShopRefresh();
  el.shopDayLabel.textContent = formatShopRefreshCountdown(ms);

  const day = typeof getShopDayKey === 'function' ? getShopDayKey() : null;
  if (day && shopCountdownLastDay && day !== shopCountdownLastDay) {
    // 跨过 06:00：重新拉当日货架
    shopCountdownLastDay = day;
    currentShopSession = null;
    void ensureAndRenderShop();
  } else if (day) {
    shopCountdownLastDay = day;
  }

  if (ms <= 0) {
    // 正点：下一拍会进入新商店日
    currentShopSession = null;
  }
}

function startShopCountdown() {
  stopShopCountdown();
  shopCountdownLastDay = typeof getShopDayKey === 'function' ? getShopDayKey() : null;
  updateShopCountdownLabel();
  shopCountdownTimer = window.setInterval(updateShopCountdownLabel, 1000);
}

function showShopToast(message, { error = false, durationMs = 2200 } = {}) {
  if (!el.shopToast) return;
  if (shopToastTimer != null) {
    clearTimeout(shopToastTimer);
    shopToastTimer = null;
  }
  el.shopToast.textContent = message;
  el.shopToast.classList.toggle('is-error', Boolean(error));
  el.shopToast.classList.toggle('is-ok', !error);
  el.shopToast.classList.remove('hidden');
  shopToastTimer = window.setTimeout(() => {
    shopToastTimer = null;
    el.shopToast?.classList.add('hidden');
  }, durationMs);
}

function flashShopBuyInkShort(actionsBtn) {
  if (!actionsBtn) return;
  const prev = shopInkFlashTimers.get(actionsBtn);
  if (prev != null) clearTimeout(prev);
  actionsBtn.classList.add('is-ink-short');
  const timer = window.setTimeout(() => {
    actionsBtn.classList.remove('is-ink-short');
    shopInkFlashTimers.delete(actionsBtn);
  }, 1000);
  shopInkFlashTimers.set(actionsBtn, timer);
}

const MAX_CHAR_LEVEL = 10;

const CARD_IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp'];
const CARD_IMAGE_DIR = {
  cao: '../images/cardImages/cao',
  kai: '../images/cardImages/kai',
  ming: '../images/cardImages/ming',
  hei: '../images/cardImages/hei',
};
/** 练字页草书字形图（characters 下默认草体，文件名为汉字） */
const GLYPH_IMAGE_DIR = '../images/characters';
const GLYPH_IMAGE_EXTENSIONS = CARD_IMAGE_EXTENSIONS;

let cardPreviewLoadToken = 0;
let cardPreviewFadeTimer = null;
const CARD_PREVIEW_HOVER_FADE_THRESHOLD = 1200;
const CARD_PREVIEW_FADE_MS = 2000;
let cardPreviewHoverAt = 0;
/** @type {{ colorSchemeId?: string|null, decorationId?: string|null, cardBase?: string|null, cardModifier?: string|null }|null} */
let cardPreviewStyleOverride = null;
/** @type {number|string|null} unique 获取时间（ms 或 ISO） */
let cardPreviewAcquiredAt = null;
/** 当前右侧预览身份；相同则跳过重载，避免闪一下 */
let cardPreviewIdentity = '';
const CARD_COLOR_SCHEME_STORAGE_KEY = 'cao-card-color-scheme-id';
const CARD_BASE_STORAGE_KEY = 'cao-card-base-id';
const CARD_MODIFIER_STORAGE_KEY = 'cao-card-modifier-id';
const CARD_STYLE_OVERRIDE_ALL_STORAGE_KEY = 'cao-card-style-override-all';
/** 默认卡色（库内 cs000） */
const DEFAULT_COLOR_SCHEME_ID = 'cs000';
/** @type {string|null} 当前预览启用的 colorScheme id */
let activeColorSchemeId = loadActiveColorSchemeId();
/** @type {string|null} 当前预览启用的 cardBase id */
let activeCardBaseId = loadActiveCardBaseId();
/** @type {string|null} 当前预览启用的 cardModifier id */
let activeCardModifierId = loadActiveCardModifierId();
/** testUser：用工具栏装饰覆盖等级页全部卡 */
let cardStyleOverrideAll = loadCardStyleOverrideAll();
/** 分解模式 */
let dismantleMode = false;
/** @type {{ sessionIndex: number, strokeIndex: number }|null} */
let dismantleSelection = null;
/** 中央按钮二次确认：已点过「分解此卡」 */
let dismantleConfirmArmed = false;
/** @type {object|null} 当前商店日 session */
let currentShopSession = null;
/** @type {object|null} 完整商店历史 */
let shopHistoryCache = null;
/** 商店 PNG 字池缓存 */
let shopPngCatalogCache = null;
let shopPngCatalogPromise = null;
let shopEnsureToken = 0;
/** @type {number|null} */
let shopCountdownTimer = null;
let shopCountdownLastDay = null;
/** @type {number|null} */
let shopToastTimer = null;
/** @type {WeakMap<Element, number>} */
const shopInkFlashTimers = new WeakMap();

function loadActiveColorSchemeId() {
  const raw = localStorage.getItem(CARD_COLOR_SCHEME_STORAGE_KEY);
  if (!raw) return DEFAULT_COLOR_SCHEME_ID;
  const resolved = typeof resolveColorSchemeId === 'function'
    ? resolveColorSchemeId(raw)
    : raw;
  if (!getColorSchemeById(resolved)) return DEFAULT_COLOR_SCHEME_ID;
  if (resolved && resolved !== raw) {
    saveActiveColorSchemeId(resolved);
  }
  return resolved;
}

function saveActiveColorSchemeId(id) {
  if (!id) localStorage.removeItem(CARD_COLOR_SCHEME_STORAGE_KEY);
  else localStorage.setItem(CARD_COLOR_SCHEME_STORAGE_KEY, id);
}

function loadActiveCardBaseId() {
  const raw = localStorage.getItem(CARD_BASE_STORAGE_KEY);
  if (!raw) return null;
  const resolved = typeof resolveCardBaseId === 'function'
    ? resolveCardBaseId(raw)
    : raw;
  if (!getCardBaseById(resolved)) return null;
  if (resolved && resolved !== raw) saveActiveCardBaseId(resolved);
  return resolved;
}

function saveActiveCardBaseId(id) {
  if (!id) localStorage.removeItem(CARD_BASE_STORAGE_KEY);
  else localStorage.setItem(CARD_BASE_STORAGE_KEY, id);
}

function loadActiveCardModifierId() {
  const raw = localStorage.getItem(CARD_MODIFIER_STORAGE_KEY);
  if (!raw) return null;
  const resolved = typeof resolveCardModifierId === 'function'
    ? resolveCardModifierId(raw)
    : raw;
  if (!getCardModifierById(resolved)) return null;
  if (resolved && resolved !== raw) saveActiveCardModifierId(resolved);
  return resolved;
}

function saveActiveCardModifierId(id) {
  if (!id) localStorage.removeItem(CARD_MODIFIER_STORAGE_KEY);
  else localStorage.setItem(CARD_MODIFIER_STORAGE_KEY, id);
}

function loadCardStyleOverrideAll() {
  return localStorage.getItem(CARD_STYLE_OVERRIDE_ALL_STORAGE_KEY) === '1';
}

function saveCardStyleOverrideAll(on) {
  if (on) localStorage.setItem(CARD_STYLE_OVERRIDE_ALL_STORAGE_KEY, '1');
  else localStorage.removeItem(CARD_STYLE_OVERRIDE_ALL_STORAGE_KEY);
}

/** 工具栏当前所选装饰（供全局覆盖 / 预览） */
function getToolOverrideCardStyle() {
  return {
    colorSchemeId: activeColorSchemeId || DEFAULT_COLOR_SCHEME_ID,
    decorationId: null,
    cardBase: activeCardBaseId || null,
    cardModifier: activeCardModifierId || null,
  };
}

/**
 * toggle on（仅 testUser）：用工具栏装饰覆盖；其余情况保留原卡面
 * @param {object|null} originalStyle
 */
function resolveCardStyleForDisplay(originalStyle = null) {
  if (!isActiveTestUser()) return originalStyle || null;
  if (cardStyleOverrideAll) return getToolOverrideCardStyle();
  return originalStyle || null;
}

function refreshLevelViewForStyleTools() {
  if (currentView !== 'level') return;
  const entry = fileEntries.find((item) => item.id === activeId);
  if (!entry?.data || !isActiveTestUser()) return;
  renderActiveView(entry);
}

function setCardStyleOverrideAll(on) {
  cardStyleOverrideAll = Boolean(on);
  saveCardStyleOverrideAll(cardStyleOverrideAll);
  applyCardStyleToolsUI();
  refreshLevelViewForStyleTools();
}

function cardPreviewPrimaryColor() {
  if (cardPreviewStyleOverride?.colorSchemeId) {
    const overrideScheme = getColorSchemeById(cardPreviewStyleOverride.colorSchemeId);
    if (overrideScheme) return overrideScheme.primaryColor;
  }
  if (cardPreviewStyleOverride) {
    const fallback = getColorSchemeById(DEFAULT_COLOR_SCHEME_ID);
    return fallback?.primaryColor || '#191919';
  }
  if (isActiveTestUser()) {
    const scheme = getColorSchemeById(activeColorSchemeId);
    if (scheme) return scheme.primaryColor;
  }
  const fallback = getColorSchemeById(DEFAULT_COLOR_SCHEME_ID);
  return fallback?.primaryColor || '#191919';
}

function cardPreviewSecondaryColor() {
  if (cardPreviewStyleOverride?.colorSchemeId) {
    const overrideScheme = getColorSchemeById(cardPreviewStyleOverride.colorSchemeId);
    if (overrideScheme) return overrideScheme.secondaryColor;
  }
  if (cardPreviewStyleOverride) {
    const fallback = getColorSchemeById(DEFAULT_COLOR_SCHEME_ID);
    return fallback?.secondaryColor || '#848484';
  }
  if (isActiveTestUser()) {
    const scheme = getColorSchemeById(activeColorSchemeId);
    if (scheme) return scheme.secondaryColor;
  }
  const fallback = getColorSchemeById(DEFAULT_COLOR_SCHEME_ID);
  return fallback?.secondaryColor || '#848484';
}

function cardPreviewTertiaryColor() {
  if (cardPreviewStyleOverride?.colorSchemeId) {
    const overrideScheme = getColorSchemeById(cardPreviewStyleOverride.colorSchemeId);
    if (overrideScheme) return overrideScheme.tertiaryColor;
  }
  if (cardPreviewStyleOverride) {
    const fallback = getColorSchemeById(DEFAULT_COLOR_SCHEME_ID);
    return fallback?.tertiaryColor || '#7a7a7a';
  }
  if (isActiveTestUser()) {
    const scheme = getColorSchemeById(activeColorSchemeId);
    if (scheme) return scheme.tertiaryColor;
  }
  const fallback = getColorSchemeById(DEFAULT_COLOR_SCHEME_ID);
  return fallback?.tertiaryColor || '#7a7a7a';
}

/**
 * 预览样式：
 * - 传入 uniquePreview.cardStyle → 严格用该词条（缺配色则 cs000）
 * - testUser 且无 override → 可用工具栏预览
 * - 非 testUser → 始终默认卡（不受工具栏 / localStorage 影响）
 */
function applyActiveCardStyleToPreview() {
  if (!el.cardPreview) return;
  const override = cardPreviewStyleOverride;
  let style;
  if (override) {
    style = {
      colorSchemeId: override.colorSchemeId || DEFAULT_COLOR_SCHEME_ID,
      decorationId: override.decorationId || null,
      cardBase: override.cardBase || null,
      cardModifier: override.cardModifier || null,
    };
  } else if (isActiveTestUser()) {
    style = {
      colorSchemeId: activeColorSchemeId || DEFAULT_COLOR_SCHEME_ID,
      decorationId: null,
      cardBase: activeCardBaseId || null,
      cardModifier: activeCardModifierId || null,
    };
  } else {
    style = {
      colorSchemeId: DEFAULT_COLOR_SCHEME_ID,
      decorationId: null,
      cardBase: null,
      cardModifier: null,
    };
  }
  applyCardStyleToElement(el.cardPreview, style);
  if (el.cardPreviewMask && !el.cardPreviewMask.classList.contains('hidden')) {
    el.cardPreviewMask.style.backgroundColor = cardPreviewPrimaryColor();
  }
  if (el.cardPreviewBase && !el.cardPreviewBase.classList.contains('hidden')) {
    el.cardPreviewBase.style.backgroundColor = cardPreviewTertiaryColor();
  }
  void applyCardBaseToPreview(style.cardBase || null);
  void applyCardModifierToPreview(style.cardModifier || null);
}

function isActiveTestUser() {
  const entry = fileEntries.find((item) => item.id === activeId);
  return Boolean(entry?.data?.isTestUser);
}

function closeCardStyleMenus() {
  setCardSchemeMenuOpen(false);
  setCardBaseMenuOpen(false);
  setCardModifierMenuOpen(false);
}

function setCardSchemeMenuOpen(open) {
  el.cardSchemeMenu?.classList.toggle('hidden', !open);
  el.btnCardScheme?.setAttribute('aria-expanded', open ? 'true' : 'false');
  if (open) {
    setCardBaseMenuOpen(false);
    setCardModifierMenuOpen(false);
  }
}

function setCardBaseMenuOpen(open) {
  el.cardBaseMenu?.classList.toggle('hidden', !open);
  el.btnCardBase?.setAttribute('aria-expanded', open ? 'true' : 'false');
  if (open) {
    setCardSchemeMenuOpen(false);
    setCardModifierMenuOpen(false);
  }
}

function setCardModifierMenuOpen(open) {
  el.cardModifierMenu?.classList.toggle('hidden', !open);
  el.btnCardModifier?.setAttribute('aria-expanded', open ? 'true' : 'false');
  if (open) {
    setCardSchemeMenuOpen(false);
    setCardBaseMenuOpen(false);
  }
}

function buildStyleMenu(menuEl, options, activeId, onPick) {
  if (!menuEl) return;
  menuEl.replaceChildren();
  for (const opt of options) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'card-style-menu-btn';
    btn.setAttribute('role', 'option');
    btn.dataset.id = opt.id == null ? '' : String(opt.id);
    btn.textContent = opt.label;
    const selected = (opt.id == null && !activeId) || opt.id === activeId;
    btn.classList.toggle('is-active', selected);
    btn.setAttribute('aria-selected', selected ? 'true' : 'false');
    btn.addEventListener('click', () => onPick(opt.id));
    menuEl.appendChild(btn);
  }
}

function rebuildCardSchemeMenu() {
  const options = (CARD_COLOR_SCHEME_LIBRARY || []).map((s) => ({
    id: s.id,
    label: s.name || s.id,
  }));
  buildStyleMenu(el.cardSchemeMenu, options, activeColorSchemeId || DEFAULT_COLOR_SCHEME_ID, (id) => {
    activeColorSchemeId = id || DEFAULT_COLOR_SCHEME_ID;
    saveActiveColorSchemeId(activeColorSchemeId);
    setCardSchemeMenuOpen(false);
    onCardStyleToolChanged();
  });
}

function rebuildCardBaseMenu() {
  const options = [
    { id: null, label: '无底纹' },
    ...(CARD_BASE_LIBRARY || []).map((b) => ({
      id: b.id,
      label: b.name || b.id,
    })),
  ];
  buildStyleMenu(el.cardBaseMenu, options, activeCardBaseId, (id) => {
    activeCardBaseId = id;
    saveActiveCardBaseId(activeCardBaseId);
    setCardBaseMenuOpen(false);
    onCardStyleToolChanged();
  });
}

function rebuildCardModifierMenu() {
  const options = [
    { id: null, label: '无修饰' },
    ...(CARD_MODIFIER_LIBRARY || []).map((m) => ({
      id: m.id,
      label: m.name || m.id,
    })),
  ];
  buildStyleMenu(el.cardModifierMenu, options, activeCardModifierId, (id) => {
    activeCardModifierId = id;
    saveActiveCardModifierId(activeCardModifierId);
    setCardModifierMenuOpen(false);
    onCardStyleToolChanged();
  });
}

function applyCardStyleToolsUI() {
  if (!activeColorSchemeId || !getColorSchemeById(activeColorSchemeId)) {
    activeColorSchemeId = DEFAULT_COLOR_SCHEME_ID;
  }
  const scheme = getColorSchemeById(activeColorSchemeId);
  const base = getCardBaseById(activeCardBaseId);
  const modifier = getCardModifierById(activeCardModifierId);
  const isCustomScheme = Boolean(
    isActiveTestUser() && scheme && scheme.id !== DEFAULT_COLOR_SCHEME_ID,
  );
  el.cardPreviewSlot?.classList.toggle('has-color-scheme', isCustomScheme);

  if (el.btnCardOverrideAll) {
    el.btnCardOverrideAll.classList.toggle('is-active', cardStyleOverrideAll);
    el.btnCardOverrideAll.setAttribute('aria-pressed', cardStyleOverrideAll ? 'true' : 'false');
    el.btnCardOverrideAll.textContent = cardStyleOverrideAll ? '覆盖·开' : '覆盖';
    el.btnCardOverrideAll.title = cardStyleOverrideAll
      ? '已开启：下方装饰覆盖等级页全部卡（再点关闭）'
      : '已关闭：各卡显示原样（点开后用下方装饰覆盖全部卡）';
  }

  if (el.btnCardScheme) {
    el.btnCardScheme.textContent = scheme?.name || '配色';
    el.btnCardScheme.classList.toggle('is-active', isCustomScheme);
    el.btnCardScheme.title = scheme
      ? `配色：${scheme.name}（点击选择）`
      : '选择卡面配色';
  }
  if (el.btnCardBase) {
    el.btnCardBase.textContent = base?.name || '底纹';
    el.btnCardBase.classList.toggle('is-active', Boolean(base));
    el.btnCardBase.title = base
      ? `底纹：${base.name}（点击选择）`
      : '选择卡背底纹';
  }
  if (el.btnCardModifier) {
    el.btnCardModifier.textContent = modifier?.name || '修饰';
    el.btnCardModifier.classList.toggle('is-active', Boolean(modifier));
    el.btnCardModifier.title = modifier
      ? `修饰：${modifier.name}（${modifier.type}，点击选择）`
      : '选择卡面修饰';
  }

  rebuildCardSchemeMenu();
  rebuildCardBaseMenu();
  rebuildCardModifierMenu();
  applyActiveCardStyleToPreview();
}

function onCardStyleToolChanged() {
  applyCardStyleToolsUI();
  if (cardStyleOverrideAll) refreshLevelViewForStyleTools();
}

function setUniqueInjectStatus(text, isError = false) {
  if (!el.uniqueInjectStatus) return;
  el.uniqueInjectStatus.textContent = text || '';
  el.uniqueInjectStatus.classList.toggle('is-error', Boolean(isError && text));
}

function fillSelectOptions(selectEl, options, selectedId) {
  if (!selectEl) return;
  selectEl.replaceChildren();
  for (const opt of options) {
    const option = document.createElement('option');
    option.value = opt.id == null ? '' : String(opt.id);
    option.textContent = opt.label;
    if ((opt.id == null && !selectedId) || opt.id === selectedId) {
      option.selected = true;
    }
    selectEl.appendChild(option);
  }
}

function rebuildUniqueInjectCharSelect(filterText = '') {
  const q = String(filterText || '').trim().toLowerCase();
  const entries = getLibraryEntries()
    .filter((entry) => entry?.id && entry?.char)
    .slice()
    .sort((a, b) => String(a.char).localeCompare(String(b.char), 'zh')
      || String(a.id).localeCompare(String(b.id)));
  const filtered = q
    ? entries.filter((entry) => (
      String(entry.char).toLowerCase().includes(q)
      || String(entry.id).toLowerCase().includes(q)
    ))
    : entries;
  const prev = el.uniqueInjectChar?.value || '';
  fillSelectOptions(
    el.uniqueInjectChar,
    filtered.map((entry) => ({
      id: entry.id,
      label: `${entry.char}  ${entry.id}`,
    })),
    filtered.some((entry) => entry.id === prev) ? prev : (filtered[0]?.id || ''),
  );
}

function rebuildUniqueInjectStyleSelects() {
  fillSelectOptions(
    el.uniqueInjectScheme,
    [
      { id: null, label: '无配色' },
      ...(CARD_COLOR_SCHEME_LIBRARY || []).map((s) => ({
        id: s.id,
        label: s.name || s.id,
      })),
    ],
    activeColorSchemeId && activeColorSchemeId !== DEFAULT_COLOR_SCHEME_ID
      ? activeColorSchemeId
      : null,
  );
  fillSelectOptions(
    el.uniqueInjectBase,
    [
      { id: null, label: '无底纹' },
      ...(CARD_BASE_LIBRARY || []).map((b) => ({
        id: b.id,
        label: b.name || b.id,
      })),
    ],
    activeCardBaseId,
  );
  fillSelectOptions(
    el.uniqueInjectModifier,
    [
      { id: null, label: '无修饰' },
      ...(CARD_MODIFIER_LIBRARY || []).map((m) => ({
        id: m.id,
        label: m.name || m.id,
      })),
    ],
    activeCardModifierId,
  );
}

function readUniqueInjectSelection() {
  const ziId = el.uniqueInjectChar?.value || '';
  const schemeRaw = el.uniqueInjectScheme?.value || '';
  const baseRaw = el.uniqueInjectBase?.value || '';
  const modRaw = el.uniqueInjectModifier?.value || '';
  const colorSchemeId = schemeRaw || null;
  const cardBase = baseRaw || null;
  const cardModifier = modRaw || null;
  const cardStyle = typeof buildCardStyleRecord === 'function'
    ? buildCardStyleRecord(colorSchemeId, null, cardBase, cardModifier)
    : null;
  return { ziId, cardStyle, colorSchemeId, cardBase, cardModifier };
}

function previewUniqueInjectSelection() {
  const { ziId, cardStyle } = readUniqueInjectSelection();
  if (!ziId || !cardStyle) {
    hideCardPreview();
    return;
  }
  const catalog = getCatalogById().get(ziId);
  const script = normalizeItemScript(catalog?.script);
  const char = catalog?.char || ziId;
  showCardPreview(char, script, ziId, {
    cardStyle,
    acquiredAt: Date.now(),
  });
}

function openUniqueInjectDialog() {
  if (!isActiveTestUser()) return;
  closeCardStyleMenus();
  setUniqueInjectStatus('');
  if (el.uniqueInjectCharFilter) el.uniqueInjectCharFilter.value = '';
  rebuildUniqueInjectCharSelect('');
  rebuildUniqueInjectStyleSelects();
  previewUniqueInjectSelection();
  if (typeof el.uniqueInjectDialog?.showModal === 'function') {
    el.uniqueInjectDialog.showModal();
  }
}

function closeUniqueInjectDialog() {
  if (el.uniqueInjectDialog?.open) el.uniqueInjectDialog.close();
}

async function writeActiveUserData(data) {
  const entry = fileEntries.find((item) => item.id === activeId);
  if (!entry) throw new Error('未选择用户');
  const text = (typeof stringifyUserStatsForDisk === 'function')
    ? stringifyUserStatsForDisk(data)
    : `${JSON.stringify(data, null, 2)}\n`;
  if (entry.handle) {
    const writable = await entry.handle.createWritable();
    await writable.write(text);
    await writable.close();
    entry.data = typeof normalizeUserStats === 'function'
      ? normalizeUserStats(data, entry.id)
      : data;
    return;
  }
  if (dirHandle && entry.file && typeof writeJsonToDir === 'function') {
    await writeJsonToDir(dirHandle, entry.file, data);
    entry.data = typeof normalizeUserStats === 'function'
      ? normalizeUserStats(data, entry.id)
      : data;
    return;
  }
  throw new Error('请先连接 local 文件夹（需写入权限）');
}

async function submitUniqueInject() {
  const entry = fileEntries.find((item) => item.id === activeId);
  if (!entry?.data) {
    setUniqueInjectStatus('请先打开测试用户文件', true);
    return;
  }
  if (!isActiveTestUser()) {
    setUniqueInjectStatus('仅测试用户可用', true);
    return;
  }

  const { ziId, cardStyle } = readUniqueInjectSelection();
  if (!ziId) {
    setUniqueInjectStatus('请选择字', true);
    return;
  }
  if (!cardStyle) {
    setUniqueInjectStatus('请至少选择一项卡面样式（配色 / 底纹 / 修饰）', true);
    return;
  }

  const catalog = getCatalogById().get(ziId);
  const now = new Date().toISOString();
  const normalized = typeof normalizeCardStyleRecord === 'function'
    ? normalizeCardStyleRecord(cardStyle)
    : cardStyle;

  const session = {
    type: 'practice-session',
    version: 1,
    startedAt: now,
    endedAt: now,
    filter: normalizeItemScript(catalog?.script),
    mode: 'test-inject',
    librarySize: null,
    commitSource: 'test-unique-inject',
    strokes: [{
      id: ziId,
      durationMs: 0,
      isUnique: true,
      ciHao: 1,
      cardStyle: normalized,
    }],
    summary: {
      uniqueChars: 1,
      totalAppearances: 1,
      totalDurationMs: 0,
    },
  };

  const data = entry.data;
  if (!Array.isArray(data.sessions)) data.sessions = [];
  data.sessions.push(session);
  data.updatedAt = now;
  if (!data.summary || typeof data.summary !== 'object') data.summary = {};
  data.summary.sessionCount = data.sessions.length;

  try {
    el.uniqueInjectSubmit.disabled = true;
    setUniqueInjectStatus('正在写入…');
    await writeActiveUserData(data);
    closeUniqueInjectDialog();
    setHint(`已注入 UNIQUE：${catalog?.char || ziId}`);
    renderActiveView(entry);
    updateCardPreviewSlot();
  } catch (error) {
    setUniqueInjectStatus(`写入失败：${error.message || error}`, true);
  } finally {
    if (el.uniqueInjectSubmit) el.uniqueInjectSubmit.disabled = false;
  }
}

function setCardPreviewMaskSource(url) {
  if (!el.cardPreviewMask) return;

  if (!url) {
    el.cardPreviewMask.style.webkitMaskImage = '';
    el.cardPreviewMask.style.maskImage = '';
    el.cardPreviewMask.classList.add('hidden');
    el.cardPreviewMask.setAttribute('aria-hidden', 'true');
    return;
  }

  const quoted = `url("${url}")`;
  el.cardPreviewMask.style.webkitMaskImage = quoted;
  el.cardPreviewMask.style.maskImage = quoted;
  el.cardPreviewMask.style.backgroundColor = cardPreviewPrimaryColor();
  el.cardPreviewMask.classList.remove('hidden');
  el.cardPreviewMask.setAttribute('aria-hidden', 'false');
}

function setCardPreviewBaseSource(url) {
  if (!el.cardPreviewBase) return;

  if (!url) {
    el.cardPreviewBase.style.webkitMaskImage = '';
    el.cardPreviewBase.style.maskImage = '';
    el.cardPreviewBase.classList.add('hidden');
    el.cardPreviewBase.setAttribute('aria-hidden', 'true');
    return;
  }

  const quoted = `url("${url}")`;
  el.cardPreviewBase.style.webkitMaskImage = quoted;
  el.cardPreviewBase.style.maskImage = quoted;
  el.cardPreviewBase.style.backgroundColor = cardPreviewTertiaryColor();
  el.cardPreviewBase.classList.remove('hidden');
  el.cardPreviewBase.setAttribute('aria-hidden', 'false');
}

let cardPreviewBaseLoadToken = 0;

/** 加载 cardBase 黑白图并用 tertiaryColor 渲染（在 cardImage 之下） */
function applyCardBaseToPreview(cardBaseId) {
  const token = ++cardPreviewBaseLoadToken;
  if (!cardBaseId) {
    setCardPreviewBaseSource('');
    return Promise.resolve(false);
  }

  const candidates = typeof getCardBaseImageCandidates === 'function'
    ? getCardBaseImageCandidates(cardBaseId)
    : [];
  if (candidates.length === 0) {
    setCardPreviewBaseSource('');
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    let index = 0;
    const tryNext = () => {
      if (token !== cardPreviewBaseLoadToken) {
        resolve(false);
        return;
      }
      if (index >= candidates.length) {
        setCardPreviewBaseSource('');
        resolve(false);
        return;
      }
      const path = candidates[index++];
      const probe = new Image();
      probe.onload = () => {
        if (token !== cardPreviewBaseLoadToken) {
          resolve(false);
          return;
        }
        setCardPreviewBaseSource(path);
        resolve(true);
      };
      probe.onerror = tryNext;
      probe.src = path;
    };
    tryNext();
  });
}

function setCardPreviewModifierSource(url) {
  if (!el.cardPreviewModifier) return;

  if (!url) {
    el.cardPreviewModifier.removeAttribute('src');
    el.cardPreviewModifier.classList.add('hidden');
    el.cardPreviewModifier.setAttribute('aria-hidden', 'true');
    return;
  }

  // sticker 始终置于卡内最上层（含 cardImage / fallback 之上）
  if (el.cardPreview && el.cardPreviewModifier.parentElement === el.cardPreview) {
    el.cardPreview.appendChild(el.cardPreviewModifier);
  }
  el.cardPreviewModifier.src = url;
  el.cardPreviewModifier.classList.remove('hidden');
  el.cardPreviewModifier.setAttribute('aria-hidden', 'false');
}

let cardPreviewModifierLoadToken = 0;

/**
 * 加载 cardModifier：type=sticker 时原图叠在最上层
 * @param {string|null} cardModifierId
 */
function applyCardModifierToPreview(cardModifierId) {
  const token = ++cardPreviewModifierLoadToken;
  if (!cardModifierId) {
    setCardPreviewModifierSource('');
    return Promise.resolve(false);
  }

  const entry = typeof getCardModifierById === 'function'
    ? getCardModifierById(cardModifierId)
    : null;
  const modType = entry?.type
    || (typeof CARD_MODIFIER_TYPE_STICKER !== 'undefined' ? CARD_MODIFIER_TYPE_STICKER : 'sticker');

  if (modType !== 'sticker') {
    setCardPreviewModifierSource('');
    return Promise.resolve(false);
  }

  const candidates = typeof getCardModifierImageCandidates === 'function'
    ? getCardModifierImageCandidates(cardModifierId)
    : [];
  if (candidates.length === 0) {
    setCardPreviewModifierSource('');
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    let index = 0;
    const tryNext = () => {
      if (token !== cardPreviewModifierLoadToken) {
        resolve(false);
        return;
      }
      if (index >= candidates.length) {
        setCardPreviewModifierSource('');
        resolve(false);
        return;
      }
      const path = candidates[index++];
      const probe = new Image();
      probe.onload = () => {
        if (token !== cardPreviewModifierLoadToken) {
          resolve(false);
          return;
        }
        setCardPreviewModifierSource(path);
        resolve(true);
      };
      probe.onerror = tryNext;
      probe.src = path;
    };
    tryNext();
  });
}

/**
 * UNIQUE 小卡：type=sticker 时叠原图
 * @param {Element} frame
 * @param {string|null} cardModifierId
 */
function applyCardModifierToUniqueFrame(frame, cardModifierId) {
  if (!frame) return;
  frame.querySelectorAll('.unique-card-modifier').forEach((node) => node.remove());
  if (!cardModifierId) return;

  const entry = typeof getCardModifierById === 'function'
    ? getCardModifierById(cardModifierId)
    : null;
  const modType = entry?.type || 'sticker';
  if (modType !== 'sticker') return;

  const candidates = typeof getCardModifierImageCandidates === 'function'
    ? getCardModifierImageCandidates(cardModifierId)
    : [];
  if (!candidates.length) return;

  const img = document.createElement('img');
  img.className = 'unique-card-modifier';
  img.alt = '';
  img.setAttribute('aria-hidden', 'true');
  let index = 0;
  const tryNext = () => {
    if (index >= candidates.length) {
      img.remove();
      return;
    }
    img.src = candidates[index++];
  };
  img.onerror = tryNext;
  tryNext();
  frame.appendChild(img);
}

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

async function ensurePermission(handle, mode = 'readwrite') {
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
      mode: 'readwrite',
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

  const allowed = await ensurePermission(dirHandle, 'readwrite');
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

  const savedActive = loadActiveUserId();
  const preferred = fileEntries.find((item) => item.id === savedActive)
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
    const raw = JSON.parse(text);
    validateUserData(raw);
    const data = typeof normalizeUserStats === 'function'
      ? normalizeUserStats(raw, entry.id)
      : raw;
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

const ZI_ID_PATTERN = /^[ck]\.[0-9A-F]{5}\.\d{2}$/i;

function getCatalogById() {
  const map = new Map();
  for (const entry of getLibraryEntries()) {
    if (entry?.id) map.set(entry.id, entry);
  }
  return map;
}

/** 从总账条目 + catalog 解析展示用字段 */
function resolveUserStatItem(id, raw, catalogById) {
  const catalog = catalogById.get(id);
  return {
    id,
    char: catalog?.char || id,
    script: normalizeItemScript(catalog?.script),
    count: raw?.count || 0,
    firstSeenAt: raw?.firstSeenAt,
    lastSeenAt: raw?.lastSeenAt,
  };
}

/** 遍历用户总账（键/id 为准；JSON 里的 char 仅供人工阅读，不参与匹配） */
function iterateUserChars(data) {
  const chars = data?.chars;
  if (!chars || typeof chars !== 'object') return [];

  const catalogById = getCatalogById();
  const catalogList = [...catalogById.values()];
  const items = [];

  for (const [key, raw] of Object.entries(chars)) {
    if (!raw || typeof raw !== 'object') continue;

    let id = raw.id || (ZI_ID_PATTERN.test(key) ? key : '');
    if (!id) {
      const legacyChar = raw.char || key;
      const catalog = catalogList.find(
        (entry) => entry.char === legacyChar
          || (entry.alternatives || []).includes(legacyChar),
      );
      id = catalog?.id || '';
    }
    if (!id) continue;

    items.push(resolveUserStatItem(id, raw, catalogById));
  }

  return items;
}

/** 从 sessions.strokes 现场统计各 id 出现次数（不写回 chars） */
function countSessionStrokesById(data) {
  const byId = new Map();
  for (const session of data?.sessions || []) {
    for (const stroke of session.strokes || []) {
      if (!stroke?.id) continue;
      const id = String(stroke.id);
      byId.set(id, (byId.get(id) || 0) + 1);
    }
  }
  return byId;
}

/** sessions 内各 id 最早/最晚时间（用 session 起止近似） */
function getSessionTimeBoundsById(data) {
  const firstById = new Map();
  const lastById = new Map();
  for (const session of data?.sessions || []) {
    const started = session.startedAt || session.endedAt || null;
    const ended = session.endedAt || session.startedAt || null;
    for (const stroke of session.strokes || []) {
      if (!stroke?.id) continue;
      const id = String(stroke.id);
      if (started && (!firstById.has(id) || started < firstById.get(id))) {
        firstById.set(id, started);
      }
      if (ended && (!lastById.has(id) || ended > lastById.get(id))) {
        lastById.set(id, ended);
      }
    }
  }
  return { firstById, lastById };
}

/**
 * 展示用有效字表：count = chars 冻结基数 + sessions 现场合计
 * @param {{ includeLibraryZeros?: boolean }} options
 */
function collectEffectiveChars(data, { includeLibraryZeros = false } = {}) {
  const byId = new Map();
  const sessionCounts = countSessionStrokesById(data);
  const { firstById, lastById } = getSessionTimeBoundsById(data);
  const catalogById = getCatalogById();

  for (const item of iterateUserChars(data)) {
    const sessionCount = sessionCounts.get(item.id) || 0;
    sessionCounts.delete(item.id);
    const candidatesFirst = [item.firstSeenAt, firstById.get(item.id)].filter(Boolean);
    const candidatesLast = [item.lastSeenAt, lastById.get(item.id)].filter(Boolean);
    candidatesFirst.sort();
    candidatesLast.sort();
    byId.set(item.id, {
      ...item,
      baseCount: item.count || 0,
      sessionCount,
      count: (item.count || 0) + sessionCount,
      firstSeenAt: candidatesFirst[0] || item.firstSeenAt || null,
      lastSeenAt: candidatesLast[candidatesLast.length - 1] || item.lastSeenAt || null,
    });
  }

  for (const [id, sessionCount] of sessionCounts) {
    const catalog = catalogById.get(id);
    byId.set(id, {
      id,
      char: catalog?.char || id,
      script: normalizeItemScript(catalog?.script),
      baseCount: 0,
      sessionCount,
      count: sessionCount,
      firstSeenAt: firstById.get(id) || null,
      lastSeenAt: lastById.get(id) || null,
    });
  }

  if (includeLibraryZeros) {
    for (const entry of getLibraryEntries()) {
      if (!entry.id || byId.has(entry.id)) continue;
      byId.set(entry.id, {
        id: entry.id,
        char: entry.char,
        script: normalizeItemScript(entry.script),
        baseCount: 0,
        sessionCount: 0,
        count: 0,
      });
    }
  }

  return [...byId.values()];
}

/** 等级页：chars + sessions，并补全字库未练过的字为 0 */
function collectLevelChars(data) {
  return collectEffectiveChars(data, { includeLibraryZeros: true });
}

function formatCharChipLabel(item) {
  const ch = item.char || item.id || '—';
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
 * 0 次 = 0 级；起步 1 级后：1→2 需 2，2→3 需 3，3→4 需 4，4→5 需 5；
 * 5 级起每级升级均需 5 次，最高 10 级。
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
    const need = level >= 5 ? 5 : level + 1;
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

/** 练习字库中尚未练过的字 → LVL. 0 */
function getLibraryEntries() {
  if (typeof buildLibrary !== 'function') {
    return [];
  }
  const caoChars = typeof loadEditableCharacters === 'function'
    ? loadEditableCharacters()
    : (typeof getDefaultCaoCharacters === 'function' ? getDefaultCaoCharacters() : []);
  return buildLibrary(caoChars);
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

function updateLevelOverlays() {
  const hasData = Boolean(fileEntries.find((item) => item.id === activeId)?.data);
  const showLevel = currentView === 'level' && hasData;
  const isShop = levelDisplayMode === 'shop';
  const isSettings = levelDisplayMode === 'settings';
  const isInkHistory = levelDisplayMode === 'inkHistory';
  const showStyleTools = showLevel && isActiveTestUser() && !isSettings && !isShop && !isInkHistory;
  const showDismantle = showLevel && !isSettings && !isShop && !isInkHistory
    && levelDisplayMode !== 'levels';
  const showPreview = showLevel && !isSettings && !isShop && !isInkHistory;
  el.cardPreviewSlot?.classList.toggle('hidden', !showPreview);
  el.cardStyleTools?.classList.toggle('hidden', !showStyleTools);
  el.dismantleTools?.classList.toggle('hidden', !showDismantle);
  document.body.classList.toggle('has-card-style-tools', showStyleTools);
  el.levelNavSlot?.classList.toggle('hidden', !showLevel);
  document.body.classList.toggle('has-level-nav', showLevel);
  document.body.classList.toggle('is-dismantle-mode', showDismantle && dismantleMode);
  document.body.classList.toggle('is-shop-view', showLevel && isShop);
  syncDismantleModeButton();
  if (!showStyleTools) {
    closeCardStyleMenus();
    // 非 testUser：预览不受工具栏 localStorage 样式影响
    if (!cardPreviewStyleOverride) applyActiveCardStyleToPreview();
  }
  if (!showDismantle && dismantleMode) {
    dismantleMode = false;
    dismantleSelection = null;
    resetDismantleConfirmButton();
    document.body.classList.remove('is-dismantle-mode');
    syncDismantleModeButton();
    hideCardPreview();
  }
  syncDismantleOverlay();
}

function syncDismantleModeButton() {
  if (!el.btnDismantleMode) return;
  el.btnDismantleMode.classList.toggle('is-active', dismantleMode);
  el.btnDismantleMode.setAttribute('aria-pressed', dismantleMode ? 'true' : 'false');
  const label = el.btnDismantleMode.querySelector('.dismantle-switch-label');
  if (label) label.textContent = dismantleMode ? '取消' : '分解';
}

function updateCardPreviewSlot() {
  updateLevelOverlays();
}

function findUniqueItemBySelection(data, selection) {
  if (!selection) return null;
  return collectUniqueCardAppearances(data).find((item) => (
    item.sessionIndex === selection.sessionIndex
    && item.strokeIndex === selection.strokeIndex
  )) || null;
}

function resetDismantleConfirmButton() {
  dismantleConfirmArmed = false;
  if (!el.btnDismantleConfirm) return;
  el.btnDismantleConfirm.textContent = '分解此卡';
  el.btnDismantleConfirm.classList.remove('is-armed');
}

function syncDismantleOverlay() {
  const show = dismantleMode && Boolean(dismantleSelection);
  el.dismantleOverlay?.classList.toggle('hidden', !show);
  el.dismantleOverlay?.setAttribute('aria-hidden', show ? 'false' : 'true');
  if (!show) {
    resetDismantleConfirmButton();
    return;
  }

  const entry = fileEntries.find((item) => item.id === activeId);
  const item = findUniqueItemBySelection(entry?.data, dismantleSelection);
  const inkGain = typeof computeUniqueDismantleInk === 'function'
    ? computeUniqueDismantleInk(item?.cardStyle)
    : 0;
  if (el.dismantleInkValue) el.dismantleInkValue.textContent = String(inkGain);
}

function pinDismantleSelectionPreview() {
  if (!dismantleMode || !dismantleSelection) return;
  const entry = fileEntries.find((item) => item.id === activeId);
  const item = findUniqueItemBySelection(entry?.data, dismantleSelection);
  if (!item) {
    hideCardPreview();
    return;
  }
  cancelCardPreviewFade();
  const displayStyle = resolveCardStyleForDisplay(item.cardStyle || null);
  const paintStyle = withDefaultUniqueColorScheme(displayStyle);
  // allowWhenPinned：分解选中锁定后，仅此入口可更新右侧预览
  showCardPreview(item.char, item.script, item.id, {
    cardStyle: displayStyle || paintStyle,
    acquiredAt: item.acquiredAt,
    ciHao: typeof resolveCiHao === 'function' ? resolveCiHao(item) : (Number(item.ciHao) || 1),
  }, { allowWhenPinned: true });
}

function setDismantleMode(on) {
  const next = Boolean(on);
  const changed = dismantleMode !== next;
  dismantleMode = next;
  if (!dismantleMode) {
    dismantleSelection = null;
    resetDismantleConfirmButton();
    hideCardPreview();
  }
  document.body.classList.toggle('is-dismantle-mode', dismantleMode);
  syncDismantleModeButton();
  syncDismantleOverlay();
  if (!changed) return;
  const entry = fileEntries.find((item) => item.id === activeId);
  if (entry?.data && currentView === 'level') renderActiveView(entry);
  else updateLevelOverlays();
}

function toggleDismantleSelection(item) {
  if (!dismantleMode || !item) return;
  const same = dismantleSelection
    && dismantleSelection.sessionIndex === item.sessionIndex
    && dismantleSelection.strokeIndex === item.strokeIndex;
  dismantleSelection = same
    ? null
    : { sessionIndex: item.sessionIndex, strokeIndex: item.strokeIndex };
  resetDismantleConfirmButton();

  document.querySelectorAll('.unique-card.is-dismantle-selected').forEach((node) => {
    node.classList.remove('is-dismantle-selected');
  });
  if (dismantleSelection) {
    const selected = document.querySelector(
      `.unique-card[data-session-index="${dismantleSelection.sessionIndex}"][data-stroke-index="${dismantleSelection.strokeIndex}"]`,
    );
    selected?.classList.add('is-dismantle-selected');
    pinDismantleSelectionPreview();
  } else {
    hideCardPreview();
  }
  syncDismantleOverlay();
}

function stripUniqueFromStroke(stroke) {
  if (!stroke || typeof stroke !== 'object') return;
  delete stroke.isUnique;
  delete stroke.cardStyle;
  delete stroke.ciHao;
}

async function confirmDismantleSelected() {
  if (!dismantleMode || !dismantleSelection) return;

  if (!dismantleConfirmArmed) {
    dismantleConfirmArmed = true;
    if (el.btnDismantleConfirm) {
      el.btnDismantleConfirm.textContent = '确认分解';
      el.btnDismantleConfirm.classList.add('is-armed');
    }
    return;
  }

  const entry = fileEntries.find((item) => item.id === activeId);
  if (!entry?.data) {
    setHint('请先打开用户文件', true);
    return;
  }

  const data = typeof normalizeUserStats === 'function'
    ? normalizeUserStats(entry.data, entry.id)
    : entry.data;
  entry.data = data;

  const item = findUniqueItemBySelection(data, dismantleSelection);
  if (!item) {
    setHint('未找到选中的 unique 卡', true);
    dismantleSelection = null;
    syncDismantleOverlay();
    return;
  }

  const stroke = data.sessions?.[item.sessionIndex]?.strokes?.[item.strokeIndex];
  if (!stroke || !stroke.isUnique) {
    setHint('该卡已不可分解', true);
    dismantleSelection = null;
    syncDismantleOverlay();
    renderActiveView(entry);
    return;
  }

  const inkGain = typeof computeUniqueDismantleInk === 'function'
    ? computeUniqueDismantleInk(item.cardStyle)
    : 0;
  if (inkGain <= 0) {
    setHint('此卡组合无法兑换墨', true);
    resetDismantleConfirmButton();
    return;
  }

  if (typeof gainInk !== 'function') {
    setHint('缺少 gainInk', true);
    return;
  }

  const gained = gainInk(data, inkGain, {
    reason: 'unique-dismantle',
    source: 'level-dismantle',
    ref: {
      id: item.id,
      char: item.char,
      sessionIndex: item.sessionIndex,
      strokeIndex: item.strokeIndex,
      cardStyle: item.cardStyle,
      ciHao: item.ciHao,
    },
  });
  if (!gained.ok) {
    setHint(`获得墨失败：${gained.error || 'unknown'}`, true);
    return;
  }

  stripUniqueFromStroke(stroke);
  dismantleSelection = null;
  resetDismantleConfirmButton();
  syncDismantleOverlay();
  hideCardPreview();

  try {
    if (el.btnDismantleConfirm) el.btnDismantleConfirm.disabled = true;
    await writeActiveUserData(data);
    setHint(`已分解「${item.char}」，+${inkGain} 墨`);
    renderActiveView(entry);
  } catch (error) {
    setHint(`写入失败：${error.message || error}`, true);
  } finally {
    if (el.btnDismantleConfirm) el.btnDismantleConfirm.disabled = false;
  }
}

async function loadShopHistoryFromDisk() {
  if (!dirHandle || typeof readJsonFromDir !== 'function') {
    return typeof emptyShopHistory === 'function' ? emptyShopHistory() : { version: 1, sessions: [] };
  }
  const fileName = (typeof CAO_LOCAL_FILES !== 'undefined' && CAO_LOCAL_FILES.shopSessions)
    || (typeof SHOP_SESSIONS_FILE !== 'undefined' ? SHOP_SESSIONS_FILE : 'shop-sessions.json');
  try {
    const raw = await readJsonFromDir(dirHandle, fileName);
    return typeof normalizeShopHistory === 'function' ? normalizeShopHistory(raw) : raw;
  } catch {
    return typeof emptyShopHistory === 'function' ? emptyShopHistory() : { version: 1, sessions: [] };
  }
}

async function saveShopHistoryToDisk(history) {
  if (!dirHandle || typeof writeJsonToDir !== 'function') {
    throw new Error('请先连接 local 文件夹');
  }
  const fileName = (typeof CAO_LOCAL_FILES !== 'undefined' && CAO_LOCAL_FILES.shopSessions)
    || (typeof SHOP_SESSIONS_FILE !== 'undefined' ? SHOP_SESSIONS_FILE : 'shop-sessions.json');
  const payload = typeof normalizeShopHistory === 'function' ? normalizeShopHistory(history) : history;
  await writeJsonToDir(dirHandle, fileName, payload);
  shopHistoryCache = payload;
}

async function collectCatalogWithCardPng() {
  if (shopPngCatalogCache) return shopPngCatalogCache;
  if (shopPngCatalogPromise) return shopPngCatalogPromise;

  shopPngCatalogPromise = (async () => {
    const catalogById = getCatalogById();
    const entries = [...catalogById.values()].filter((zi) => {
      if (!zi?.id || !zi?.char) return false;
      const script = normalizeItemScript(zi.script);
      return script === 'cao';
    });
    const out = [];
    // 分批探测，避免一次打开过多图片
    const batchSize = 12;
    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize);
      const flags = await Promise.all(
        batch.map((zi) => probeCardPngExists(zi.char, normalizeItemScript(zi.script), zi.id)),
      );
      batch.forEach((zi, index) => {
        if (flags[index]) {
          out.push({
            id: String(zi.id),
            char: zi.char,
            script: normalizeItemScript(zi.script),
          });
        }
      });
    }
    shopPngCatalogCache = out;
    return out;
  })();

  try {
    return await shopPngCatalogPromise;
  } finally {
    shopPngCatalogPromise = null;
  }
}

async function ensureAndRenderShop() {
  const token = ++shopEnsureToken;
  if (!dirHandle) {
    currentShopSession = null;
    renderShopPanel(null);
    return;
  }
  if (typeof getShopDayKey !== 'function' || typeof generateShopSession !== 'function') {
    renderShopPanel(null);
    return;
  }

  const day = getShopDayKey();
  if (currentShopSession?.day === day && el.shopRow?.childElementCount > 0) {
    renderShopPanel(currentShopSession);
    return;
  }

  let history = shopHistoryCache || await loadShopHistoryFromDisk();
  if (token !== shopEnsureToken) return;
  shopHistoryCache = history;

  let session = typeof findShopSessionByDay === 'function'
    ? findShopSessionByDay(history, day)
    : null;

  if (!session || !Array.isArray(session.offers) || session.offers.length === 0) {
    const pool = await collectCatalogWithCardPng();
    if (token !== shopEnsureToken) return;
    if (!pool.length) {
      setHint('商店：没有找到带 png 卡面的字', true);
      currentShopSession = null;
      renderShopPanel(null);
      return;
    }
    session = generateShopSession(pool, { day });
    if (!history.sessions) history.sessions = [];
    history.sessions.push(session);
    try {
      await saveShopHistoryToDisk(history);
    } catch (error) {
      setHint(`商店写入失败：${error.message || error}`, true);
    }
    if (token !== shopEnsureToken) return;
  }

  // 旧货架缺次号时补写 1–20 并落盘
  let patchedCi = false;
  for (const offer of session.offers || []) {
    const n = Math.floor(Number(offer.ciHao));
    if (!(Number.isFinite(n) && n >= 1 && n <= 20)) {
      offer.ciHao = typeof rollShopCiHao === 'function' ? rollShopCiHao() : (1 + Math.floor(Math.random() * 20));
      patchedCi = true;
    }
  }
  if (patchedCi) {
    try {
      await saveShopHistoryToDisk(history);
    } catch {
      // ignore patch write failure
    }
  }

  currentShopSession = session;
  renderShopPanel(session);
}

function renderShopPanel(session) {
  if (!el.shopRow) return;
  el.shopRow.replaceChildren();
  updateShopCountdownLabel();
  if (!session?.offers?.length) return;

  const entry = fileEntries.find((item) => item.id === activeId);
  const data = entry?.data || null;
  const day = session.day;

  for (const offer of session.offers) {
    const sold = typeof userHasBoughtShopSlot === 'function'
      ? userHasBoughtShopSlot(data, day, offer.slot)
      : false;
    el.shopRow.appendChild(createShopOfferCard(offer, { sold }));
  }
}

function shopStyleColors(cardStyle) {
  const fallbackId = typeof CARD_DEFAULT_COLOR_SCHEME_ID !== 'undefined'
    ? CARD_DEFAULT_COLOR_SCHEME_ID
    : DEFAULT_COLOR_SCHEME_ID;
  const schemeId = cardStyle?.colorSchemeId || fallbackId;
  const scheme = typeof getColorSchemeById === 'function' ? getColorSchemeById(schemeId) : null;
  return {
    primary: scheme?.primaryColor || '#191919',
    secondary: scheme?.secondaryColor || '#848484',
    tertiary: scheme?.tertiaryColor || scheme?.secondaryColor || '#7a7a7a',
  };
}

function setShopLayerMask(layer, url, backgroundColor) {
  if (!layer) return;
  if (!url) {
    layer.style.webkitMaskImage = '';
    layer.style.maskImage = '';
    layer.classList.add('hidden');
    return;
  }
  const quoted = `url("${url}")`;
  layer.style.webkitMaskImage = quoted;
  layer.style.maskImage = quoted;
  layer.style.backgroundColor = backgroundColor;
  layer.classList.remove('hidden');
}

function loadShopImageMask(layer, candidates, backgroundColor) {
  if (!layer) return Promise.resolve(false);
  if (!candidates?.length) {
    setShopLayerMask(layer, '', backgroundColor);
    return Promise.resolve(false);
  }
  return new Promise((resolve) => {
    let index = 0;
    const tryNext = () => {
      if (index >= candidates.length) {
        setShopLayerMask(layer, '', backgroundColor);
        resolve(false);
        return;
      }
      const path = candidates[index++];
      const probe = new Image();
      probe.onload = () => {
        setShopLayerMask(layer, path, backgroundColor);
        resolve(true);
      };
      probe.onerror = tryNext;
      probe.src = path;
    };
    tryNext();
  });
}

function createShopOfferCard(offer, { sold = false } = {}) {
  const script = normalizeItemScript(offer.script);
  const displayStyle = typeof resolveCardStyleForDisplay === 'function'
    ? resolveCardStyleForDisplay(offer.cardStyle || null)
    : offer.cardStyle;
  const paintStyle = withDefaultUniqueColorScheme(displayStyle);
  const colors = shopStyleColors(paintStyle);

  const root = document.createElement('article');
  root.className = `shop-offer${sold ? ' is-sold' : ''}`;
  root.dataset.offerId = offer.id;
  root.setAttribute('role', 'listitem');

  const frame = document.createElement('div');
  frame.className = `shop-offer-frame script-${script}`;
  if (typeof applyCardStyleToElement === 'function') {
    applyCardStyleToElement(frame, paintStyle);
  }
  frame.style.background = colors.secondary;

  const baseLayer = document.createElement('div');
  baseLayer.className = 'shop-offer-base hidden';
  baseLayer.setAttribute('aria-hidden', 'true');

  const maskLayer = document.createElement('div');
  maskLayer.className = 'shop-offer-mask hidden';
  maskLayer.setAttribute('aria-hidden', 'true');

  const fallback = document.createElement('span');
  fallback.className = 'shop-offer-fallback';
  fallback.textContent = offer.char || '—';
  fallback.style.color = colors.primary;

  frame.append(baseLayer, maskLayer, fallback);

  if (paintStyle?.cardModifier) {
    applyCardModifierToUniqueFrame(frame, paintStyle.cardModifier);
  }

  const info = document.createElement('div');
  info.className = 'shop-offer-info';
  info.style.setProperty('--shop-primary', colors.primary);
  info.style.setProperty('--shop-secondary', colors.secondary);
  info.style.color = colors.primary;
  info.style.backgroundColor = `${colors.secondary}e6`;

  const infoChar = document.createElement('div');
  infoChar.className = 'shop-offer-info-char';
  infoChar.textContent = offer.char || '—';
  info.appendChild(infoChar);

  const infoMeta = document.createElement('div');
  infoMeta.className = 'shop-offer-info-meta';
  const lines = typeof collectCardPreviewMetaLines === 'function'
    ? collectCardPreviewMetaLines({
      cardStyle: displayStyle || paintStyle,
      acquiredAt: null,
      ciHao: offer.ciHao,
    }).filter((line) => line.kind !== 'date')
    : [];
  for (const line of lines) {
    const row = document.createElement('p');
    row.className = 'card-preview-meta-line';
    if (line.kind === 'ciHao') row.classList.add('is-ci-hao');
    row.textContent = line.text;
    row.style.color = colors.primary;
    row.style.backgroundColor = colors.secondary;
    infoMeta.appendChild(row);
  }
  if (lines.length === 0) {
    const row = document.createElement('p');
    row.className = 'card-preview-meta-line';
    row.textContent = '—';
    row.style.color = colors.primary;
    row.style.backgroundColor = colors.secondary;
    infoMeta.appendChild(row);
  }
  info.appendChild(infoMeta);
  frame.appendChild(info);

  if (sold) {
    const badge = document.createElement('div');
    badge.className = 'shop-offer-sold-badge';
    badge.textContent = '已购';
    frame.appendChild(badge);
  }

  // 卡面图（primary mask）
  const imageCandidates = getCardImageCandidates(offer.char, script, offer.ziId)
    .filter((path) => /\.png$/i.test(path));
  void loadShopImageMask(maskLayer, imageCandidates, colors.primary).then((ok) => {
    if (!frame.isConnected) return;
    if (ok) fallback.classList.add('hidden');
    else fallback.classList.remove('hidden');
  });

  // 底纹（tertiary mask）
  if (paintStyle?.cardBase && typeof getCardBaseImageCandidates === 'function') {
    void loadShopImageMask(
      baseLayer,
      getCardBaseImageCandidates(paintStyle.cardBase),
      colors.tertiary,
    );
  }

  const actions = document.createElement('button');
  actions.type = 'button';
  actions.className = 'shop-offer-actions';
  actions.disabled = Boolean(sold);
  actions.title = sold ? '今日已购' : `购买「${offer.char || ''}」`;
  actions.setAttribute('aria-label', sold ? '今日已购' : `购买 ${offer.char || ''}，${offer.price} 墨`);

  const priceEl = document.createElement('div');
  priceEl.className = 'shop-offer-price';
  priceEl.innerHTML = `${offer.price}<span class="shop-offer-price-unit">墨</span>`;

  const buyLabel = document.createElement('span');
  buyLabel.className = 'shop-offer-buy';
  buyLabel.textContent = sold ? '已购' : '购买';

  actions.append(priceEl, buyLabel);
  actions.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (sold) return;
    void purchaseShopOffer(offer.id, actions);
  });

  root.append(frame, actions);
  return root;
}

async function purchaseShopOffer(offerId, actionsBtn = null) {
  const entry = fileEntries.find((item) => item.id === activeId);
  if (!entry?.data) {
    setHint('请先选择用户', true);
    return;
  }
  if (!currentShopSession || !dirHandle) {
    setHint('商店未就绪', true);
    return;
  }

  const day = currentShopSession.day;
  const offer = (currentShopSession.offers || []).find((item) => item.id === offerId);
  if (!offer) {
    setHint('商品不存在', true);
    return;
  }
  if (typeof userHasBoughtShopSlot === 'function' && userHasBoughtShopSlot(entry.data, day, offer.slot)) {
    setHint('今日已购此卡', true);
    return;
  }

  const price = Math.max(0, Math.floor(Number(offer.price) || 0));
  if (price <= 0) {
    setHint('价格无效', true);
    return;
  }
  if (typeof spendInk !== 'function') {
    setHint('缺少 spendInk', true);
    return;
  }

  const data = entry.data;
  const spent = spendInk(data, price, {
    reason: 'shop-buy',
    source: 'daily-shop',
    ref: {
      offerId: offer.id,
      day,
      ziId: offer.ziId,
      char: offer.char,
      cardStyle: offer.cardStyle,
      priceMod: offer.priceMod,
      basePrice: offer.basePrice,
    },
  });
  if (!spent.ok) {
    if (spent.error === 'insufficient-ink') {
      flashShopBuyInkShort(actionsBtn);
      showShopToast('墨量不够，无法购买', { error: true, durationMs: 2200 });
    } else {
      showShopToast(`购买失败：${spent.error || 'unknown'}`, { error: true });
    }
    return;
  }

  const now = spent.entry?.at || new Date().toISOString();
  const normalizedStyle = typeof normalizeCardStyleRecord === 'function'
    ? normalizeCardStyleRecord(offer.cardStyle)
    : offer.cardStyle;

  if (typeof recordUserShopBuy === 'function') {
    recordUserShopBuy(data, day, offer.slot);
  }

  if (!Array.isArray(data.shopPurchases)) data.shopPurchases = [];
  const purchaseCiHao = typeof resolveShopCiHao === 'function'
    ? resolveShopCiHao(offer.ciHao)
    : (Math.max(1, Math.min(20, Math.floor(Number(offer.ciHao) || 1))));
  data.shopPurchases.push({
    at: now,
    day,
    slot: offer.slot,
    ziId: offer.ziId,
    price,
    priceMod: offer.priceMod,
    cardStyle: normalizedStyle,
    offerId: offer.id,
    ciHao: purchaseCiHao,
  });

  if (!Array.isArray(data.sessions)) data.sessions = [];
  data.sessions.push({
    type: 'practice-session',
    version: 1,
    startedAt: now,
    endedAt: now,
    filter: normalizeItemScript(offer.script),
    mode: 'shop-purchase',
    librarySize: null,
    commitSource: 'daily-shop',
    strokes: [{
      id: offer.ziId,
      durationMs: 0,
      isUnique: true,
      ciHao: purchaseCiHao,
      cardStyle: normalizedStyle,
    }],
    summary: {
      uniqueChars: 1,
      totalAppearances: 1,
      totalDurationMs: 0,
    },
  });
  data.updatedAt = now;
  if (!data.summary || typeof data.summary !== 'object') data.summary = {};
  data.summary.sessionCount = data.sessions.length;

  try {
    await writeActiveUserData(data);
    renderShopPanel(currentShopSession);
    showShopToast('购买成功', { durationMs: 2200 });
    if (levelDisplayMode === 'shop') {
      updateLevelOverlays();
    } else {
      renderActiveView(entry);
      updateLevelOverlays();
    }
  } catch (error) {
    if (typeof unrecordUserShopBuy === 'function') {
      unrecordUserShopBuy(data, day, offer.slot);
    }
    if (typeof gainInk === 'function') {
      gainInk(data, price, {
        reason: 'shop-buy-rollback',
        source: 'daily-shop',
        ref: { offerId, day },
      });
    }
    data.shopPurchases = (data.shopPurchases || []).filter((p) => p.offerId !== offerId || p.at !== now);
    if (Array.isArray(data.sessions) && data.sessions.length) {
      const last = data.sessions[data.sessions.length - 1];
      if (last?.commitSource === 'daily-shop' && last?.startedAt === now) {
        data.sessions.pop();
      }
    }
    setHint(`写入失败：${error.message || error}`, true);
  }
}

function setLevelDisplayMode(mode) {
  unlockCardHoverSfx();
  const prevMode = levelDisplayMode;
  if (mode === 'lastSession') {
    levelDisplayMode = 'lastSession';
    historySessionIndex = null;
  } else if (mode === 'unique') levelDisplayMode = 'unique';
  else if (mode === 'levels') levelDisplayMode = 'levels';
  else if (mode === 'cardFace') levelDisplayMode = 'cardFace';
  else if (mode === 'glyphImage') levelDisplayMode = 'glyphImage';
  else if (mode === 'shop') levelDisplayMode = 'shop';
  else if (mode === 'inkHistory') levelDisplayMode = 'inkHistory';
  else if (mode === 'settings') levelDisplayMode = 'settings';
  else levelDisplayMode = 'overview';
  if (prevMode === 'shop' && levelDisplayMode !== 'shop') stopShopCountdown();
  applyLevelNavUI();
  hideCardPreview();
  const entry = fileEntries.find((item) => item.id === activeId);
  if (entry?.data && currentView === 'level') renderActiveView(entry);
  else if (levelDisplayMode === 'settings' && currentView === 'level') renderSettingsView();
  else if (levelDisplayMode === 'shop' && currentView === 'level') renderShopView();
  else if (levelDisplayMode === 'inkHistory' && currentView === 'level') renderInkHistoryView(entry);
}

function setView(view) {
  currentView = view === 'level' ? 'level' : 'stats';
  el.viewStats.classList.toggle('is-active', currentView === 'stats');
  el.viewLevel.classList.toggle('is-active', currentView === 'level');

  const hasData = Boolean(fileEntries.find((item) => item.id === activeId)?.data);
  document.body.classList.toggle('is-level-view', currentView === 'level');
  document.body.classList.toggle('has-user-data', hasData);

  el.panel.classList.toggle('hidden', currentView !== 'stats' || !hasData);
  if (currentView !== 'level' || !hasData) {
    el.levelPanel.classList.add('hidden');
    el.settingsPanel?.classList.add('hidden');
    el.shopPanel?.classList.add('hidden');
    el.inkHistoryPanel?.classList.add('hidden');
  }
  updateCardPreviewSlot();

  if (currentView !== 'level') hideCardPreview();

  const entry = fileEntries.find((item) => item.id === activeId);
  if (entry?.data) renderActiveView(entry);
}

function getCardImageCandidates(char, script, id) {
  const ch = String(char || '').trim();
  const scriptNorm = normalizeItemScript(script);
  const dir = CARD_IMAGE_DIR[scriptNorm] || CARD_IMAGE_DIR.cao;

  let catalog = null;
  if (id) catalog = getCatalogById().get(String(id)) || null;
  if (!catalog && typeof findZiEntry === 'function') {
    catalog = findZiEntry(id || ch, scriptNorm) || null;
  }

  let basenames = [];
  if (catalog && typeof cardImageBasenamesForEntry === 'function') {
    basenames = cardImageBasenamesForEntry({
      ...catalog,
      char: catalog.char || ch,
    });
  } else if (id && typeof cardImageBasenameFromZiId === 'function' && ch) {
    basenames = [cardImageBasenameFromZiId(id, ch)];
    // 无 catalog 时仍尝试：仅主字
  } else if (ch) {
    basenames = [ch];
  }

  // 确保传入的 char 也在候选里（且优先）
  if (ch && typeof cardImageBasename === 'function') {
    const dup = id && typeof parseDupFromZiId === 'function'
      ? (parseDupFromZiId(id) || 1)
      : 1;
    const primary = cardImageBasename(ch, dup);
    if (primary) {
      basenames = [primary, ...basenames.filter((b) => b !== primary)];
    }
  }

  const paths = [];
  const seen = new Set();
  for (const basename of basenames) {
    if (!basename) continue;
    for (const ext of CARD_IMAGE_EXTENSIONS) {
      const path = `${dir}/${basename}.${ext}`;
      if (seen.has(path)) continue;
      seen.add(path);
      paths.push(path);
    }
  }
  return paths;
}

function cardImageCacheKey(id, script) {
  return `${normalizeItemScript(script)}:${id}`;
}

function probeCardImageExists(char, script, id) {
  const key = cardImageCacheKey(id, script);
  if (cardImageExistsCache.has(key)) {
    return Promise.resolve(cardImageExistsCache.get(key));
  }

  const candidates = getCardImageCandidates(char, script, id);
  if (candidates.length === 0) {
    cardImageExistsCache.set(key, false);
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    let index = 0;
    const tryNext = () => {
      if (index >= candidates.length) {
        cardImageExistsCache.set(key, false);
        resolve(false);
        return;
      }
      const probe = new Image();
      probe.onload = () => {
        cardImageExistsCache.set(key, true);
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

/** 商店专用：必须存在对应 .png 卡面 */
function probeCardPngExists(char, script, id) {
  const key = `png:${cardImageCacheKey(id, script)}`;
  if (cardImageExistsCache.has(key)) {
    return Promise.resolve(cardImageExistsCache.get(key));
  }
  const candidates = getCardImageCandidates(char, script, id).filter((path) => /\.png$/i.test(path));
  if (candidates.length === 0) {
    cardImageExistsCache.set(key, false);
    return Promise.resolve(false);
  }
  return new Promise((resolve) => {
    let index = 0;
    const tryNext = () => {
      if (index >= candidates.length) {
        cardImageExistsCache.set(key, false);
        resolve(false);
        return;
      }
      const probe = new Image();
      probe.onload = () => {
        cardImageExistsCache.set(key, true);
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

function getGlyphImageCandidates(char, id = null) {
  let catalog = null;
  if (id) catalog = getCatalogById().get(String(id)) || null;
  if (!catalog && typeof findZiEntry === 'function') {
    catalog = findZiEntry(id || char) || null;
  }

  const forms = typeof glyphImageCharForms === 'function'
    ? glyphImageCharForms(char, catalog)
    : [String(char || '').trim()].filter(Boolean);

  const paths = [];
  const seen = new Set();
  for (const form of forms) {
    for (const ext of GLYPH_IMAGE_EXTENSIONS) {
      const path = `${GLYPH_IMAGE_DIR}/${form}.${ext}`;
      if (seen.has(path)) continue;
      seen.add(path);
      paths.push(path);
    }
  }
  return paths;
}

function glyphImageCacheKey(char, id = null) {
  return `glyph:${id || String(char || '').trim()}`;
}

function probeGlyphImageExists(char, id = null) {
  const key = glyphImageCacheKey(char, id);
  if (glyphImageExistsCache.has(key)) {
    return Promise.resolve(glyphImageExistsCache.get(key));
  }

  const candidates = getGlyphImageCandidates(char, id);
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

/**
 * 卡面/字形 filter 下的 unique 格子：
 * - 无图：与其他卡相同灰显（不受 colorScheme 影响）
 * - 有图：level 0 视觉
 */
function applyFilterVisualToUniqueCard(card, hasImage) {
  const frame = card.querySelector('.unique-card-frame') || card.querySelector('.level-frame');
  if (!frame) return;

  if (typeof stripCardStyleClasses === 'function') {
    stripCardStyleClasses(frame);
  }
  applyCardModifierToUniqueFrame(frame, null);

  if (!hasImage) {
    card.classList.add('is-no-card-image');
    card.classList.remove('is-filter-level0');
    frame.style.background = '';
    frame.style.borderColor = '';
    frame.style.color = '';
    return;
  }

  card.classList.remove('is-no-card-image');
  card.classList.add('is-filter-level0');
  const color = levelFrameColor(0);
  frame.style.background = color;
  frame.style.borderColor = color;
  frame.style.color = '#fff';
}

function finishImageFilterOnCard(card, hasImage) {
  if (card.classList.contains('unique-card')) {
    applyFilterVisualToUniqueCard(card, hasImage);
    return;
  }
  if (!hasImage) card.classList.add('is-no-card-image');
  else card.classList.remove('is-no-card-image');
}

function applyCardFaceFilterToCard(card, item, token) {
  const script = normalizeItemScript(item.script);
  const key = cardImageCacheKey(item.id, script);

  if (cardImageExistsCache.has(key)) {
    finishImageFilterOnCard(card, Boolean(cardImageExistsCache.get(key)));
    return;
  }

  probeCardImageExists(item.char, script, item.id).then((hasImage) => {
    if (token !== imageFilterToken || !card.isConnected) return;
    finishImageFilterOnCard(card, hasImage);
  });
}

/** 字形 tab：检查 images/characters/{字}.*（主字优先，再 alternatives） */
function applyGlyphImageFilterToCard(card, item, token) {
  const key = glyphImageCacheKey(item.char, item.id);

  if (glyphImageExistsCache.has(key)) {
    finishImageFilterOnCard(card, Boolean(glyphImageExistsCache.get(key)));
    return;
  }

  probeGlyphImageExists(item.char, item.id).then((hasImage) => {
    if (token !== imageFilterToken || !card.isConnected) return;
    finishImageFilterOnCard(card, hasImage);
  });
}

function applyImageFilterToCard(card, item, token, imageFilter) {
  if (imageFilter === 'card') applyCardFaceFilterToCard(card, item, token);
  else if (imageFilter === 'glyph') applyGlyphImageFilterToCard(card, item, token);
}

function probeItemMatchesImageFilter(item, imageFilter) {
  if (imageFilter === 'card') {
    return probeCardImageExists(item.char, normalizeItemScript(item.script), item.id);
  }
  if (imageFilter === 'glyph') {
    return probeGlyphImageExists(item.char, item.id);
  }
  return Promise.resolve(false);
}

/** 卡面/字形 filter：UNIQUE 上方显示「符合数/总数」 */
function buildImageFilterStatsBar(imageFilter) {
  const bar = document.createElement('div');
  bar.className = 'level-filter-stats';
  bar.setAttribute('role', 'status');
  bar.setAttribute('aria-live', 'polite');

  const label = document.createElement('span');
  label.className = 'level-filter-stats-label';
  label.textContent = imageFilter === 'card' ? '有卡面' : '有字形';

  const value = document.createElement('span');
  value.className = 'level-filter-stats-value';
  value.textContent = '—/—';

  bar.append(label, value);
  return bar;
}

function fillImageFilterStatsBar(bar, items, imageFilter, token) {
  if (!bar) return;
  const valueEl = bar.querySelector('.level-filter-stats-value');
  const total = items.length;
  if (valueEl) valueEl.textContent = `…/${total}`;

  Promise.all(items.map((item) => probeItemMatchesImageFilter(item, imageFilter)))
    .then((results) => {
      if (token !== imageFilterToken || !bar.isConnected) return;
      const matched = results.reduce((sum, ok) => sum + (ok ? 1 : 0), 0);
      if (valueEl) valueEl.textContent = `${matched}/${total}`;
      bar.title = imageFilter === 'card'
        ? `${matched} 字有卡面图，共 ${total} 字`
        : `${matched} 字有字形图，共 ${total} 字`;
    });
}

function cardPreviewIdentityKey(char, script, id, uniquePreview = null) {
  const style = uniquePreview?.cardStyle || null;
  return [
    char,
    script,
    id,
    style?.colorSchemeId || '',
    style?.decorationId || '',
    style?.cardBase || '',
    style?.cardModifier || '',
    uniquePreview?.acquiredAt ?? '',
    uniquePreview?.ciHao ?? '',
  ].join('\0');
}

/**
 * @param {string} char
 * @param {string} script
 * @param {string} id
 * @param {{ cardStyle?: object, acquiredAt?: number|string|null, ciHao?: number }|null} [uniquePreview]
 * @param {{ allowWhenPinned?: boolean }} [options]
 */
function showCardPreview(char, script, id, uniquePreview = null, options = {}) {
  if (!el.cardPreview) return;

  // 分解已选中：禁止 hover 等路径换卡；仅 pin 入口可更新
  if (dismantleMode && dismantleSelection && !options.allowWhenPinned) return;

  const identity = cardPreviewIdentityKey(char, script, id, uniquePreview);
  const alreadyShowing = el.cardPreview.classList.contains('is-visible')
    && !el.cardPreview.classList.contains('is-leaving')
    && identity === cardPreviewIdentity;
  if (alreadyShowing) {
    cancelCardPreviewFade();
    return;
  }

  const cardStyle = uniquePreview?.cardStyle || null;
  cardPreviewStyleOverride = cardStyle;
  cardPreviewAcquiredAt = uniquePreview?.acquiredAt ?? null;
  cardPreviewIdentity = identity;
  cancelCardPreviewFade();

  el.cardPreview.classList.remove('is-leaving');
  el.cardPreview.style.transition = '';
  el.cardPreview.classList.add('is-visible');
  el.cardPreview.setAttribute('aria-hidden', 'false');
  applyActiveCardStyleToPreview();
  renderCardPreviewMeta(cardStyle ? uniquePreview : null);

  const token = ++cardPreviewLoadToken;
  setCardPreviewMaskSource('');
  el.cardPreviewFallback.classList.remove('hidden');

  const candidates = getCardImageCandidates(char, script, id);
  let index = 0;

  const tryNext = () => {
    if (token !== cardPreviewLoadToken) return;
    if (index >= candidates.length) {
      setCardPreviewMaskSource('');
      el.cardPreviewFallback.classList.remove('hidden');
      return;
    }

    const path = candidates[index++];
    const probe = new Image();
    probe.onload = () => {
      if (token !== cardPreviewLoadToken) return;
      setCardPreviewMaskSource(path);
      el.cardPreviewFallback.classList.add('hidden');
    };
    probe.onerror = tryNext;
    probe.src = path;
  };

  tryNext();
}

/**
 * 估算 unique 获取时刻：session.startedAt + 此前各字 durationMs
 * （unique 在 beginStroke 时 roll）
 */
function estimateUniqueAcquiredAt(session, strokeIndex) {
  const startMs = Date.parse(session?.startedAt || '');
  if (Number.isFinite(startMs)) {
    let offset = 0;
    const strokes = session.strokes || [];
    for (let i = 0; i < strokeIndex; i += 1) {
      offset += Math.max(0, Number(strokes[i]?.durationMs) || 0);
    }
    return startMs + offset;
  }
  const endMs = Date.parse(session?.endedAt || '');
  return Number.isFinite(endMs) ? endMs : null;
}

/** 北京时间 → xxxx年x月x日 */
function formatBeijingDate(isoOrMs) {
  if (isoOrMs == null || isoOrMs === '') return '';
  const date = new Date(isoOrMs);
  if (Number.isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(date);
  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;
  if (!year || !month || !day) return '';
  return `${year}年${month}月${day}日`;
}

/** unique 卡面信息行（有则显示）：配色 / 装饰 / 底纹 / 修饰 + 获取日期 */
function collectCardPreviewMetaLines(uniquePreview) {
  const lines = [];
  const style = uniquePreview?.cardStyle;
  if (!style) return lines;

  if (style.colorSchemeId && typeof getColorSchemeById === 'function') {
    const scheme = getColorSchemeById(style.colorSchemeId);
    if (scheme) lines.push({ text: scheme.name || scheme.id, kind: 'scheme' });
  }
  if (style.decorationId && typeof getDecorationById === 'function') {
    const deco = getDecorationById(style.decorationId);
    if (deco) lines.push({ text: deco.name || deco.id, kind: 'deco' });
    else lines.push({ text: style.decorationId, kind: 'deco' });
  }
  if (style.cardBase && typeof getCardBaseById === 'function') {
    const base = getCardBaseById(style.cardBase);
    if (base) lines.push({ text: base.name || base.id, kind: 'base' });
  }
  if (style.cardModifier && typeof getCardModifierById === 'function') {
    const mod = getCardModifierById(style.cardModifier);
    if (mod) lines.push({ text: mod.name || mod.id, kind: 'modifier' });
  }

  const ciHao = typeof resolveCiHao === 'function'
    ? resolveCiHao(uniquePreview)
    : (Number(uniquePreview?.ciHao) || 1);
  lines.push({ text: `次号：${ciHao}`, kind: 'ciHao' });

  const dateText = formatBeijingDate(uniquePreview.acquiredAt);
  if (dateText) lines.push({ text: dateText, kind: 'date' });

  return lines;
}

function clearCardPreviewMeta() {
  if (!el.cardPreviewMeta) return;
  el.cardPreviewMeta.replaceChildren();
  el.cardPreviewMeta.classList.remove('is-visible', 'is-leaving');
  el.cardPreviewMeta.classList.add('hidden');
  el.cardPreviewMeta.setAttribute('aria-hidden', 'true');
  el.cardPreviewMeta.style.transition = '';
  el.cardPreviewMeta.style.color = '';
}

function renderCardPreviewMeta(uniquePreview) {
  if (!el.cardPreviewMeta) return;
  const lines = collectCardPreviewMetaLines(uniquePreview);
  if (lines.length === 0) {
    clearCardPreviewMeta();
    return;
  }

  const textColor = cardPreviewPrimaryColor();
  const highlightColor = cardPreviewSecondaryColor();

  el.cardPreviewMeta.replaceChildren();
  for (const line of lines) {
    const row = document.createElement('p');
    row.className = 'card-preview-meta-line';
    if (line.kind === 'date') row.classList.add('is-date');
    if (line.kind === 'ciHao') row.classList.add('is-ci-hao');
    row.textContent = line.text;
    row.style.color = textColor;
    row.style.backgroundColor = highlightColor;
    el.cardPreviewMeta.appendChild(row);
  }
  el.cardPreviewMeta.classList.remove('hidden', 'is-leaving');
  el.cardPreviewMeta.classList.add('is-visible');
  el.cardPreviewMeta.setAttribute('aria-hidden', 'false');
  el.cardPreviewMeta.style.transition = '';
}

function resetCardPreviewContent() {
  cardPreviewLoadToken += 1;
  cardPreviewBaseLoadToken += 1;
  cardPreviewModifierLoadToken += 1;
  if (!el.cardPreview) return;
  setCardPreviewMaskSource('');
  setCardPreviewBaseSource('');
  setCardPreviewModifierSource('');
  el.cardPreviewFallback.classList.remove('hidden');
  clearCardPreviewMeta();
}

function hideCardPreviewNow() {
  if (!el.cardPreview) return;
  cardPreviewStyleOverride = null;
  cardPreviewAcquiredAt = null;
  cardPreviewIdentity = '';
  el.cardPreview.classList.remove('is-visible', 'is-leaving');
  el.cardPreview.style.transition = '';
  el.cardPreview.setAttribute('aria-hidden', 'true');
  resetCardPreviewContent();
}

function cancelCardPreviewFade() {
  if (cardPreviewFadeTimer) {
    clearTimeout(cardPreviewFadeTimer);
    cardPreviewFadeTimer = null;
  }
}

function fadeOutCardPreview() {
  if (!el.cardPreview?.classList.contains('is-visible')) return;

  cancelCardPreviewFade();
  el.cardPreview.classList.add('is-leaving');
  el.cardPreviewMeta?.classList.add('is-leaving');

  cardPreviewFadeTimer = setTimeout(() => {
    cardPreviewFadeTimer = null;
    hideCardPreviewNow();
  }, CARD_PREVIEW_FADE_MS);
}

/**
 * @param {string} char
 * @param {string} script
 * @param {string} id
 * @param {{ cardStyle?: object, acquiredAt?: number|string|null }|null} [uniquePreview]
 */
function onLevelCardEnter(char, script, id, uniquePreview = null) {
  if (dismantleMode && dismantleSelection) return;
  playCardHoverSfx();
  cardPreviewHoverAt = Date.now();
  showCardPreview(char, script, id, uniquePreview);
}

function onLevelCardLeave() {
  // 已钉住选中卡：离开其它卡时不要重载预览（showCardPreview 会清 mask，造成闪一下）
  if (dismantleMode && dismantleSelection) {
    cancelCardPreviewFade();
    return;
  }

  const hoveredMs = Date.now() - cardPreviewHoverAt;
  if (hoveredMs >= CARD_PREVIEW_HOVER_FADE_THRESHOLD) {
    fadeOutCardPreview();
    return;
  }

  cancelCardPreviewFade();
  if (!el.cardPreview) return;
  el.cardPreview.classList.remove('is-leaving');
  el.cardPreview.style.transition = 'none';
  el.cardPreviewMeta?.classList.remove('is-leaving');
  hideCardPreviewNow();
  void el.cardPreview.offsetWidth;
  el.cardPreview.style.transition = '';
}

function hideCardPreview() {
  cancelCardPreviewFade();
  hideCardPreviewNow();
}

function renderActiveView(entry) {
  if (currentView === 'level') {
    if (levelDisplayMode === 'settings') {
      renderSettingsView();
      return;
    }
    if (levelDisplayMode === 'shop') {
      renderShopView();
      return;
    }
    if (levelDisplayMode === 'inkHistory') {
      renderInkHistoryView(entry);
      return;
    }
    stopShopCountdown();
    el.settingsPanel?.classList.add('hidden');
    el.shopPanel?.classList.add('hidden');
    el.inkHistoryPanel?.classList.add('hidden');
    if (levelDisplayMode === 'lastSession') renderLastSessionView(entry);
    else if (levelDisplayMode === 'unique') renderLevelView(entry, { uniqueOnly: true });
    else if (levelDisplayMode === 'levels') renderLevelView(entry, { levelsOnly: true });
    else if (levelDisplayMode === 'cardFace') renderLevelView(entry, { imageFilter: 'card' });
    else if (levelDisplayMode === 'glyphImage') renderLevelView(entry, { imageFilter: 'glyph' });
    else renderLevelView(entry);
  } else {
    stopShopCountdown();
    el.settingsPanel?.classList.add('hidden');
    el.shopPanel?.classList.add('hidden');
    el.inkHistoryPanel?.classList.add('hidden');
    renderUser(entry);
  }
}

const RECORD_UNIQUE_FRAME_COLOR = '#e87822';

function createLevelCard(item, info, color, { recordMode = false } = {}) {
  const script = normalizeItemScript(item.script);
  const card = document.createElement('div');
  card.className = 'level-card';
  if (recordMode) card.classList.add('is-record');
  if (recordMode && item.isUnique) card.classList.add('is-record-unique');

  const frame = document.createElement('div');
  frame.className = `level-frame script-${script}`;
  const displayStyle = resolveCardStyleForDisplay(
    recordMode && item.isUnique ? (item.cardStyle || null) : null,
  );
  const overrideScheme = displayStyle?.colorSchemeId
    ? getColorSchemeById(displayStyle.colorSchemeId)
    : null;
  const frameColor = recordMode && item.isUnique
    ? RECORD_UNIQUE_FRAME_COLOR
    : (overrideScheme ? overrideScheme.secondaryColor : color);
  const accentColor = recordMode && item.isUnique
    ? RECORD_UNIQUE_FRAME_COLOR
    : (overrideScheme ? overrideScheme.primaryColor : color);
  frame.style.background = frameColor;
  frame.style.borderColor = frameColor;
  if (displayStyle && typeof applyCardStyleToElement === 'function' && !(recordMode && item.isUnique)) {
    applyCardStyleToElement(frame, displayStyle);
  }

  const glyph = document.createElement('span');
  glyph.className = 'char-glyph';
  glyph.textContent = item.char || '—';

  if (!recordMode) {
    const badge = document.createElement('span');
    badge.className = 'level-badge';
    badge.textContent = `LVL. ${info.level}`;
    frame.append(glyph, badge);
  } else {
    frame.appendChild(glyph);
  }
  if (displayStyle?.cardModifier && !(recordMode && item.isUnique)) {
    applyCardModifierToUniqueFrame(frame, displayStyle.cardModifier);
  }

  const track = document.createElement('div');
  track.className = 'level-track';

  const bar = document.createElement('div');
  bar.className = 'level-bar';
  const fill = document.createElement('div');
  fill.className = 'level-bar-fill';
  fill.style.width = recordMode ? '0%' : `${Math.round(info.ratio * 1000) / 10}%`;
  fill.style.background = accentColor;
  bar.appendChild(fill);

  const xp = document.createElement('div');
  xp.className = 'level-xp';
  if (recordMode) {
    xp.textContent = '0 / 1';
  } else {
    xp.textContent = info.level >= MAX_CHAR_LEVEL
      ? '满级'
      : `${info.xp} / ${info.need}`;
  }

  track.append(bar, xp);
  card.append(frame, track);

  card.addEventListener('mouseenter', () => {
    const uniquePreview = item.isUnique && item.cardStyle
      ? {
        cardStyle: item.cardStyle,
        acquiredAt: item.acquiredAt ?? null,
        ciHao: typeof resolveCiHao === 'function' ? resolveCiHao(item) : (Number(item.ciHao) || 1),
      }
      : (displayStyle ? { cardStyle: displayStyle } : null);
    onLevelCardEnter(item.char, script, item.id, uniquePreview);
  });
  card.addEventListener('mouseleave', onLevelCardLeave);

  return card;
}

function collectUniqueCardAppearances(data) {
  const catalogById = getCatalogById();
  const items = [];
  const sessions = data?.sessions || [];
  for (let sessionIndex = 0; sessionIndex < sessions.length; sessionIndex += 1) {
    const session = sessions[sessionIndex];
    const strokes = session.strokes || [];
    for (let strokeIndex = 0; strokeIndex < strokes.length; strokeIndex += 1) {
      const stroke = strokes[strokeIndex];
      if (typeof strokeHasUniqueCardStyle === 'function' && !strokeHasUniqueCardStyle(stroke)) {
        continue;
      }
      if (!stroke?.isUnique || !stroke?.cardStyle) continue;
      const schemeId = typeof resolveColorSchemeId === 'function'
        ? resolveColorSchemeId(stroke.cardStyle.colorSchemeId)
        : stroke.cardStyle.colorSchemeId;
      const baseId = typeof resolveCardBaseId === 'function'
        ? resolveCardBaseId(stroke.cardStyle.cardBase)
        : stroke.cardStyle.cardBase;
      const modifierId = typeof resolveCardModifierId === 'function'
        ? resolveCardModifierId(stroke.cardStyle.cardModifier)
        : stroke.cardStyle.cardModifier;
      if (!schemeId && !stroke.cardStyle.decorationId && !baseId && !modifierId) continue;

      const id = String(stroke.id);
      const catalog = catalogById.get(id);
      const cardStyle = typeof normalizeCardStyleRecord === 'function'
        ? normalizeCardStyleRecord(stroke.cardStyle)
        : {
          colorSchemeId: schemeId || null,
          decorationId: stroke.cardStyle.decorationId || null,
          cardBase: baseId || null,
          cardModifier: modifierId || null,
        };
      items.push({
        id,
        char: catalog?.char || id,
        script: normalizeItemScript(catalog?.script),
        cardStyle,
        acquiredAt: estimateUniqueAcquiredAt(session, strokeIndex),
        ciHao: typeof resolveCiHao === 'function' ? resolveCiHao(stroke) : (Number(stroke.ciHao) || 1),
        sessionIndex,
        strokeIndex,
      });
    }
  }
  return items;
}

/**
 * unique 卡格子上色：有 colorScheme 用其配色，否则用默认 cs000
 * @param {object|null} style
 */
function withDefaultUniqueColorScheme(style) {
  const fallbackId = typeof CARD_DEFAULT_COLOR_SCHEME_ID !== 'undefined'
    ? CARD_DEFAULT_COLOR_SCHEME_ID
    : DEFAULT_COLOR_SCHEME_ID;
  if (!style || typeof style !== 'object') {
    return {
      colorSchemeId: fallbackId,
      decorationId: null,
      cardBase: null,
      cardModifier: null,
    };
  }
  if (style.colorSchemeId) return style;
  return {
    ...style,
    colorSchemeId: fallbackId,
  };
}

function createUniqueCard(item, { imageFilter = null } = {}) {
  const script = normalizeItemScript(item.script);
  const card = document.createElement('div');
  card.className = 'level-card unique-card';
  card.dataset.sessionIndex = String(item.sessionIndex);
  card.dataset.strokeIndex = String(item.strokeIndex);
  const displayStyle = resolveCardStyleForDisplay(item.cardStyle || null);
  const paintStyle = withDefaultUniqueColorScheme(displayStyle);

  const frame = document.createElement('div');
  frame.className = `unique-card-frame level-frame script-${script}`;

  const glyph = document.createElement('span');
  glyph.className = 'char-glyph';
  glyph.textContent = item.char || '—';
  frame.appendChild(glyph);

  if (imageFilter) {
    // filter 模式下先按 level0 占位，探测后再灰显或保持 level0
    const color = levelFrameColor(0);
    frame.style.background = color;
    frame.style.borderColor = color;
    card.classList.add('is-filter-level0');
  } else if (typeof applyCardStyleToElement === 'function') {
    applyCardStyleToElement(frame, paintStyle);
    applyCardModifierToUniqueFrame(frame, paintStyle?.cardModifier || null);
  } else {
    const color = levelFrameColor(1);
    frame.style.background = color;
    frame.style.borderColor = color;
  }

  card.appendChild(frame);

  if (
    dismantleMode
    && dismantleSelection
    && dismantleSelection.sessionIndex === item.sessionIndex
    && dismantleSelection.strokeIndex === item.strokeIndex
  ) {
    card.classList.add('is-dismantle-selected');
  }

  card.addEventListener('click', (event) => {
    if (!dismantleMode) return;
    event.preventDefault();
    event.stopPropagation();
    toggleDismantleSelection(item);
  });

  card.addEventListener('mouseenter', () => {
    // 已选中某张卡时，右侧只钉住选中卡，不再因 hover 切换
    if (dismantleMode && dismantleSelection) return;
    onLevelCardEnter(item.char, script, item.id, {
      // 预览词条保持原样（无配色不伪造成「默认」）；格子上色用 paintStyle
      cardStyle: displayStyle || paintStyle,
      acquiredAt: item.acquiredAt,
      ciHao: typeof resolveCiHao === 'function' ? resolveCiHao(item) : (Number(item.ciHao) || 1),
    });
  });
  card.addEventListener('mouseleave', onLevelCardLeave);

  return card;
}

function buildUniqueSection(uniqueItems, { imageFilter = null, imageFilterToken = 0, ink = 0 } = {}) {
  const section = document.createElement('section');
  section.className = 'level-section level-section-unique';
  section.dataset.level = 'unique';

  const head = document.createElement('div');
  head.className = 'level-section-head';

  const titleRow = document.createElement('div');
  titleRow.className = 'level-section-title-row unique-title-row';

  const title = document.createElement('div');
  title.className = 'level-section-title';
  title.textContent = 'UNIQUE';

  const inkEl = document.createElement('div');
  inkEl.className = 'unique-ink';
  inkEl.title = '墨';
  const inkValue = document.createElement('span');
  inkValue.className = 'unique-ink-value';
  inkValue.textContent = String(
    typeof resolveInk === 'function' ? resolveInk({ ink }) : Math.max(0, Math.floor(Number(ink) || 0)),
  );
  const inkUnit = document.createElement('span');
  inkUnit.className = 'unique-ink-unit';
  inkUnit.textContent = '墨';
  inkEl.append(inkValue, inkUnit);

  titleRow.append(title, inkEl);

  const rule = document.createElement('div');
  rule.className = 'level-section-rule';

  head.append(titleRow, rule);

  const group = document.createElement('div');
  group.className = 'level-group unique-group';

  for (const item of uniqueItems) {
    const card = createUniqueCard(item, { imageFilter });
    if (imageFilter) applyImageFilterToCard(card, item, imageFilterToken, imageFilter);
    group.appendChild(card);
  }

  section.append(head, group);
  return section;
}

function renderLevelSummary(chars, data = null) {
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
    ['总时间', formatLongDuration(sumSessionsDurationMs(data))],
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

function renderUniqueFilterSummary(uniqueItems, data) {
  const ink = typeof resolveInk === 'function' ? resolveInk(data) : (Number(data?.ink) || 0);
  const stats = [
    ['独特', uniqueItems.length],
    ['墨', ink],
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

function renderLevelView(entry, { imageFilter = null, uniqueOnly = false, levelsOnly = false } = {}) {
  const data = entry.data || {};
  const chars = uniqueOnly ? [] : collectLevelChars(data);
  const uniqueItems = levelsOnly ? [] : collectUniqueCardAppearances(data);

  if (!uniqueOnly) {
    chars.sort((a, b) => {
      const la = getLevelFromCount(a.count);
      const lb = getLevelFromCount(b.count);
      return lb.level - la.level
        || lb.ratio - la.ratio
        || (b.count || 0) - (a.count || 0)
        || String(a.char || a.id || '').localeCompare(String(b.char || b.id || ''), 'zh');
    });
    renderLevelSummary(chars, data);
  } else {
    renderUniqueFilterSummary(uniqueItems, data);
  }

  hideCardPreview();
  el.levelList.replaceChildren();
  document.body.classList.toggle('is-card-face-view', imageFilter === 'card');
  document.body.classList.toggle('is-glyph-image-view', imageFilter === 'glyph');
  document.body.classList.toggle('is-unique-filter-view', uniqueOnly);
  document.body.classList.toggle('is-levels-only-view', levelsOnly);

  if (imageFilter) {
    imageFilterToken += 1;
  }

  if (!uniqueOnly && chars.length === 0 && (levelsOnly || uniqueItems.length === 0)) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = '暂无字记录';
    el.levelList.appendChild(empty);
    el.levelPanel.classList.remove('hidden');
    el.panel.classList.add('hidden');
    updateLevelOverlays();
    return;
  }

  if (uniqueOnly && uniqueItems.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = '暂无独特卡';
    el.levelList.appendChild(empty);
    el.levelPanel.classList.remove('hidden');
    el.panel.classList.add('hidden');
    updateLevelOverlays();
    return;
  }

  const fragment = document.createDocumentFragment();

  if (uniqueOnly) {
    const topBlock = document.createElement('div');
    topBlock.className = 'level-top-block';
    topBlock.appendChild(buildUniqueSection(uniqueItems, {
      ink: typeof resolveInk === 'function' ? resolveInk(data) : (Number(data?.ink) || 0),
    }));
    fragment.appendChild(topBlock);
    el.levelList.appendChild(fragment);
    el.levelPanel.classList.remove('hidden');
    el.panel.classList.add('hidden');
    updateLevelOverlays();
    return;
  }

  const groups = new Map();
  for (const item of chars) {
    const info = getLevelFromCount(item.count);
    if (!groups.has(info.level)) groups.set(info.level, []);
    groups.get(info.level).push({ item, info });
  }

  if (!levelsOnly) {
    if (imageFilter || uniqueItems.length > 0) {
      const topBlock = document.createElement('div');
      topBlock.className = 'level-top-block';

      if (imageFilter) {
        const statsBar = buildImageFilterStatsBar(imageFilter);
        topBlock.appendChild(statsBar);
        fillImageFilterStatsBar(statsBar, chars, imageFilter, imageFilterToken);
      }

      topBlock.appendChild(buildUniqueSection(uniqueItems, {
        imageFilter,
        imageFilterToken,
        ink: typeof resolveInk === 'function' ? resolveInk(data) : (Number(data?.ink) || 0),
      }));

      fragment.appendChild(topBlock);
    } else {
      // 无卡面筛选且尚无 unique 卡：仍显示 UNIQUE + 墨
      const topBlock = document.createElement('div');
      topBlock.className = 'level-top-block';
      topBlock.appendChild(buildUniqueSection([], {
        ink: typeof resolveInk === 'function' ? resolveInk(data) : (Number(data?.ink) || 0),
      }));
      fragment.appendChild(topBlock);
    }
  } else if (imageFilter) {
    const topBlock = document.createElement('div');
    topBlock.className = 'level-top-block';
    const statsBar = buildImageFilterStatsBar(imageFilter);
    topBlock.appendChild(statsBar);
    fillImageFilterStatsBar(statsBar, chars, imageFilter, imageFilterToken);
    fragment.appendChild(topBlock);
  }

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
      const card = createLevelCard(item, info, levelFrameColor(info.level));
      if (imageFilter) applyImageFilterToCard(card, item, imageFilterToken, imageFilter);
      group.appendChild(card);
    }

    section.append(head, group);
    fragment.appendChild(section);
  }

  el.levelList.appendChild(fragment);
  el.levelPanel.classList.remove('hidden');
  el.panel.classList.add('hidden');
  updateLevelOverlays();
}

/** 商店购买写入的 session：进 unique 库，但不进「记录历史」 */
function isShopPurchaseSession(session) {
  if (!session || typeof session !== 'object') return false;
  return session.mode === 'shop-purchase'
    || session.commitSource === 'daily-shop';
}

/** 练字记录（排除商店购买等非练习 session） */
function getPracticeSessions(data) {
  const list = Array.isArray(data?.sessions) ? data.sessions : [];
  return list.filter((session) => !isShopPurchaseSession(session));
}

function getLastPracticeSession(data) {
  const sessions = getPracticeSessions(data);
  if (sessions.length === 0) return null;
  return sessions[sessions.length - 1];
}

function resolveHistorySessionIndex(sessions) {
  if (!sessions.length) return -1;
  if (
    historySessionIndex == null
    || historySessionIndex < 0
    || historySessionIndex >= sessions.length
  ) {
    historySessionIndex = sessions.length - 1;
  }
  return historySessionIndex;
}

function sessionDurationMs(session) {
  if (!session) return 0;
  const fromSummary = Number(session.summary?.totalDurationMs);
  if (Number.isFinite(fromSummary) && fromSummary >= 0) return fromSummary;
  return (session.strokes || []).reduce(
    (sum, stroke) => sum + Math.max(0, Number(stroke?.durationMs) || 0),
    0,
  );
}

function sumSessionsDurationMs(data) {
  return getPracticeSessions(data).reduce((sum, session) => sum + sessionDurationMs(session), 0);
}

/**
 * 总时间：x天x时x分x秒；不足 24 小时则从「时」起显示（不含天）
 */
function formatLongDuration(ms) {
  const totalMs = Math.max(0, Math.floor(Number(ms) || 0));
  const dayMs = 24 * 60 * 60 * 1000;
  const hourMs = 60 * 60 * 1000;
  const minMs = 60 * 1000;

  const days = Math.floor(totalMs / dayMs);
  const hours = Math.floor((totalMs % dayMs) / hourMs);
  const minutes = Math.floor((totalMs % hourMs) / minMs);
  const seconds = Math.floor((totalMs % minMs) / 1000);

  if (days > 0) {
    return `${days}天${hours}时${minutes}分${seconds}秒`;
  }
  return `${hours}时${minutes}分${seconds}秒`;
}

function strokesToOrderedItems(strokes) {
  const catalogById = getCatalogById();
  return (strokes || [])
    .filter((stroke) => stroke?.id)
    .map((stroke, index) => {
      const id = String(stroke.id);
      const catalog = catalogById.get(id);
      const isUnique = typeof strokeHasUniqueCardStyle === 'function'
        ? strokeHasUniqueCardStyle(stroke)
        : Boolean(stroke?.isUnique && stroke?.cardStyle);
      const cardStyle = isUnique && stroke.cardStyle
        ? (typeof normalizeCardStyleRecord === 'function'
          ? normalizeCardStyleRecord(stroke.cardStyle)
          : stroke.cardStyle)
        : null;
      return {
        id,
        char: catalog?.char || id,
        script: normalizeItemScript(catalog?.script),
        order: index + 1,
        durationMs: Math.max(0, Number(stroke.durationMs) || 0),
        isUnique,
        cardStyle,
        ciHao: typeof resolveCiHao === 'function' ? resolveCiHao(stroke) : (Number(stroke.ciHao) || 1),
      };
    });
}

function formatDurationMs(ms) {
  const n = Math.max(0, Number(ms) || 0);
  if (n < 1000) return `${n}ms`;
  const sec = Math.round(n / 100) / 10;
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  const rest = Math.round((sec - min * 60) * 10) / 10;
  return rest > 0 ? `${min}m ${rest}s` : `${min}m`;
}

function renderLastSessionSummary(session, items) {
  const totalDurationMs = sessionDurationMs(session)
    || items.reduce((sum, item) => sum + item.durationMs, 0);
  const uniqueIds = new Set(items.map((item) => item.id));

  const stats = [
    ['次序', items.length],
    ['字', uniqueIds.size],
    ['时长', formatLongDuration(totalDurationMs)],
  ];

  el.levelSummary.replaceChildren();
  for (const [label, value] of stats) {
    const stat = document.createElement('div');
    stat.className = 'level-summary-item';
    const num = document.createElement('span');
    num.className = 'level-summary-value';
    num.textContent = String(value);
    const tag = document.createElement('span');
    tag.className = 'level-summary-label';
    tag.textContent = label;
    stat.append(num, tag);
    el.levelSummary.appendChild(stat);
  }
}

function shiftHistorySession(delta) {
  const entry = fileEntries.find((item) => item.id === activeId);
  if (!entry?.data || levelDisplayMode !== 'lastSession') return;
  const sessions = getPracticeSessions(entry.data);
  if (sessions.length === 0) return;
  const current = resolveHistorySessionIndex(sessions);
  const next = Math.min(sessions.length - 1, Math.max(0, current + delta));
  if (next === current) return;
  historySessionIndex = next;
  renderLastSessionView(entry);
}

function renderLastSessionView(entry) {
  document.body.classList.remove('is-card-face-view', 'is-glyph-image-view', 'is-unique-filter-view', 'is-levels-only-view');
  const data = entry.data || {};
  const sessions = getPracticeSessions(data);
  const index = resolveHistorySessionIndex(sessions);
  const session = index >= 0 ? sessions[index] : null;
  const items = session ? strokesToOrderedItems(session.strokes) : [];

  renderLastSessionSummary(session, items);
  hideCardPreview();
  el.levelList.replaceChildren();

  if (!session || items.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = sessions.length === 0 ? '暂无练习记录' : '该次记录没有字';
    el.levelList.appendChild(empty);
    el.levelPanel.classList.remove('hidden');
    el.panel.classList.add('hidden');
    updateLevelOverlays();
    return;
  }

  const zeroLevel = getLevelFromCount(0);
  const frameColor = levelFrameColor(0);

  const section = document.createElement('section');
  section.className = 'level-section level-section-record';

  const head = document.createElement('div');
  head.className = 'level-section-head';

  const titleRow = document.createElement('div');
  titleRow.className = 'level-section-title-row';

  const title = document.createElement('div');
  title.className = 'level-section-title';
  title.textContent = '记录';

  const nav = document.createElement('div');
  nav.className = 'record-nav';

  const btnPrev = document.createElement('button');
  btnPrev.type = 'button';
  btnPrev.className = 'record-nav-btn';
  btnPrev.setAttribute('aria-label', '更早一次');
  btnPrev.title = '更早一次';
  btnPrev.textContent = '‹';
  btnPrev.disabled = index <= 0;
  btnPrev.addEventListener('click', () => shiftHistorySession(-1));

  const indexLabel = document.createElement('span');
  indexLabel.className = 'record-nav-index';
  indexLabel.textContent = `${index + 1} / ${sessions.length}`;

  const btnNext = document.createElement('button');
  btnNext.type = 'button';
  btnNext.className = 'record-nav-btn';
  btnNext.setAttribute('aria-label', '更新一次');
  btnNext.title = '更新一次';
  btnNext.textContent = '›';
  btnNext.disabled = index >= sessions.length - 1;
  btnNext.addEventListener('click', () => shiftHistorySession(1));

  nav.append(btnPrev, indexLabel, btnNext);
  titleRow.append(title, nav);

  const rule = document.createElement('div');
  rule.className = 'level-section-rule';

  head.append(titleRow, rule);

  const group = document.createElement('div');
  group.className = 'level-group';

  for (const item of items) {
    group.appendChild(createLevelCard(item, zeroLevel, frameColor, { recordMode: true }));
  }

  section.append(head, group);
  el.levelList.appendChild(section);
  el.levelPanel.classList.remove('hidden');
  el.panel.classList.add('hidden');
  updateLevelOverlays();
}

function renderUser(entry) {
  const data = entry.data || {};
  const allChars = collectEffectiveChars(data).filter((item) => (item.count || 0) > 0);
  const chars = filterHistoryItems(allChars);

  chars.sort((a, b) => (b.count || 0) - (a.count || 0)
    || String(a.id || '').localeCompare(String(b.id || '')));

  const shownAppearances = chars.reduce((sum, item) => sum + (item.count || 0), 0);
  const totalAppearances = allChars.reduce((sum, item) => sum + (item.count || 0), 0);
  const rangeLabel = historyFilter === 'week' ? '最近一周' : '全部';
  const sessionCount = Array.isArray(data.sessions) ? data.sessions.length : (data.summary?.sessionCount ?? 0);

  el.meta.innerHTML = [
    `<div>用户：<strong>${data.user || entry.name}</strong>（${entry.file}）</div>`,
    `<div>更新：${formatTime(data.updatedAt)}</div>`,
    `<div>合计：<strong>${allChars.length}</strong> 字 / <strong>${totalAppearances}</strong> 次 / <strong>${sessionCount}</strong> 轮（chars+sessions）</div>`,
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
  historySessionIndex = null;
  renderFileList();
  setHint(`正在读取 ${entry.file} …`);

  try {
    // 刷新时重新读盘：清掉缓存再读
    entry.data = undefined;
    await readEntryData(entry);
    saveActiveUserId(id);
    document.body.classList.add('has-user-data');
    updateCardPreviewSlot();
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
  updateCardPreviewSlot();
  await clearDirHandle();
  el.fileList.classList.add('hidden');
  el.panel.classList.add('hidden');
  el.levelPanel.classList.add('hidden');
  el.settingsPanel?.classList.add('hidden');
  el.shopPanel?.classList.add('hidden');
  el.inkHistoryPanel?.classList.add('hidden');
  el.btnRefresh.hidden = true;
  el.btnDisconnect.hidden = true;
  el.btnConnect.textContent = '连接 local';
  stopShopCountdown();
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
      const raw = JSON.parse(text);
      validateUserData(raw);
      const id = raw.user || raw.u
        || (isUserJsonName(file.name) ? userIdFromFile(file.name) : file.name.replace(/\.json$/i, ''));
      const data = typeof normalizeUserStats === 'function'
        ? normalizeUserStats(raw, id)
        : raw;
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
  const savedActive = loadActiveUserId();
  const preferred = fileEntries.find((item) => item.id === savedActive) || fileEntries[0];
  await openEntry(preferred.id);
  if (errors.length) {
    setHint(`已加载 ${fileEntries.length} 个；部分失败：${errors.join('；')}`, true);
  }
}

async function tryApplyCachedUserData() {
  const cached = typeof consumeCachedUserData === 'function' ? consumeCachedUserData() : null;
  if (!cached?.data) return false;

  const userId = cached.userId || USER_MERGE_DEFAULT_USER_ID;
  const file = userStatsFileName(userId);
  let entry = fileEntries.find((item) => item.id === userId);

  if (entry) {
    entry.data = typeof normalizeUserStats === 'function'
      ? normalizeUserStats(cached.data, userId)
      : cached.data;
    entry.file = file;
  } else {
    entry = {
      id: userId,
      file,
      name: userId,
      data: typeof normalizeUserStats === 'function'
        ? normalizeUserStats(cached.data, userId)
        : cached.data,
    };
    fileEntries.push(entry);
    fileEntries.sort((a, b) => a.file.localeCompare(b.file, 'en'));
  }

  activeId = userId;
  saveActiveUserId(userId);
  document.body.classList.add('has-user-data');
  el.btnRefresh.hidden = false;
  el.btnDisconnect.hidden = false;
  el.btnConnect.textContent = '重新连接';
  renderFileList();
  updateCardPreviewSlot();
  renderActiveView(entry);
  setHint(`已从本轮保存加载 ${file}（连接 local 可刷新磁盘数据）`);
  setView(currentView);
  return true;
}

function applyInitialViewFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const viewParam = params.get('view');
  if (viewParam === 'stats' || viewParam === 'level') {
    currentView = viewParam;
  }
  const modeParam = params.get('mode');
  if (modeParam === 'last') levelDisplayMode = 'lastSession';
  else if (modeParam === 'unique') levelDisplayMode = 'unique';
  else if (modeParam === 'levels') levelDisplayMode = 'levels';
  else if (modeParam === 'ink') levelDisplayMode = 'inkHistory';
  else if (modeParam === 'card') levelDisplayMode = 'cardFace';
  else if (modeParam === 'glyph') levelDisplayMode = 'glyphImage';
  else if (modeParam === 'shop') levelDisplayMode = 'shop';
  else if (modeParam === 'settings') levelDisplayMode = 'settings';
}

function applyLevelNavUI() {
  const modes = [
    [el.levelNavOverview, 'overview'],
    [el.levelNavUnique, 'unique'],
    [el.levelNavLevels, 'levels'],
    [el.levelNavLast, 'lastSession'],
    [el.levelNavInk, 'inkHistory'],
    [el.levelNavCard, 'cardFace'],
    [el.levelNavGlyph, 'glyphImage'],
    [el.levelNavShop, 'shop'],
    [el.levelNavSettings, 'settings'],
  ];
  for (const [btn, mode] of modes) {
    const active = levelDisplayMode === mode;
    btn?.classList.toggle('is-active', active);
    btn?.setAttribute('aria-selected', active ? 'true' : 'false');
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
    const allowed = await ensurePermission(dirHandle, 'readwrite');
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

async function boot() {
  applyInitialViewFromUrl();
  await tryApplyCachedUserData();
  await tryRestoreDirectory();
}

function init() {
  cardSfxVolume = loadCardSfxVolume();
  syncSfxVolumeUI();
  void prefetchCardSfxData();
  // 任意点击/按键时创建并 resume AudioContext
  const armSfxUnlock = () => unlockCardHoverSfx();
  document.addEventListener('pointerdown', armSfxUnlock, { capture: true, passive: true });
  document.addEventListener('keydown', armSfxUnlock, { capture: true });

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
  el.levelNavOverview?.addEventListener('click', () => setLevelDisplayMode('overview'));
  el.levelNavUnique?.addEventListener('click', () => setLevelDisplayMode('unique'));
  el.levelNavLevels?.addEventListener('click', () => setLevelDisplayMode('levels'));
  el.levelNavLast?.addEventListener('click', () => setLevelDisplayMode('lastSession'));
  el.levelNavInk?.addEventListener('click', () => setLevelDisplayMode('inkHistory'));
  el.inkHistoryHidePractice?.addEventListener('change', () => {
    inkHistoryHidePracticeDrops = Boolean(el.inkHistoryHidePractice.checked);
    const entry = fileEntries.find((item) => item.id === activeId);
    if (levelDisplayMode === 'inkHistory' && entry) renderInkHistoryView(entry);
  });
  el.levelNavCard?.addEventListener('click', () => setLevelDisplayMode('cardFace'));
  el.levelNavGlyph?.addEventListener('click', () => setLevelDisplayMode('glyphImage'));
  el.levelNavShop?.addEventListener('click', () => setLevelDisplayMode('shop'));
  el.levelNavSettings?.addEventListener('click', () => setLevelDisplayMode('settings'));
  el.sfxVolume?.addEventListener('input', () => {
    saveCardSfxVolume(el.sfxVolume.value);
    syncSfxVolumeUI();
  });
  el.sfxVolume?.addEventListener('change', () => {
    unlockCardHoverSfx();
    playCardHoverSfx();
  });
  el.btnCardScheme?.addEventListener('click', (event) => {
    event.stopPropagation();
    const open = el.cardSchemeMenu?.classList.contains('hidden');
    setCardSchemeMenuOpen(Boolean(open));
  });
  el.btnCardBase?.addEventListener('click', (event) => {
    event.stopPropagation();
    const open = el.cardBaseMenu?.classList.contains('hidden');
    setCardBaseMenuOpen(Boolean(open));
  });
  el.btnCardModifier?.addEventListener('click', (event) => {
    event.stopPropagation();
    const open = el.cardModifierMenu?.classList.contains('hidden');
    setCardModifierMenuOpen(Boolean(open));
  });
  el.btnCardInject?.addEventListener('click', (event) => {
    event.stopPropagation();
    openUniqueInjectDialog();
  });
  el.btnCardOverrideAll?.addEventListener('click', (event) => {
    event.stopPropagation();
    setCardStyleOverrideAll(!cardStyleOverrideAll);
  });
  el.btnDismantleMode?.addEventListener('click', (event) => {
    event.stopPropagation();
    if (dismantleMode) {
      setDismantleMode(false);
      return;
    }
    if (levelDisplayMode !== 'overview') setLevelDisplayMode('overview');
    setDismantleMode(true);
  });
  el.btnDismantleConfirm?.addEventListener('click', (event) => {
    event.stopPropagation();
    void confirmDismantleSelected();
  });
  el.uniqueInjectCharFilter?.addEventListener('input', () => {
    rebuildUniqueInjectCharSelect(el.uniqueInjectCharFilter.value);
    previewUniqueInjectSelection();
  });
  el.uniqueInjectChar?.addEventListener('change', previewUniqueInjectSelection);
  el.uniqueInjectScheme?.addEventListener('change', previewUniqueInjectSelection);
  el.uniqueInjectBase?.addEventListener('change', previewUniqueInjectSelection);
  el.uniqueInjectModifier?.addEventListener('change', previewUniqueInjectSelection);
  el.uniqueInjectSubmit?.addEventListener('click', (event) => {
    event.preventDefault();
    void submitUniqueInject();
  });
  el.uniqueInjectDialog?.addEventListener('close', () => {
    setUniqueInjectStatus('');
    hideCardPreview();
    applyActiveCardStyleToPreview();
  });
  document.addEventListener('click', (event) => {
    if (!el.cardStyleTools?.contains(event.target)) closeCardStyleMenus();
  });

  injectCardStyleSheet();
  applyCardStyleToolsUI();
  applyLevelNavUI();

  el.btnFallback.addEventListener('click', () => el.fileInput.click());
  el.fileInput.addEventListener('change', () => {
    if (el.fileInput.files && el.fileInput.files.length > 0) {
      ingestManualFiles(el.fileInput.files);
    }
  });

  updateHistoryFilterUI();
  document.body.classList.toggle('is-level-view', currentView === 'level');
  updateCardPreviewSlot();

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

  void boot();
}

init();
