/**
 * 默认模式抽字：chance distribution（10 等份）
 *
 * A 2/10 最久未见 · B 5/10 过滤池随机 · C 2/10 近期加入 · D 1/10 强制近期
 * 正常过滤字库 = 总字库 − 近期做过的字（按字库规模）− 本轮已练过的字
 * 近期剔除：字库 >100 → 50；>50 → 20；≥30 → 5；<30 → 0
 * D 唯一无视「近期做过」过滤，仅排除本轮已出现。
 */

const DEFAULT_CHANCE_SHARES = 10;
/** 兼容旧引用：历史剔除上限（大字库档） */
const DEFAULT_CHANCE_HISTORY_EXCLUDE = 50;
const DEFAULT_CHANCE_RECENT_JOIN = 10;

/**
 * 按当前练习字库规模决定「近期做过」剔除条数
 * >100 → 50；>50 → 20；≥30 → 5；<30 → 0
 */
function resolveRecentHistoryExcludeCount(librarySize) {
  const n = Math.max(0, Math.floor(Number(librarySize) || 0));
  if (n > 100) return 50;
  if (n > 50) return 20;
  if (n >= 30) return 5;
  return 0;
}

/** @typedef {{ id: string, label: string, shares: number, detail: string }} DefaultChanceRuleMeta */

class DefaultModeChance {
  constructor() {
    /** @type {Map<string, string>} id → 最近一次练习时间（ISO 或可比较字符串） */
    this.lastSeenById = new Map();
    /** 历史中按最近练习排序的 id 列表（新→旧） */
    this.recentHistoryIds = [];
  }

  /** 默认模式规则元数据（按几率降序：B5 A2 C2 D1） */
  static getRulesMeta() {
    /** @type {DefaultChanceRuleMeta[]} */
    const rules = [
      {
        id: 'B',
        label: '默认随机',
        shares: 5,
        detail: '在正常过滤字库中均匀随机选一字。正常过滤 = 总字库去掉「近期做过」的字（字库>100 剔 50、>50 剔 20、≥30 剔 5、<30 不剔），以及本轮已练过的字。',
      },
      {
        id: 'A',
        label: '最久未见',
        shares: 2,
        detail: '在正常过滤字库中，按上次练习时间从新到旧排列后取最后一个字（与等级页「顺序」末位一致：从未练过的优先落在末尾，否则取最久未练的字）。',
      },
      {
        id: 'C',
        label: '近期练习',
        shares: 2,
        detail: '若正常过滤字库中仍含「字库加入时间最晚的 10 字」之一，则从这些字中随机选一；否则回退为默认随机。',
      },
      {
        id: 'D',
        label: '强制近期',
        shares: 1,
        detail: '无视「近期做过」过滤，仅排除本轮已出现。从加入最晚的 10 字中选；触发几率 = 本轮尚未练到的近期字数 / 10。未触发或无可选时回退为默认随机。',
      },
    ];
    return rules;
  }

  /** 随机模式：仅 B 7/10 + A 3/10（无近期练习 / 强制近期） */
  static getRandomModeRulesMeta() {
    /** @type {DefaultChanceRuleMeta[]} */
    return [
      {
        id: 'B',
        label: '默认随机',
        shares: 7,
        detail: '在正常过滤字库中均匀随机选一字。正常过滤 = 总字库去掉「近期做过」的字，以及本轮已练过的字。',
      },
      {
        id: 'A',
        label: '最久未见',
        shares: 3,
        detail: '在正常过滤字库中，按上次练习时间取最久未见的一字。',
      },
    ];
  }

  /**
   * 从用户 sessions（及可选 chars.lastSeenAt）重建最近练习索引
   * @param {{ sessions?: any[], chars?: Record<string, any> } | null} stats
   */
  loadFromUserStats(stats) {
    const lastSeenById = new Map();

    const chars = stats?.chars;
    if (chars && typeof chars === 'object') {
      for (const [id, item] of Object.entries(chars)) {
        // 与等级页「顺序」一致：lastSeenAt 优先，否则 firstSeenAt
        const t = item?.lastSeenAt || item?.firstSeenAt;
        if (id && t) lastSeenById.set(String(id), String(t));
      }
    }

    for (const session of stats?.sessions || []) {
      if (session?.mode === 'recognize') continue;
      const ended = session?.endedAt || session?.startedAt || null;
      if (!ended) continue;
      const stamp = String(ended);
      for (const stroke of session?.strokes || []) {
        const id = stroke?.id ? String(stroke.id) : '';
        if (!id) continue;
        const prev = lastSeenById.get(id);
        if (!prev || stamp > prev) lastSeenById.set(id, stamp);
      }
    }

    this.lastSeenById = lastSeenById;
    this.recentHistoryIds = [...lastSeenById.entries()]
      .sort((a, b) => {
        if (a[1] === b[1]) return 0;
        return a[1] > b[1] ? -1 : 1;
      })
      .map(([id]) => id);
  }

  clearHistory() {
    this.lastSeenById = new Map();
    this.recentHistoryIds = [];
  }

  /**
   * 历史最近练习过、按字库规模应剔除的 id 集合
   * @param {number} [librarySize] 当前练习字库大小；缺省按大字库档（50）
   */
  getRecentHistoryExcludeSet(librarySize = DEFAULT_CHANCE_HISTORY_EXCLUDE + 1) {
    const limit = resolveRecentHistoryExcludeCount(librarySize);
    if (limit <= 0) return new Set();
    return new Set(this.recentHistoryIds.slice(0, limit));
  }

  /**
   * 正常过滤字库
   * @param {any[]} library
   * @param {Set<string>|string[]} sessionSeenKeys
   */
  buildNormalFilteredPool(library, sessionSeenKeys) {
    const sessionSeen = sessionSeenKeys instanceof Set
      ? sessionSeenKeys
      : new Set(sessionSeenKeys || []);
    const lib = Array.isArray(library) ? library : [];
    const historyExclude = this.getRecentHistoryExcludeSet(lib.length);
    const keyOf = typeof entryKey === 'function' ? entryKey : ((e) => e?.id || e?.char || '');

    const filtered = lib.filter((entry) => {
      const key = keyOf(entry);
      if (!key) return false;
      if (sessionSeen.has(key)) return false;
      if (historyExclude.has(key)) return false;
      return true;
    });

    if (filtered.length > 0) return filtered;

    // 近期剔除把池子抽空时：仅保留本轮过滤
    const soft = lib.filter((entry) => {
      const key = keyOf(entry);
      return key && !sessionSeen.has(key);
    });
    return soft.length > 0 ? soft : lib;
  }

  /**
   * 加入字库时间最晚的 N 个字（以默认 catalog 顺序为加入序，取末尾）
   * @param {any[]} library 当前练习库
   * @param {number} [count]
   */
  getRecentJoinEntries(library, count = DEFAULT_CHANCE_RECENT_JOIN) {
    const keyOf = typeof entryKey === 'function' ? entryKey : ((e) => e?.id || e?.char || '');
    const order = typeof getDefaultOrder === 'function' ? getDefaultOrder() : [];
    const indexByKey = new Map(order.map((k, i) => [k, i]));

    const ranked = [];
    for (const entry of library || []) {
      const key = keyOf(entry);
      if (!key || !indexByKey.has(key)) continue;
      ranked.push({ entry, idx: indexByKey.get(key) });
    }
    ranked.sort((a, b) => b.idx - a.idx);
    return ranked.slice(0, count).map((row) => row.entry);
  }

  /**
   * @param {any[]} pool
   * @param {() => number} rng
   */
  pickUniformFrom(pool, rng) {
    if (!pool || pool.length === 0) return null;
    const roll = typeof rng === 'function' ? rng() : Math.random();
    const index = Math.floor(roll * pool.length) % pool.length;
    return pool[index];
  }

  /**
   * A：最久未见 = 过滤池按「顺序」排后的末位
   * （新→旧；无练习记录的排在最后；同分再按字序）
   * @param {any[]} pool
   * @param {() => number} [_rng]
   */
  pickLongestUnseen(pool, _rng) {
    if (!pool || pool.length === 0) return null;
    const keyOf = typeof entryKey === 'function' ? entryKey : ((e) => e?.id || e?.char || '');

    const ranked = pool.slice().sort((a, b) => {
      const ka = keyOf(a);
      const kb = keyOf(b);
      const ta = this.lastSeenById.get(ka) || '';
      const tb = this.lastSeenById.get(kb) || '';
      if (ta && tb && ta !== tb) return ta > tb ? -1 : 1;
      if (ta && !tb) return -1;
      if (!ta && tb) return 1;
      return String(a.char || ka || '').localeCompare(String(b.char || kb || ''), 'zh');
    });

    return ranked[ranked.length - 1] || null;
  }

  /**
   * B：过滤池随机
   * @param {any[]} normalPool
   * @param {() => number} rng
   */
  pickDefaultRandom(normalPool, rng) {
    return this.pickUniformFrom(normalPool, rng);
  }

  /**
   * C：近期练习（过滤池 ∩ 近 10 加入）；空则 B
   * @param {any[]} normalPool
   * @param {any[]} recentJoin
   * @param {() => number} rng
   */
  pickRecentInFiltered(normalPool, recentJoin, rng) {
    const keyOf = typeof entryKey === 'function' ? entryKey : ((e) => e?.id || e?.char || '');
    const filteredKeys = new Set(normalPool.map((e) => keyOf(e)).filter(Boolean));
    const intersect = (recentJoin || []).filter((e) => filteredKeys.has(keyOf(e)));
    if (intersect.length === 0) return this.pickDefaultRandom(normalPool, rng);
    return this.pickUniformFrom(intersect, rng);
  }

  /**
   * D：强制近期（无视历史 50；本轮未见的近 10 字）；触发几率 = unseen/10
   * @param {any[]} recentJoin
   * @param {Set<string>|string[]} sessionSeenKeys
   * @param {any[]} normalPool 触发失败时回退 B
   * @param {() => number} rng
   */
  pickForceRecent(recentJoin, sessionSeenKeys, normalPool, rng) {
    const keyOf = typeof entryKey === 'function' ? entryKey : ((e) => e?.id || e?.char || '');
    const sessionSeen = sessionSeenKeys instanceof Set
      ? sessionSeenKeys
      : new Set(sessionSeenKeys || []);

    const unseen = (recentJoin || []).filter((entry) => {
      const key = keyOf(entry);
      return key && !sessionSeen.has(key);
    });

    const triggerChance = unseen.length / DEFAULT_CHANCE_RECENT_JOIN;
    const roll = typeof rng === 'function' ? rng() : Math.random();
    if (unseen.length === 0 || roll >= triggerChance) {
      return this.pickDefaultRandom(normalPool, rng);
    }
    return this.pickUniformFrom(unseen, rng);
  }

  /**
   * 按 10 等份抽规则并选字
   * @param {{
   *   library: any[],
   *   sessionSeenKeys?: Set<string>|string[],
   *   rng?: () => number,
   *   forceRuleId?: string,
   *   profile?: 'default'|'random'|'time',
   * }} options
   * @returns {{ entry: any, ruleId: string, fellBack: boolean, normalPoolSize: number } | null}
   */
  pick(options) {
    const library = options?.library || [];
    if (library.length === 0) return null;

    const rng = options.rng || Math.random;
    const sessionSeen = options.sessionSeenKeys || new Set();
    const normalPool = this.buildNormalFilteredPool(library, sessionSeen);
    const recentJoin = this.getRecentJoinEntries(library, DEFAULT_CHANCE_RECENT_JOIN);
    const profile = options.profile ? String(options.profile) : 'default';

    const forceRuleId = options.forceRuleId ? String(options.forceRuleId) : '';
    let ruleId;
    let fellBack = false;
    let entry;

    // 随机模式：B 7/10 · A 3/10（无 C/D）
    if (profile === 'random' && forceRuleId !== 'D') {
      const share = Math.floor(rng() * DEFAULT_CHANCE_SHARES);
      if (share < 7) {
        ruleId = 'B';
        entry = this.pickDefaultRandom(normalPool, rng);
      } else {
        ruleId = 'A';
        entry = this.pickLongestUnseen(normalPool, rng);
      }
      if (!entry) entry = this.pickDefaultRandom(normalPool, rng) || library[0];
      return { entry, ruleId, fellBack, normalPoolSize: normalPool.length };
    }

    const share = forceRuleId === 'D' || profile === 'time'
      ? 9
      : Math.floor(rng() * DEFAULT_CHANCE_SHARES);

    if (share < 5) {
      ruleId = 'B';
      entry = this.pickDefaultRandom(normalPool, rng);
    } else if (share < 7) {
      ruleId = 'A';
      entry = this.pickLongestUnseen(normalPool, rng);
    } else if (share < 9) {
      ruleId = 'C';
      const keyOf = typeof entryKey === 'function' ? entryKey : ((e) => e?.id || e?.char || '');
      const filteredKeys = new Set(normalPool.map((e) => keyOf(e)).filter(Boolean));
      const intersect = (recentJoin || []).filter((e) => filteredKeys.has(keyOf(e)));
      if (intersect.length > 0) {
        entry = this.pickUniformFrom(intersect, rng);
      } else {
        fellBack = true;
        entry = this.pickDefaultRandom(normalPool, rng);
      }
    } else {
      ruleId = 'D';
      const keyOf = typeof entryKey === 'function' ? entryKey : ((e) => e?.id || e?.char || '');
      const seen = sessionSeen instanceof Set ? sessionSeen : new Set(sessionSeen || []);
      const unseen = (recentJoin || []).filter((e) => {
        const key = keyOf(e);
        return key && !seen.has(key);
      });
      const triggerChance = unseen.length / DEFAULT_CHANCE_RECENT_JOIN;
      const triggerRoll = rng();
      if (unseen.length > 0 && triggerRoll < triggerChance) {
        entry = this.pickUniformFrom(unseen, rng);
      } else {
        fellBack = true;
        entry = this.pickDefaultRandom(normalPool, rng);
      }
    }

    if (!entry) {
      entry = this.pickDefaultRandom(normalPool, rng) || library[0];
      if (ruleId === 'C' || ruleId === 'D') fellBack = true;
    }
    return { entry, ruleId, fellBack, normalPoolSize: normalPool.length };
  }
}

/** 练字页单例 */
const defaultModeChance = new DefaultModeChance();
