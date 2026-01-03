// Combat System Configuration - 战斗系统配置

// Combat Configuration
export const COMBAT_CONFIG = {
  BASE_CRIT_RATE: 0.2,      // 20% base crit rate
  CRIT_MULTIPLIER: 1.4      // 140% damage multiplier on crit
};

// Element Types - 元素类型
export const ELEMENTS = {
  PYRO: 'PYRO',       // 火元素
  HYDRO: 'HYDRO',     // 水元素
  CRYO: 'CRYO',       // 冰元素
  ELECTRO: 'ELECTRO', // 雷元素
  POISON: 'POISON'    // 毒元素
};

// Status Effect Types - 状态效果类型（Real-time based, in milliseconds）
export const STATUS_TYPES = {
  BURN: {
    id: 'BURN',
    name: '灼烧',
    element: ELEMENTS.PYRO,
    duration: 5000,      // 5秒
    tickInterval: 1000,  // 每秒
    damagePercent: 0.02, // 2% MaxHP/sec
    isHardCC: false
  },
  WET: {
    id: 'WET',
    name: '潮湿',
    element: ELEMENTS.HYDRO,
    duration: 8000,      // 8秒
    tickInterval: 0,     // 无固有效果
    isHardCC: false
  },
  FROZEN: {
    id: 'FROZEN',
    name: '冰冻',
    element: ELEMENTS.CRYO,
    duration: 2500,      // 2.5秒（反应时为3秒）
    tickInterval: 0,
    isHardCC: true       // 硬控：无法移动/攻击
  },
  FREEZE_DOT: {
    id: 'FREEZE_DOT',
    name: '冰封伤害',
    element: ELEMENTS.CRYO,
    duration: 5000,
    tickInterval: 1000,
    damagePercent: 0.03,
    isHardCC: false
  },
  SHOCK: {
    id: 'SHOCK',
    name: '感电',
    element: ELEMENTS.ELECTRO,
    duration: 8000,      // 8秒
    tickInterval: 0,     // 无固有效果，作为引子
    isHardCC: false
  },
  POISON: {
    id: 'POISON',
    name: '中毒',
    element: ELEMENTS.POISON,
    duration: 10000,     // 10秒
    tickInterval: 1000,  // 每秒
    damagePercent: 0.01, // 1% MaxHP/stack/sec
    isHardCC: false,
    stackable: true      // 可叠加
  },
  SLOW: {
    id: 'SLOW',
    name: '减速',
    element: null,
    duration: 2000,      // 2秒
    tickInterval: 0,     // 无固有效果
    isHardCC: false,
    speedMultiplier: 0.7 // 移动速度降低到70%
  }
};

// Elemental Reactions Configuration - 元素反应配置
export const ELEMENT_REACTIONS = {
  // BURN + HYDRO/CRYO -> Vaporize/Melt (蒸发/融化)
  VAPORIZE: {
    id: 'VAPORIZE',
    name: '蒸发',
    trigger: ['BURN', 'HYDRO'],
    damageMultiplier: 2.0,  // 2.0倍瞬间伤害
    removeStatus: ['BURN']
  },
  MELT: {
    id: 'MELT',
    name: '融化',
    trigger: ['BURN', 'CRYO'],
    damageMultiplier: 2.0,  // 2.0倍瞬间伤害
    removeStatus: ['BURN']
  },
  
  // BURN + ELECTRO -> Overload (超载)
  OVERLOAD: {
    id: 'OVERLOAD',
    name: '超载',
    trigger: ['BURN', 'ELECTRO'],
    aoeDamageMultiplier: 1.5, // 150% AOE伤害
    aoeRadius: 2,              // 2格半径
    removeStatus: ['BURN']
  },
  
  // WET + CRYO -> Freeze (冰冻)
  FREEZE: {
    id: 'FREEZE',
    name: '冰冻',
    trigger: ['WET', 'CRYO'],
    freezeDuration: 3000,      // 3.0秒冻结
    removeStatus: ['WET']
  },
  
  // WET + ELECTRO -> Electro-Charged (感电)
  ELECTRO_CHARGED: {
    id: 'ELECTRO_CHARGED',
    name: '感电',
    trigger: ['WET', 'ELECTRO'],
    damagePercent: 0.2,        // 每次20%伤害
    tickInterval: 500,         // 每0.5秒
    duration: 3000,            // 持续3秒
    tetherRadius: 2            // 2格内的最近敌人
  },
  
  // FROZEN + PYRO -> Shatter (碎裂)
  SHATTER: {
    id: 'SHATTER',
    name: '碎裂',
    trigger: ['FROZEN', 'PYRO'],
    damageMultiplier: 2.5,     // 2.5倍物理伤害
    removeStatus: ['FROZEN']
  },
  
  // POISON + PYRO -> Venom Blast (剧毒爆炸)
  VENOM_BLAST: {
    id: 'VENOM_BLAST',
    name: '剧毒爆炸',
    trigger: ['POISON', 'PYRO'],
    damagePerStack: 0.5,       // 每层50%伤害
    aoeRadius: 2,              // 2格半径AOE
    removeStatus: ['POISON']
  }
};

// ========================================
// 防御平衡机制配置 (V2.0)
// ========================================

// 1. 穿透伤害配置
export const PENETRATION_CONFIG = {
  BASE_RATE: 0.03,         // 基础穿透系数 (3%)
  ELITE_BONUS: 0.02,       // 精英/Boss 额外穿透 (+2%)
  BOSS_BONUS: 0.05         // Boss 额外穿透 (+5%)
};

// 2. 战斗疲劳/狂热配置 (软狂暴)
export const FATIGUE_CONFIG = {
  INTERVAL: 8000,          // 每 8 秒叠加一层
  MAX_STACKS: 10,          // 最大叠加 10 层
  ATK_BONUS_PER_STACK: 0.05, // 每层攻击力 +5%
  PEN_BONUS_PER_STACK: 0.01  // 每层穿透系数 +1%
};

// 3. 怪物暴击配置
export const CRITICAL_CONFIG = {
  MONSTER_CHANCE: 0.05,    // 怪物基础暴击率 (5%)
  MULTIPLIER: 1.5,         // 暴击伤害倍率 (1.5x)
  PIERCE_PERCENT: 0.30     // 暴击穿甲比例 (无视 30% 防御)
};

// ========================================
// 武器精通系统配置 (Weapon Mastery & Combo System)
// ========================================

export const WEAPON_MASTERY = {
  BLADE:  { maxCombo: 4, type: 'CLEAVE', splashPct: 0.3, range: 1 }, // Sword: 4 hits
  EDGE:   { maxCombo: 5, type: 'ASSASSINATE', penBonus: 0.3 },       // Dagger: 5 hits
  SCYTHE: { maxCombo: 4, type: 'EXECUTE', dmgMult: 1.5 },            // Heavy: 4 hits
  STAFF:  { maxCombo: 0, type: 'OVERLOAD', rageGain: 5, bonusElemDmgPct: 0.2 } // Staff: No combo bar
};
export const COMBO_RESET_TIME = 3000;

