/**
 * 掉落几率 / 权重 — 仅数值调参
 *
 * ⚠ 本文件只允许写概率、权重、保底墨量、保底连击等「数值常量」。
 *    禁止写函数、判定流程、UI、序列化或任何业务逻辑。
 * 判定实现：
 *   - Unique：card-style.js（rollDropJudgment）
 *   - 真书印记：zhen-seal.js（rollZhenSealJudgment）
 * 练习页与用户页均加载本文件；改几率只改这里的数字。
 */

// —— Unique 掉落门控（完成一字 → 下一字时；仅草体）——
/** 未翻开原型时的 unique 门控 */
const CARD_UNIQUE_APPEARANCE_CHANCE = 0.08;
/** 本字翻开过原型后，门控再加这一档（8% → 10%） */
const CARD_UNIQUE_GLYPH_REVEAL_BONUS = 0.02;

// —— Unique 门控通过后的词条（彼此独立，可叠加）——
/** 配色 */
const CARD_COLOR_SCHEME_APPEARANCE_CHANCE = 1 / 4;
/** 底纹 */
const CARD_BASE_APPEARANCE_CHANCE = 1 / 8;
/** 修饰 */
const CARD_MODIFIER_APPEARANCE_CHANCE = 1 / 10;

// —— Unique 门控进了、但词条全空：保底墨（记在 stroke，结算后入账）——
const CARD_INK_DROP_AMOUNT = 5;

// —— 连续未获得 unique：可领取保底卡 ——
const UNIQUE_PITY_STREAK_THRESHOLD = 32;

// —— 真书印记加权（单次判定；与几率成正比，总分母见 TOTAL）——
/** 普通印记权重（约 1/20） */
const ZHEN_SEAL_WEIGHT_COMMON = 40;
/** 稀有印记权重（约 1/50） */
const ZHEN_SEAL_WEIGHT_RARE = 10;
/** 绝对印记权重（约 1/100） */
const ZHEN_SEAL_WEIGHT_ABSOLUTE = 5;
/** 印记判定总分母（其余权重为空） */
const ZHEN_SEAL_WEIGHT_TOTAL = 1000;
