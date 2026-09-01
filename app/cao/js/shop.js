/**
 * Unique 卡商店（货架历史：local/shop-sessions.json；按用户售罄：user JSON 的 shopBuys）
 * 每日北京时间 06:00 刷新 3 张；当日货架共享，是否已买按用户各自判断。
 */

const SHOP_SESSIONS_FILE = 'shop-sessions.json';
const SHOP_REFRESH_HOUR_BEIJING = 6;
const SHOP_OFFER_COUNT = 3;
const SHOP_PRICE_MOD_MIN = -0.2;
const SHOP_PRICE_MOD_MAX = 0.4;
const SHOP_HISTORY_VERSION = 1;

function emptyShopHistory() {
  return {
    version: SHOP_HISTORY_VERSION,
    sessions: [],
  };
}

/** 北京时间日历部件 */
function getBeijingDateParts(date = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date)
      .filter((p) => p.type !== 'literal')
      .map((p) => [p.type, p.value]),
  );
  let hour = Number(parts.hour);
  if (hour === 24) hour = 0;
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number.isFinite(hour) ? hour : 0,
    minute: Number(parts.minute) || 0,
    second: Number(parts.second) || 0,
  };
}

/** 商店日键：当天 06:00（北京）起算；06:00 前仍属前一日 */
function getShopDayKey(date = new Date()) {
  const parts = getBeijingDateParts(date);
  let { year, month, day, hour } = parts;
  if (hour < SHOP_REFRESH_HOUR_BEIJING) {
    const utc = new Date(Date.UTC(year, month - 1, day));
    utc.setUTCDate(utc.getUTCDate() - 1);
    year = utc.getUTCFullYear();
    month = utc.getUTCMonth() + 1;
    day = utc.getUTCDate();
  }
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** 下一次北京 06:00 刷新时刻（Date） */
function getNextShopRefreshAt(date = new Date()) {
  const parts = getBeijingDateParts(date);
  let { year, month, day, hour, minute, second } = parts;
  const pastTodayRefresh = hour > SHOP_REFRESH_HOUR_BEIJING
    || (hour === SHOP_REFRESH_HOUR_BEIJING && (minute > 0 || second > 0));
  if (pastTodayRefresh) {
    const utc = new Date(Date.UTC(year, month - 1, day));
    utc.setUTCDate(utc.getUTCDate() + 1);
    year = utc.getUTCFullYear();
    month = utc.getUTCMonth() + 1;
    day = utc.getUTCDate();
  }
  const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(SHOP_REFRESH_HOUR_BEIJING).padStart(2, '0')}:00:00+08:00`;
  return new Date(iso);
}

/** 距下次刷新剩余毫秒 */
function getMsUntilNextShopRefresh(date = new Date()) {
  return Math.max(0, getNextShopRefreshAt(date).getTime() - date.getTime());
}

/** 倒计时文案：H:MM:SS */
function formatShopRefreshCountdown(ms) {
  const totalSec = Math.max(0, Math.floor(Number(ms) / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function normalizeShopHistory(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return emptyShopHistory();
  const sessions = Array.isArray(raw.sessions) ? raw.sessions.map(normalizeShopSession).filter(Boolean) : [];
  return {
    version: Number(raw.version) || SHOP_HISTORY_VERSION,
    sessions,
  };
}

function normalizeShopSession(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const day = raw.day != null ? String(raw.day) : '';
  if (!day) return null;
  const offers = Array.isArray(raw.offers)
    ? raw.offers.map((offer, index) => normalizeShopOffer(offer, day, index)).filter(Boolean)
    : [];
  return {
    day,
    refreshedAt: raw.refreshedAt || null,
    offers,
  };
}

function normalizeShopOffer(raw, day, index) {
  if (!raw || typeof raw !== 'object') return null;
  const ziId = raw.ziId != null ? String(raw.ziId) : (raw.id != null ? String(raw.id) : '');
  if (!ziId) return null;
  const styleIn = raw.cardStyle || {};
  const cardStyle = typeof normalizeCardStyleRecord === 'function'
    ? normalizeCardStyleRecord(styleIn)
    : styleIn;
  if (!cardStyle) return null;
  const basePrice = Math.max(
    0,
    Math.floor(
      Number(raw.basePrice) >= 0
        ? Number(raw.basePrice)
        : (typeof computeUniqueShopBasePrice === 'function' ? computeUniqueShopBasePrice(cardStyle) : 0),
    ),
  );
  const priceMod = Number.isFinite(Number(raw.priceMod))
    ? Number(raw.priceMod)
    : 0;
  const price = Math.max(
    0,
    Math.floor(
      Number(raw.price) >= 0
        ? Number(raw.price)
        : (typeof applyShopPriceModifier === 'function'
          ? applyShopPriceModifier(basePrice, priceMod)
          : basePrice),
    ),
  );
  return {
    id: raw.id != null ? String(raw.id) : `${day}-${index}`,
    slot: Math.max(0, Math.floor(Number(raw.slot) || index)),
    ziId,
    char: raw.char != null ? String(raw.char) : '',
    script: raw.script != null ? String(raw.script) : 'cao',
    cardStyle,
    basePrice,
    priceMod,
    price,
    ciHao: (() => {
      const n = Math.floor(Number(raw.ciHao ?? raw.ci));
      if (Number.isFinite(n) && n >= 1 && n <= 20) return n;
      return null;
    })(),
  };
}

function findShopSessionByDay(history, day) {
  const list = history?.sessions || [];
  for (let i = list.length - 1; i >= 0; i -= 1) {
    if (list[i]?.day === day) return list[i];
  }
  return null;
}

function shopOfferFingerprint(ziId, cardStyle) {
  return [
    String(ziId || ''),
    cardStyle?.colorSchemeId || '',
    cardStyle?.cardBase || '',
    cardStyle?.cardModifier || '',
    cardStyle?.decorationId || '',
  ].join('|');
}

/** 价格浮动 −20%～+40%（含端点） */
function rollShopPriceMod(rng = Math.random) {
  const next = typeof rng === 'function' ? rng : Math.random;
  const span = SHOP_PRICE_MOD_MAX - SHOP_PRICE_MOD_MIN;
  return SHOP_PRICE_MOD_MIN + next() * span;
}

/** 商店次号：1–20（含） */
function rollShopCiHao(rng = Math.random) {
  const next = typeof rng === 'function' ? rng : Math.random;
  return 1 + Math.floor(next() * 20);
}

function resolveShopCiHao(value, rng = Math.random) {
  const n = Math.floor(Number(value));
  if (Number.isFinite(n) && n >= 1 && n <= 20) return n;
  return rollShopCiHao(rng);
}

/**
 * 强制出一张非空 unique 词条（不过门控）
 * @returns {object|null} cardStyle
 */
function rollShopCardStyle(rng = Math.random) {
  const next = typeof rng === 'function' ? rng : Math.random;
  if (typeof rollCardStyleForAppearance !== 'function') return null;

  for (let attempt = 0; attempt < 48; attempt += 1) {
    let first = true;
    const gateRng = () => {
      if (first) {
        first = false;
        return 0;
      }
      return next();
    };
    const rolled = rollCardStyleForAppearance(gateRng);
    if (rolled?.isUnique && rolled.cardStyle) {
      const normalized = typeof normalizeCardStyleRecord === 'function'
        ? normalizeCardStyleRecord(rolled.cardStyle)
        : rolled.cardStyle;
      if (normalized && (typeof computeUniqueDismantleInk !== 'function' || computeUniqueDismantleInk(normalized) > 0)) {
        return normalized;
      }
    }
  }

  // 兜底：单配色
  if (typeof pickRandomColorScheme === 'function' && typeof buildCardStyleRecord === 'function') {
    const scheme = pickRandomColorScheme(next);
    if (scheme) return buildCardStyleRecord(scheme.id, null, null, null);
  }
  return null;
}

function shuffleInPlace(list, rng = Math.random) {
  const next = typeof rng === 'function' ? rng : Math.random;
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(next() * (i + 1));
    const tmp = list[i];
    list[i] = list[j];
    list[j] = tmp;
  }
  return list;
}

/**
 * @param {Array<{ id: string, char: string, script?: string }>} catalogWithPng
 * @param {{ day?: string, refreshedAt?: string, rng?: function }} [options]
 */
function generateShopSession(catalogWithPng, options = {}) {
  const day = options.day || getShopDayKey();
  const refreshedAt = options.refreshedAt || new Date().toISOString();
  const rng = typeof options.rng === 'function' ? options.rng : Math.random;
  const pool = Array.isArray(catalogWithPng) ? catalogWithPng.slice() : [];
  shuffleInPlace(pool, rng);

  const offers = [];
  const usedZi = new Set();
  const usedFp = new Set();

  for (const entry of pool) {
    if (offers.length >= SHOP_OFFER_COUNT) break;
    const ziId = String(entry?.id || '');
    if (!ziId || usedZi.has(ziId)) continue;

    let cardStyle = null;
    for (let t = 0; t < 16; t += 1) {
      const candidate = rollShopCardStyle(rng);
      if (!candidate) continue;
      const fp = shopOfferFingerprint(ziId, candidate);
      if (usedFp.has(fp)) continue;
      cardStyle = candidate;
      usedFp.add(fp);
      break;
    }
    if (!cardStyle) continue;

    const basePrice = typeof computeUniqueShopBasePrice === 'function'
      ? computeUniqueShopBasePrice(cardStyle)
      : 0;
    if (basePrice <= 0) continue;

    const priceMod = rollShopPriceMod(rng);
    const price = typeof applyShopPriceModifier === 'function'
      ? applyShopPriceModifier(basePrice, priceMod)
      : Math.round(basePrice * (1 + priceMod));
    const ciHao = rollShopCiHao(rng);

    const slot = offers.length;
    usedZi.add(ziId);
    offers.push({
      id: `${day}-${slot}`,
      slot,
      ziId,
      char: entry.char || ziId,
      script: entry.script || 'cao',
      cardStyle,
      basePrice,
      priceMod,
      price,
      ciHao,
    });
  }

  return {
    day,
    refreshedAt,
    offers,
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SHOP_SESSIONS_FILE,
    SHOP_OFFER_COUNT,
    emptyShopHistory,
    getShopDayKey,
    getNextShopRefreshAt,
    getMsUntilNextShopRefresh,
    formatShopRefreshCountdown,
    normalizeShopHistory,
    findShopSessionByDay,
    generateShopSession,
    rollShopPriceMod,
    rollShopCiHao,
    resolveShopCiHao,
    rollShopCardStyle,
    shopOfferFingerprint,
  };
}
