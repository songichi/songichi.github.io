/**
 * 真书印记 — 判定、规范化与展示
 *
 * 几率/权重数值见 unique-drop-rates.js（本文件只实现功能，不调参）。
 * 须在 unique-drop-rates.js 之后加载。
 */

const ZHEN_SEAL = Object.freeze({
  common: 'common',
  rare: 'rare',
  absolute: 'absolute',
});

const ZHEN_SEAL_LABEL = Object.freeze({
  [ZHEN_SEAL.common]: '普通印记',
  [ZHEN_SEAL.rare]: '稀有印记',
  [ZHEN_SEAL.absolute]: '绝对印记',
});

/** 展示用稀有度（越大越稀有） */
const ZHEN_SEAL_RANK = Object.freeze({
  [ZHEN_SEAL.common]: 1,
  [ZHEN_SEAL.rare]: 2,
  [ZHEN_SEAL.absolute]: 3,
});

function normalizeZhenSeal(raw) {
  const key = String(raw || '').trim().toLowerCase();
  if (key === ZHEN_SEAL.common || key === '普通' || key === '普通印记') return ZHEN_SEAL.common;
  if (key === ZHEN_SEAL.rare || key === '稀有' || key === '稀有印记') return ZHEN_SEAL.rare;
  if (key === ZHEN_SEAL.absolute || key === '绝对' || key === '绝对印记') return ZHEN_SEAL.absolute;
  return null;
}

/**
 * 真书印记：只做一次加权判定（权重读自 unique-drop-rates.js）
 * @param {function} [rng]
 * @returns {{ seal: 'common'|'rare'|'absolute'|null }}
 */
function rollZhenSealJudgment(rng = Math.random) {
  const next = typeof rng === 'function' ? rng : Math.random;
  const total = typeof ZHEN_SEAL_WEIGHT_TOTAL === 'number' ? ZHEN_SEAL_WEIGHT_TOTAL : 1000;
  const wCommon = typeof ZHEN_SEAL_WEIGHT_COMMON === 'number' ? ZHEN_SEAL_WEIGHT_COMMON : 0;
  const wRare = typeof ZHEN_SEAL_WEIGHT_RARE === 'number' ? ZHEN_SEAL_WEIGHT_RARE : 0;
  const wAbsolute = typeof ZHEN_SEAL_WEIGHT_ABSOLUTE === 'number' ? ZHEN_SEAL_WEIGHT_ABSOLUTE : 0;

  const slot = Math.floor(next() * total);
  let edge = wCommon;
  if (slot < edge) return { seal: ZHEN_SEAL.common };
  edge += wRare;
  if (slot < edge) return { seal: ZHEN_SEAL.rare };
  edge += wAbsolute;
  if (slot < edge) return { seal: ZHEN_SEAL.absolute };
  return { seal: null };
}

/** 普通 1 层 / 稀有 2 层 / 绝对 3 层 */
function zhenSealStrokeLayers(seal) {
  const key = normalizeZhenSeal(seal);
  if (key === ZHEN_SEAL.absolute) return 3;
  if (key === ZHEN_SEAL.rare) return 2;
  if (key === ZHEN_SEAL.common) return 1;
  return 0;
}

/** 从累计印记取最高稀有度（展示用） */
function highestZhenSealFromCounts(seals) {
  const s = seals || {};
  if (Math.max(0, Math.floor(Number(s.absolute) || 0)) > 0) return ZHEN_SEAL.absolute;
  if (Math.max(0, Math.floor(Number(s.rare) || 0)) > 0) return ZHEN_SEAL.rare;
  if (Math.max(0, Math.floor(Number(s.common) || 0)) > 0) return ZHEN_SEAL.common;
  return null;
}

/**
 * 印记红框 SVG：单层 / 双层 / 三层同心方框（stroke 红色）
 * 用于练习页统计/结算等小字标；字卡 cell 请用 createZhenSealFrameOverlay。
 * @param {string|null} seal
 * @param {{ className?: string, size?: number, radius?: number, onBorder?: boolean }} [opts]
 * @returns {SVGElement|null}
 */
function createZhenSealFrameSvg(seal, opts = {}) {
  const layers = zhenSealStrokeLayers(seal);
  if (layers <= 0 || typeof document === 'undefined') return null;

  const size = Math.max(28, Math.floor(Number(opts.size) || 48));
  const className = opts.className
    ? String(opts.className)
    : 'zhen-seal-frame stats-seal-frame';
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', className);
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');

  const stroke = '#c62828';
  const strokeWidth = size >= 44 ? 1.9 : 1.55;
  const onBorder = Boolean(opts.onBorder);
  const outerInset = onBorder
    ? strokeWidth / 2
    : size * 0.05;
  const layerGap = size * 0.085;
  const baseRadius = Math.max(0, Number(opts.radius) || 0);
  for (let i = 0; i < layers; i += 1) {
    const inset = outerInset + i * layerGap;
    const side = size - inset * 2;
    if (side <= strokeWidth * 2) break;
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', String(inset));
    rect.setAttribute('y', String(inset));
    rect.setAttribute('width', String(side));
    rect.setAttribute('height', String(side));
    const rx = Math.max(0, baseRadius - inset);
    if (rx > 0) {
      rect.setAttribute('rx', String(rx));
      rect.setAttribute('ry', String(rx));
    }
    rect.setAttribute('fill', 'none');
    rect.setAttribute('stroke', stroke);
    rect.setAttribute('stroke-width', String(strokeWidth));
    rect.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(rect);
  }
  return svg;
}

/**
 * 印记红框（DOM）：贴在 cell 边框上，圆角与 cell 一致（border-radius: inherit）
 * @param {string|null} seal
 * @param {{ className?: string, radius?: number, layerGap?: number, strokeWidth?: number }} [opts]
 * @returns {HTMLElement|null}
 */
function createZhenSealFrameOverlay(seal, opts = {}) {
  const layers = zhenSealStrokeLayers(seal);
  if (layers <= 0 || typeof document === 'undefined') return null;

  const wrap = document.createElement('div');
  wrap.className = opts.className ? String(opts.className) : 'zhen-seal-frame';
  wrap.setAttribute('aria-hidden', 'true');

  const radius = Math.max(0, Number(opts.radius) || 0);
  const gap = Number(opts.layerGap) > 0 ? Number(opts.layerGap) : 3.5;
  const strokeWidth = Number(opts.strokeWidth) > 0 ? Number(opts.strokeWidth) : 1.9;
  wrap.style.setProperty('--seal-stroke-width', `${strokeWidth}px`);

  for (let i = 0; i < layers; i += 1) {
    const ring = document.createElement('span');
    ring.className = 'zhen-seal-ring';
    const inset = i * gap;
    ring.style.inset = `${inset}px`;
    ring.style.borderRadius = `${Math.max(0, radius - inset)}px`;
    wrap.appendChild(ring);
  }
  return wrap;
}
