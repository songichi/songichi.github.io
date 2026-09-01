/**
 * 用户总账合并逻辑（浏览器与 Node 共用，无 fs / DOM 依赖）
 *
 * 磁盘格式 v3（紧凑）：短键 + strokes/chars 数组行；读写经 pack/unpack。
 * 内存中始终使用长键 canonical 结构，供等级页 / merge 使用。
 */

const USER_MERGE_DEFAULT_USER_ID = 'yi';
const USER_MERGE_SNAPSHOT_TYPE = 'practice-session-snapshot';
/** 落盘 user-*.json 的紧凑版本号 */
const USER_STATS_DISK_VERSION = 3;

function userStatsFileName(userId) {
  return `user-${userId || USER_MERGE_DEFAULT_USER_ID}.json`;
}

function buildCatalogMapsFromZiGroups(groups) {
  const charToId = new Map();
  const idToChar = new Map();

  for (const group of groups || []) {
    if (!Array.isArray(group)) continue;
    for (const zi of group) {
      const id = zi?.id;
      const ch = zi?.char;
      if (!id || !ch) continue;
      idToChar.set(id, ch);
      charToId.set(ch, id);
      for (const alt of zi.alternatives || []) {
        if (!charToId.has(alt)) charToId.set(alt, id);
      }
    }
  }

  return { charToId, idToChar };
}

/** 浏览器：catalog 已加载并 finalize 后调用 */
function buildCatalogMapsInBrowser() {
  const groups = [];
  if (typeof DEFAULT_ZI_CAO !== 'undefined') groups.push(DEFAULT_ZI_CAO);
  if (typeof DEFAULT_ZI_KAI !== 'undefined') groups.push(DEFAULT_ZI_KAI);
  return buildCatalogMapsFromZiGroups(groups);
}

function emptyUserStats(userId) {
  return {
    version: USER_STATS_DISK_VERSION,
    user: userId || USER_MERGE_DEFAULT_USER_ID,
    updatedAt: null,
    isTestUser: false,
    policy: {
      chars: 'legacy-frozen-base',
      sessions: 'append-only-history',
      displayCount: 'chars-plus-sessions-live',
      note: '新练习只追加 sessions，禁止写入 chars。界面次数 = chars 基数 + sessions 现场合计。chars 仅兼容旧数据。',
    },
    summary: {
      uniqueChars: 0,
      totalAppearances: 0,
      sessionCount: 0,
    },
    /** 货币：墨（当前余额） */
    ink: 0,
    /** 墨流水：可追溯重算 */
    inkHistory: [],
    /** 商店购买记录（仅用户账本；商店货架历史在 shop-sessions.json） */
    shopPurchases: [],
    /**
     * 商店按日已购格位（售罄按用户）：{ "2026-08-31": [0, 2] }
     * 磁盘短键 `sb`
     */
    shopBuys: {},
    chars: {},
    sessions: [],
  };
}

/** 规范化 shopBuys：day → 去重排序后的 slot 数组 */
function normalizeShopBuys(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const [dayKey, slots] of Object.entries(raw)) {
    const day = String(dayKey || '');
    if (!day) continue;
    const list = Array.isArray(slots) ? slots : [];
    const cleaned = [...new Set(
      list
        .map((n) => Math.floor(Number(n)))
        .filter((n) => Number.isFinite(n) && n >= 0),
    )].sort((a, b) => a - b);
    if (cleaned.length) out[day] = cleaned;
  }
  return out;
}

/** 用旧版 shopPurchases 补全 shopBuys（迁移） */
function hydrateShopBuysFromPurchases(shopBuys, shopPurchases) {
  const out = normalizeShopBuys(shopBuys);
  for (const purchase of shopPurchases || []) {
    const day = purchase?.day != null ? String(purchase.day) : '';
    if (!day) continue;
    const slot = Math.floor(Number(purchase.slot));
    if (!Number.isFinite(slot) || slot < 0) continue;
    if (!out[day]) out[day] = [];
    if (!out[day].includes(slot)) out[day].push(slot);
  }
  for (const day of Object.keys(out)) {
    out[day].sort((a, b) => a - b);
  }
  return out;
}

/** 当前用户是否已买过某商店日的某一格 */
function userHasBoughtShopSlot(data, day, slot) {
  const dayKey = day != null ? String(day) : '';
  if (!dayKey) return false;
  const slotN = Math.floor(Number(slot));
  if (!Number.isFinite(slotN) || slotN < 0) return false;
  const buys = data?.shopBuys && typeof data.shopBuys === 'object'
    ? data.shopBuys
    : null;
  if (buys && Array.isArray(buys[dayKey]) && buys[dayKey].includes(slotN)) {
    return true;
  }
  // 兜底：旧数据只有 shopPurchases
  return (data?.shopPurchases || []).some((p) => (
    p?.day === dayKey && Math.floor(Number(p.slot)) === slotN
  ));
}

/** 记录用户购买某格（就地改 data.shopBuys） */
function recordUserShopBuy(data, day, slot) {
  if (!data || typeof data !== 'object') return;
  const dayKey = day != null ? String(day) : '';
  const slotN = Math.floor(Number(slot));
  if (!dayKey || !Number.isFinite(slotN) || slotN < 0) return;
  if (!data.shopBuys || typeof data.shopBuys !== 'object' || Array.isArray(data.shopBuys)) {
    data.shopBuys = {};
  }
  const list = Array.isArray(data.shopBuys[dayKey]) ? data.shopBuys[dayKey] : [];
  if (!list.includes(slotN)) list.push(slotN);
  list.sort((a, b) => a - b);
  data.shopBuys[dayKey] = list;
}

/** 回滚某一格购买标记 */
function unrecordUserShopBuy(data, day, slot) {
  if (!data?.shopBuys || typeof data.shopBuys !== 'object') return;
  const dayKey = day != null ? String(day) : '';
  const slotN = Math.floor(Number(slot));
  if (!dayKey || !Number.isFinite(slotN)) return;
  const list = Array.isArray(data.shopBuys[dayKey]) ? data.shopBuys[dayKey] : [];
  data.shopBuys[dayKey] = list.filter((n) => n !== slotN);
  if (data.shopBuys[dayKey].length === 0) delete data.shopBuys[dayKey];
}

/** 是否像 user 总账对象（有 chars） */
function isUserStatsPayload(data) {
  return Boolean(data && typeof data === 'object' && !Array.isArray(data) && data.chars && typeof data.chars === 'object');
}

function packStrokeForDisk(stroke) {
  const id = String(stroke?.id || '');
  const durationMs = Math.max(0, Number(stroke?.durationMs) || 0);
  const row = [id, durationMs];
  const extra = {};

  if (stroke?.isUnique && stroke?.cardStyle) {
    const cs = stroke.cardStyle;
    const schemeId = cs.colorSchemeId || null;
    const decorationId = cs.decorationId || null;
    const baseId = typeof resolveCardBaseId === 'function'
      ? (resolveCardBaseId(cs.cardBase) || null)
      : (cs.cardBase || null);
    const modifierId = typeof resolveCardModifierId === 'function'
      ? (resolveCardModifierId(cs.cardModifier) || null)
      : (cs.cardModifier || null);
    if (schemeId) extra.cs = schemeId;
    if (decorationId) extra.d = decorationId;
    if (baseId) extra.cb = baseId;
    if (modifierId) extra.cm = modifierId;
    const ci = typeof resolveCiHao === 'function' ? resolveCiHao(stroke) : (Number(stroke.ciHao) || 1);
    if (ci !== 1) extra.ci = ci;
  }

  const inkDrop = Math.floor(Number(stroke?.inkDrop) || 0);
  if (inkDrop > 0) extra.ink = inkDrop;

  if (Object.keys(extra).length > 0) row.push(extra);
  return row;
}

function unpackStrokeFromDisk(raw) {
  if (Array.isArray(raw)) {
    const id = String(raw[0] || '');
    const durationMs = Math.max(0, Number(raw[1]) || 0);
    const extra = raw[2] && typeof raw[2] === 'object' && !Array.isArray(raw[2]) ? raw[2] : null;
    const out = { id, durationMs };
    if (!extra) return out;

    const colorSchemeId = extra.cs || extra.colorSchemeId || null;
    const decorationId = extra.d || extra.decorationId || null;
    const cardBase = extra.cb || extra.cardBase || null;
    const cardModifier = extra.cm || extra.cardModifier || null;
    if (colorSchemeId || decorationId || cardBase || cardModifier) {
      const cardStyle = typeof buildCardStyleRecord === 'function'
        ? buildCardStyleRecord(colorSchemeId, decorationId, cardBase, cardModifier)
        : {
          colorSchemeId: colorSchemeId || null,
          decorationId: decorationId || null,
          cardBase: cardBase || null,
          cardModifier: cardModifier || null,
          tags: [],
        };
      if (cardStyle) {
        out.isUnique = true;
        out.cardStyle = cardStyle;
        out.ciHao = Number(extra.ci ?? extra.ciHao) || 1;
      }
    }
    const inkDrop = Math.floor(Number(extra.ink ?? extra.inkDrop) || 0);
    if (inkDrop > 0) out.inkDrop = inkDrop;
    return out;
  }

  if (!raw || typeof raw !== 'object') return null;
  const id = raw.id ? String(raw.id) : '';
  if (!id) return null;
  const out = {
    id,
    durationMs: Math.max(0, Number(raw.durationMs) || 0),
  };
  if (raw.isUnique && raw.cardStyle) {
    out.isUnique = true;
    out.ciHao = typeof resolveCiHao === 'function' ? resolveCiHao(raw) : (Number(raw.ciHao) || 1);
    out.cardStyle = typeof normalizeCardStyleRecord === 'function'
      ? normalizeCardStyleRecord(raw.cardStyle)
      : raw.cardStyle;
  }
  const inkDrop = Math.floor(Number(raw.inkDrop ?? raw.ink) || 0);
  if (inkDrop > 0) out.inkDrop = inkDrop;
  return out;
}

function packCharForDisk(item) {
  return [
    item?.char ? String(item.char) : '',
    Math.max(0, Number(item?.count) || 0),
    item?.firstSeenAt || null,
    item?.lastSeenAt || null,
  ];
}

function unpackCharFromDisk(raw) {
  if (Array.isArray(raw)) {
    return {
      ...(raw[0] ? { char: String(raw[0]) } : {}),
      count: Math.max(0, Number(raw[1]) || 0),
      firstSeenAt: raw[2] || null,
      lastSeenAt: raw[3] || null,
    };
  }
  if (!raw || typeof raw !== 'object') {
    return { count: 0, firstSeenAt: null, lastSeenAt: null };
  }
  return {
    ...(raw.char ? { char: String(raw.char) } : {}),
    count: Math.max(0, Number(raw.count) || 0),
    firstSeenAt: raw.firstSeenAt || null,
    lastSeenAt: raw.lastSeenAt || null,
  };
}

function summarizeStrokesForSession(strokes) {
  let totalDurationMs = 0;
  const ids = new Set();
  for (const stroke of strokes || []) {
    if (stroke?.id) ids.add(stroke.id);
    totalDurationMs += Math.max(0, Number(stroke?.durationMs) || 0);
  }
  return {
    uniqueChars: ids.size,
    totalAppearances: Array.isArray(strokes) ? strokes.length : 0,
    totalDurationMs,
  };
}

const ISO_TIME_ONLY_RE = /^T?\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/i;
const ISO_FULL_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/i;

/** 从完整 ISO 取出 UTC 时刻片段，如 06:06:47.129Z */
function isoUtcTimePart(iso) {
  const text = String(iso || '');
  if (!ISO_FULL_RE.test(text)) return null;
  return text.slice(11);
}

function isoUtcDatePart(iso) {
  const text = String(iso || '');
  if (!ISO_FULL_RE.test(text)) return null;
  return text.slice(0, 10);
}

/**
 * 落盘结束时间：与开始同一 UTC 日则只写时刻；跨日仍写完整 ISO。
 * 读回时若时刻早于开始，则视为次日。
 */
function packSessionEndForDisk(startedAt, endedAt) {
  if (endedAt == null || endedAt === '') return null;
  if (typeof endedAt === 'number' && Number.isFinite(endedAt)) return endedAt;

  const endText = String(endedAt);
  if (ISO_TIME_ONLY_RE.test(endText)) {
    return endText.startsWith('T') || endText.startsWith('t') ? endText.slice(1) : endText;
  }

  const startDate = isoUtcDatePart(startedAt);
  const endDate = isoUtcDatePart(endText);
  const endTime = isoUtcTimePart(endText);
  if (startDate && endDate && endTime && startDate === endDate) return endTime;
  return endText;
}

function unpackSessionEndFromDisk(startedAt, endedAt) {
  if (endedAt == null || endedAt === '') return null;
  const endText = String(endedAt);
  if (!ISO_TIME_ONLY_RE.test(endText)) return endText;

  const startMs = Date.parse(startedAt);
  if (!Number.isFinite(startMs)) return endText;

  const timePart = endText.replace(/^T/i, '');
  const startDate = isoUtcDatePart(startedAt) || new Date(startMs).toISOString().slice(0, 10);
  let endMs = Date.parse(`${startDate}T${timePart}`);
  if (!Number.isFinite(endMs)) return endText;
  if (endMs < startMs) endMs += 24 * 60 * 60 * 1000;
  return new Date(endMs).toISOString();
}

function packSessionForDisk(session) {
  const strokes = (session?.strokes || [])
    .map((s) => packStrokeForDisk(typeof s === 'object' && !Array.isArray(s) ? s : unpackStrokeFromDisk(s)))
    .filter((row) => row[0]);

  const startedAt = session.startedAt ?? session.a ?? null;
  const endedRaw = session.endedAt ?? session.e ?? null;
  const out = {
    a: startedAt,
    e: packSessionEndForDisk(startedAt, endedRaw),
    s: strokes,
  };
  const filter = session.filter ?? session.f;
  const mode = session.mode ?? session.m;
  const librarySize = session.librarySize ?? session.lib;
  const commitSource = session.commitSource ?? session.src;
  const committed = session.committedToLevels ?? session.cl;
  if (filter != null) out.f = filter;
  if (mode != null) out.m = mode;
  if (librarySize != null) out.lib = librarySize;
  if (committed === true) out.cl = true;
  if (commitSource) out.src = commitSource;
  return out;
}

function unpackSessionFromDisk(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

  const strokesRaw = raw.s ?? raw.strokes;
  const strokes = [];
  if (Array.isArray(strokesRaw)) {
    for (const item of strokesRaw) {
      const stroke = unpackStrokeFromDisk(item);
      if (stroke?.id) strokes.push(stroke);
    }
  }

  const summary = raw.summary && typeof raw.summary === 'object'
    ? raw.summary
    : summarizeStrokesForSession(strokes);

  const startedAt = raw.startedAt ?? raw.a ?? null;
  const endedAt = unpackSessionEndFromDisk(startedAt, raw.endedAt ?? raw.e ?? null);

  return {
    type: 'practice-session',
    version: 1,
    startedAt,
    endedAt,
    filter: raw.filter ?? raw.f ?? null,
    mode: raw.mode ?? raw.m ?? null,
    librarySize: raw.librarySize ?? raw.lib ?? null,
    ...((raw.committedToLevels ?? raw.cl) === true ? { committedToLevels: true } : {}),
    commitSource: raw.commitSource ?? raw.src ?? null,
    strokes,
    summary,
  };
}

/** 货币「墨」：缺省 / 非法视为 0 */
function resolveInk(source, defaultValue = 0) {
  const n = Number(source?.ink);
  if (Number.isFinite(n) && n >= 0) return Math.floor(n);
  return defaultValue;
}

/**
 * unique 卡分解所得墨（按组件组合）
 * 单件：配色 20 / 底纹 40 / 修饰 50
 * 两件：160 / 200 / 400；三件：1600
 */
function computeUniqueDismantleInk(cardStyle) {
  const schemeId = typeof resolveColorSchemeId === 'function'
    ? resolveColorSchemeId(cardStyle?.colorSchemeId)
    : cardStyle?.colorSchemeId;
  const defaultId = typeof CARD_DEFAULT_COLOR_SCHEME_ID !== 'undefined'
    ? CARD_DEFAULT_COLOR_SCHEME_ID
    : 'cs000';
  // cs000 视为默认底色，不计入词条定价
  const hasCs = Boolean(schemeId) && schemeId !== defaultId;
  const hasCb = Boolean(
    typeof resolveCardBaseId === 'function'
      ? resolveCardBaseId(cardStyle?.cardBase)
      : cardStyle?.cardBase,
  );
  const hasCm = Boolean(
    typeof resolveCardModifierId === 'function'
      ? resolveCardModifierId(cardStyle?.cardModifier)
      : cardStyle?.cardModifier,
  );
  const key = `${hasCs ? 1 : 0}${hasCb ? 1 : 0}${hasCm ? 1 : 0}`;
  const table = {
    '100': 20,
    '010': 40,
    '001': 50,
    '110': 160,
    '101': 200,
    '011': 400,
    '111': 1600,
  };
  return table[key] || 0;
}

/** 商店标价基数 = 分解表 × 2 */
function computeUniqueShopBasePrice(cardStyle) {
  return computeUniqueDismantleInk(cardStyle) * 2;
}

/**
 * 商店成交价：基数 × (1 + mod)，mod ∈ [-0.2, 0.4]，取整
 * @param {number} basePrice
 * @param {number} priceMod
 */
function applyShopPriceModifier(basePrice, priceMod) {
  const base = Math.max(0, Math.floor(Number(basePrice) || 0));
  const mod = Number(priceMod);
  const factor = 1 + (Number.isFinite(mod) ? mod : 0);
  return Math.max(0, Math.round(base * factor));
}

function ensureInkHistory(stats) {
  if (!Array.isArray(stats.inkHistory)) stats.inkHistory = [];
  return stats.inkHistory;
}

function packInkHistoryEntryForDisk(entry) {
  const delta = Math.trunc(Number(entry?.delta) || 0);
  const balance = Math.max(0, Math.floor(Number(entry?.balance) || 0));
  const at = entry?.at || null;
  const reason = entry?.reason != null ? String(entry.reason) : '';
  const row = [delta, balance, at, reason];
  const extra = {};
  if (entry?.source) extra.src = String(entry.source);
  if (entry?.ref != null) extra.ref = entry.ref;
  if (Object.keys(extra).length > 0) row.push(extra);
  return row;
}

function unpackInkHistoryEntryFromDisk(raw) {
  if (Array.isArray(raw)) {
    const delta = Math.trunc(Number(raw[0]) || 0);
    const balance = Math.max(0, Math.floor(Number(raw[1]) || 0));
    const at = raw[2] || null;
    const reason = raw[3] != null ? String(raw[3]) : '';
    const extra = raw[4] && typeof raw[4] === 'object' && !Array.isArray(raw[4]) ? raw[4] : null;
    const out = { delta, balance, at, reason };
    if (extra?.src || extra?.source) out.source = String(extra.src || extra.source);
    if (extra && 'ref' in extra) out.ref = extra.ref;
    return out;
  }
  if (!raw || typeof raw !== 'object') return null;
  const delta = Math.trunc(Number(raw.delta ?? raw.d) || 0);
  const balance = Math.max(0, Math.floor(Number(raw.balance ?? raw.b) || 0));
  const out = {
    delta,
    balance,
    at: raw.at || raw.t || null,
    reason: raw.reason != null ? String(raw.reason) : (raw.r != null ? String(raw.r) : ''),
  };
  if (raw.source || raw.src) out.source = String(raw.source || raw.src);
  if (raw.ref != null) out.ref = raw.ref;
  return out;
}

function packShopPurchaseForDisk(entry) {
  const style = entry?.cardStyle && typeof entry.cardStyle === 'object' ? entry.cardStyle : {};
  const extra = {};
  if (style.colorSchemeId) extra.cs = String(style.colorSchemeId);
  if (style.decorationId) extra.d = String(style.decorationId);
  if (style.cardBase) extra.cb = String(style.cardBase);
  if (style.cardModifier) extra.cm = String(style.cardModifier);
  const ci = Math.floor(Number(entry?.ciHao));
  if (Number.isFinite(ci) && ci >= 1) extra.ci = ci;
  return [
    entry?.at || null,
    entry?.day != null ? String(entry.day) : '',
    Math.max(0, Math.floor(Number(entry?.slot) || 0)),
    entry?.ziId != null ? String(entry.ziId) : '',
    Math.max(0, Math.floor(Number(entry?.price) || 0)),
    Number.isFinite(Number(entry?.priceMod)) ? Number(entry.priceMod) : 0,
    extra,
    entry?.offerId != null ? String(entry.offerId) : '',
  ];
}

function unpackShopPurchaseFromDisk(raw) {
  if (Array.isArray(raw)) {
    const extra = raw[6] && typeof raw[6] === 'object' && !Array.isArray(raw[6]) ? raw[6] : {};
    const cardStyle = typeof buildCardStyleRecord === 'function'
      ? buildCardStyleRecord(extra.cs || null, extra.d || null, extra.cb || null, extra.cm || null)
      : {
        colorSchemeId: extra.cs || null,
        decorationId: extra.d || null,
        cardBase: extra.cb || null,
        cardModifier: extra.cm || null,
      };
    return {
      at: raw[0] || null,
      day: raw[1] != null ? String(raw[1]) : '',
      slot: Math.max(0, Math.floor(Number(raw[2]) || 0)),
      ziId: raw[3] != null ? String(raw[3]) : '',
      price: Math.max(0, Math.floor(Number(raw[4]) || 0)),
      priceMod: Number.isFinite(Number(raw[5])) ? Number(raw[5]) : 0,
      cardStyle,
      offerId: raw[7] != null ? String(raw[7]) : '',
      ciHao: Math.max(1, Math.floor(Number(extra.ci ?? extra.ciHao) || 1)),
    };
  }
  if (!raw || typeof raw !== 'object') return null;
  const styleIn = raw.cardStyle || raw.style || {};
  const cardStyle = typeof normalizeCardStyleRecord === 'function'
    ? normalizeCardStyleRecord(styleIn)
    : styleIn;
  return {
    at: raw.at || null,
    day: raw.day != null ? String(raw.day) : '',
    slot: Math.max(0, Math.floor(Number(raw.slot) || 0)),
    ziId: raw.ziId != null ? String(raw.ziId) : (raw.id != null ? String(raw.id) : ''),
    price: Math.max(0, Math.floor(Number(raw.price) || 0)),
    priceMod: Number.isFinite(Number(raw.priceMod)) ? Number(raw.priceMod) : 0,
    cardStyle,
    offerId: raw.offerId != null ? String(raw.offerId) : '',
    ciHao: Math.max(1, Math.floor(Number(raw.ciHao ?? raw.ci) || 1)),
  };
}

/** 仅从 inkHistory 重算余额（不改 history） */
function recomputeInkFromHistory(stats) {
  let ink = 0;
  for (const entry of stats?.inkHistory || []) {
    const delta = Math.trunc(Number(entry?.delta) || 0);
    ink = Math.max(0, ink + delta);
  }
  if (stats && typeof stats === 'object') stats.ink = ink;
  return ink;
}

/**
 * 内部：写入一笔墨变动（delta 可正可负）
 * @returns {{ ok: true, stats: object, entry: object } | { ok: false, error: string, ink?: number, need?: number }}
 */
function applyInkDelta(stats, delta, {
  reason = '',
  source = '',
  ref = undefined,
  at = null,
  allowNegativeBalance = false,
} = {}) {
  if (!stats || typeof stats !== 'object') {
    return { ok: false, error: 'invalid-stats' };
  }
  const change = Math.trunc(Number(delta));
  if (!Number.isFinite(change) || change === 0) {
    return { ok: false, error: 'invalid-amount' };
  }

  const current = resolveInk(stats);
  const next = current + change;
  if (!allowNegativeBalance && next < 0) {
    return {
      ok: false,
      error: 'insufficient-ink',
      ink: current,
      need: Math.abs(change),
    };
  }

  const entry = {
    delta: change,
    balance: Math.max(0, next),
    at: at || new Date().toISOString(),
    reason: reason != null ? String(reason) : '',
  };
  if (source) entry.source = String(source);
  if (ref !== undefined) entry.ref = ref;

  ensureInkHistory(stats).push(entry);
  stats.ink = entry.balance;
  stats.updatedAt = entry.at;
  return { ok: true, stats, entry };
}

/** 获得墨（amount 须为正整数） */
function gainInk(stats, amount, options = {}) {
  const n = Math.floor(Number(amount));
  if (!Number.isFinite(n) || n <= 0) {
    return { ok: false, error: 'invalid-amount' };
  }
  return applyInkDelta(stats, n, options);
}

/**
 * 使用 / 花费墨（amount 须为正整数；余额不足则失败且不改动）
 */
function spendInk(stats, amount, options = {}) {
  const n = Math.floor(Number(amount));
  if (!Number.isFinite(n) || n <= 0) {
    return { ok: false, error: 'invalid-amount' };
  }
  const current = resolveInk(stats);
  if (current < n) {
    return {
      ok: false,
      error: 'insufficient-ink',
      ink: current,
      need: n,
    };
  }
  return applyInkDelta(stats, -n, options);
}

/**
 * 磁盘 → 内存（长键 + 对象 stroke）
 * 兼容 v2 pretty / v3 紧凑
 */
function unpackUserStatsFromDisk(data, userId) {
  if (!isUserStatsPayload(data)) return emptyUserStats(userId);

  const charsIn = data.chars || {};
  const chars = {};
  for (const [id, item] of Object.entries(charsIn)) {
    chars[id] = unpackCharFromDisk(item);
  }

  const sessionsIn = Array.isArray(data.sessions) ? data.sessions : [];
  const sessions = [];
  for (const session of sessionsIn) {
    const unpacked = unpackSessionFromDisk(session);
    if (unpacked) sessions.push(unpacked);
  }

  const historyIn = Array.isArray(data.inkHistory) ? data.inkHistory : [];
  const inkHistory = [];
  for (const item of historyIn) {
    const entry = unpackInkHistoryEntryFromDisk(item);
    if (entry) inkHistory.push(entry);
  }

  const purchasesIn = Array.isArray(data.shopPurchases)
    ? data.shopPurchases
    : (Array.isArray(data.sp) ? data.sp : []);
  const shopPurchases = [];
  for (const item of purchasesIn) {
    const entry = unpackShopPurchaseFromDisk(item);
    if (entry) shopPurchases.push(entry);
  }

  const shopBuys = hydrateShopBuysFromPurchases(
    data.shopBuys ?? data.sb,
    shopPurchases,
  );

  const sum = data.summary || data.sum || {};
  const stats = {
    version: Number(data.version ?? data.v) || USER_STATS_DISK_VERSION,
    user: userId || data.user || data.u || USER_MERGE_DEFAULT_USER_ID,
    updatedAt: data.updatedAt ?? data.at ?? null,
    isTestUser: typeof data.isTestUser === 'boolean'
      ? data.isTestUser
      : Boolean(data.test),
    policy: (data.policy && typeof data.policy === 'object')
      ? data.policy
      : emptyUserStats(userId).policy,
    summary: {
      uniqueChars: Number(sum.uniqueChars ?? sum.u) || 0,
      totalAppearances: Number(sum.totalAppearances ?? sum.n) || 0,
      sessionCount: Number(sum.sessionCount ?? sum.s) || sessions.length,
    },
    ink: resolveInk(data),
    inkHistory,
    shopPurchases,
    shopBuys,
    chars,
    sessions,
  };
  return stats;
}

/** 内存 → 磁盘紧凑 JSON 对象（短键 + 数组行） */
function packUserStatsForDisk(data) {
  const stats = unpackUserStatsFromDisk(data, data?.user || data?.u);
  // 若调用方已在内存改过 ink/history，unpack 会从 data 再读；优先保留传入对象上的最新值
  if (data && typeof data === 'object') {
    if (Array.isArray(data.inkHistory)) {
      stats.inkHistory = data.inkHistory
        .map((item) => unpackInkHistoryEntryFromDisk(item) || item)
        .filter(Boolean);
    }
    if (data.ink != null) stats.ink = resolveInk(data);
    if (Array.isArray(data.shopPurchases)) {
      stats.shopPurchases = data.shopPurchases
        .map((item) => unpackShopPurchaseFromDisk(item) || item)
        .filter(Boolean);
    }
    if (data.shopBuys != null || data.sb != null) {
      stats.shopBuys = hydrateShopBuysFromPurchases(
        data.shopBuys ?? data.sb,
        stats.shopPurchases,
      );
    } else {
      stats.shopBuys = hydrateShopBuysFromPurchases(stats.shopBuys, stats.shopPurchases);
    }
  }
  const chars = {};
  for (const [id, item] of Object.entries(stats.chars || {})) {
    chars[id] = packCharForDisk(item);
  }
  const shopBuysPacked = normalizeShopBuys(stats.shopBuys);
  return {
    v: USER_STATS_DISK_VERSION,
    u: stats.user,
    at: stats.updatedAt || null,
    ...(stats.isTestUser ? { test: true } : {}),
    policy: stats.policy || emptyUserStats(stats.user).policy,
    sum: {
      u: stats.summary?.uniqueChars || 0,
      n: stats.summary?.totalAppearances || 0,
      s: Array.isArray(stats.sessions) ? stats.sessions.length : (stats.summary?.sessionCount || 0),
    },
    ink: resolveInk(stats),
    inkHistory: (stats.inkHistory || []).map((entry) => packInkHistoryEntryForDisk(entry)),
    sp: (stats.shopPurchases || []).map((entry) => packShopPurchaseForDisk(entry)),
    ...(Object.keys(shopBuysPacked).length ? { sb: shopBuysPacked } : {}),
    chars,
    sessions: (stats.sessions || []).map((session) => packSessionForDisk(session)),
  };
}

/**
 * 落盘 JSON：整体缩进；sessions[].s 每笔单行；f/m/lib/cl/src 收成一行
 */
function isStrokeRowForDisk(value) {
  return Array.isArray(value)
    && (value.length === 2 || value.length === 3)
    && typeof value[0] === 'string'
    && typeof value[1] === 'number'
    && (value.length === 2 || (value[2] && typeof value[2] === 'object' && !Array.isArray(value[2])));
}

function isStrokeListForDisk(value) {
  return Array.isArray(value) && value.length > 0 && value.every(isStrokeRowForDisk);
}

/** inkHistory 落盘行：[delta, balance, at, reason] 或再跟 {src,ref} */
function isInkHistoryRowForDisk(value) {
  return Array.isArray(value)
    && value.length >= 4
    && value.length <= 5
    && typeof value[0] === 'number'
    && typeof value[1] === 'number';
}

function isInkHistoryListForDisk(value) {
  return Array.isArray(value) && value.length > 0 && value.every(isInkHistoryRowForDisk);
}

function stringifyInkHistoryRowForDisk(row) {
  const parts = [
    String(row[0]),
    String(row[1]),
    JSON.stringify(row[2]),
    JSON.stringify(row[3]),
  ];
  if (row.length >= 5) parts.push(JSON.stringify(row[4]));
  return `[${parts.join(', ')}]`;
}

/** chars 落盘行：[字, 次数, firstSeenAt, lastSeenAt] */
function isCharRowForDisk(value) {
  return Array.isArray(value)
    && value.length === 4
    && (typeof value[0] === 'string' || value[0] === null)
    && typeof value[1] === 'number';
}

function isPackedSessionForDisk(value) {
  return Boolean(
    value
    && typeof value === 'object'
    && !Array.isArray(value)
    && ('a' in value || 'startedAt' in value)
    && ('s' in value || 'strokes' in value),
  );
}

const SESSION_META_KEYS_FOR_DISK = ['f', 'm', 'lib', 'cl', 'src'];

function stringifyStrokeRowForDisk(row) {
  if (row.length === 2) return `[${JSON.stringify(row[0])}, ${row[1]}]`;
  return `[${JSON.stringify(row[0])}, ${row[1]}, ${JSON.stringify(row[2])}]`;
}

function stringifyCharRowForDisk(row) {
  return `[${JSON.stringify(row[0])}, ${row[1]}, ${JSON.stringify(row[2])}, ${JSON.stringify(row[3])}]`;
}

function stringifyPackedSessionForDisk(session, indentUnit, level) {
  const pad = indentUnit.repeat(level);
  const padInner = indentUnit.repeat(level + 1);
  const lines = [];

  if ('a' in session) {
    lines.push(`${padInner}"a": ${JSON.stringify(session.a)}`);
  }
  if ('e' in session) {
    lines.push(`${padInner}"e": ${JSON.stringify(session.e)}`);
  }
  if ('s' in session) {
    lines.push(`${padInner}"s": ${stringifyJsonIndented(session.s, indentUnit, level + 1)}`);
  }

  const metaParts = [];
  for (const key of SESSION_META_KEYS_FOR_DISK) {
    if (!(key in session)) continue;
    metaParts.push(`${JSON.stringify(key)}: ${JSON.stringify(session[key])}`);
  }
  if (metaParts.length > 0) {
    lines.push(`${padInner}${metaParts.join(', ')}`);
  }

  // 其它未知字段仍逐行写出，避免丢数据
  for (const key of Object.keys(session)) {
    if (key === 'a' || key === 'e' || key === 's' || SESSION_META_KEYS_FOR_DISK.includes(key)) continue;
    lines.push(`${padInner}${JSON.stringify(key)}: ${stringifyJsonIndented(session[key], indentUnit, level + 1)}`);
  }

  if (lines.length === 0) return '{}';
  return `{\n${lines.join(',\n')}\n${pad}}`;
}

function stringifyJsonIndented(value, indentUnit, level) {
  const pad = indentUnit.repeat(level);
  const padInner = indentUnit.repeat(level + 1);

  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    if (isStrokeRowForDisk(value)) {
      return stringifyStrokeRowForDisk(value);
    }
    if (isCharRowForDisk(value)) {
      return stringifyCharRowForDisk(value);
    }
    if (isStrokeListForDisk(value)) {
      const lines = value.map((row) => `${padInner}${stringifyStrokeRowForDisk(row)}`);
      return `[\n${lines.join(',\n')}\n${pad}]`;
    }
    if (isInkHistoryListForDisk(value)) {
      const lines = value.map((row) => `${padInner}${stringifyInkHistoryRowForDisk(row)}`);
      return `[\n${lines.join(',\n')}\n${pad}]`;
    }
    const items = value.map((item) => `${padInner}${stringifyJsonIndented(item, indentUnit, level + 1)}`);
    return `[\n${items.join(',\n')}\n${pad}]`;
  }

  if (isPackedSessionForDisk(value)) {
    return stringifyPackedSessionForDisk(value, indentUnit, level);
  }

  const keys = Object.keys(value);
  if (keys.length === 0) return '{}';
  const fields = keys.map((key) => {
    const rendered = stringifyJsonIndented(value[key], indentUnit, level + 1);
    return `${padInner}${JSON.stringify(key)}: ${rendered}`;
  });
  return `{\n${fields.join(',\n')}\n${pad}}`;
}

/** 序列化为缩进 JSON（chars / s 每条单行；session 元数据单行） */
function stringifyUserStatsForDisk(data) {
  return `${stringifyJsonIndented(packUserStatsForDisk(data), '  ', 0)}\n`;
}

function normalizeUserStats(data, userId) {
  const stats = unpackUserStatsFromDisk(data, userId);
  if (!stats.chars || typeof stats.chars !== 'object') stats.chars = {};
  if (!Array.isArray(stats.sessions)) stats.sessions = [];
  if (!stats.summary || typeof stats.summary !== 'object') {
    stats.summary = emptyUserStats(userId).summary;
  }
  if (!stats.policy || typeof stats.policy !== 'object') {
    stats.policy = emptyUserStats(userId).policy;
  }
  if (typeof stats.isTestUser !== 'boolean') {
    stats.isTestUser = false;
  }
  stats.ink = resolveInk(stats);
  if (!Array.isArray(stats.inkHistory)) stats.inkHistory = [];
  if (!Array.isArray(stats.shopPurchases)) stats.shopPurchases = [];
  stats.shopBuys = hydrateShopBuysFromPurchases(stats.shopBuys, stats.shopPurchases);
  stats.user = userId || stats.user || USER_MERGE_DEFAULT_USER_ID;
  return stats;
}

function resolveItemId(item, charToId) {
  if (!item || typeof item !== 'object') return '';
  if (item.id) return String(item.id);
  if (item.char && charToId?.has(item.char)) return charToId.get(item.char);
  return '';
}

function annotateStatsChars(stats, idToChar) {
  for (const [id, item] of Object.entries(stats.chars || {})) {
    if (!item || typeof item !== 'object') continue;
    const catalogChar = idToChar.get(id);
    if (!catalogChar) continue;
    item.char = catalogChar;
  }
}

function mergeItemIntoStats(stats, item, maps) {
  const { charToId, idToChar } = maps;
  const id = resolveItemId(item, charToId);
  if (!id) return;

  const add = Number(item.count) || 0;
  if (add <= 0) return;

  const catalogChar = idToChar.get(id) || '';
  const existing = stats.chars[id];
  if (!existing) {
    stats.chars[id] = {
      ...(catalogChar ? { char: catalogChar } : {}),
      count: add,
      firstSeenAt: item.firstSeenAt || null,
      lastSeenAt: item.lastSeenAt || null,
    };
    return;
  }

  if (catalogChar) existing.char = catalogChar;

  existing.count = (existing.count || 0) + add;
  if (item.firstSeenAt) {
    if (!existing.firstSeenAt || item.firstSeenAt < existing.firstSeenAt) {
      existing.firstSeenAt = item.firstSeenAt;
    }
  }
  if (item.lastSeenAt) {
    if (!existing.lastSeenAt || item.lastSeenAt > existing.lastSeenAt) {
      existing.lastSeenAt = item.lastSeenAt;
    }
  }
}

function aggregateStrokesToItems(strokes) {
  const byId = new Map();
  for (const stroke of strokes || []) {
    const id = stroke?.id;
    if (!id) continue;
    const existing = byId.get(id);
    if (!existing) byId.set(id, { id, count: 1 });
    else existing.count += 1;
  }
  return [...byId.values()];
}

function isSnapshotCommittedToLevels(snapshot) {
  // 仅当显式为 true 时才写入 chars；缺省 / false 一律视为只写 sessions
  return snapshot?.meta?.committedToLevels === true;
}

/** 写入 ndjson / 合并前标注是否写入 chars（默认不写：只追加 sessions） */
function annotateSnapshotCommit(snapshot, { committedToLevels = false, commitSource = '' } = {}) {
  const meta = { ...(snapshot.meta || {}) };
  if (committedToLevels === true) meta.committedToLevels = true;
  else delete meta.committedToLevels;
  if (commitSource) meta.commitSource = commitSource;
  return { ...snapshot, meta };
}

function snapshotToPracticeSession(snapshot) {
  const meta = snapshot.meta || {};
  let strokes = [];

  if (Array.isArray(snapshot.strokes) && snapshot.strokes.length > 0) {
    strokes = snapshot.strokes
      .filter((s) => s?.id)
      .map((s) => (
        typeof serializeStrokeForSnapshot === 'function'
          ? serializeStrokeForSnapshot(s)
          : {
            id: String(s.id),
            durationMs: Math.max(0, Number(s.durationMs) || 0),
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
          }
      ));
  } else if (Array.isArray(snapshot.items)) {
    for (const item of snapshot.items) {
      const id = item?.id;
      if (!id) continue;
      const count = Math.max(0, Number(item.count) || 0);
      for (let i = 0; i < count; i += 1) {
        strokes.push({ id: String(id), durationMs: 0 });
      }
    }
  }

  let totalDurationMs = 0;
  const ids = new Set();
  for (const stroke of strokes) {
    ids.add(stroke.id);
    totalDurationMs += stroke.durationMs;
  }

  return {
    type: 'practice-session',
    version: 1,
    startedAt: snapshot.startedAt || null,
    endedAt: snapshot.endedAt || snapshot.createdAt || null,
    filter: meta.filter ?? null,
    mode: meta.mode ?? null,
    librarySize: meta.librarySize ?? null,
    ...(isSnapshotCommittedToLevels(snapshot) ? { committedToLevels: true } : {}),
    commitSource: meta.commitSource || null,
    strokes,
    summary: snapshot.summary || {
      uniqueChars: ids.size,
      totalAppearances: strokes.length,
      totalDurationMs,
    },
  };
}

function mergeSnapshotItemsIntoStats(stats, snapshot, maps) {
  const items = Array.isArray(snapshot.items) && snapshot.items.length > 0
    ? snapshot.items
    : aggregateStrokesToItems(snapshot.strokes);

  const now = snapshot.endedAt || snapshot.createdAt || new Date().toISOString();
  for (const item of items) {
    mergeItemIntoStats(stats, {
      ...item,
      firstSeenAt: item.firstSeenAt || snapshot.startedAt || now,
      lastSeenAt: item.lastSeenAt || snapshot.endedAt || snapshot.createdAt || now,
    }, maps);
  }
}

/**
 * 结算入账：把快照 strokes 上的墨掉落写入 inkHistory（与 sessions 对照）
 * 幂等：同一 sessionEndedAt + strokeIndex 不重复入账
 */
function applyPracticeInkDropsFromSnapshot(stats, snapshot) {
  if (!stats || typeof stats !== 'object' || !snapshot) return stats;
  if (typeof gainInk !== 'function') return stats;

  const strokes = Array.isArray(snapshot.strokes) ? snapshot.strokes : [];
  const sessionAt = snapshot.endedAt || snapshot.createdAt || new Date().toISOString();
  const history = Array.isArray(stats.inkHistory) ? stats.inkHistory : [];

  for (let i = 0; i < strokes.length; i += 1) {
    const stroke = strokes[i];
    const amount = Math.floor(Number(stroke?.inkDrop) || 0);
    if (amount <= 0 || !stroke?.id) continue;

    const already = history.some((entry) => (
      entry?.reason === 'practice-ink-drop'
      && entry?.ref
      && entry.ref.sessionEndedAt === sessionAt
      && Number(entry.ref.strokeIndex) === i
    ));
    if (already) continue;

    gainInk(stats, amount, {
      reason: 'practice-ink-drop',
      source: 'practice-session',
      at: sessionAt,
      ref: {
        sessionEndedAt: sessionAt,
        strokeIndex: i,
        ziId: String(stroke.id),
        inkDrop: amount,
      },
    });
  }
  return stats;
}

function applySnapshotToUserStats(stats, snapshot, maps) {
  // 政策：新练习永远只追加 sessions；chars 为旧数据兼容冻结层，禁止日常 merge 写入
  // 仅当 meta.committedToLevels === true（显式、遗留）时才改 chars
  if (isSnapshotCommittedToLevels(snapshot)) {
    mergeSnapshotItemsIntoStats(stats, snapshot, maps);
  }
  if (!Array.isArray(stats.sessions)) stats.sessions = [];
  stats.sessions.push(snapshotToPracticeSession(snapshot));
  // Unique / 墨掉落均随结算写入；墨同时记 inkHistory
  applyPracticeInkDropsFromSnapshot(stats, snapshot);
  return stats;
}

function refreshUserSummary(stats) {
  const items = Object.values(stats.chars || {});
  const sessionsLen = Array.isArray(stats.sessions) ? stats.sessions.length : 0;
  stats.summary = {
    uniqueChars: items.length,
    totalAppearances: items.reduce((sum, item) => sum + (item.count || 0), 0),
    sessionCount: sessionsLen,
  };
  stats.updatedAt = new Date().toISOString();
  stats.version = USER_STATS_DISK_VERSION;
  return stats;
}

function migrateStatsToIdKeys(stats, maps) {
  const { charToId, idToChar } = maps;
  const next = {};

  for (const [key, item] of Object.entries(stats.chars || {})) {
    const id = resolveItemId({
      ...item,
      id: item?.id || (/^[ck]\.[0-9A-F]{5}\.\d{2}$/i.test(key) ? key : ''),
    }, charToId)
      || resolveItemId({ char: key, script: item?.script }, charToId);
    if (!id) continue;

    const catalogChar = idToChar.get(id) || '';
    const existing = next[id];
    if (!existing) {
      next[id] = {
        ...(catalogChar ? { char: catalogChar } : {}),
        count: item.count || 0,
        firstSeenAt: item.firstSeenAt || null,
        lastSeenAt: item.lastSeenAt || null,
      };
      continue;
    }
    existing.count = (existing.count || 0) + (item.count || 0);
    if (item.firstSeenAt && (!existing.firstSeenAt || item.firstSeenAt < existing.firstSeenAt)) {
      existing.firstSeenAt = item.firstSeenAt;
    }
    if (item.lastSeenAt && (!existing.lastSeenAt || item.lastSeenAt > existing.lastSeenAt)) {
      existing.lastSeenAt = item.lastSeenAt;
    }
  }

  stats.chars = next;
  annotateStatsChars(stats, idToChar);
  return stats;
}

function parseSnapshotData(raw) {
  const text = String(raw || '').trim();
  if (!text) throw new Error('快照内容为空');

  let data;
  try {
    data = JSON.parse(text);
  } catch (error) {
    throw new Error(`无法解析 JSON：${error.message}`);
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('快照必须是 JSON 对象');
  }

  const hasItems = Array.isArray(data.items);
  const hasStrokes = Array.isArray(data.strokes) && data.strokes.length > 0;
  if (!hasItems && !hasStrokes) {
    throw new Error('快照缺少 strokes 或 items');
  }

  return data;
}

/**
 * 合并快照进总账对象（不读写文件）
 * @returns {{ stats: object, snapshot: object }}
 */
function mergeSnapshotIntoUserStats(stats, snapshot, maps, userId) {
  const normalized = normalizeUserStats(stats, userId);
  migrateStatsToIdKeys(normalized, maps);
  applySnapshotToUserStats(normalized, snapshot, maps);
  annotateStatsChars(normalized, maps.idToChar);
  refreshUserSummary(normalized);
  return normalized;
}

function userIdFromFileName(fileName) {
  const match = /^user-(.+)\.json$/i.exec(fileName);
  if (match) return match[1];
  if (/^user\.json$/i.test(fileName)) return 'default';
  return String(fileName || '').replace(/\.json$/i, '');
}

function isUserJsonFileName(name) {
  return /^user(-[\w.-]+)?\.json$/i.test(name) && !/\.example\.json$/i.test(name);
}

function buildUsersIndexFromStatsList(entries) {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    users: entries.map(({ id, file, data }) => ({
      id,
      file,
      name: id,
      updatedAt: data?.updatedAt || null,
      summary: data?.summary || null,
    })),
  };
}
