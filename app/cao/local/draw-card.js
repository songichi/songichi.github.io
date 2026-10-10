#!/usr/bin/env node
/**
 * 模拟抽取 unique 组件（按当前库权重与组件出现概率）
 *
 *   cd app/cao/local
 *   node draw 100
 *   ./draw 50
 *
 * 说明：
 * - 直接调用练字同款 rollCardStyleForAppearance（同概率、同 weight 池）
 * - 仅强制跳过「先 1/10 是否 unique」门控；门控后逻辑完全一致
 * - 三项皆空记为「roll空」（对应实战不当 unique）
 * - 不含次号
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const LOCAL_DIR = __dirname;
const JS_DIR = path.join(LOCAL_DIR, '..', 'js');

function loadCardStyleApi() {
  const sandbox = {
    console,
    Map,
    Set,
    Array,
    Object,
    String,
    Number,
    Math,
    Date,
    JSON,
    parseInt,
    parseFloat,
    isFinite,
    Infinity,
    undefined,
    globalThis: null,
  };
  sandbox.globalThis = sandbox;
  const context = vm.createContext(sandbox);
  const files = [
    'unique-drop-rates.js',
    'card-style.js',
    'card-color-schemes.js',
    'card-bases.js',
    'card-modifiers.js',
  ];
  for (const file of files) {
    const code = fs.readFileSync(path.join(JS_DIR, file), 'utf8');
    vm.runInContext(code, context, { filename: file });
  }

  // top-level const/let 不在 global 属性上，需在沙箱内显式导出
  return vm.runInContext(`({
    CARD_DEFAULT_COLOR_SCHEME_ID,
    CARD_UNIQUE_APPEARANCE_CHANCE,
    CARD_COLOR_SCHEME_APPEARANCE_CHANCE,
    CARD_BASE_APPEARANCE_CHANCE,
    CARD_MODIFIER_APPEARANCE_CHANCE,
    CARD_COLOR_SCHEME_LIBRARY,
    CARD_BASE_LIBRARY,
    CARD_MODIFIER_LIBRARY,
    rollCardStyleForAppearance,
    getColorSchemeById,
    getCardBaseById,
    getCardModifierById,
  })`, context);
}

function parseCount(argv) {
  const raw = argv[2];
  if (raw == null || raw === '') {
    console.error('用法: node draw <张数>\n例如: node draw 100');
    process.exit(1);
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) {
    console.error(`张数须为正整数，收到: ${raw}`);
    process.exit(1);
  }
  if (n > 1000000) {
    console.error('张数过大（上限 1000000）');
    process.exit(1);
  }
  return n;
}

/**
 * 与练字相同的 rollCardStyleForAppearance，但强制通过 unique 门控。
 * 门控后三项独立掷骰；全空 → roll空（与实战「不当 unique」一致）。
 * @returns {{ empty: true } | { empty: false, cardStyle: object }}
 */
function rollOneAttempt(api) {
  let gateConsumed = false;
  const rng = () => {
    // 第一次掷骰专供门控：返回 0 必过（next() < 1/10）；其后与练字相同
    if (!gateConsumed) {
      gateConsumed = true;
      return 0;
    }
    return Math.random();
  };

  const result = api.rollCardStyleForAppearance(rng);
  if (!result?.isUnique || !result.cardStyle) return { empty: true };
  return { empty: false, cardStyle: result.cardStyle };
}

function bump(map, key) {
  if (!key) {
    map.set('(无)', (map.get('(无)') || 0) + 1);
    return;
  }
  map.set(key, (map.get(key) || 0) + 1);
}

function safeWeight(item) {
  const w = Number(item?.weight);
  return Number.isFinite(w) && w > 0 ? w : 1;
}

/** @returns {Map<string, { weight: number, share: number, expected: number }>} */
function buildWeightedExpectations(library, appearanceChance, totalDraws, { excludeId = null } = {}) {
  const pool = (library || []).filter((item) => item?.id && item.id !== excludeId);
  let totalWeight = 0;
  const weights = new Map();
  for (const item of pool) {
    const w = safeWeight(item);
    weights.set(item.id, w);
    totalWeight += w;
  }

  const pAppear = Number(appearanceChance) || 0;
  const meta = new Map();
  for (const [id, w] of weights) {
    const share = totalWeight > 0 ? w / totalWeight : 0;
    const overall = pAppear * share;
    meta.set(id, {
      weight: w,
      share,
      overall,
      expected: totalDraws * overall,
    });
  }
  meta.set('(无)', {
    weight: null,
    share: 1 - pAppear,
    overall: 1 - pAppear,
    expected: totalDraws * (1 - pAppear),
  });
  return {
    byId: meta,
    totalWeight,
    appearExpected: totalDraws * pAppear,
    appearChance: pAppear,
  };
}

function formatCountMap(map, knownIds = [], expectMeta = null) {
  const keys = new Set([...knownIds, ...map.keys()]);
  const lines = [];
  for (const id of [...keys].sort((a, b) => {
    if (a === '(无)') return 1;
    if (b === '(无)') return -1;
    return String(a).localeCompare(String(b));
  })) {
    const count = map.get(id) || 0;
    const exp = expectMeta?.byId?.get(id);
    if (exp) {
      const weightPart = exp.weight == null ? '' : `, weight=${exp.weight}`;
      lines.push(
        `  ${id}: ${count}`
        + `（期望 ${exp.expected.toFixed(1)}, ${(exp.overall * 100).toFixed(2)}%${weightPart}）`,
      );
    } else {
      lines.push(`  ${id}: ${count}`);
    }
  }
  return lines.join('\n');
}

function formatAppearLine(label, hitCount, totalDraws, expectMeta) {
  const rate = hitCount / totalDraws;
  const expCount = expectMeta.appearExpected;
  const expRate = expectMeta.appearChance;
  return (
    `  出现${label}: ${hitCount} / ${totalDraws}`
    + `（${(rate * 100).toFixed(1)}%，期望 ${expCount.toFixed(1)} / ${(expRate * 100).toFixed(1)}%）`
  );
}

function main() {
  const count = parseCount(process.argv);
  const api = loadCardStyleApi();

  const schemeLib = (api.CARD_COLOR_SCHEME_LIBRARY || [])
    .filter((item) => item.id !== api.CARD_DEFAULT_COLOR_SCHEME_ID);
  const baseLib = api.CARD_BASE_LIBRARY || [];
  const modLib = api.CARD_MODIFIER_LIBRARY || [];

  const schemeIds = schemeLib.map((item) => item.id);
  const baseIds = baseLib.map((item) => item.id);
  const modIds = modLib.map((item) => item.id);

  const schemeCounts = new Map();
  const baseCounts = new Map();
  const modCounts = new Map();
  let emptyCount = 0;

  const pS = Number(api.CARD_COLOR_SCHEME_APPEARANCE_CHANCE) || 0;
  const pB = Number(api.CARD_BASE_APPEARANCE_CHANCE) || 0;
  const pM = Number(api.CARD_MODIFIER_APPEARANCE_CHANCE) || 0;
  const pEmpty = (1 - pS) * (1 - pB) * (1 - pM);

  const schemeExpect = buildWeightedExpectations(
    api.CARD_COLOR_SCHEME_LIBRARY,
    pS,
    count,
    { excludeId: api.CARD_DEFAULT_COLOR_SCHEME_ID },
  );
  const baseExpect = buildWeightedExpectations(baseLib, pB, count);
  const modExpect = buildWeightedExpectations(modLib, pM, count);

  console.log(`模拟掷骰 ${count} 次（跳过 unique 门控；全空记为 roll空）\n`);
  console.log(
    `组件独立概率: 配色 ${api.CARD_COLOR_SCHEME_APPEARANCE_CHANCE} / `
    + `底纹 ${api.CARD_BASE_APPEARANCE_CHANCE} / `
    + `修饰 ${api.CARD_MODIFIER_APPEARANCE_CHANCE}`
    + `（期望 roll空 ${(pEmpty * 100).toFixed(1)}%）`,
  );
  console.log('');

  for (let i = 1; i <= count; i += 1) {
    const result = rollOneAttempt(api);

    if (result.empty) {
      emptyCount += 1;
      bump(schemeCounts, null);
      bump(baseCounts, null);
      bump(modCounts, null);
      console.log(`#${i}  roll空`);
      continue;
    }

    const style = result.cardStyle;
    const scheme = style.colorSchemeId || null;
    const base = style.cardBase || null;
    const mod = style.cardModifier || null;

    bump(schemeCounts, scheme);
    bump(baseCounts, base);
    bump(modCounts, mod);

    const parts = [];
    if (scheme) {
      const s = api.getColorSchemeById?.(scheme);
      parts.push(`colorScheme=${scheme}${s?.name ? `(${s.name})` : ''}`);
    }
    if (base) {
      const b = api.getCardBaseById?.(base);
      parts.push(`cardBase=${base}${b?.name ? `(${b.name})` : ''}`);
    }
    if (mod) {
      const m = api.getCardModifierById?.(mod);
      parts.push(`cardModifier=${mod}${m?.name ? `(${m.name})` : ''}`);
    }
    console.log(`#${i}  ${parts.join('  ')}`);
  }

  console.log('\n======== 总结 ========');
  console.log(`合计: ${count} 次掷骰\n`);

  const schemeHit = count - (schemeCounts.get('(无)') || 0);
  const baseHit = count - (baseCounts.get('(无)') || 0);
  const modHit = count - (modCounts.get('(无)') || 0);

  console.log('colorScheme:');
  console.log(formatCountMap(schemeCounts, schemeIds, schemeExpect));
  console.log(formatAppearLine('配色', schemeHit, count, schemeExpect));

  console.log('\ncardBase:');
  console.log(formatCountMap(baseCounts, baseIds, baseExpect));
  console.log(formatAppearLine('底纹', baseHit, count, baseExpect));

  console.log('\ncardModifier:');
  console.log(formatCountMap(modCounts, modIds, modExpect));
  console.log(formatAppearLine('修饰', modHit, count, modExpect));

  console.log(
    `\nroll空: ${emptyCount} / ${count}`
    + `（${(emptyCount / count * 100).toFixed(1)}%，期望 ${(count * pEmpty).toFixed(1)} / ${(pEmpty * 100).toFixed(1)}%）`,
  );
}

main();
