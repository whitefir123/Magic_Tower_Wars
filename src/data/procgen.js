// procgen.js - 程序化生成装备的数据定义
// 将现有16个图标抽象为底材，通过前缀+后缀生成海量装备

/**
 * ARCHETYPES - 装备原型/底材
 * 将现有的16个图标映射为基础装备类型
 * 
 * ⚠️ V2.0 重要说明：
 * baseStats 中的数值范围代表 Level 1 的原始基底值
 * 这些值将通过楼层、难度、命运骰子等因素进行动态放大
 * 例如：p_atk: [4, 6] 表示在 Level 1 时，该底材的物理攻击在 4-6 之间
 * 实际生成时会根据楼层和难度进行放大（LevelMult = 1 + Floor * 0.2 + AscensionLevel * 0.05）
 */
export const ARCHETYPES = {
  // ========== WEAPONS (iconIndex 0-3) ==========
  BLADE: {
    id: 'BLADE',
    name: 'Blade',
    nameZh: '剑',
    type: 'WEAPON',
    iconIndex: 0,
    baseStats: {
      p_atk: [4, 6]  // Level 1 基准值：均衡物理攻击
    },
    weight: 100,
    classAffinity: { warrior: 1.5, rogue: 1.2 }
  },
  
  EDGE: {
    id: 'EDGE',
    name: 'Edge',
    nameZh: '刃',
    type: 'WEAPON',
    iconIndex: 1,
    baseStats: {
      p_atk: [3, 5],  // Level 1 基准值
      crit_rate: [0.03, 0.05]  // Level 1 基准值：暴击特化
    },
    weight: 90,
    classAffinity: { rogue: 1.5, warrior: 1.2 }
  },
  
  STAFF: {
    id: 'STAFF',
    name: 'Staff',
    nameZh: '法杖',
    type: 'WEAPON',
    iconIndex: 2,
    baseStats: {
      m_atk: [4, 6]  // Level 1 基准值：纯魔法攻击
    },
    weight: 100,
    classAffinity: { mage: 1.5 }
  },
  
  SCYTHE: {
    id: 'SCYTHE',
    name: 'Scythe',
    nameZh: '镰',
    type: 'WEAPON',
    iconIndex: 3,
    baseStats: {
      p_atk: [2, 4],  // Level 1 基准值
      m_atk: [2, 3],  // Level 1 基准值
      armor_pen: [0.05, 0.08]  // Level 1 基准值：穿透/混伤
    },
    weight: 70,
    classAffinity: { rogue: 1.3, mage: 1.1 }
  },

  // ========== ARMOR (iconIndex 4-7) ==========
  HIDE: {
    id: 'HIDE',
    name: 'Hide',
    nameZh: '皮甲',
    type: 'ARMOR',
    iconIndex: 4,
    baseStats: {
      p_def: [2, 4],  // Level 1 基准值
      dodge: [0.03, 0.05]  // Level 1 基准值：闪避特化
    },
    weight: 100,
    classAffinity: { rogue: 1.5 }
  },
  
  MAIL: {
    id: 'MAIL',
    name: 'Mail',
    nameZh: '锁甲',
    type: 'ARMOR',
    iconIndex: 5,
    baseStats: {
      p_def: [3, 5],  // Level 1 基准值
      maxHp: [15, 25]  // Level 1 基准值：生命/防御
    },
    weight: 100,
    classAffinity: { warrior: 1.5 }
  },
  
  PLATE: {
    id: 'PLATE',
    name: 'Plate',
    nameZh: '板甲',
    type: 'ARMOR',
    iconIndex: 6,
    baseStats: {
      p_def: [4, 7]  // Level 1 基准值：纯物防
    },
    weight: 90,
    classAffinity: { warrior: 1.5 }
  },
  
  ROBE: {
    id: 'ROBE',
    name: 'Robe',
    nameZh: '法袍',
    type: 'ARMOR',
    iconIndex: 7,
    baseStats: {
      p_def: [1, 2],  // Level 1 基准值
      m_atk: [2, 4]  // Level 1 基准值：魔防/魔攻
    },
    weight: 100,
    classAffinity: { mage: 1.5 }
  },

  // ========== HELM (iconIndex 8-9) ==========
  HELM: {
    id: 'HELM',
    name: 'Helm',
    nameZh: '盔',
    type: 'HELM',
    iconIndex: 8,
    baseStats: {
      p_def: [2, 3]
    },
    weight: 100,
    classAffinity: { warrior: 1.3 }
  },
  
  CROWN: {
    id: 'CROWN',
    name: 'Crown',
    nameZh: '冠',
    type: 'HELM',
    iconIndex: 9,
    baseStats: {
      p_def: [1, 2],  // Level 1 基准值
      gold: [0.05, 0.10],  // Level 1 基准值
      maxMp: [10, 15]  // Level 1 基准值
    },
    weight: 60,
    classAffinity: { mage: 1.2 }
  },

  // ========== BOOTS (iconIndex 10-11) ==========
  BOOTS_LIGHT: {
    id: 'BOOTS_LIGHT',
    name: 'Boots',
    nameZh: '靴',
    type: 'BOOTS',
    iconIndex: 10,
    baseStats: {
      p_def: [1, 2],  // Level 1 基准值
      dodge: [0.03, 0.05]  // Level 1 基准值
    },
    weight: 100,
    classAffinity: { rogue: 1.3 }
  },
  
  BOOTS_HEAVY: {
    id: 'BOOTS_HEAVY',
    name: 'Sabatons',
    nameZh: '重靴',
    type: 'BOOTS',
    iconIndex: 11,
    baseStats: {
      p_def: [2, 3]
    },
    weight: 80,
    classAffinity: { warrior: 1.3 }
  },

  // ========== ACCESSORIES (iconIndex 12-15) ==========
  BRACELET: {
    id: 'BRACELET',
    name: 'Bracelet',
    nameZh: '镯',
    type: 'RING',
    iconIndex: 12,
    baseStats: {
      p_atk: [2, 3]  // Level 1 基准值
    },
    weight: 80,
    classAffinity: { warrior: 1.2, rogue: 1.2 }
  },
  
  GEM_RED: {
    id: 'GEM_RED',
    name: 'Ruby',
    nameZh: '红宝石',
    type: 'AMULET',
    iconIndex: 13,
    baseStats: {
      maxHp: [10, 20]  // Level 1 基准值
    },
    weight: 80,
    classAffinity: {}
  },
  
  BONE: {
    id: 'BONE',
    name: 'Bone',
    nameZh: '骨',
    type: 'AMULET',
    iconIndex: 14,
    baseStats: {
      p_atk: [1, 2],  // Level 1 基准值
      m_atk: [1, 2]  // Level 1 基准值
    },
    weight: 60,
    classAffinity: {}
  },
  
  GEM_GREEN: {
    id: 'GEM_GREEN',
    name: 'Emerald',
    nameZh: '绿宝石',
    type: 'RING',
    iconIndex: 15,
    baseStats: {
      m_atk: [2, 3]  // Level 1 基准值
    },
    weight: 80,
    classAffinity: { mage: 1.2 }
  }
};

/**
 * AFFIXES - 词缀池
 * 前缀决定材质/状态，后缀决定传说/特殊效果
 */
export const AFFIXES = {
  // ========== PREFIXES (前缀) - 修正基础数值 ==========
  PREFIXES: [
    // === Tier 1: 破败 (数值略低) ===
    {
      name: 'Rusted',
      nameZh: '锈蚀的',
      tier: 1,
      stats: {
        multiplier: 0.8,
        p_atk: -1  // 稍微降低攻击
      },
      weight: 100
    },
    {
      name: 'Broken',
      nameZh: '破损的',
      tier: 1,
      stats: {
        multiplier: 0.85,
        p_def: -1  // 稍微降低防御
      },
      weight: 100
    },
    {
      name: 'Crude',
      nameZh: '粗糙的',
      tier: 1,
      stats: {
        multiplier: 0.9,
        maxHp: -5
      },
      weight: 120
    },

    // === Tier 2: 普通 (标准数值) ===
    {
      name: 'Iron',
      nameZh: '铁制',
      tier: 2,
      stats: {
        multiplier: 1.0,
        p_def: 1
      },
      weight: 150
    },
    {
      name: 'Common',
      nameZh: '普通',
      tier: 2,
      stats: {
        multiplier: 1.0,
        maxHp: 10
      },
      weight: 150
    },
    {
      name: 'Sturdy',
      nameZh: '坚固的',
      tier: 2,
      stats: {
        multiplier: 1.05,
        p_def: 2,
        maxHp: 15
      },
      weight: 130
    },

    // === Tier 3: 精良 (数值+) ===
    {
      name: 'Tempered',
      nameZh: '锻造',
      tier: 3,
      stats: {
        multiplier: 1.2,
        p_def: 3  // 额外固定防御
      },
      weight: 100
    },
    {
      name: 'Honed',
      nameZh: '磨砺',
      tier: 3,
      stats: {
        multiplier: 1.2,
        p_atk: 3  // 额外固定物攻
      },
      weight: 100
    },
    {
      name: 'Reinforced',
      nameZh: '强化',
      tier: 3,
      stats: {
        multiplier: 1.25,
        p_def: 4,
        p_atk: 1
      },
      weight: 90
    },
    {
      name: 'Master',
      nameZh: '大师',
      tier: 3,
      stats: {
        multiplier: 1.3,
        p_atk: 4,
        m_atk: 4
      },
      weight: 80
    },

    // === Tier 4: 史诗 (数值++) ===
    {
      name: 'Void-forged',
      nameZh: '虚空锻造',
      tier: 4,
      stats: {
        multiplier: 1.5,
        armor_pen: 0.05,
        m_atk: 5
      },
      weight: 40
    },
    {
      name: 'Dragonbone',
      nameZh: '龙骨',
      tier: 4,
      stats: {
        multiplier: 1.5,
        maxHp: 50,
        p_def: 5
      },
      weight: 40
    },
    {
      name: 'Astral',
      nameZh: '星界',
      tier: 4,
      stats: {
        multiplier: 1.5,
        m_atk: 8,
        maxMp: 20
      },
      weight: 40
    },
    {
      name: 'Celestial',
      nameZh: '天界',
      tier: 4,
      stats: {
        multiplier: 1.6,
        p_atk: 8,
        m_atk: 8,
        maxHp: 40
      },
      weight: 30
    },

    // === Tier 5: 神话 (Jackpot专属) ===
    {
      name: 'Primordial',
      nameZh: '原初',
      tier: 5,
      stats: {
        multiplier: 2.0,
        p_atk: 10,
        m_atk: 10
      },
      weight: 10
    },
    {
      name: 'Eternal',
      nameZh: '永恒',
      tier: 5,
      stats: {
        multiplier: 2.0,
        maxHp: 100
      },
      weight: 10
    }
  ],

  // ========== SUFFIXES (后缀) - 百分比加成或特殊词条 ==========
  SUFFIXES: [
    // === Tier 1: 基础 ===
    {
      name: 'of the Wolf',
      nameZh: '狼之',
      tier: 1,
      stats: {
        crit_rate: 0.05
      },
      weight: 100
    },
    {
      name: 'of the Bear',
      nameZh: '熊之',
      tier: 1,
      stats: {
        maxHp_percent: 0.10  // +10% 生命
      },
      weight: 100
    },
    {
      name: 'of the Fox',
      nameZh: '狐之',
      tier: 1,
      stats: {
        dodge: 0.05
      },
      weight: 100
    },
    {
      name: 'of Power',
      nameZh: '力量',
      tier: 1,
      stats: {
        p_atk_percent: 0.10  // +10% 物攻
      },
      weight: 100
    },

    // === Tier 2: 进阶 ===
    {
      name: 'of the Titan',
      nameZh: '泰坦',
      tier: 2,
      stats: {
        maxHp_percent: 0.20,
        p_def: 5
      },
      weight: 80
    },
    {
      name: 'of Precision',
      nameZh: '精准',
      tier: 2,
      stats: {
        crit_rate: 0.10,
        p_atk: 3
      },
      weight: 80
    },
    {
      name: 'of the Arcane',
      nameZh: '奥术',
      tier: 2,
      stats: {
        m_atk_percent: 0.15,
        maxMp: 20
      },
      weight: 80
    },
    {
      name: 'of Swiftness',
      nameZh: '迅捷',
      tier: 2,
      stats: {
        dodge: 0.10,
        p_atk: 2
      },
      weight: 80
    },

    // === Tier 3: 高级 ===
    {
      name: 'of the Vampire',
      nameZh: '吸血鬼',
      tier: 3,
      stats: {
        lifesteal: 0.08  // 8% 吸血
      },
      weight: 50
    },
    {
      name: 'of Greed',
      nameZh: '贪婪',
      tier: 3,
      stats: {
        gold: 0.25  // +25% 金币
      },
      weight: 50
    },
    {
      name: 'of the Phoenix',
      nameZh: '凤凰',
      tier: 3,
      stats: {
        maxHp_percent: 0.30,
        crit_rate: 0.10
      },
      weight: 40
    },
    {
      name: 'of Devastation',
      nameZh: '毁灭',
      tier: 3,
      stats: {
        p_atk_percent: 0.25,
        armor_pen: 0.10
      },
      weight: 40
    },

    // === Tier 4: 传说 ===
    {
      name: 'of the Dragon',
      nameZh: '巨龙',
      tier: 4,
      stats: {
        p_atk_percent: 0.30,
        m_atk_percent: 0.30,
        maxHp: 50
      },
      weight: 20
    },
    {
      name: 'of Immortality',
      nameZh: '不朽',
      tier: 4,
      stats: {
        maxHp_percent: 0.50,
        lifesteal: 0.10
      },
      weight: 20
    },
    {
      name: 'of Omnipotence',
      nameZh: '全能',
      tier: 4,
      stats: {
        p_atk_percent: 0.20,
        m_atk_percent: 0.20,
        crit_rate: 0.15,
        armor_pen: 0.15
      },
      weight: 15
    },

    // === Tier 5: 神话 (Jackpot专属) ===
    {
      name: 'of Ragnarok',
      nameZh: '诸神黄昏',
      tier: 5,
      stats: {
        p_atk_percent: 0.50,
        m_atk_percent: 0.50,
        crit_rate: 0.25,
        armor_pen: 0.25,
        lifesteal: 0.15,
        maxHp_percent: 0.50
      },
      weight: 5,
      jackpotOnly: true  // 仅 Jackpot 可获得
    },
    {
      name: 'of the Abyss',
      nameZh: '深渊',
      tier: 5,
      stats: {
        p_atk_percent: 0.60,
        m_atk_percent: 0.60,
        armor_pen: 0.30
      },
      weight: 5,
      jackpotOnly: true
    }
  ]
};

/**
 * 根据Tier获取可用的词缀池
 * @param {string} affixType - 'PREFIXES' 或 'SUFFIXES'
 * @param {number} maxTier - 最大允许Tier
 * @param {boolean} isJackpot - 是否为Jackpot
 * @returns {Array} 符合条件的词缀列表
 */
export function getAvailableAffixes(affixType, maxTier, isJackpot = false) {
  return AFFIXES[affixType].filter(affix => {
    if (affix.tier > maxTier) return false;
    if (affix.jackpotOnly && !isJackpot) return false;
    return true;
  });
}

/**
 * 加权随机选择
 * @param {Array} pool - 带有weight属性的对象数组
 * @param {SeededRandom} rng - 可选的随机数生成器（如果提供则使用，否则使用 Math.random）
 * @returns {Object} 选中的对象
 */
export function weightedRandom(pool, rng = null) {
  if (pool.length === 0) return null;
  
  const totalWeight = pool.reduce((sum, item) => sum + (item.weight || 1), 0);
  const randomValue = rng ? rng.next() : Math.random();
  let random = randomValue * totalWeight;
  
  for (const item of pool) {
    random -= (item.weight || 1);
    if (random <= 0) {
      return item;
    }
  }
  
  return pool[pool.length - 1];
}

