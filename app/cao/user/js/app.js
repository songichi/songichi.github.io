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
  levelNavRecognize: document.getElementById('level-nav-recognize'),
  levelNavSort: document.getElementById('level-nav-sort'),
  levelNavLast: document.getElementById('level-nav-last'),
  levelNavInk: document.getElementById('level-nav-ink'),
  levelNavCard: document.getElementById('level-nav-card'),
  levelNavGlyph: document.getElementById('level-nav-glyph'),
  levelNavShop: document.getElementById('level-nav-shop'),
  levelNavAtlas: document.getElementById('level-nav-atlas'),
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
  btnUnicodeCheck: document.getElementById('btn-unicode-check'),
  unicodeCheckResult: document.getElementById('unicode-check-result'),
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
  pityTools: document.getElementById('pity-tools'),
  btnPityDiamond: document.getElementById('btn-pity-diamond'),
  pityDiamondLabel: document.getElementById('pity-diamond-label'),
  pityClaimOverlay: document.getElementById('pity-claim-overlay'),
  pityClaimCardSlot: document.getElementById('pity-claim-card-slot'),
  btnPityClaimClose: document.getElementById('btn-pity-claim-close'),
  uniqueInjectDialog: document.getElementById('unique-inject-dialog'),
  uniqueInjectForm: document.getElementById('unique-inject-form'),
  uniqueInjectCharFilter: document.getElementById('unique-inject-char-filter'),
  uniqueInjectChar: document.getElementById('unique-inject-char'),
  uniqueInjectScheme: document.getElementById('unique-inject-scheme'),
  uniqueInjectBase: document.getElementById('unique-inject-base'),
  uniqueInjectModifier: document.getElementById('unique-inject-modifier'),
  uniqueInjectStatus: document.getElementById('unique-inject-status'),
  uniqueInjectSubmit: document.getElementById('unique-inject-submit'),
  uniquesMismatchFlag: document.getElementById('uniques-mismatch-flag'),
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
/** 等级子视图：overview | unique | levels | recognize | sort | lastSession | inkHistory | cardFace | glyphImage | shop | atlas | settings */
let levelDisplayMode = 'overview';
/** 排序方式子选项：joined = 加入时间（字库顺序），recency = 练习顺序 */
let sortByMode = 'joined';
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
  document.body.classList.remove(
    'is-card-face-view',
    'is-glyph-image-view',
    'is-unique-filter-view',
    'is-levels-only-view',
    'is-atlas-view',
  );
  el.levelPanel?.classList.add('hidden');
  el.panel?.classList.add('hidden');
  el.shopPanel?.classList.add('hidden');
  el.inkHistoryPanel?.classList.add('hidden');
  syncSfxVolumeUI();
  el.settingsPanel?.classList.remove('hidden');
  updateLevelOverlays();
}

function expectedUnicodeFromChar(char) {
  const cp = typeof charToCodePoint === 'function'
    ? charToCodePoint(char)
    : (String(char || '').codePointAt(0) || 0);
  if (!cp) return '';
  return typeof formatUnicodeLabel === 'function'
    ? formatUnicodeLabel(cp)
    : `U+${cp.toString(16).toUpperCase()}`;
}

function parseCodePointFromUnicodeLabel(unicode) {
  const m = String(unicode || '').trim().match(/^U\+([0-9A-Fa-f]{4,6})$/);
  if (!m) return 0;
  return parseInt(m[1], 16) || 0;
}

function parseCode5FromZiId(id) {
  const m = String(id || '').match(/^[a-z]\.([0-9A-Fa-f]{5})\.\d{2}$/i);
  return m ? m[1].toUpperCase() : '';
}

/** 收集用户 JSON 中出现过的 zi id → 来源标记 */
function collectUserZiIdRefs(data) {
  const refs = new Map();
  const add = (id, source) => {
    const key = String(id || '').trim();
    if (!key) return;
    if (!refs.has(key)) refs.set(key, new Set());
    refs.get(key).add(source);
  };

  for (const item of iterateUserChars(data)) {
    add(item.id, 'chars');
  }

  const sessions = Array.isArray(data?.sessions) ? data.sessions : [];
  sessions.forEach((session, si) => {
    (session?.strokes || []).forEach((stroke, ti) => {
      if (stroke?.id) add(stroke.id, `sessions[${si}].strokes[${ti}]`);
    });
  });

  for (const u of data?.uniques || []) {
    add(u?.id || u?.ziId, 'uniques');
  }
  for (const claim of getUniquePityClaims(data)) {
    add(claim?.id || claim?.ziId, 'uniquePityClaims');
  }
  const pending = getUniquePityPending(data);
  if (pending?.id) add(pending.id, 'uniquePityPending');

  return refs;
}

/** 直接扫描 zi-catalog-cao.js 的 DEFAULT_ZI_CAO（含可选 kai） */
function getCatalogZiGroupsForUnicodeCheck() {
  const groups = [];
  if (typeof DEFAULT_ZI_CAO !== 'undefined' && Array.isArray(DEFAULT_ZI_CAO)) {
    groups.push({ label: 'cao', list: DEFAULT_ZI_CAO });
  }
  if (typeof DEFAULT_ZI_KAI !== 'undefined' && Array.isArray(DEFAULT_ZI_KAI)) {
    groups.push({ label: 'kai', list: DEFAULT_ZI_KAI });
  }
  return groups;
}

function checkCatalogUnicodeConsistency() {
  const issues = [];
  const groups = getCatalogZiGroupsForUnicodeCheck();
  if (!groups.length) {
    issues.push({
      kind: 'catalog',
      id: '—',
      detail: '未加载 DEFAULT_ZI_CAO（请确认 zi.js / zi-catalog-cao.js 已引入）',
    });
    return issues;
  }

  for (const { label, list } of groups) {
    list.forEach((zi, index) => {
      const char = zi?.char || '';
      const id = zi?.id || '—';
      const row = `${label}#${index + 1}`;
      if (!char) {
        issues.push({ kind: 'catalog', id, detail: `${row} 缺少主字 char` });
        return;
      }

      const expectCp = typeof charToCodePoint === 'function'
        ? charToCodePoint(char)
        : (char.codePointAt(0) || 0);
      const expectUnicode = expectedUnicodeFromChar(char);
      const expectCode5 = typeof formatCodePoint5 === 'function'
        ? formatCodePoint5(expectCp)
        : expectCp.toString(16).toUpperCase().padStart(5, '0');

      const unicodeCp = parseCodePointFromUnicodeLabel(zi.unicode);
      if (zi.unicode && unicodeCp && unicodeCp !== expectCp) {
        const wrongChar = String.fromCodePoint(unicodeCp);
        issues.push({
          kind: 'catalog',
          id,
          detail: `${row}「${char}」unicode ${zi.unicode} ≠ ${expectUnicode}（写成了「${wrongChar}」）`,
        });
      } else if (!zi.unicode) {
        issues.push({
          kind: 'catalog',
          id,
          detail: `${row}「${char}」缺少 unicode（应为 ${expectUnicode}）`,
        });
      }

      if (zi.codePoint && Number(zi.codePoint) !== expectCp) {
        issues.push({
          kind: 'catalog',
          id,
          detail: `${row}「${char}」codePoint ${zi.codePoint} ≠ ${expectCp}`,
        });
      }

      const idCode5 = parseCode5FromZiId(zi.id);
      if (zi.id && idCode5 && idCode5 !== expectCode5) {
        issues.push({
          kind: 'catalog',
          id: zi.id,
          detail: `${row}「${char}」id 码位段 ${idCode5} ≠ 字形 ${expectCode5}`,
        });
      }
    });
  }
  return issues;
}

function checkUserCatalogMatch(data) {
  const issues = [];
  if (!data) {
    issues.push({ kind: 'user', id: '—', detail: '未加载用户数据' });
    return issues;
  }
  const catalogById = getCatalogById();
  const refs = collectUserZiIdRefs(data);
  for (const [id, sources] of refs) {
    const entry = catalogById.get(id);
    if (!entry) {
      issues.push({
        kind: 'user',
        id,
        detail: `用户有记录，字库无此 id（${[...sources].slice(0, 3).join('、')}${sources.size > 3 ? '…' : ''}）`,
      });
      continue;
    }
    const expectUnicode = expectedUnicodeFromChar(entry.char);
    const unicodeCp = parseCodePointFromUnicodeLabel(entry.unicode);
    const expectCp = typeof charToCodePoint === 'function'
      ? charToCodePoint(entry.char)
      : (entry.char.codePointAt(0) || 0);
    if (entry.unicode && unicodeCp && unicodeCp !== expectCp) {
      issues.push({
        kind: 'user',
        id,
        detail: `已练「${entry.char}」：字库 unicode 仍不一致（${entry.unicode} / 应为 ${expectUnicode}）；id 若未变则练习数据一般仍可保留`,
      });
    }
  }
  return issues;
}

function countCatalogZiEntries() {
  return getCatalogZiGroupsForUnicodeCheck().reduce((sum, g) => sum + (g.list?.length || 0), 0);
}

function runUnicodeConsistencyCheck() {
  const entry = fileEntries.find((item) => item.id === activeId);
  const catalogIssues = checkCatalogUnicodeConsistency();
  const userIssues = checkUserCatalogMatch(entry?.data);
  const issues = catalogIssues.concat(userIssues);
  renderUnicodeCheckResult(issues, {
    catalogCount: countCatalogZiEntries(),
    catalogIssueCount: catalogIssues.length,
    userIdCount: entry?.data ? collectUserZiIdRefs(entry.data).size : 0,
    userIssueCount: userIssues.length,
    hasUser: Boolean(entry?.data),
  });
}

function renderUnicodeCheckResult(issues, summary) {
  const box = el.unicodeCheckResult;
  if (!box) return;
  box.classList.remove('hidden');
  box.replaceChildren();

  const head = document.createElement('p');
  head.className = 'settings-check-summary';
  if (!issues.length) {
    head.classList.add('is-ok');
    head.textContent = summary.hasUser
      ? `通过：zi-catalog 共 ${summary.catalogCount} 条字↔unicode 均正确；用户 ${summary.userIdCount} 个 id 均可匹配。`
      : `通过：zi-catalog 共 ${summary.catalogCount} 条字↔unicode 均正确（未加载用户，跳过用户对账）。`;
  } else {
    head.classList.add('is-bad');
    head.textContent = `发现 ${issues.length} 处问题（字库 ${summary.catalogIssueCount} / 用户 ${summary.userIssueCount}；已扫 ${summary.catalogCount} 条）`;
  }
  box.appendChild(head);

  if (!issues.length) return;

  const list = document.createElement('ul');
  list.className = 'settings-check-list';
  for (const issue of issues) {
    const li = document.createElement('li');
    li.className = `settings-check-item is-${issue.kind}`;
    const tag = document.createElement('span');
    tag.className = 'settings-check-tag';
    tag.textContent = issue.kind === 'catalog' ? '字库' : '用户';
    const idEl = document.createElement('code');
    idEl.className = 'settings-check-id';
    idEl.textContent = issue.id;
    const detail = document.createElement('span');
    detail.className = 'settings-check-detail';
    detail.textContent = issue.detail;
    li.append(tag, idEl, detail);
    list.appendChild(li);
  }
  box.appendChild(list);
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
  document.body.classList.remove(
    'is-card-face-view',
    'is-glyph-image-view',
    'is-unique-filter-view',
    'is-levels-only-view',
    'is-atlas-view',
  );
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
  document.body.classList.remove(
    'is-card-face-view',
    'is-glyph-image-view',
    'is-unique-filter-view',
    'is-levels-only-view',
    'is-atlas-view',
  );
  el.levelPanel?.classList.add('hidden');
  el.panel?.classList.add('hidden');
  el.settingsPanel?.classList.add('hidden');
  el.inkHistoryPanel?.classList.add('hidden');
  el.shopPanel?.classList.remove('hidden');
  updateLevelOverlays();
  startShopCountdown();
  void ensureAndRenderShop();
}

/** 图鉴预览用「心」字（草体优先） */
function resolveAtlasHeartZi() {
  const entries = typeof getLibraryEntries === 'function' ? getLibraryEntries() : [];
  let found = null;
  for (const entry of entries) {
    if (entry?.char !== '心') continue;
    if (normalizeItemScript(entry.script) === 'cao') return entry;
    if (!found) found = entry;
  }
  return found || { id: '', char: '心', script: 'cao' };
}

/**
 * 图鉴格子对应的预览样式
 * - scheme：仅该配色
 * - base：默认配色 + 该底纹
 * - modifier：默认配色 + 默认底纹（库中第一条）+ 该修饰
 */
function buildAtlasPreviewCardStyle(kind, styleId) {
  const defaultScheme = typeof CARD_DEFAULT_COLOR_SCHEME_ID !== 'undefined'
    ? CARD_DEFAULT_COLOR_SCHEME_ID
    : DEFAULT_COLOR_SCHEME_ID;
  const defaultBaseId = (CARD_BASE_LIBRARY || [])[0]?.id || null;
  let colorSchemeId = defaultScheme;
  let cardBase = null;
  let cardModifier = null;

  if (kind === 'scheme') {
    colorSchemeId = styleId;
  } else if (kind === 'base') {
    cardBase = styleId;
  } else if (kind === 'modifier') {
    cardBase = defaultBaseId;
    cardModifier = styleId;
  }

  if (typeof buildCardStyleRecord === 'function') {
    return buildCardStyleRecord(colorSchemeId, null, cardBase, cardModifier);
  }
  return {
    colorSchemeId,
    decorationId: null,
    cardBase,
    cardModifier,
    tags: [],
  };
}

function createAtlasStyleCard(kind, entry) {
  const heart = resolveAtlasHeartZi();
  const script = normalizeItemScript(heart.script);
  const rawStyle = buildAtlasPreviewCardStyle(kind, entry.id);
  const paintStyle = withDefaultUniqueColorScheme(
    typeof normalizeCardStyleRecord === 'function'
      ? normalizeCardStyleRecord(rawStyle)
      : rawStyle,
  );

  const card = document.createElement('div');
  card.className = 'level-card atlas-style-card';
  card.dataset.atlasKind = kind;
  card.dataset.atlasId = String(entry.id || '');

  const frame = document.createElement('div');
  frame.className = `level-frame atlas-style-frame script-${script}`;
  if (typeof applyCardStyleToElement === 'function') {
    applyCardStyleToElement(frame, paintStyle);
  } else {
    const scheme = typeof getColorSchemeById === 'function'
      ? getColorSchemeById(paintStyle.colorSchemeId)
      : null;
    const color = scheme?.secondaryColor || levelFrameColor(1);
    frame.style.background = color;
    frame.style.borderColor = color;
  }
  if (paintStyle?.cardModifier) {
    applyCardModifierToUniqueFrame(frame, paintStyle.cardModifier);
  }

  const glyph = document.createElement('span');
  glyph.className = 'char-glyph atlas-style-name';
  glyph.textContent = entry.name || entry.id || '—';
  frame.appendChild(glyph);
  card.appendChild(frame);

  const uniquePreview = { cardStyle: paintStyle };
  setKeyboardSelectRingColor(card, paintStyle);
  levelCardPreviewByEl.set(card, {
    char: heart.char || '心',
    script,
    id: heart.id || '',
    uniquePreview,
  });

  card.addEventListener('mouseenter', () => {
    onLevelCardEnter(heart.char || '心', script, heart.id || '', uniquePreview);
  });
  card.addEventListener('mouseleave', onLevelCardLeave);
  card.addEventListener('click', (event) => {
    onLevelCardKeyboardSelectClick(card, event);
  });

  return card;
}

function buildAtlasSection(titleText, kind, entries) {
  const section = document.createElement('section');
  section.className = 'level-section level-section-atlas';
  section.dataset.atlasKind = kind;

  const head = document.createElement('div');
  head.className = 'level-section-head';

  const title = document.createElement('div');
  title.className = 'level-section-title';
  title.textContent = titleText;

  const rule = document.createElement('div');
  rule.className = 'level-section-rule';
  head.append(title, rule);

  const group = document.createElement('div');
  group.className = 'level-group atlas-style-group';
  for (const entry of entries || []) {
    if (!entry?.id) continue;
    group.appendChild(createAtlasStyleCard(kind, entry));
  }

  section.append(head, group);
  return section;
}

function renderAtlasSummary() {
  const schemes = (CARD_COLOR_SCHEME_LIBRARY || []).length;
  const bases = (CARD_BASE_LIBRARY || []).length;
  const modifiers = (CARD_MODIFIER_LIBRARY || []).length;
  const stats = [
    ['配色', schemes],
    ['底纹', bases],
    ['修饰', modifiers],
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

function renderAtlasView() {
  stopShopCountdown();
  hideCardPreview();
  document.body.classList.remove(
    'is-card-face-view',
    'is-glyph-image-view',
    'is-unique-filter-view',
    'is-levels-only-view',
  );
  document.body.classList.add('is-atlas-view');
  el.settingsPanel?.classList.add('hidden');
  el.shopPanel?.classList.add('hidden');
  el.inkHistoryPanel?.classList.add('hidden');
  el.panel?.classList.add('hidden');
  el.levelPanel?.classList.remove('hidden');

  renderAtlasSummary();
  el.levelList.replaceChildren();

  const fragment = document.createDocumentFragment();
  fragment.appendChild(buildAtlasSection('配色', 'scheme', CARD_COLOR_SCHEME_LIBRARY || []));
  fragment.appendChild(buildAtlasSection('底纹', 'base', CARD_BASE_LIBRARY || []));
  fragment.appendChild(buildAtlasSection('修饰', 'modifier', CARD_MODIFIER_LIBRARY || []));
  el.levelList.appendChild(fragment);
  updateLevelOverlays();
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
/** 空格：键盘逐字选择模式 */
let keyboardSelectMode = false;
let keyboardSelectIndex = 0;
/** @type {HTMLElement | null} 选中字下方操作钮 */
let kbSelectActionsEl = null;
/** @type {WeakMap<Element, { char: string, script: string, id: string, uniquePreview: object|null }>} */
const levelCardPreviewByEl = new WeakMap();
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

/** 卡面 primaryColor；无配色时用默认 cs000 */
function resolveCardPrimaryColor(cardStyle = null) {
  const fallbackId = typeof CARD_DEFAULT_COLOR_SCHEME_ID !== 'undefined'
    ? CARD_DEFAULT_COLOR_SCHEME_ID
    : DEFAULT_COLOR_SCHEME_ID;
  const schemeId = cardStyle?.colorSchemeId || fallbackId;
  const scheme = typeof getColorSchemeById === 'function'
    ? getColorSchemeById(schemeId)
    : null;
  if (scheme?.primaryColor) return scheme.primaryColor;
  const fallback = typeof getColorSchemeById === 'function'
    ? getColorSchemeById(fallbackId)
    : null;
  return fallback?.primaryColor || '#191919';
}

function setKeyboardSelectRingColor(card, cardStyle = null) {
  if (!card) return;
  card.style.setProperty('--kb-select-ring', resolveCardPrimaryColor(cardStyle));
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
  if (data && typeof data === 'object') {
    delete data.uniquesNeedsPersist;
  }
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
    syncUniquesMismatchFlag(entry.data);
    return;
  }
  if (dirHandle && entry.file && typeof writeJsonToDir === 'function') {
    await writeJsonToDir(dirHandle, entry.file, data);
    entry.data = typeof normalizeUserStats === 'function'
      ? normalizeUserStats(data, entry.id)
      : data;
    syncUniquesMismatchFlag(entry.data);
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
  if (typeof appendUniquesFromSession === 'function') {
    appendUniquesFromSession(data, data.sessions.length - 1);
  }
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
    if (isRecognizeSession(session)) continue;
    for (const stroke of session.strokes || []) {
      if (!stroke?.id) continue;
      const id = String(stroke.id);
      byId.set(id, (byId.get(id) || 0) + 1);
    }
  }
  return byId;
}

/** 识字模式 strokes：只计识别数，不计入练字经验 */
function countRecognizeById(data) {
  const byId = new Map();
  for (const session of data?.sessions || []) {
    if (!isRecognizeSession(session)) continue;
    for (const stroke of session.strokes || []) {
      if (!stroke?.id) continue;
      const id = String(stroke.id);
      byId.set(id, (byId.get(id) || 0) + 1);
    }
  }
  return byId;
}

function collectRecognizeChars(data) {
  const counts = countRecognizeById(data);
  const byId = new Map();
  for (const entry of getLibraryEntries()) {
    if (normalizeItemScript(entry?.script) !== 'cao' || !entry?.id) continue;
    byId.set(entry.id, {
      id: entry.id,
      char: entry.char,
      script: 'cao',
      recognizeCount: counts.get(entry.id) || 0,
    });
  }
  const catalogById = getCatalogById();
  for (const [id, count] of counts) {
    if (byId.has(id)) continue;
    const catalog = catalogById.get(id);
    byId.set(id, {
      id,
      char: catalog?.char || id,
      script: normalizeItemScript(catalog?.script),
      recognizeCount: count,
    });
  }
  return [...byId.values()].sort((a, b) => (
    (b.recognizeCount || 0) - (a.recognizeCount || 0)
    || String(a.char || '').localeCompare(String(b.char || ''), 'zh')
  ));
}

/** sessions 内各 id 最早/最晚时间（用 session 起止近似） */
function getSessionTimeBoundsById(data) {
  const firstById = new Map();
  const lastById = new Map();
  for (const session of data?.sessions || []) {
    if (isRecognizeSession(session)) continue;
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

/** 草体字库 id → 加入时间序（越大越新；来自 zi-catalog-cao.js 文件顺序） */
function getCaoCatalogOrderIndex() {
  const map = new Map();
  const list = typeof DEFAULT_ZI_CAO !== 'undefined' && Array.isArray(DEFAULT_ZI_CAO)
    ? DEFAULT_ZI_CAO
    : [];
  list.forEach((zi, index) => {
    const id = zi?.id ? String(zi.id) : '';
    if (id) map.set(id, index);
  });
  return map;
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
  const isAtlas = levelDisplayMode === 'atlas';
  const showStyleTools = showLevel && isActiveTestUser()
    && !isSettings && !isShop && !isInkHistory && !isAtlas;
  const showDismantle = showLevel && !isSettings && !isShop && !isInkHistory && !isAtlas
    && levelDisplayMode !== 'levels'
    && levelDisplayMode !== 'sort'
    && levelDisplayMode !== 'recognize';
  const showPreview = showLevel && !isSettings && !isShop && !isInkHistory;
  el.cardPreviewSlot?.classList.toggle('hidden', !showPreview);
  el.cardStyleTools?.classList.toggle('hidden', !showStyleTools);
  el.dismantleTools?.classList.toggle('hidden', !showDismantle);
  document.body.classList.toggle('has-dismantle-tools', showDismantle);
  document.body.classList.toggle('has-card-style-tools', showStyleTools);
  el.levelNavSlot?.classList.toggle('hidden', !showLevel);
  document.body.classList.toggle('has-level-nav', showLevel);
  document.body.classList.toggle('is-dismantle-mode', showDismantle && dismantleMode);
  document.body.classList.toggle('is-shop-view', showLevel && isShop);
  document.body.classList.toggle('is-atlas-view', showLevel && isAtlas);
  document.body.classList.toggle(
    'is-catalog-sort-view',
    showLevel && levelDisplayMode === 'sort',
  );
  syncPityDiamondUI();
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
  syncKeyboardSelectAfterRender();
  const activeEntry = fileEntries.find((item) => item.id === activeId);
  syncUniquesMismatchFlag(activeEntry?.data);
}

function syncUniquesMismatchFlag(data) {
  const mismatch = Boolean(data)
    && (
      Boolean(data.uniquesMismatch)
      || (typeof uniquesInventoryMatchesHistory === 'function'
        && !uniquesInventoryMatchesHistory(data))
    );
  el.uniquesMismatchFlag?.classList.toggle('hidden', !mismatch);
  el.uniquesMismatchFlag?.setAttribute('aria-hidden', mismatch ? 'false' : 'true');
  document.body.classList.toggle('has-uniques-mismatch', mismatch);
}

function syncDismantleModeButton() {
  if (!el.btnDismantleMode) return;
  el.btnDismantleMode.classList.toggle('is-active', dismantleMode);
  el.btnDismantleMode.setAttribute('aria-pressed', dismantleMode ? 'true' : 'false');
  const label = el.btnDismantleMode.querySelector('.dismantle-switch-label');
  if (label) label.textContent = dismantleMode ? '取消' : '分解';
}

/** 连续未获得 unique 达到此数可领取保底 */
const UNIQUE_PITY_STREAK_THRESHOLD = 32;
/** 写盘触发页面刷新时，用 sessionStorage 恢复中央领取卡 */
const PITY_REVEAL_STORAGE_KEY = 'cao-pity-claim-reveal';

function getUniquePityClaims(data) {
  return Array.isArray(data?.uniquePityClaims) ? data.uniquePityClaims : [];
}

function getUniquePityPending(data) {
  return data?.uniquePityPending && typeof data.uniquePityPending === 'object'
    ? data.uniquePityPending
    : null;
}

function clearPityRevealStorage() {
  try {
    sessionStorage.removeItem(PITY_REVEAL_STORAGE_KEY);
  } catch {
    // ignore
  }
}

function stashPityRevealForReload(item) {
  try {
    sessionStorage.setItem(PITY_REVEAL_STORAGE_KEY, JSON.stringify(item));
  } catch {
    // ignore
  }
}

function readStashedPityReveal() {
  try {
    const raw = sessionStorage.getItem(PITY_REVEAL_STORAGE_KEY);
    if (!raw) return null;
    const item = JSON.parse(raw);
    return item && typeof item === 'object' ? item : null;
  } catch {
    return null;
  }
}

/**
 * 保底就绪时预先掷好待领卡（写入 data.uniquePityPending）
 * 字池与左侧「卡面」一致：仅已有卡面图的字
 * 未就绪则清空 pending
 * @returns {Promise<{ pending: object|null, created: boolean, cleared?: boolean }>}
 */
async function ensureUniquePityPending(data) {
  if (!data || typeof data !== 'object') return { pending: null, created: false };
  const streak = computeUniqueDryStreak(data);
  if (streak < UNIQUE_PITY_STREAK_THRESHOLD) {
    if (data.uniquePityPending) {
      data.uniquePityPending = null;
      return { pending: null, created: false, cleared: true };
    }
    return { pending: null, created: false };
  }

  const existing = getUniquePityPending(data);
  if (existing?.id && existing?.cardStyle) {
    const catalog = getCatalogById().get(String(existing.id));
    const hasFace = await probeCardImageExists(
      catalog?.char || existing.id,
      normalizeItemScript(catalog?.script),
      String(existing.id),
    );
    if (hasFace) return { pending: existing, created: false };
    // 旧 pending 无卡面：作废重掷
    data.uniquePityPending = null;
  }

  const zi = await pickRandomLibraryEntryForPity();
  if (!zi?.id) return { pending: null, created: false };

  const rolled = typeof rollPityUniqueCardStyle === 'function'
    ? rollPityUniqueCardStyle(Math.random)
    : (typeof rollUniqueTraitChecks === 'function' ? rollUniqueTraitChecks(Math.random) : null);
  if (!rolled?.isUnique || !rolled?.cardStyle) return { pending: null, created: false };

  const cardStyle = typeof normalizeCardStyleRecord === 'function'
    ? normalizeCardStyleRecord(rolled.cardStyle)
    : rolled.cardStyle;
  const rolledAt = new Date().toISOString();
  const pending = {
    id: String(zi.id),
    cardStyle,
    rolledAt,
    acquiredAt: rolledAt,
    streakAtClaim: streak,
    ciHao: streak,
    isUnique: true,
    isPityUnique: true,
    isPityPending: true,
  };
  data.uniquePityPending = pending;
  return { pending, created: true };
}

function sessionTimeIso(session) {
  return session?.endedAt || session?.startedAt || null;
}

function estimateStrokeTimeIso(session, strokeIndex) {
  const ms = estimateUniqueAcquiredAt(session, strokeIndex);
  if (Number.isFinite(ms)) return new Date(ms).toISOString();
  return sessionTimeIso(session);
}

/** 最近一次「打断」连续未 unique 的时间：练习 unique 或保底领取 */
function getLastUniqueBreakIso(data) {
  let latest = null;
  for (const claim of getUniquePityClaims(data)) {
    const at = claim?.acquiredAt ? String(claim.acquiredAt) : '';
    if (at && (!latest || at > latest)) latest = at;
  }
  const sessions = getPracticeSessions(data);
  for (const session of sessions) {
    const strokes = session.strokes || [];
    for (let i = 0; i < strokes.length; i += 1) {
      const stroke = strokes[i];
      const isUnique = typeof strokeHasUniqueCardStyle === 'function'
        ? strokeHasUniqueCardStyle(stroke)
        : Boolean(stroke?.isUnique && stroke?.cardStyle);
      if (!isUnique) continue;
      const at = estimateStrokeTimeIso(session, i);
      if (at && (!latest || at > latest)) latest = at;
    }
  }
  return latest;
}

/**
 * 实时计算：最近一次 unique/保底领取之后，连续练习字数（无 unique）
 */
function computeUniqueDryStreak(data) {
  const breakAt = getLastUniqueBreakIso(data);
  const sessions = getPracticeSessions(data);
  let streak = 0;
  for (let si = sessions.length - 1; si >= 0; si -= 1) {
    const session = sessions[si];
    const strokes = session.strokes || [];
    for (let i = strokes.length - 1; i >= 0; i -= 1) {
      const stroke = strokes[i];
      const strokeAt = estimateStrokeTimeIso(session, i);
      if (breakAt && strokeAt && strokeAt <= breakAt) {
        return streak;
      }
      const isUnique = typeof strokeHasUniqueCardStyle === 'function'
        ? strokeHasUniqueCardStyle(stroke)
        : Boolean(stroke?.isUnique && stroke?.cardStyle);
      if (isUnique) return streak;
      if (stroke?.id) streak += 1;
    }
  }
  return streak;
}

function findNearestPracticeSession(sessions, acquiredAt) {
  if (!acquiredAt || !sessions?.length) return null;
  let best = null;
  for (const session of sessions) {
    const t = sessionTimeIso(session);
    if (t && t <= acquiredAt) best = session;
  }
  return best;
}

function findNearestPracticeSessionIndex(sessions, acquiredAt) {
  if (!acquiredAt || !sessions?.length) return -1;
  let best = -1;
  for (let i = 0; i < sessions.length; i += 1) {
    const t = sessionTimeIso(sessions[i]);
    if (t && t <= acquiredAt) best = i;
  }
  return best;
}

/** 与左侧「卡面」一致：已探测到卡面图的字库条目缓存 */
let pityCardFaceCatalogCache = null;
let pityCardFaceCatalogPromise = null;

/** 收集有卡面的字（逻辑同卡面 tab 的 probeCardImageExists） */
async function collectCatalogWithCardFace() {
  if (pityCardFaceCatalogCache) return pityCardFaceCatalogCache;
  if (pityCardFaceCatalogPromise) return pityCardFaceCatalogPromise;

  pityCardFaceCatalogPromise = (async () => {
    const entries = typeof getLibraryEntries === 'function'
      ? getLibraryEntries().filter((zi) => zi?.id && zi?.char)
      : [];
    const out = [];
    const batchSize = 12;
    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize);
      const flags = await Promise.all(
        batch.map((zi) => probeCardImageExists(
          zi.char,
          normalizeItemScript(zi.script),
          zi.id,
        )),
      );
      batch.forEach((zi, index) => {
        if (flags[index]) out.push(zi);
      });
    }
    pityCardFaceCatalogCache = out;
    return out;
  })();

  try {
    return await pityCardFaceCatalogPromise;
  } finally {
    pityCardFaceCatalogPromise = null;
  }
}

/** 保底随机字：仅从已有卡面的字中抽 */
async function pickRandomLibraryEntryForPity() {
  const usable = await collectCatalogWithCardFace();
  if (!usable.length) return null;
  return usable[Math.floor(Math.random() * usable.length)];
}

function syncPityDiamondUI() {
  void syncPityDiamondUIAsync();
}

async function syncPityDiamondUIAsync() {
  const entry = fileEntries.find((item) => item.id === activeId);
  const show = currentView === 'level' && Boolean(entry?.data);
  el.pityTools?.classList.toggle('hidden', !show);
  if (!show) {
    el.btnPityDiamond?.classList.remove('is-ready');
    return;
  }
  const ensured = await ensureUniquePityPending(entry.data);
  const overlayOpen = el.pityClaimOverlay && !el.pityClaimOverlay.classList.contains('hidden');
  if ((ensured.created || ensured.cleared) && !overlayOpen) {
    // 就绪时预先落盘待领卡 / 未就绪清掉；不阻塞 UI
    void writeActiveUserData(entry.data).catch(() => {});
  }
  const streak = computeUniqueDryStreak(entry.data);
  const ready = streak >= UNIQUE_PITY_STREAK_THRESHOLD && Boolean(getUniquePityPending(entry.data));
  el.btnPityDiamond?.classList.toggle('is-ready', ready);
  if (el.pityDiamondLabel) {
    el.pityDiamondLabel.textContent = ready ? '!' : String(streak);
  }
  if (el.btnPityDiamond) {
    el.btnPityDiamond.title = ready
      ? `可领取保底 unique（连续 ${streak} 字未获得）`
      : `连续 ${streak} 字未获得 unique（${UNIQUE_PITY_STREAK_THRESHOLD} 可领取）`;
    el.btnPityDiamond.disabled = false;
  }
}

function closePityClaimOverlay({ obtained = false } = {}) {
  const wasOpen = el.pityClaimOverlay && !el.pityClaimOverlay.classList.contains('hidden');
  el.pityClaimOverlay?.classList.add('hidden');
  el.pityClaimOverlay?.setAttribute('aria-hidden', 'true');
  el.pityClaimCardSlot?.replaceChildren();
  clearPityRevealStorage();
  if (!wasOpen) return;
  const entry = fileEntries.find((item) => item.id === activeId);
  syncPityDiamondUI();
  // 仅真正获得后刷新列表；取消关闭则保留 pending，金刚仍可点
  if (obtained && entry?.data) renderActiveView(entry);
}

function resolvePityFaceColors(cardStyle) {
  const fallbackId = typeof CARD_DEFAULT_COLOR_SCHEME_ID !== 'undefined'
    ? CARD_DEFAULT_COLOR_SCHEME_ID
    : DEFAULT_COLOR_SCHEME_ID;
  const schemeId = cardStyle?.colorSchemeId || fallbackId;
  const scheme = typeof getColorSchemeById === 'function'
    ? (getColorSchemeById(schemeId) || getColorSchemeById(fallbackId))
    : null;
  return {
    primary: scheme?.primaryColor || '#191919',
    secondary: scheme?.secondaryColor || '#848484',
    tertiary: scheme?.tertiaryColor || scheme?.secondaryColor || '#848484',
  };
}

function loadFirstImage(candidates) {
  const list = Array.isArray(candidates) ? candidates : [];
  return new Promise((resolve) => {
    let index = 0;
    const tryNext = () => {
      if (index >= list.length) {
        resolve('');
        return;
      }
      const path = list[index++];
      const probe = new Image();
      probe.onload = () => resolve(path);
      probe.onerror = tryNext;
      probe.src = path;
    };
    tryNext();
  });
}

/** 中央展示 unique 卡面（与右侧预览同结构），不是字 cell */
async function paintPityClaimFace(faceRoot, item) {
  if (!faceRoot || !item) return;
  // 必须用待领卡自身的 cardStyle，勿走 resolveCardStyleForDisplay（测试用户「覆盖」会盖掉）
  const paintStyle = withDefaultUniqueColorScheme(
    typeof normalizeCardStyleRecord === 'function'
      ? normalizeCardStyleRecord(item.cardStyle)
      : item.cardStyle,
  );
  const colors = resolvePityFaceColors(paintStyle);

  faceRoot.classList.add('card-preview', 'is-visible');
  if (typeof applyCardStyleToElement === 'function') {
    applyCardStyleToElement(faceRoot, paintStyle);
  }
  // 显式铺底色（secondary）；配色 class 负责 CSS 变量，这里保证立刻可见
  faceRoot.style.background = colors.secondary;

  const baseEl = faceRoot.querySelector('.card-preview-base');
  const maskEl = faceRoot.querySelector('.card-preview-mask');
  const fallbackEl = faceRoot.querySelector('.card-preview-fallback');
  const modifierEl = faceRoot.querySelector('.card-preview-modifier');

  if (fallbackEl) {
    fallbackEl.textContent = item.char || '?';
    fallbackEl.style.color = colors.primary;
    fallbackEl.classList.remove('hidden');
  }

  // cardBase（tertiary mask）
  if (baseEl) {
    const baseId = paintStyle?.cardBase || null;
    const baseUrl = baseId && typeof getCardBaseImageCandidates === 'function'
      ? await loadFirstImage(getCardBaseImageCandidates(baseId))
      : '';
    if (baseUrl) {
      const quoted = `url("${baseUrl}")`;
      baseEl.style.webkitMaskImage = quoted;
      baseEl.style.maskImage = quoted;
      baseEl.style.backgroundColor = colors.tertiary;
      baseEl.classList.remove('hidden');
      baseEl.setAttribute('aria-hidden', 'false');
    } else {
      baseEl.style.webkitMaskImage = '';
      baseEl.style.maskImage = '';
      baseEl.style.backgroundColor = '';
      baseEl.classList.add('hidden');
      baseEl.setAttribute('aria-hidden', 'true');
    }
  }

  // cardImage mask（primary）
  if (maskEl) {
    const candidates = getCardImageCandidates(item.char, item.script, item.id);
    const maskUrl = await loadFirstImage(candidates);
    if (maskUrl) {
      const quoted = `url("${maskUrl}")`;
      maskEl.style.webkitMaskImage = quoted;
      maskEl.style.maskImage = quoted;
      maskEl.style.backgroundColor = colors.primary;
      maskEl.classList.remove('hidden');
      maskEl.setAttribute('aria-hidden', 'false');
      fallbackEl?.classList.add('hidden');
    } else {
      maskEl.style.webkitMaskImage = '';
      maskEl.style.maskImage = '';
      maskEl.style.backgroundColor = '';
      maskEl.classList.add('hidden');
      maskEl.setAttribute('aria-hidden', 'true');
      fallbackEl?.classList.remove('hidden');
    }
  }

  // modifier sticker
  if (modifierEl) {
    const modId = paintStyle?.cardModifier || null;
    let modUrl = '';
    if (modId && typeof getCardModifierImageCandidates === 'function') {
      modUrl = await loadFirstImage(getCardModifierImageCandidates(modId));
    }
    if (modUrl) {
      modifierEl.src = modUrl;
      modifierEl.classList.remove('hidden');
      modifierEl.setAttribute('aria-hidden', 'false');
    } else {
      modifierEl.removeAttribute('src');
      modifierEl.classList.add('hidden');
      modifierEl.setAttribute('aria-hidden', 'true');
    }
  }
}

function buildPityClaimFaceShell(item) {
  const face = document.createElement('div');
  // 同时挂 card-preview，才能吃到 injectCardStyleSheet 的配色规则
  face.className = 'pity-claim-face card-preview is-visible';
  face.setAttribute('aria-label', `保底 unique：${item?.char || item?.id || ''}`);

  const base = document.createElement('div');
  base.className = 'card-preview-base hidden';
  base.setAttribute('aria-hidden', 'true');

  const mask = document.createElement('div');
  mask.className = 'card-preview-mask hidden';
  mask.setAttribute('aria-hidden', 'true');

  const fallback = document.createElement('span');
  fallback.className = 'card-preview-fallback';
  fallback.textContent = item?.char || '?';

  const modifier = document.createElement('img');
  modifier.className = 'card-preview-modifier hidden';
  modifier.alt = '';
  modifier.setAttribute('aria-hidden', 'true');

  face.append(base, mask, fallback, modifier);
  return face;
}

function buildPityOfferRevealItem(pending, data) {
  if (!pending?.id || !pending?.cardStyle) return null;
  const catalog = getCatalogById().get(String(pending.id));
  const cardStyle = typeof normalizeCardStyleRecord === 'function'
    ? normalizeCardStyleRecord(pending.cardStyle)
    : pending.cardStyle;
  const streakAtClaim = Math.max(
    UNIQUE_PITY_STREAK_THRESHOLD,
    Math.floor(Number(pending.streakAtClaim) || computeUniqueDryStreak(data) || 0),
  );
  return {
    id: String(pending.id),
    char: catalog?.char || pending.id,
    script: normalizeItemScript(catalog?.script),
    cardStyle,
    ciHao: streakAtClaim,
    streakAtClaim,
    isPityUnique: true,
    isPityPending: true,
  };
}

function showPityClaimOverlay(item) {
  if (!el.pityClaimOverlay || !el.pityClaimCardSlot || !item) return;
  el.pityClaimCardSlot.replaceChildren();
  const face = buildPityClaimFaceShell(item);
  el.pityClaimCardSlot.appendChild(face);
  el.pityClaimOverlay.classList.remove('hidden');
  el.pityClaimOverlay.setAttribute('aria-hidden', 'false');
  void paintPityClaimFace(face, item);
}

function restorePityClaimOverlayIfNeeded() {
  const item = readStashedPityReveal();
  if (!item) return false;
  // 仅恢复「待确认获得」的展示；已写入的不要再弹
  if (!item.isPityPending) {
    clearPityRevealStorage();
    return false;
  }
  showPityClaimOverlay(item);
  return true;
}

/** 点钻石：只展示预先掷好的卡面，不写入库存 */
async function openPityClaimOffer() {
  const entry = fileEntries.find((item) => item.id === activeId);
  if (!entry?.data) return;

  const ensured = await ensureUniquePityPending(entry.data);
  if (ensured.created || ensured.cleared) {
    void writeActiveUserData(entry.data).catch(() => {});
  }
  const pending = ensured.pending || getUniquePityPending(entry.data);
  const streak = computeUniqueDryStreak(entry.data);
  if (streak < UNIQUE_PITY_STREAK_THRESHOLD || !pending?.id || !pending?.cardStyle) {
    setHint(
      ensured.pending == null && streak >= UNIQUE_PITY_STREAK_THRESHOLD
        ? '字库中暂无带卡面的字，无法生成保底 unique'
        : `还需连续 ${Math.max(0, UNIQUE_PITY_STREAK_THRESHOLD - streak)} 字未获得 unique`,
      true,
    );
    syncPityDiamondUI();
    return;
  }

  const revealItem = buildPityOfferRevealItem(pending, entry.data);
  if (!revealItem) {
    setHint('保底卡尚未准备好', true);
    return;
  }
  stashPityRevealForReload(revealItem);
  showPityClaimOverlay(revealItem);
  setHint(`保底 unique「${revealItem.char}」待确认，点击获得收入卡库`);
}

/** 点「获得」：此时才写入 upc / uq */
async function confirmPityClaimObtain() {
  const entry = fileEntries.find((item) => item.id === activeId);
  if (!entry?.data) return;

  const pending = getUniquePityPending(entry.data);
  if (!pending?.id || !pending?.cardStyle) {
    setHint('没有待领取的保底卡', true);
    closePityClaimOverlay({ obtained: false });
    return;
  }

  const now = new Date().toISOString();
  const sessions = getPracticeSessions(entry.data);
  const anchor = findNearestPracticeSession(sessions, now);
  const cardStyle = typeof normalizeCardStyleRecord === 'function'
    ? normalizeCardStyleRecord(pending.cardStyle)
    : pending.cardStyle;
  const streakAtClaim = Math.max(
    UNIQUE_PITY_STREAK_THRESHOLD,
    Math.floor(Number(pending.streakAtClaim) || computeUniqueDryStreak(entry.data) || 0),
  );

  const claim = {
    id: String(pending.id),
    cardStyle,
    acquiredAt: now,
    streakAtClaim,
    ciHao: streakAtClaim,
    anchorSessionAt: sessionTimeIso(anchor) || anchor?.startedAt || null,
    isUnique: true,
    isPityUnique: true,
  };

  if (!Array.isArray(entry.data.uniquePityClaims)) entry.data.uniquePityClaims = [];
  entry.data.uniquePityClaims.push(claim);
  const pityIndex = entry.data.uniquePityClaims.length - 1;
  if (typeof appendUniqueFromPityClaim === 'function') {
    appendUniqueFromPityClaim(entry.data, pityIndex);
  }
  entry.data.uniquePityPending = null;
  entry.data.updatedAt = now;

  const catalog = getCatalogById().get(String(claim.id));
  try {
    if (el.btnPityClaimClose) el.btnPityClaimClose.disabled = true;
    await writeActiveUserData(entry.data);
    clearPityRevealStorage();
    closePityClaimOverlay({ obtained: true });
    setHint(`已获得保底 unique：${catalog?.char || claim.id}（次号 ${streakAtClaim}）`);
  } catch (error) {
    entry.data.uniquePityClaims.pop();
    if (typeof removeUniqueInventoryAt === 'function') {
      removeUniqueInventoryAt(entry.data, -1, pityIndex);
    }
    entry.data.uniquePityPending = pending;
    setHint(`获得失败：${error.message || error}`, true);
  } finally {
    if (el.btnPityClaimClose) el.btnPityClaimClose.disabled = false;
    syncPityDiamondUI();
  }
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
  if (typeof removeUniqueInventoryAt === 'function') {
    removeUniqueInventoryAt(data, item.sessionIndex, item.strokeIndex);
  }
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

let todayShopEnsurePromise = null;

/** 当天货架还没有就生成并写入。不切换当前页面。 */
function requestTodayShopCheck() {
  if (!dirHandle) return Promise.resolve(null);
  const day = typeof getShopDayKey === 'function' ? getShopDayKey() : '';
  if (
    day
    && currentShopSession?.day === day
    && Array.isArray(currentShopSession.offers)
    && currentShopSession.offers.length > 0
  ) {
    return Promise.resolve(currentShopSession);
  }
  if (todayShopEnsurePromise) return todayShopEnsurePromise;
  todayShopEnsurePromise = ensureTodayShopSession().finally(() => {
    todayShopEnsurePromise = null;
  });
  return todayShopEnsurePromise;
}

async function ensureTodayShopSession() {
  const token = ++shopEnsureToken;
  if (!dirHandle) return null;
  if (typeof getShopDayKey !== 'function' || typeof generateShopSession !== 'function') return null;

  const day = getShopDayKey();
  if (
    currentShopSession?.day === day
    && Array.isArray(currentShopSession.offers)
    && currentShopSession.offers.length > 0
  ) {
    return currentShopSession;
  }

  let history = shopHistoryCache || await loadShopHistoryFromDisk();
  if (token !== shopEnsureToken) return null;
  shopHistoryCache = history;

  let session = typeof findShopSessionByDay === 'function'
    ? findShopSessionByDay(history, day)
    : null;

  if (!session || !Array.isArray(session.offers) || session.offers.length === 0) {
    // 写盘可能让页面热刷新；先记住当前分类，避免被打回总览以外的页面
    persistLevelDisplayMode(levelDisplayMode);
    const pool = await collectCatalogWithCardPng();
    if (token !== shopEnsureToken) return null;
    if (!pool.length) {
      if (levelDisplayMode === 'shop') setHint('商店：没有找到带 png 卡面的字', true);
      currentShopSession = null;
      return null;
    }
    session = generateShopSession(pool, { day });
    if (!history.sessions) history.sessions = [];
    history.sessions.push(session);
    try {
      await saveShopHistoryToDisk(history);
    } catch (error) {
      if (levelDisplayMode === 'shop') {
        setHint(`商店写入失败：${error.message || error}`, true);
      }
    }
    if (token !== shopEnsureToken) return null;
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
    persistLevelDisplayMode(levelDisplayMode);
    try {
      await saveShopHistoryToDisk(history);
    } catch {
      // ignore patch write failure
    }
  }

  currentShopSession = session;
  return session;
}

async function ensureAndRenderShop() {
  if (levelDisplayMode === 'shop') persistLevelDisplayMode('shop');
  if (!dirHandle) {
    currentShopSession = null;
    renderShopPanel(null);
    return;
  }
  const session = await requestTodayShopCheck();
  if (levelDisplayMode !== 'shop') return;
  el.levelPanel?.classList.add('hidden');
  el.panel?.classList.add('hidden');
  el.settingsPanel?.classList.add('hidden');
  el.inkHistoryPanel?.classList.add('hidden');
  el.shopPanel?.classList.remove('hidden');
  document.body.classList.add('is-shop-view');
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
  if (typeof appendUniquesFromSession === 'function') {
    appendUniquesFromSession(data, data.sessions.length - 1);
  }
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
        const poppedIndex = data.sessions.length - 1;
        data.sessions.pop();
        if (typeof removeUniqueInventoryAt === 'function') {
          removeUniqueInventoryAt(data, poppedIndex, 0);
        }
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
  else if (mode === 'recognize') levelDisplayMode = 'recognize';
  else if (mode === 'sort' || mode === 'catalog' || mode === 'recency') {
    levelDisplayMode = 'sort';
    if (mode === 'catalog') sortByMode = 'joined';
    else if (mode === 'recency') sortByMode = 'recency';
    persistSortByMode(sortByMode);
  }
  else if (mode === 'cardFace') levelDisplayMode = 'cardFace';
  else if (mode === 'glyphImage') levelDisplayMode = 'glyphImage';
  else if (mode === 'shop') levelDisplayMode = 'shop';
  else if (mode === 'atlas') levelDisplayMode = 'atlas';
  else if (mode === 'inkHistory') levelDisplayMode = 'inkHistory';
  else if (mode === 'settings') levelDisplayMode = 'settings';
  else levelDisplayMode = 'overview';
  persistLevelDisplayMode(levelDisplayMode);
  if (prevMode === 'shop' && levelDisplayMode !== 'shop') stopShopCountdown();
  applyLevelNavUI();
  hideCardPreview();
  const entry = fileEntries.find((item) => item.id === activeId);
  if (entry?.data && currentView === 'level') renderActiveView(entry);
  else if (levelDisplayMode === 'settings' && currentView === 'level') renderSettingsView();
  else if (levelDisplayMode === 'shop' && currentView === 'level') renderShopView();
  else if (levelDisplayMode === 'atlas' && currentView === 'level') renderAtlasView();
  else if (levelDisplayMode === 'inkHistory' && currentView === 'level') renderInkHistoryView(entry);
  if (levelDisplayMode === 'overview' && currentView === 'level') {
    void requestTodayShopCheck();
  }
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

  if (currentView !== 'level') {
    setKeyboardSelectMode(false);
    hideCardPreview();
  }

  const entry = fileEntries.find((item) => item.id === activeId);
  if (entry?.data) renderActiveView(entry);
  if (currentView === 'level') void requestTodayShopCheck();
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

/** 北京时间 → xxxx年x月x日 HH:MM */
function formatBeijingDateTime(isoOrMs) {
  if (isoOrMs == null || isoOrMs === '') return '';
  const date = new Date(isoOrMs);
  if (Number.isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;
  const hour = parts.find((p) => p.type === 'hour')?.value;
  const minute = parts.find((p) => p.type === 'minute')?.value;
  if (!year || !month || !day || hour == null || minute == null) return '';
  return `${year}年${month}月${day}日 ${hour}:${minute}`;
}

function sessionCompletedAt(session) {
  return session?.endedAt || session?.startedAt || null;
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
  if (keyboardSelectMode) return;
  if (dismantleMode && dismantleSelection) return;
  playCardHoverSfx();
  cardPreviewHoverAt = Date.now();
  showCardPreview(char, script, id, uniquePreview);
}

function onLevelCardLeave() {
  if (keyboardSelectMode) return;
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
    if (levelDisplayMode === 'atlas') {
      renderAtlasView();
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
    else if (levelDisplayMode === 'recognize') renderRecognizeView(entry);
    else if (levelDisplayMode === 'unique') renderLevelView(entry, { uniqueOnly: true });
    else if (levelDisplayMode === 'levels') renderLevelView(entry, { levelsOnly: true });
    else if (levelDisplayMode === 'sort') {
      renderLevelView(entry, sortByMode === 'recency'
        ? { recencyOrder: true }
        : { catalogOrder: true });
    }
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

function createLevelCard(item, info, color, { recordMode = false, badgeText = null, xpText = null } = {}) {
  const script = normalizeItemScript(item.script);
  const card = document.createElement('div');
  card.className = 'level-card';
  if (recordMode) card.classList.add('is-record');
  if (recordMode && item.isUnique) card.classList.add('is-record-unique');
  if (recordMode && item.isPityUnique) card.classList.add('is-record-pity');
  if (recordMode && item.isPityUnique) card.classList.add('is-record-pity');

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
  // 记录/高光 palette：unique（含保底）额外黑描边
  if (recordMode && item.isUnique) {
    frame.style.borderColor = '#1a1a1a';
    frame.style.borderWidth = '4px';
    frame.style.borderStyle = 'solid';
  }
  if (displayStyle && typeof applyCardStyleToElement === 'function' && !(recordMode && item.isUnique)) {
    applyCardStyleToElement(frame, displayStyle);
  }

  const glyph = document.createElement('span');
  glyph.className = 'char-glyph';
  glyph.textContent = item.char || '—';

  if (!recordMode) {
    const badge = document.createElement('span');
    badge.className = 'level-badge';
    badge.textContent = badgeText != null ? badgeText : `LVL. ${info.level}`;
    frame.append(glyph, badge);
  } else {
    frame.appendChild(glyph);
  }
  if (displayStyle?.cardModifier && !(recordMode && item.isUnique)) {
    applyCardModifierToUniqueFrame(frame, displayStyle.cardModifier);
  }

  if (!recordMode) {
    const track = document.createElement('div');
    track.className = 'level-track';

    const bar = document.createElement('div');
    bar.className = 'level-bar';
    const fill = document.createElement('div');
    fill.className = 'level-bar-fill';
    fill.style.width = `${Math.round(info.ratio * 1000) / 10}%`;
    fill.style.background = accentColor;
    bar.appendChild(fill);

    const xp = document.createElement('div');
    xp.className = 'level-xp';
    xp.textContent = xpText != null
      ? xpText
      : (info.level >= MAX_CHAR_LEVEL
        ? '满级'
        : `${info.xp} / ${info.need}`);

    track.append(bar, xp);
    card.append(frame, track);
  } else {
    card.appendChild(frame);
  }

  const uniquePreview = item.isUnique && item.cardStyle
    ? {
      cardStyle: item.cardStyle,
      acquiredAt: item.acquiredAt ?? null,
      ciHao: typeof resolveCiHao === 'function' ? resolveCiHao(item) : (Number(item.ciHao) || 1),
    }
    : (displayStyle ? { cardStyle: displayStyle } : null);
  // 默认卡 → cs000 primary；有配色则用该配色 primary
  setKeyboardSelectRingColor(card, uniquePreview?.cardStyle || displayStyle || null);
  levelCardPreviewByEl.set(card, {
    char: item.char,
    script,
    id: item.id,
    uniquePreview,
  });

  card.addEventListener('mouseenter', () => {
    onLevelCardEnter(item.char, script, item.id, uniquePreview);
  });
  card.addEventListener('mouseleave', onLevelCardLeave);
  card.addEventListener('click', (event) => {
    onLevelCardKeyboardSelectClick(card, event);
  });

  return card;
}

function collectUniqueCardAppearances(data) {
  if (Array.isArray(data?.uniques)) {
    return enrichUniquesInventoryForUi(data.uniques);
  }
  return collectUniqueCardAppearancesFromHistory(data);
}

/** 将库存条目补全为界面用结构（字 / 体 / 时间戳毫秒） */
function enrichUniquesInventoryForUi(uniques) {
  const catalogById = getCatalogById();
  return (uniques || []).map((item) => {
    const id = String(item?.id || '');
    const catalog = catalogById.get(id);
    let acquiredAt = item?.acquiredAt;
    if (typeof acquiredAt === 'string') {
      const ms = Date.parse(acquiredAt);
      acquiredAt = Number.isFinite(ms) ? ms : null;
    } else if (typeof acquiredAt === 'number' && Number.isFinite(acquiredAt)) {
      // already ms
    } else {
      acquiredAt = null;
    }
    const cardStyle = typeof normalizeCardStyleRecord === 'function'
      ? normalizeCardStyleRecord(item?.cardStyle)
      : item?.cardStyle;
    return {
      id,
      char: catalog?.char || id,
      script: normalizeItemScript(catalog?.script),
      cardStyle,
      acquiredAt,
      ciHao: typeof resolveCiHao === 'function'
        ? resolveCiHao(item)
        : (Math.max(1, Math.floor(Number(item?.ciHao) || 1))),
      sessionIndex: Math.floor(Number(item?.sessionIndex)),
      strokeIndex: Math.floor(Number(item?.strokeIndex)),
      starred: Boolean(item?.starred),
      ...(item?.isPityUnique
        ? { isPityUnique: true, streakAtClaim: item.streakAtClaim }
        : {}),
    };
  });
}

/** 仅从 sessions / upc 历史拼装（对账与无库存兜底） */
function collectUniqueCardAppearancesFromHistory(data) {
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

  const pityClaims = getUniquePityClaims(data);
  for (let pityIndex = 0; pityIndex < pityClaims.length; pityIndex += 1) {
    const claim = pityClaims[pityIndex];
    if (!claim?.id || !claim?.cardStyle) continue;
    const id = String(claim.id);
    const catalog = catalogById.get(id);
    const cardStyle = typeof normalizeCardStyleRecord === 'function'
      ? normalizeCardStyleRecord(claim.cardStyle)
      : claim.cardStyle;
    items.push({
      id,
      char: catalog?.char || id,
      script: normalizeItemScript(catalog?.script),
      cardStyle,
      acquiredAt: claim.acquiredAt ? Date.parse(claim.acquiredAt) : null,
      ciHao: typeof resolveCiHao === 'function' ? resolveCiHao(claim) : (Number(claim.ciHao) || 1),
      sessionIndex: -1,
      strokeIndex: pityIndex,
      isPityUnique: true,
      streakAtClaim: claim.streakAtClaim,
    });
  }
  return items;
}

function sortUniqueItemsByAcquiredAt(items) {
  return [...(items || [])].sort((a, b) => {
    const ta = Number(a?.acquiredAt);
    const tb = Number(b?.acquiredAt);
    const aOk = Number.isFinite(ta);
    const bOk = Number.isFinite(tb);
    if (aOk && bOk && ta !== tb) return ta - tb;
    if (aOk && !bOk) return -1;
    if (!aOk && bOk) return 1;
    const sa = Number(a?.sessionIndex);
    const sb = Number(b?.sessionIndex);
    if (Number.isFinite(sa) && Number.isFinite(sb) && sa !== sb) return sa - sb;
    return (Number(a?.strokeIndex) || 0) - (Number(b?.strokeIndex) || 0);
  });
}

/** 最近获得的 unique（新→旧），默认取 5 张 */
function collectNewestUniqueItems(items, limit = 5) {
  const n = Math.max(0, Math.floor(Number(limit) || 0));
  if (n <= 0) return [];
  return sortUniqueItemsByAcquiredAt(items).reverse().slice(0, n);
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
  if (item.starred) card.classList.add('is-starred');
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

  const uniquePreview = {
    // 预览词条保持原样（无配色不伪造成「默认」）；格子上色用 paintStyle
    cardStyle: displayStyle || paintStyle,
    acquiredAt: item.acquiredAt,
    ciHao: typeof resolveCiHao === 'function' ? resolveCiHao(item) : (Number(item.ciHao) || 1),
  };
  setKeyboardSelectRingColor(card, paintStyle);
  levelCardPreviewByEl.set(card, {
    char: item.char,
    script,
    id: item.id,
    uniquePreview,
  });

  card.addEventListener('click', (event) => {
    if (dismantleMode) {
      if (item.isPityUnique || item.sessionIndex < 0) return;
      event.preventDefault();
      event.stopPropagation();
      toggleDismantleSelection(item);
      return;
    }
    onLevelCardKeyboardSelectClick(card, event);
  });

  card.addEventListener('mouseenter', () => {
    // 已选中某张卡时，右侧只钉住选中卡，不再因 hover 切换
    if (dismantleMode && dismantleSelection) return;
    onLevelCardEnter(item.char, script, item.id, uniquePreview);
  });
  card.addEventListener('mouseleave', onLevelCardLeave);

  return card;
}

/** 独特栏按分解价值分栏（高→低） */
const UNIQUE_AFFIX_TIER_ORDER = [
  { key: '111', label: '配色 · 底纹 · 修饰', ink: 1600 },
  { key: '011', label: '底纹 · 修饰', ink: 400 },
  { key: '101', label: '修饰 · 配色', ink: 200 },
  { key: '110', label: '底纹 · 配色', ink: 160 },
  { key: '001', label: '修饰', ink: 50 },
  { key: '010', label: '底纹', ink: 40 },
  { key: '100', label: '配色', ink: 20 },
];

function uniqueAffixKey(cardStyle) {
  if (typeof getUniqueAffixFlags === 'function') {
    return getUniqueAffixFlags(cardStyle).key;
  }
  const ink = typeof computeUniqueDismantleInk === 'function'
    ? computeUniqueDismantleInk(cardStyle)
    : 0;
  const byInk = UNIQUE_AFFIX_TIER_ORDER.find((tier) => tier.ink === ink);
  return byInk?.key || '000';
}

function groupUniqueItemsByAffixTier(uniqueItems) {
  const buckets = new Map(UNIQUE_AFFIX_TIER_ORDER.map((tier) => [tier.key, []]));
  const other = [];
  for (const item of uniqueItems || []) {
    const key = uniqueAffixKey(item?.cardStyle);
    if (buckets.has(key)) buckets.get(key).push(item);
    else other.push(item);
  }
  const tiers = [];
  for (const tier of UNIQUE_AFFIX_TIER_ORDER) {
    const items = buckets.get(tier.key) || [];
    if (!items.length) continue;
    tiers.push({ ...tier, items });
  }
  if (other.length) {
    tiers.push({ key: '000', label: '其他', ink: 0, items: other });
  }
  return tiers;
}

function appendUniqueCards(group, items, imageFilter, imageFilterToken) {
  for (const item of items || []) {
    const card = createUniqueCard(item, { imageFilter });
    if (imageFilter) applyImageFilterToCard(card, item, imageFilterToken, imageFilter);
    group.appendChild(card);
  }
}

function buildUniqueSection(uniqueItems, {
  imageFilter = null,
  imageFilterToken = 0,
  ink = 0,
  groupByAffix = false,
} = {}) {
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
  section.appendChild(head);

  // 总览等：按获取时间穿插（含保底卡），不要把保底永远甩在最后
  if (!groupByAffix) {
    const group = document.createElement('div');
    group.className = 'level-group unique-group';
    appendUniqueCards(group, sortUniqueItemsByAcquiredAt(uniqueItems), imageFilter, imageFilterToken);
    section.appendChild(group);
    return section;
  }

  // 独特页：按分解价值分栏，栏标题层级同 LEVEL；最顶即第一栏
  const tiersWrap = document.createElement('div');
  tiersWrap.className = 'unique-affix-tiers';
  const tiers = groupUniqueItemsByAffixTier(uniqueItems);
  let firstTier = true;

  if (!tiers.length) {
    const group = document.createElement('div');
    group.className = 'level-group unique-group';
    tiersWrap.appendChild(group);
  } else {
    for (const tier of tiers) {
      const tierSection = document.createElement('section');
      tierSection.className = 'level-section unique-affix-tier level-section-unique';
      tierSection.dataset.affixKey = tier.key;

      const tierHead = document.createElement('div');
      tierHead.className = 'level-section-head';

      const titleRow = document.createElement('div');
      titleRow.className = 'level-section-title-row unique-title-row';

      const tierTitle = document.createElement('div');
      tierTitle.className = 'level-section-title unique-affix-tier-title';
      tierTitle.textContent = tier.ink > 0 ? `${tier.label} · ${tier.ink}` : tier.label;

      titleRow.appendChild(tierTitle);
      if (firstTier) {
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
        titleRow.appendChild(inkEl);
        firstTier = false;
      }

      const tierRule = document.createElement('div');
      tierRule.className = 'level-section-rule';

      tierHead.append(titleRow, tierRule);

      const group = document.createElement('div');
      group.className = 'level-group unique-group';
      appendUniqueCards(group, sortUniqueItemsByAcquiredAt(tier.items), imageFilter, imageFilterToken);

      tierSection.append(tierHead, group);
      tiersWrap.appendChild(tierSection);
    }
  }

  return tiersWrap;
}

/** 总览：UNIQUE 下方的「最近获得」分栏 */
function buildUniqueNewSection(uniqueItems, {
  imageFilter = null,
  imageFilterToken = 0,
} = {}) {
  const section = document.createElement('section');
  section.className = 'level-section level-section-unique level-section-unique-new';
  section.dataset.level = 'unique-new';

  const head = document.createElement('div');
  head.className = 'level-section-head';

  const titleRow = document.createElement('div');
  titleRow.className = 'level-section-title-row unique-title-row';

  const title = document.createElement('div');
  title.className = 'level-section-title';
  title.textContent = 'UNIQUE NEW';

  titleRow.appendChild(title);

  const rule = document.createElement('div');
  rule.className = 'level-section-rule';

  head.append(titleRow, rule);
  section.appendChild(head);

  const group = document.createElement('div');
  group.className = 'level-group unique-group';
  appendUniqueCards(group, uniqueItems || [], imageFilter, imageFilterToken);
  section.appendChild(group);
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

function renderLevelView(entry, {
  imageFilter = null,
  uniqueOnly = false,
  levelsOnly = false,
  catalogOrder = false,
  recencyOrder = false,
} = {}) {
  const data = entry.data || {};
  const chars = uniqueOnly ? [] : collectLevelChars(data);
  // 排序方式 / 字形视图：不展示 unique；卡面视图按 level 并显示 unique
  const hideUnique = levelsOnly || catalogOrder || recencyOrder || imageFilter === 'glyph';
  const allUniqueItems = hideUnique ? [] : collectUniqueCardAppearances(data);
  // 总览默认只显示已收藏；UNIQUE 页 / 卡面筛选仍可带 unique
  const showOverviewUniqueNew = !uniqueOnly && !imageFilter && !hideUnique;
  const uniqueItems = uniqueOnly
    ? allUniqueItems
    : (imageFilter
      ? allUniqueItems
      : allUniqueItems.filter((item) => item.starred));
  const newestUniqueItems = showOverviewUniqueNew
    ? collectNewestUniqueItems(allUniqueItems, 5)
    : [];
  const flatOrder = catalogOrder || recencyOrder;

  if (!uniqueOnly) {
    if (catalogOrder) {
      const orderIndex = getCaoCatalogOrderIndex();
      chars.sort((a, b) => {
        const ia = orderIndex.has(String(a.id)) ? orderIndex.get(String(a.id)) : -1;
        const ib = orderIndex.has(String(b.id)) ? orderIndex.get(String(b.id)) : -1;
        // 加入时间：新（字库文件末尾）在前；不在草体库的排最后
        if (ia !== ib) return ib - ia;
        return (b.count || 0) - (a.count || 0)
          || String(a.char || a.id || '').localeCompare(String(b.char || b.id || ''), 'zh');
      });
    } else if (recencyOrder) {
      chars.sort((a, b) => {
        const ta = a.lastSeenAt || a.firstSeenAt || '';
        const tb = b.lastSeenAt || b.firstSeenAt || '';
        if (ta && tb && ta !== tb) return ta > tb ? -1 : 1;
        if (ta && !tb) return -1;
        if (!ta && tb) return 1;
        return (b.count || 0) - (a.count || 0)
          || String(a.char || a.id || '').localeCompare(String(b.char || b.id || ''), 'zh');
      });
    } else {
      chars.sort((a, b) => {
        const la = getLevelFromCount(a.count);
        const lb = getLevelFromCount(b.count);
        return lb.level - la.level
          || lb.ratio - la.ratio
          || (b.count || 0) - (a.count || 0)
          || String(a.char || a.id || '').localeCompare(String(b.char || b.id || ''), 'zh');
      });
    }
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
  document.body.classList.toggle('is-catalog-sort-view', flatOrder);
  document.body.classList.remove('is-atlas-view');

  if (imageFilter) {
    imageFilterToken += 1;
  }

  if (!uniqueOnly && chars.length === 0 && !imageFilter
    && (hideUnique || (uniqueItems.length === 0 && allUniqueItems.length === 0))) {
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
      groupByAffix: true,
    }));
    fragment.appendChild(topBlock);
    el.levelList.appendChild(fragment);
    el.levelPanel.classList.remove('hidden');
    el.panel.classList.add('hidden');
    updateLevelOverlays();
    return;
  }

  const groups = new Map();
  if (flatOrder) {
    const sectionKey = catalogOrder ? 'catalog' : 'recency';
    groups.set(sectionKey, chars.map((item) => ({
      item,
      info: getLevelFromCount(item.count),
    })));
  } else {
    for (const item of chars) {
      const info = getLevelFromCount(item.count);
      if (!groups.has(info.level)) groups.set(info.level, []);
      groups.get(info.level).push({ item, info });
    }
  }

  if (!levelsOnly && !catalogOrder && !recencyOrder && imageFilter !== 'glyph') {
    if (imageFilter || uniqueItems.length > 0 || newestUniqueItems.length > 0 || showOverviewUniqueNew) {
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

      if (showOverviewUniqueNew) {
        topBlock.appendChild(buildUniqueNewSection(newestUniqueItems, {
          imageFilter,
          imageFilterToken,
        }));
      }

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

    if (flatOrder) {
      const titleRow = document.createElement('div');
      titleRow.className = 'level-section-title-row';

      const title = document.createElement('div');
      title.className = 'level-section-title';
      title.textContent = '排序方式';

      const sortToggle = document.createElement('button');
      sortToggle.type = 'button';
      sortToggle.className = 'filter-toggle sort-by-toggle';
      sortToggle.classList.toggle('is-joined', catalogOrder);
      sortToggle.classList.toggle('is-recency', recencyOrder);
      sortToggle.setAttribute('aria-pressed', catalogOrder ? 'true' : 'false');
      sortToggle.title = catalogOrder
        ? '当前：加入时间（点击切换为顺序）'
        : '当前：顺序（点击切换为加入时间）';
      sortToggle.textContent = catalogOrder ? '加入时间' : '顺序';
      sortToggle.addEventListener('click', toggleSortByMode);

      titleRow.append(title, sortToggle);
      const rule = document.createElement('div');
      rule.className = 'level-section-rule';
      head.append(titleRow, rule);
    } else {
      const title = document.createElement('div');
      title.className = 'level-section-title';
      title.textContent = `LEVEL. ${level}`;

      const rule = document.createElement('div');
      rule.className = 'level-section-rule';

      head.append(title, rule);
    }

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

  // 总览：全部 level 之后追加「最多 UNIQUE / 最多字数」高光练习
  const isOverview = !uniqueOnly && !levelsOnly && !flatOrder && !imageFilter;
  if (isOverview) {
    appendOverviewHighlightSections(fragment, data);
  }

  el.levelList.appendChild(fragment);
  el.levelPanel.classList.remove('hidden');
  el.panel.classList.add('hidden');
  updateLevelOverlays();
}

function renderRecognizeSummary(items) {
  const recognized = items.filter((item) => (item.recognizeCount || 0) > 0).length;
  const total = items.reduce((sum, item) => sum + (item.recognizeCount || 0), 0);
  const stats = [
    ['字', items.length],
    ['已识别', recognized],
    ['识别数', total],
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

function renderRecognizeView(entry) {
  const items = collectRecognizeChars(entry?.data || {});
  hideCardPreview();
  el.levelList.replaceChildren();
  document.body.classList.toggle('is-card-face-view', false);
  document.body.classList.toggle('is-glyph-image-view', false);
  document.body.classList.toggle('is-unique-filter-view', false);
  document.body.classList.toggle('is-levels-only-view', false);
  document.body.classList.toggle('is-catalog-sort-view', false);
  renderRecognizeSummary(items);

  const section = document.createElement('section');
  section.className = 'level-section';
  const head = document.createElement('div');
  head.className = 'level-section-head';
  const title = document.createElement('div');
  title.className = 'level-section-title';
  title.textContent = '识别';
  const rule = document.createElement('div');
  rule.className = 'level-section-rule';
  head.append(title, rule);

  const group = document.createElement('div');
  group.className = 'level-group';
  for (const item of items) {
    const count = item.recognizeCount || 0;
    const card = createLevelCard(
      item,
      { level: 0, xp: 0, need: 1, ratio: 0 },
      levelFrameColor(Math.min(10, count)),
      { badgeText: String(count), xpText: '识别' },
    );
    group.appendChild(card);
  }
  section.append(head, group);
  el.levelList.appendChild(section);
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

function isRecognizeSession(session) {
  return Boolean(session && session.mode === 'recognize');
}

/** 练字记录（排除商店购买、识字等非练习 session） */
function getPracticeSessions(data) {
  const list = Array.isArray(data?.sessions) ? data.sessions : [];
  return list.filter((session) => !isShopPurchaseSession(session) && !isRecognizeSession(session));
}

function getLastPracticeSession(data) {
  const sessions = getPracticeSessions(data);
  if (sessions.length === 0) return null;
  return sessions[sessions.length - 1];
}

/** 单次练习包含的字数（去重 id） */
function sessionDistinctCharCount(session) {
  const ids = new Set();
  for (const stroke of session?.strokes || []) {
    if (stroke?.id) ids.add(String(stroke.id));
  }
  return ids.size;
}

function isStrokeUniqueDrop(stroke) {
  return typeof strokeHasUniqueCardStyle === 'function'
    ? strokeHasUniqueCardStyle(stroke)
    : Boolean(stroke?.isUnique && stroke?.cardStyle);
}

/** 练习内掉落的 unique 数（不含保底领取） */
function countSessionUniqueDrops(session) {
  let n = 0;
  for (const stroke of session?.strokes || []) {
    if (isStrokeUniqueDrop(stroke)) n += 1;
  }
  return n;
}

/** 保底 unique 锚定到某次练习的下标（与记录历史一致） */
function resolvePityClaimSessionIndex(claim, sessions) {
  if (!claim || !sessions?.length) return -1;
  let anchorIndex = -1;
  if (claim.anchorSessionAt) {
    anchorIndex = sessions.findIndex((s) => sessionTimeIso(s) === claim.anchorSessionAt
      || s?.startedAt === claim.anchorSessionAt
      || s?.endedAt === claim.anchorSessionAt);
  }
  if (anchorIndex < 0) {
    anchorIndex = findNearestPracticeSessionIndex(sessions, claim.acquiredAt);
  }
  return anchorIndex;
}

function countPityUniquesForSession(data, sessions, sessionIndex) {
  let n = 0;
  for (const claim of getUniquePityClaims(data)) {
    if (!claim?.id || !claim?.cardStyle) continue;
    if (resolvePityClaimSessionIndex(claim, sessions) === sessionIndex) n += 1;
  }
  return n;
}

function collectPityItemsForSession(data, sessions, sessionIndex, startOrder = 1) {
  const items = [];
  let order = startOrder;
  for (const claim of getUniquePityClaims(data)) {
    if (!claim?.id || !claim?.cardStyle) continue;
    if (resolvePityClaimSessionIndex(claim, sessions) !== sessionIndex) continue;
    const catalog = getCatalogById().get(String(claim.id));
    items.push({
      id: String(claim.id),
      char: catalog?.char || claim.id,
      script: normalizeItemScript(catalog?.script),
      order: order,
      durationMs: 0,
      isUnique: true,
      isPityUnique: true,
      cardStyle: typeof normalizeCardStyleRecord === 'function'
        ? normalizeCardStyleRecord(claim.cardStyle)
        : claim.cardStyle,
      ciHao: typeof resolveCiHao === 'function' ? resolveCiHao(claim) : (Number(claim.ciHao) || 1),
      streakAtClaim: claim.streakAtClaim,
    });
    order += 1;
  }
  return items;
}

/**
 * 最多 UNIQUE：unique 数最多；
 * 并列 → 字数更少；再并列 → 时间更远（更早）。
 */
function pickMostUniqueSession(data) {
  const sessions = getPracticeSessions(data);
  let best = null;
  for (let i = 0; i < sessions.length; i += 1) {
    const session = sessions[i];
    const uniqueCount = countSessionUniqueDrops(session)
      + countPityUniquesForSession(data, sessions, i);
    if (uniqueCount <= 0) continue;
    const charCount = sessionDistinctCharCount(session);
    const time = sessionCompletedAt(session) || sessionTimeIso(session) || '';
    const candidate = { session, sessionIndex: i, uniqueCount, charCount, time };
    if (!best) {
      best = candidate;
      continue;
    }
    if (candidate.uniqueCount !== best.uniqueCount) {
      if (candidate.uniqueCount > best.uniqueCount) best = candidate;
      continue;
    }
    if (candidate.charCount !== best.charCount) {
      if (candidate.charCount < best.charCount) best = candidate;
      continue;
    }
    if (candidate.time && best.time && candidate.time !== best.time) {
      if (candidate.time < best.time) best = candidate;
    }
  }
  return best;
}

/** 最多字数：单次练习去重字数最多；并列取时间更远（更早） */
function pickMostCharsSession(data) {
  const sessions = getPracticeSessions(data);
  let best = null;
  for (let i = 0; i < sessions.length; i += 1) {
    const session = sessions[i];
    const charCount = sessionDistinctCharCount(session);
    if (charCount <= 0) continue;
    const time = sessionCompletedAt(session) || sessionTimeIso(session) || '';
    const candidate = { session, sessionIndex: i, charCount, time };
    if (!best) {
      best = candidate;
      continue;
    }
    if (candidate.charCount !== best.charCount) {
      if (candidate.charCount > best.charCount) best = candidate;
      continue;
    }
    if (candidate.time && best.time && candidate.time !== best.time) {
      if (candidate.time < best.time) best = candidate;
    }
  }
  return best;
}

/**
 * 某次练习开始前的累计次数（chars 冻结基数 + 此前 sessions，规则同 countSessionStrokesById）
 */
function buildCountsBeforeSession(data, targetSession) {
  const counts = new Map();
  for (const item of iterateUserChars(data)) {
    if (!item?.id) continue;
    counts.set(String(item.id), Math.max(0, Number(item.count) || 0));
  }
  for (const session of data?.sessions || []) {
    if (session === targetSession) break;
    if (isRecognizeSession(session)) continue;
    for (const stroke of session.strokes || []) {
      if (!stroke?.id) continue;
      const id = String(stroke.id);
      counts.set(id, (counts.get(id) || 0) + 1);
    }
  }
  return counts;
}

/**
 * 为练习字卡标注「当时」等级（含本笔；unique / 保底仍走原有配色）
 */
function annotateSessionItemsWithHistoricalLevel(items, data, session) {
  const counts = buildCountsBeforeSession(data, session);
  return (items || []).map((item) => {
    if (!item || item.isPityUnique) return item;
    if (!item.id) return item;
    const id = String(item.id);
    const next = (counts.get(id) || 0) + 1;
    counts.set(id, next);
    if (item.isUnique) return item;
    return {
      ...item,
      historicalLevelInfo: getLevelFromCount(next),
    };
  });
}

function buildHighlightSessionMeta(pick, displayItems, sessions) {
  const session = pick.session;
  const strokeItems = displayItems.filter((item) => !item.isPityUnique);
  const uniqueCount = typeof pick.uniqueCount === 'number'
    ? pick.uniqueCount
    : (strokeItems.filter((item) => item.isUnique).length
      + displayItems.filter((item) => item.isPityUnique).length);
  const charCount = typeof pick.charCount === 'number'
    ? pick.charCount
    : new Set(strokeItems.map((item) => item.id)).size;
  const appearanceCount = strokeItems.length;
  const durationMs = sessionDurationMs(session)
    || strokeItems.reduce((sum, item) => sum + (item.durationMs || 0), 0);
  const completedAt = formatBeijingDateTime(sessionCompletedAt(session)) || '—';
  const sessionNo = `${pick.sessionIndex + 1} / ${sessions.length}`;

  return [
    ['编号', sessionNo],
    ['完成', completedAt],
    ['字', charCount],
    ['次序', appearanceCount],
    ['UNIQUE', uniqueCount],
    ['时长', formatLongDuration(durationMs)],
  ];
}

function buildOverviewHighlightSessionSection(titleText, pick, data, sessions) {
  if (!pick?.session) return null;
  const items = annotateSessionItemsWithHistoricalLevel(
    strokesToOrderedItems(pick.session.strokes),
    data,
    pick.session,
  );
  const pityItems = collectPityItemsForSession(
    data,
    sessions,
    pick.sessionIndex,
    items.length + 1,
  );
  const displayItems = items.concat(pityItems);
  if (!displayItems.length) return null;

  const section = document.createElement('section');
  section.className = 'level-section level-section-record level-section-highlight';
  section.dataset.highlight = titleText;

  const head = document.createElement('div');
  head.className = 'level-section-head';

  const titleRow = document.createElement('div');
  titleRow.className = 'level-section-title-row';

  const title = document.createElement('div');
  title.className = 'level-section-title';
  title.textContent = titleText;
  titleRow.appendChild(title);

  const meta = document.createElement('div');
  meta.className = 'highlight-session-meta';
  meta.setAttribute('aria-label', `${titleText}练习信息`);
  for (const [label, value] of buildHighlightSessionMeta(pick, displayItems, sessions)) {
    const item = document.createElement('div');
    item.className = 'highlight-session-meta-item';
    if (label === '完成') item.classList.add('is-datetime');
    const num = document.createElement('span');
    num.className = 'highlight-session-meta-value';
    num.textContent = String(value);
    const tag = document.createElement('span');
    tag.className = 'highlight-session-meta-label';
    tag.textContent = label;
    item.append(num, tag);
    meta.appendChild(item);
  }

  const rule = document.createElement('div');
  rule.className = 'level-section-rule';
  head.append(titleRow, meta, rule);

  const group = document.createElement('div');
  group.className = 'level-group';
  const zeroLevel = getLevelFromCount(0);
  for (const item of displayItems) {
    if (item.isUnique) {
      group.appendChild(createLevelCard(item, zeroLevel, levelFrameColor(0), { recordMode: true }));
      continue;
    }
    const info = item.historicalLevelInfo || zeroLevel;
    group.appendChild(createLevelCard(item, info, levelFrameColor(info.level), { recordMode: true }));
  }

  section.append(head, group);
  return section;
}

function appendOverviewHighlightSections(fragment, data) {
  const sessions = getPracticeSessions(data);
  if (!sessions.length) return;

  const mostUnique = pickMostUniqueSession(data);
  const mostUniqueSection = buildOverviewHighlightSessionSection(
    '最多UNIQUE',
    mostUnique,
    data,
    sessions,
  );
  if (mostUniqueSection) fragment.appendChild(mostUniqueSection);

  const mostChars = pickMostCharsSession(data);
  const mostCharsSection = buildOverviewHighlightSessionSection(
    '最多字数',
    mostChars,
    data,
    sessions,
  );
  if (mostCharsSection) fragment.appendChild(mostCharsSection);
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
  const completedText = formatBeijingDateTime(sessionCompletedAt(session)) || '—';

  const stats = [
    ['完成', completedText],
    ['次序', items.length],
    ['字', uniqueIds.size],
    ['时长', formatLongDuration(totalDurationMs)],
  ];

  el.levelSummary.replaceChildren();
  for (const [label, value] of stats) {
    const stat = document.createElement('div');
    stat.className = 'level-summary-item';
    if (label === '完成') stat.classList.add('is-datetime');
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
  document.body.classList.remove(
    'is-card-face-view',
    'is-glyph-image-view',
    'is-unique-filter-view',
    'is-levels-only-view',
    'is-atlas-view',
  );
  const data = entry.data || {};
  const sessions = getPracticeSessions(data);
  const index = resolveHistorySessionIndex(sessions);
  const session = index >= 0 ? sessions[index] : null;
  const items = session
    ? annotateSessionItemsWithHistoricalLevel(
      strokesToOrderedItems(session.strokes),
      data,
      session,
    )
    : [];
  hideCardPreview();
  el.levelList.replaceChildren();

  if (!session || items.length === 0) {
    renderLastSessionSummary(session, items);
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

  const section = document.createElement('section');
  section.className = 'level-section level-section-record';

  const head = document.createElement('div');
  head.className = 'level-section-head';

  const titleRow = document.createElement('div');
  titleRow.className = 'level-section-title-row';

  const title = document.createElement('div');
  title.className = 'level-section-title';
  title.textContent = '记录';

  const completedAt = formatBeijingDateTime(sessionCompletedAt(session));
  if (completedAt) {
    const timeEl = document.createElement('div');
    timeEl.className = 'record-completed-at';
    timeEl.textContent = completedAt;
    titleRow.append(title, timeEl);
  } else {
    titleRow.appendChild(title);
  }

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
  titleRow.appendChild(nav);

  const rule = document.createElement('div');
  rule.className = 'level-section-rule';

  head.append(titleRow, rule);

  const group = document.createElement('div');
  group.className = 'level-group';

  const displayItems = items.concat(
    collectPityItemsForSession(data, sessions, index, items.length + 1),
  );

  renderLastSessionSummary(session, displayItems);

  for (const item of displayItems) {
    if (item.isUnique) {
      group.appendChild(createLevelCard(item, zeroLevel, levelFrameColor(0), { recordMode: true }));
      continue;
    }
    const info = item.historicalLevelInfo || zeroLevel;
    group.appendChild(createLevelCard(item, info, levelFrameColor(info.level), { recordMode: true }));
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
    if (entry.data?.uniquesNeedsPersist) {
      try {
        await writeActiveUserData(entry.data);
      } catch {
        // 首次种子写盘失败仍可继续浏览；感叹号会提示不一致
      }
    }
    updateCardPreviewSlot();
    renderActiveView(entry);
    syncUniquesMismatchFlag(entry.data);
    restorePityClaimOverlayIfNeeded();
    setHint(`已找到 ${fileEntries.length} 个用户文件。当前：${entry.file}`);
    void requestTodayShopCheck();
  } catch (error) {
    document.body.classList.remove('has-user-data');
    syncUniquesMismatchFlag(null);
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
  syncUniquesMismatchFlag(null);
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
  restorePityClaimOverlayIfNeeded();
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
  sortByMode = loadPersistedSortByMode();
  if (modeParam === 'last') levelDisplayMode = 'lastSession';
  else if (modeParam === 'unique') levelDisplayMode = 'unique';
  else if (modeParam === 'levels') levelDisplayMode = 'levels';
  else if (modeParam === 'recognize') levelDisplayMode = 'recognize';
  else if (modeParam === 'sort') {
    levelDisplayMode = 'sort';
    const sortParam = params.get('sort');
    if (sortParam === 'joined' || sortParam === 'recency') sortByMode = sortParam;
  }
  else if (modeParam === 'catalog') {
    levelDisplayMode = 'sort';
    sortByMode = 'joined';
  }
  else if (modeParam === 'recency' || modeParam === 'order') {
    levelDisplayMode = 'sort';
    sortByMode = 'recency';
  }
  else if (modeParam === 'ink') levelDisplayMode = 'inkHistory';
  else if (modeParam === 'card') levelDisplayMode = 'cardFace';
  else if (modeParam === 'glyph') levelDisplayMode = 'glyphImage';
  else if (modeParam === 'shop') levelDisplayMode = 'shop';
  else if (modeParam === 'atlas') levelDisplayMode = 'atlas';
  else if (modeParam === 'settings') levelDisplayMode = 'settings';
  else if (isDocumentReload()) {
    const saved = loadPersistedLevelDisplayMode();
    if (saved) levelDisplayMode = saved;
  }
  persistSortByMode(sortByMode);
  applyLevelNavUI();
}

function isDocumentReload() {
  try {
    const nav = performance.getEntriesByType('navigation')[0];
    return nav?.type === 'reload';
  } catch {
    return false;
  }
}

const LEVEL_MODE_STORAGE_KEY = 'cao-level-display-mode';
const SORT_BY_STORAGE_KEY = 'cao-sort-by';

const LEVEL_MODE_TO_PARAM = {
  lastSession: 'last',
  unique: 'unique',
  levels: 'levels',
  recognize: 'recognize',
  sort: 'sort',
  inkHistory: 'ink',
  cardFace: 'card',
  glyphImage: 'glyph',
  shop: 'shop',
  atlas: 'atlas',
  settings: 'settings',
};

function normalizeSortByMode(value) {
  return value === 'recency' ? 'recency' : 'joined';
}

function loadPersistedSortByMode() {
  try {
    const saved = sessionStorage.getItem(SORT_BY_STORAGE_KEY);
    if (saved === 'joined' || saved === 'recency') return saved;
  } catch {
    // ignore
  }
  return 'joined';
}

function persistSortByMode(mode) {
  const next = normalizeSortByMode(mode);
  sortByMode = next;
  try {
    sessionStorage.setItem(SORT_BY_STORAGE_KEY, next);
  } catch {
    // ignore
  }
  try {
    const url = new URL(window.location.href);
    if (levelDisplayMode === 'sort') {
      url.searchParams.set('mode', 'sort');
      url.searchParams.set('sort', next);
    } else {
      url.searchParams.delete('sort');
    }
    const nextUrl = `${url.pathname}${url.search}${url.hash}`;
    if (`${window.location.pathname}${window.location.search}${window.location.hash}` !== nextUrl) {
      history.replaceState(null, '', nextUrl);
    }
  } catch {
    // ignore
  }
}

function toggleSortByMode() {
  unlockCardHoverSfx();
  persistSortByMode(sortByMode === 'joined' ? 'recency' : 'joined');
  const entry = fileEntries.find((item) => item.id === activeId);
  if (entry?.data && currentView === 'level' && levelDisplayMode === 'sort') {
    renderActiveView(entry);
  }
}

function loadPersistedLevelDisplayMode() {
  try {
    const saved = sessionStorage.getItem(LEVEL_MODE_STORAGE_KEY);
    if (saved === 'catalog') {
      sortByMode = 'joined';
      persistSortByMode('joined');
      return 'sort';
    }
    if (saved === 'recency') {
      sortByMode = 'recency';
      persistSortByMode('recency');
      return 'sort';
    }
    if (saved && LEVEL_FILTER_MODES.includes(saved)) return saved;
  } catch {
    // ignore
  }
  return null;
}

/** 记住当前分类，避免写盘触发整页刷新后掉回总览 */
function persistLevelDisplayMode(mode) {
  const next = mode || 'overview';
  try {
    sessionStorage.setItem(LEVEL_MODE_STORAGE_KEY, next);
  } catch {
    // ignore
  }
  try {
    const url = new URL(window.location.href);
    const param = LEVEL_MODE_TO_PARAM[next];
    if (param) url.searchParams.set('mode', param);
    else url.searchParams.delete('mode');
    if (next === 'sort') url.searchParams.set('sort', normalizeSortByMode(sortByMode));
    else url.searchParams.delete('sort');
    const nextUrl = `${url.pathname}${url.search}${url.hash}`;
    if (`${window.location.pathname}${window.location.search}${window.location.hash}` !== nextUrl) {
      history.replaceState(null, '', nextUrl);
    }
  } catch {
    // file:// 等环境可能拒绝改地址，sessionStorage 仍生效
  }
}

function applyLevelNavUI() {
  const modes = [
    [el.levelNavOverview, 'overview'],
    [el.levelNavUnique, 'unique'],
    [el.levelNavLevels, 'levels'],
    [el.levelNavRecognize, 'recognize'],
    [el.levelNavSort, 'sort'],
    [el.levelNavLast, 'lastSession'],
    [el.levelNavInk, 'inkHistory'],
    [el.levelNavCard, 'cardFace'],
    [el.levelNavGlyph, 'glyphImage'],
    [el.levelNavShop, 'shop'],
    [el.levelNavAtlas, 'atlas'],
    [el.levelNavSettings, 'settings'],
  ];
  for (const [btn, mode] of modes) {
    const active = levelDisplayMode === mode;
    btn?.classList.toggle('is-active', active);
    btn?.setAttribute('aria-selected', active ? 'true' : 'false');
  }
}

/** 左侧 filter 顺序（[ / ] 切换） */
const LEVEL_FILTER_MODES = [
  'overview',
  'unique',
  'levels',
  'recognize',
  'sort',
  'lastSession',
  'inkHistory',
  'cardFace',
  'glyphImage',
  'shop',
  'atlas',
  'settings',
];

function isLevelHotkeyBlocked() {
  if (document.querySelector('dialog[open]')) return true;
  const active = document.activeElement;
  if (!active) return false;
  const tag = active.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (active.isContentEditable) return true;
  return false;
}

function cycleLevelFilter(delta) {
  if (currentView !== 'level') return;
  const hasData = Boolean(fileEntries.find((item) => item.id === activeId)?.data);
  if (!hasData && levelDisplayMode !== 'settings' && levelDisplayMode !== 'shop') return;

  setKeyboardSelectMode(false);

  const list = LEVEL_FILTER_MODES;
  let index = list.indexOf(levelDisplayMode);
  if (index < 0) index = 0;
  const next = list[(index + delta + list.length) % list.length];
  setLevelDisplayMode(next);
}

function isPageToggleHotkey(event) {
  if (event.ctrlKey || event.metaKey || event.altKey) return false;
  const key = event.key;
  return key === 'Tab' || key === 'q' || key === 'Q';
}

function goToPracticePage() {
  window.location.href = '../';
}

function getKeyboardSelectCards() {
  return [...(el.levelList?.querySelectorAll('.level-card') || [])];
}

/** 当前视口内能看到的最上方一张卡（进入空格模式默认选中） */
function findTopVisibleKeyboardSelectIndex(cards) {
  if (!cards.length) return 0;
  const vh = window.innerHeight || document.documentElement.clientHeight || 0;
  let best = -1;
  let bestTop = Infinity;
  for (let i = 0; i < cards.length; i += 1) {
    const rect = cards[i].getBoundingClientRect();
    if (rect.bottom <= 0 || rect.top >= vh) continue;
    if (rect.top < bestTop) {
      bestTop = rect.top;
      best = i;
    }
  }
  return best >= 0 ? best : 0;
}

function clearKeyboardSelectHighlight() {
  detachKbSelectActions();
  el.levelList?.querySelectorAll('.level-card.is-kb-selected').forEach((node) => {
    node.classList.remove('is-kb-selected');
  });
}

function buildKbSelectActions() {
  const wrap = document.createElement('div');
  wrap.className = 'kb-select-actions';
  wrap.setAttribute('role', 'toolbar');
  wrap.setAttribute('aria-label', '字卡操作');

  const defs = [
    {
      action: 'square',
      label: '方形',
      svg: '<rect x="7" y="7" width="10" height="10" rx="1"/>',
    },
    {
      action: 'star',
      label: '收藏',
      svg: '<polygon points="12 3.5 14.4 9.2 20.5 9.6 15.8 13.6 17.4 19.5 12 16.2 6.6 19.5 8.2 13.6 3.5 9.6 9.6 9.2"/>',
    },
    {
      action: 'triangle',
      label: '三角形',
      svg: '<polygon points="12 5 20 19 4 19"/>',
    },
  ];

  for (const def of defs) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'kb-select-action';
    btn.dataset.action = def.action;
    btn.setAttribute('aria-label', def.label);
    btn.title = def.label;
    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round" aria-hidden="true">${def.svg}</svg>`;
    btn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (def.action === 'star') {
        void toggleUniqueStarFromKbSelect();
      }
    });
    wrap.appendChild(btn);
  }

  wrap.addEventListener('mousedown', (event) => {
    event.stopPropagation();
  });
  return wrap;
}

function readUniqueSelectionFromCard(card) {
  if (!card?.classList.contains('unique-card')) return null;
  const sessionIndex = Math.floor(Number(card.dataset.sessionIndex));
  const strokeIndex = Math.floor(Number(card.dataset.strokeIndex));
  if (!Number.isFinite(sessionIndex) || !Number.isFinite(strokeIndex)) return null;
  return { sessionIndex, strokeIndex };
}

function findUniqueInventoryItem(data, selection) {
  if (!selection || !Array.isArray(data?.uniques)) return null;
  return data.uniques.find((item) => (
    Math.floor(Number(item.sessionIndex)) === selection.sessionIndex
    && Math.floor(Number(item.strokeIndex)) === selection.strokeIndex
  )) || null;
}

function syncKbSelectStarButton(card) {
  const btn = kbSelectActionsEl?.querySelector('[data-action="star"]');
  if (!btn) return;
  const selection = readUniqueSelectionFromCard(card);
  const entry = fileEntries.find((item) => item.id === activeId);
  const inv = selection ? findUniqueInventoryItem(entry?.data, selection) : null;
  const canStar = Boolean(selection && inv);
  const starred = Boolean(inv?.starred);
  btn.disabled = !canStar;
  btn.classList.toggle('is-starred', starred);
  btn.setAttribute('aria-pressed', starred ? 'true' : 'false');
  btn.title = !canStar ? '仅 unique 卡可收藏' : (starred ? '取消收藏' : '收藏');
  btn.setAttribute('aria-label', btn.title);
  const svg = btn.querySelector('svg');
  if (svg) svg.setAttribute('fill', starred ? 'currentColor' : 'none');
}

async function toggleUniqueStarFromKbSelect() {
  const card = kbSelectActionsEl?.closest('.level-card');
  const selection = readUniqueSelectionFromCard(card);
  if (!selection) {
    setHint('请先选中一张 unique 卡', true);
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

  const inv = findUniqueInventoryItem(data, selection);
  if (!inv) {
    setHint('未找到对应 unique 库存', true);
    return;
  }

  const nextStarred = !inv.starred;
  if (typeof setUniqueInventoryStarred === 'function') {
    setUniqueInventoryStarred(data, selection.sessionIndex, selection.strokeIndex, nextStarred);
  } else {
    inv.starred = nextStarred;
  }
  data.updatedAt = new Date().toISOString();

  try {
    await writeActiveUserData(data);
    card.classList.toggle('is-starred', nextStarred);
    syncKbSelectStarButton(card);
    const catalog = getCatalogById().get(String(inv.id));
    const label = catalog?.char || inv.id;
    setHint(nextStarred ? `已收藏「${label}」` : `已取消收藏「${label}」`);
    // 总览只显示收藏卡：取消收藏后需刷新列表
    if (currentView === 'level' && levelDisplayMode === 'overview') {
      const keepIndex = keyboardSelectIndex;
      renderActiveView(entry);
      if (keyboardSelectMode) {
        // 取消收藏后该卡可能已从总览消失
        const cards = getKeyboardSelectCards();
        if (cards.length) {
          applyKeyboardSelectIndex(Math.min(keepIndex, cards.length - 1), {
            playSfx: false,
            scroll: false,
          });
        } else {
          setKeyboardSelectMode(false);
        }
      }
    } else {
      syncKbSelectStarButton(card);
    }
  } catch (error) {
    inv.starred = !nextStarred;
    setHint(`收藏失败：${error.message || error}`, true);
  }
}

function ensureKbSelectActions() {
  if (!kbSelectActionsEl) {
    kbSelectActionsEl = buildKbSelectActions();
  }
  return kbSelectActionsEl;
}

function detachKbSelectActions() {
  if (!kbSelectActionsEl) return;
  kbSelectActionsEl.remove();
}

function attachKbSelectActions(card) {
  if (!card?.classList.contains('unique-card')) {
    detachKbSelectActions();
    return;
  }
  const actions = ensureKbSelectActions();
  if (actions.parentElement !== card) {
    card.appendChild(actions);
  }
  syncKbSelectStarButton(card);
}

/** 空格选中跟随滚动：上下预留边距，避免贴边 */
const KB_SELECT_SCROLL_PAD_RATIO = 0.2;
const KB_SELECT_SCROLL_PAD_MIN_PX = 96;

function scrollKeyboardSelectCardIntoView(card) {
  if (!card) return;
  const rect = card.getBoundingClientRect();
  const vh = window.innerHeight || document.documentElement.clientHeight || 0;
  if (vh <= 0) return;

  const pad = Math.max(KB_SELECT_SCROLL_PAD_MIN_PX, Math.round(vh * KB_SELECT_SCROLL_PAD_RATIO));
  const usable = vh - pad * 2;
  let delta = 0;

  if (usable <= 0 || rect.height >= usable) {
    // 卡过高：顶边对齐到上预留线
    delta = rect.top - pad;
  } else if (rect.top < pad) {
    delta = rect.top - pad;
  } else if (rect.bottom > vh - pad) {
    delta = rect.bottom - (vh - pad);
  }

  if (Math.abs(delta) < 1) return;
  window.scrollBy({ top: delta, left: 0, behavior: 'auto' });
}

function applyKeyboardSelectIndex(index, { playSfx = true, scroll = true } = {}) {
  const cards = getKeyboardSelectCards();
  if (!cards.length) return;
  const next = ((index % cards.length) + cards.length) % cards.length;
  keyboardSelectIndex = next;
  clearKeyboardSelectHighlight();
  const card = cards[next];
  card.classList.add('is-kb-selected');
  attachKbSelectActions(card);
  if (scroll) {
    scrollKeyboardSelectCardIntoView(card);
  }
  const data = levelCardPreviewByEl.get(card);
  if (!data) return;
  if (playSfx) playCardHoverSfx();
  cardPreviewHoverAt = Date.now();
  showCardPreview(data.char, data.script, data.id, data.uniquePreview, { allowWhenPinned: true });
}

function setKeyboardSelectMode(on, { startIndex = null } = {}) {
  const next = Boolean(on);
  if (!next) {
    if (!keyboardSelectMode) return;
    keyboardSelectMode = false;
    document.body.classList.remove('is-kb-select-mode');
    clearKeyboardSelectHighlight();
    hideCardPreview();
    return;
  }

  if (currentView !== 'level') return;
  const cards = getKeyboardSelectCards();
  if (!cards.length) return;

  const wasOn = keyboardSelectMode;
  keyboardSelectMode = true;
  document.body.classList.add('is-kb-select-mode');
  let index;
  if (startIndex != null && Number.isFinite(Number(startIndex))) {
    index = Number(startIndex);
  } else if (wasOn) {
    index = keyboardSelectIndex;
  } else {
    index = findTopVisibleKeyboardSelectIndex(cards);
  }
  applyKeyboardSelectIndex(index, {
    playSfx: !wasOn || startIndex != null,
  });
}

/** 点击字卡：进入/切换空格选中；再点当前选中字则退出 */
function onLevelCardKeyboardSelectClick(card, event) {
  if (dismantleMode) return false;
  if (currentView !== 'level') return false;
  const cards = getKeyboardSelectCards();
  const index = cards.indexOf(card);
  if (index < 0) return false;

  event?.preventDefault();
  event?.stopPropagation();

  if (keyboardSelectMode && index === keyboardSelectIndex) {
    setKeyboardSelectMode(false);
    return true;
  }

  setKeyboardSelectMode(true, { startIndex: index });
  return true;
}

function toggleKeyboardSelectMode() {
  setKeyboardSelectMode(!keyboardSelectMode);
}

function syncKeyboardSelectAfterRender() {
  if (!keyboardSelectMode) return;
  if (currentView !== 'level' || !getKeyboardSelectCards().length) {
    setKeyboardSelectMode(false);
    return;
  }
  applyKeyboardSelectIndex(keyboardSelectIndex, { playSfx: false });
}

function stepKeyboardSelect(delta) {
  if (!keyboardSelectMode) return;
  const cards = getKeyboardSelectCards();
  if (!cards.length) return;
  applyKeyboardSelectIndex(keyboardSelectIndex + delta);
}

/** [] / 【】 同时按下 → 切到练习页；单键仍循环等级筛选（短延迟避开和弦） */
const levelBracketDown = new Set();
let levelBracketComboConsumed = false;
let levelBracketFilterTimer = null;
const LEVEL_BRACKET_FILTER_DELAY_MS = 70;

function levelBracketSide(key) {
  if (key === '[' || key === '【') return 'left';
  if (key === ']' || key === '】') return 'right';
  return null;
}

function clearLevelBracketFilterTimer() {
  if (levelBracketFilterTimer == null) return;
  clearTimeout(levelBracketFilterTimer);
  levelBracketFilterTimer = null;
}

function onLevelBracketKeyUp(event) {
  const side = levelBracketSide(event.key);
  if (!side) return;
  levelBracketDown.delete(side);
  if (!levelBracketDown.size) levelBracketComboConsumed = false;
}

function scheduleLevelFilterCycle(delta) {
  clearLevelBracketFilterTimer();
  levelBracketFilterTimer = setTimeout(() => {
    levelBracketFilterTimer = null;
    if (levelBracketComboConsumed) return;
    if (levelBracketDown.has('left') && levelBracketDown.has('right')) return;
    cycleLevelFilter(delta);
  }, LEVEL_BRACKET_FILTER_DELAY_MS);
}

function tryLevelBracketCombo(event) {
  if (event.ctrlKey || event.metaKey || event.altKey) return false;
  const side = levelBracketSide(event.key);
  if (!side) return false;
  levelBracketDown.add(side);
  if (!(levelBracketDown.has('left') && levelBracketDown.has('right'))) return false;
  event.preventDefault();
  clearLevelBracketFilterTimer();
  if (!levelBracketComboConsumed) {
    levelBracketComboConsumed = true;
    goToPracticePage();
  }
  return true;
}

function onLevelHotkey(event) {
  if (isLevelHotkeyBlocked()) return;

  if (isPageToggleHotkey(event)) {
    event.preventDefault();
    goToPracticePage();
    return;
  }

  if (tryLevelBracketCombo(event)) return;

  if (currentView !== 'level') return;

  // 空格：切换键盘选字模式（阻止默认整页滚动）
  if (event.key === ' ' || event.code === 'Space') {
    event.preventDefault();
    toggleKeyboardSelectMode();
    return;
  }

  if (keyboardSelectMode) {
    if (event.key === 'Escape') {
      event.preventDefault();
      setKeyboardSelectMode(false);
      return;
    }
    // 仅上下：同行从左到右，行末再下键进下一行（DOM 顺序）
    if (event.key === 'ArrowUp' || event.key === 'k' || event.key === 'K') {
      event.preventDefault();
      stepKeyboardSelect(-1);
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'j' || event.key === 'J') {
      event.preventDefault();
      stepKeyboardSelect(1);
      return;
    }
  }

  if (event.key === '[' || event.key === '【') {
    event.preventDefault();
    scheduleLevelFilterCycle(-1);
    return;
  }
  if (event.key === ']' || event.key === '】') {
    event.preventDefault();
    scheduleLevelFilterCycle(1);
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
  if (typeof applyCaoAppVersionLabels === 'function') applyCaoAppVersionLabels();
  cardSfxVolume = loadCardSfxVolume();
  syncSfxVolumeUI();
  void prefetchCardSfxData();
  // 任意点击/按键时创建并 resume AudioContext
  const armSfxUnlock = () => unlockCardHoverSfx();
  document.addEventListener('pointerdown', armSfxUnlock, { capture: true, passive: true });
  document.addEventListener('keydown', armSfxUnlock, { capture: true });
  document.addEventListener('keydown', onLevelHotkey);
  document.addEventListener('keyup', onLevelBracketKeyUp);
  window.addEventListener('blur', () => {
    levelBracketDown.clear();
    levelBracketComboConsumed = false;
    clearLevelBracketFilterTimer();
  });

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
  el.levelNavRecognize?.addEventListener('click', () => setLevelDisplayMode('recognize'));
  el.levelNavSort?.addEventListener('click', () => setLevelDisplayMode('sort'));
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
  el.levelNavAtlas?.addEventListener('click', () => setLevelDisplayMode('atlas'));
  el.levelNavSettings?.addEventListener('click', () => setLevelDisplayMode('settings'));
  el.btnUnicodeCheck?.addEventListener('click', () => {
    unlockCardHoverSfx();
    runUnicodeConsistencyCheck();
  });
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
    // 总览 / 独特都可分解；其它页仍回到总览
    if (levelDisplayMode !== 'overview' && levelDisplayMode !== 'unique') {
      setLevelDisplayMode('overview');
    }
    setDismantleMode(true);
  });
  el.btnDismantleConfirm?.addEventListener('click', (event) => {
    event.stopPropagation();
    void confirmDismantleSelected();
  });
  el.btnPityDiamond?.addEventListener('click', (event) => {
    event.stopPropagation();
    if (!el.btnPityDiamond?.classList.contains('is-ready')) return;
    void openPityClaimOffer();
  });
  el.btnPityClaimClose?.addEventListener('click', (event) => {
    event.stopPropagation();
    void confirmPityClaimObtain();
  });
  el.pityClaimOverlay?.addEventListener('click', (event) => {
    if (event.target === el.pityClaimOverlay) closePityClaimOverlay({ obtained: false });
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
