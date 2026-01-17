// Game Systems Configuration - 游戏系统配置

// Interactive Object Types - 交互对象类型
export const INTERACTIVE_TYPES = {
  DOOR: 'INTERACTIVE_DOOR',
  CHEST: 'INTERACTIVE_CHEST',
  MERCHANT: 'INTERACTIVE_MERCHANT',
  FORGE: 'INTERACTIVE_FORGE',
  SHRINE: 'INTERACTIVE_SHRINE',
  DESTRUCTIBLE: 'INTERACTIVE_DESTRUCTIBLE',
  GAMBLER: 'INTERACTIVE_GAMBLER'
};

// Forge Configuration - 铁匠铺配置
export const FORGE_CONFIG = {
  // 强化配置
  ENHANCE: {
    BASE_COST: 100,           // 基础强化费用
    COST_MULTIPLIER: 1.5,     // 每级费用倍率
    STAT_INCREASE: 0.1,       // 每级属性提升 10%
    MAX_LEVEL: 15,            // 最大强化等级（铁匠等级10后可达20）
    SUCCESS_RATE: 1.0,        // 成功率 (100% 暂时)
    // 强化失败机制配置
    BASE_SUCCESS_RATES: {
      0: 1.0, 1: 1.0, 2: 1.0, 3: 1.0, 4: 1.0,
      5: 1.0, 6: 1.0, 7: 1.0, 8: 1.0, 9: 1.0,  // 0-9: 100%
      10: 0.7,   // 70%
      11: 0.6,   // 60%
      12: 0.5,   // 50%
      13: 0.4,   // 40%
      14: 0.3,   // 30%
      15: 0.2,   // 20%
      16: 0.1,   // 10% (需要铁匠等级10)
      17: 0.1,
      18: 0.1,
      19: 0.1
    },
    BLESSING_STONE_BONUS: 0.05,  // 祝福石每个+5%成功率
    MAX_BLESSING_STONES: 5,       // 最多使用5个祝福石
    MAX_SUCCESS_RATE: 0.95        // 成功率上限95%
  },
  // 重铸配置
  REFORGE: {
    BASE_COST: 500,           // 基础重铸费用
    COST_MULTIPLIER: 2.0      // 根据装备等级的费用倍率
  },
  // 分解配置
  DISMANTLE: {
    BASE_VALUE: 50,           // 基础回收价格
    REFUND_RATE: 0.5,         // 强化费用返还率 (50%)
    QUALITY_MULTIPLIERS: {    // 品质倍率
      COMMON: 1.0,
      UNCOMMON: 1.5,
      RARE: 2.5,
      EPIC: 4.0,
      LEGENDARY: 8.0,
      MYTHIC: 20.0
    }
  },
  // 特化方向配置
  SPECIALIZATION: {
    MILESTONES: [5, 10, 15],  // 可选择特化的等级
    DIRECTIONS: {
      attack: {
        name: '攻击特化',
        nameEn: 'Attack Focus',
        multipliers: { atk: 1.5, def: 0.8, spd: 1.0 }
      },
      defense: {
        name: '防御特化',
        nameEn: 'Defense Focus',
        multipliers: { atk: 0.8, def: 1.5, spd: 1.0 }
      },
      speed: {
        name: '速度特化',
        nameEn: 'Speed Focus',
        multipliers: { atk: 1.0, def: 0.8, spd: 1.5 }
      },
      balanced: {
        name: '均衡特化',
        nameEn: 'Balanced',
        multipliers: { atk: 1.2, def: 1.2, spd: 1.2 }
      }
    }
  },
  // 套装强化配置
  SET_ENHANCEMENT: {
    ESSENCE_PER_LEVEL: 10,    // 每级需要的套装精华
    MAX_SET_LEVEL: 10,        // 最大套装强化等级
    BONUS_PER_LEVEL: {
      2: 0.05,  // 2件套：每级+5%
      4: 0.08,  // 4件套：每级+8%
      6: 0.10   // 6件套：每级+10%
    }
  },
  // 附魔系统配置
  ENCHANTMENT: {
    SLOTS_BY_TYPE: {
      WEAPON: 2,
      ARMOR: 2,
      HELM: 2,
      BOOTS: 2,
      RING: 1,
      AMULET: 1,
      ACCESSORY: 1
    },
    TIERS: {
      basic: { scrollCost: 5, multiplier: 1.0 },
      advanced: { scrollCost: 15, multiplier: 2.0 },
      master: { scrollCost: 30, multiplier: 3.0 }
    }
  },
  // 觉醒系统配置
  AWAKENING: {
    REQUIRED_QUALITY: 'MYTHIC',
    REQUIRED_ENHANCEMENT: 15,
    STONE_COST: 1,
    SUCCESS_RATE: 1.0  // 100%成功
  },
  // 材料系统配置
  MATERIALS: {
    TYPES: {
      enhancement_stone: '强化石',
      reforge_crystal: '重铸水晶',
      enchantment_dust: '附魔尘埃',
      set_essence: '套装精华',
      awakening_stone: '觉醒之石'
    },
    // 分解产出（按品质）
    DISMANTLE_YIELD: {
      COMMON: {
        enhancement_stone: [1, 3],
        reforge_crystal: [0, 1],
        enchantment_dust: [0, 1]
      },
      UNCOMMON: {
        enhancement_stone: [2, 5],
        reforge_crystal: [1, 2],
        enchantment_dust: [1, 2]
      },
      RARE: {
        enhancement_stone: [5, 10],
        reforge_crystal: [2, 4],
        enchantment_dust: [2, 4],
        set_essence: [0, 1]
      },
      EPIC: {
        enhancement_stone: [10, 20],
        reforge_crystal: [5, 10],
        enchantment_dust: [5, 10],
        set_essence: [1, 2]
      },
      LEGENDARY: {
        enhancement_stone: [20, 40],
        reforge_crystal: [10, 20],
        enchantment_dust: [10, 20],
        set_essence: [2, 5],
        awakening_stone: [0, 1]
      },
      MYTHIC: {
        enhancement_stone: [40, 80],
        reforge_crystal: [20, 40],
        enchantment_dust: [20, 40],
        set_essence: [5, 10],
        awakening_stone: [1, 3]
      }
    },
    // 材料转换率
    CONVERSION_RATES: {
      enhancement_stone: {
        to_reforge_crystal: 3,      // 3石头=1水晶
        to_enchantment_dust: 2      // 2石头=1尘埃
      },
      reforge_crystal: {
        to_enhancement_stone: 0.3,  // 1水晶=0.3石头（有损）
        to_enchantment_dust: 1      // 1水晶=1尘埃
      },
      enchantment_dust: {
        to_enhancement_stone: 0.5,  // 1尘埃=0.5石头（有损）
        to_reforge_crystal: 1       // 1尘埃=1水晶
      }
    }
  },
  // 宝石系统增强配置
  GEM_ENHANCED: {
    QUALITY_MULTIPLIERS: {
      normal: 1.0,
      fine: 1.5,
      perfect: 2.0
    },
    FUSION_CONFIG: {
      normal: { canFuse: true, result: 'fine', successRate: 1.0 },
      fine: { canFuse: true, result: 'perfect', successRate: 1.0 },
      perfect: { canFuse: false }  // 最高品质
    },
    EXTRACTION_COST: {
      normal: 1000,
      fine: 5000,
      perfect: 20000
    },
    // 宝石系列定义
    SERIES: {
      fire: ['ruby', 'fire_opal', 'sunstone'],
      ice: ['sapphire', 'aquamarine', 'moonstone'],
      lightning: ['topaz', 'citrine', 'amber'],
      nature: ['emerald', 'jade', 'peridot']
    },
    // 宝石套装效果
    SET_BONUSES: {
      2: { bonus: 0.10, effect: 'minor' },
      3: { bonus: 0.25, effect: 'major' },
      4: { bonus: 0.50, effect: 'ultimate' }
    }
  },
  // 铁匠NPC配置
  BLACKSMITH_NPC: {
    LEVEL_THRESHOLDS: [
      { level: 1, exp: 0, unlocks: [] },
      { level: 2, exp: 100, unlocks: ['批量强化'] },
      { level: 3, exp: 300, unlocks: ['附魔系统'] },
      { level: 5, exp: 1000, unlocks: ['套装强化'] },
      { level: 7, exp: 3000, unlocks: ['宝石融合'] },
      { level: 10, exp: 10000, unlocks: ['+16强化', '觉醒系统'] }
    ],
    EXP_GAINS: {
      enhance: 1,
      reforge: 2,
      socket: 1,
      dismantle: 1,
      enchant: 3,
      awaken: 10
    },
    AFFINITY_THRESHOLDS: [
      { affinity: 0, discount: 0, title: '陌生' },
      { affinity: 100, discount: 0.05, title: '熟识' },
      { affinity: 500, discount: 0.10, title: '友好' },
      { affinity: 1000, discount: 0.15, title: '信赖' },
      { affinity: 3000, discount: 0.20, title: '挚友' }
    ],
    AFFINITY_GAINS: {
      operation: 1,
      success: 2,
      failure: 1,
      dialogue_choice: 5
    }
  }
};

// Gamble Configuration - 赌博配置（赌徒NPC）
export const GAMBLER_CONFIG = {
  // Jackpot 配置
  JACKPOT: {
    CHANCE: 0.001,           // 0.1% 概率中大奖
    CONTRIBUTION_RATE: 0.1,  // 每次旋转费用的 10% 进入奖池
    BASE_POOL: 1000,         // 基础奖池金币
    MIN_POOL: 500            // 奖池被领空后的重置下限
  },
  // 保底机制 (Pity System)
  PITY: {
    THRESHOLD_STANDARD: 8,   // 标准场连续 8 次未出稀有以上触发保底
    THRESHOLD_HIGH_ROLLER: 4,// 豪赌场连续 4 次未出稀有以上触发保底
  },
  // 奖励类型权重 (总和 100)
  REWARD_WEIGHTS: {
    EQUIPMENT: 65,    // 65% 装备
    CONSUMABLE: 25,   // 25% 消耗品
    BUFF: 8,          // 8% 临时 Buff
    SOUL_CRYSTAL: 2   // 2% 灵魂水晶 (仅在高品质时生效)
  }
};

export const GAMBLE_TIERS = {
  STANDARD: {
    id: 'STANDARD',
    name: '标准旋转',
    nameEn: 'Standard Spin',
    cost: 50,
    chances: {
      COMMON: 60,      // 60% 普通/垃圾
      UNCOMMON: 30,    // 30% 优秀
      RARE: 9,         // 9% 稀有
      EPIC: 1          // 1% 史诗
    }
  },
  HIGH_ROLLER: {
    id: 'HIGH_ROLLER',
    name: '豪赌旋转',
    nameEn: 'High Roller Spin',
    cost: 200,
    chances: {
      COMMON: 30,      // 30% 普通
      UNCOMMON: 40,    // 40% 优秀
      RARE: 20,        // 20% 稀有
      EPIC: 8,         // 8% 史诗
      LEGENDARY: 2     // 2% 传说
    }
  }
};

// 赌徒生成配置
export const GAMBLER_SPAWN_CONFIG = {
  spawnChance: 0.1,  // 10% 概率出现
  minFloor: 2        // 从第2层开始出现
};

// ========================================
// 灵魂水晶（Soul Crystal）系统配置
// ========================================
export const SOUL_CRYSTAL_CONFIG = {
  // 掉落概率配置
  DROP_RATES: {
    NORMAL: {
      chance: 0.7,      // 70% 掉落概率
      min: 1,
      max: 3
    },
    ELITE: {
      chance: 1.0,      // 100% 掉落概率
      min: 30,
      max: 50
    },
    BOSS: {
      chance: 1.0,      // 100% 掉落概率
      min: 300,
      max: 500
    }
  },
  
  // 视觉效果配置
  VISUAL: {
    color: '#bb00ff',           // 紫罗兰色
    iconUrl: 'https://i.postimg.cc/CKS2nRQG/linghunjiejing1.png', // 水晶图标URL
    floatDuration: 1500,        // 浮动文字持续时间（毫秒）
    flyToUIAnimation: true      // 是否播放飞向UI的动画
  }
};

// Buff pool
export const BUFF_POOL = [
  { id: 'str', name: "Might", tags: ['OFFENSE','PHYS'], desc: "物攻提升", effect: (p, v=1) => { p.stats.p_atk += v; } },
  { id: 'iron', name: "Iron Skin", tags: ['DEFENSE','PHYS'], desc: "物防提升", effect: (p, v=1) => { p.stats.p_def += v; } },
  { id: 'arc', name: "Arcana", tags: ['OFFENSE','MAG'], desc: "魔攻提升", effect: (p, v=1) => { p.stats.m_atk += v; } },
  { id: 'ward', name: "Ward", tags: ['DEFENSE','MAG'], desc: "魔防提升", effect: (p, v=1) => { p.stats.m_def += v; } },
  { id: 'vit', name: "Vitality", tags: ['RESOURCE'], desc: "提升最大生命并回复", effect: (p, v=10) => { p.stats.maxHp += v; p.stats.hp = Math.min(p.stats.maxHp, p.stats.hp + v); } },
  { id: 'fury', name: "Fury", tags: ['RESOURCE'], desc: "获得怒气", effect: (p, v=15) => { p.stats.rage = Math.min(100, (p.stats.rage||0) + v); } },
  { id: 'fortune', name: "Fortune", tags: ['RESOURCE'], desc: "获得金币", effect: (p, v=50) => { p.stats.gold = (p.stats.gold||0) + v; } }
];

// Draft tiers
export const DRAFT_TIER_CONFIG = {
  NORMAL: { atk: 1, def: 1, hp: 10, fury: 15, gold: 50, title: '符文选择' },
  ELITE:  { atk: 3, def: 3, hp: 50, fury: 40, gold: 150, title: '精英符文' }
};

// Interactive Objects (Map Environment Objects)
export const OBJ_TRAP = { 
  id: 'OBJ_TRAP', 
  name: 'Trap', 
  damage: 10, 
  iconIndex: 0 
};

export const OBJ_SHRINE_HEAL = { 
  id: 'OBJ_SHRINE_HEAL', 
  name: 'Shrine of Healing', 
  cost: 50, 
  heal: 100, 
  iconIndex: 4 
};

export const OBJ_SHRINE_POWER = { 
  id: 'OBJ_SHRINE_POWER', 
  name: 'Shrine of Power', 
  cost: 20, 
  gainAtk: 2, 
  iconIndex: 5 
};

// Destructible Objects
export const OBJ_CRATE = { 
  id: 'OBJ_CRATE', 
  name: 'Crate', 
  nameZh: '木箱',
  type: 'DESTRUCTIBLE', 
  hp: 1, 
  brokenAsset: 'OBJ_CRATE_BROKEN' 
};

export const OBJ_BARREL = { 
  id: 'OBJ_BARREL', 
  name: 'Barrel', 
  nameZh: '木桶',
  type: 'DESTRUCTIBLE', 
  hp: 1, 
  brokenAsset: 'OBJ_BARREL_BROKEN' 
};

// Cursed Altar (2-tile wide object)
export const OBJ_ALTAR_CURSED = { 
  id: 'OBJ_ALTAR_CURSED', 
  name: 'Cursed Altar', 
  nameZh: '诅咒祭坛',
  type: 'INTERACTIVE_ALTAR', 
  width: 2  // Spans 2 tiles horizontally
};



// ========================================
// 附魔库配置 (Enchantment Library)
// ========================================
export const ENCHANTMENT_LIBRARY = {
  // 吸血附魔
  lifesteal: {
    id: 'lifesteal',
    name: '吸血',
    nameEn: 'Lifesteal',
    type: 'lifesteal',
    applicableTypes: ['WEAPON'],
    tiers: {
      basic: { value: 0.03, scrollCost: 5, description: '攻击吸取3%生命' },
      advanced: { value: 0.06, scrollCost: 15, description: '攻击吸取6%生命' },
      master: { value: 0.10, scrollCost: 30, description: '攻击吸取10%生命' }
    }
  },
  // 暴击附魔
  critical: {
    id: 'critical',
    name: '暴击',
    nameEn: 'Critical',
    type: 'critical',
    applicableTypes: ['WEAPON'],
    tiers: {
      basic: { value: 0.05, scrollCost: 5, description: '暴击率+5%' },
      advanced: { value: 0.10, scrollCost: 15, description: '暴击率+10%' },
      master: { value: 0.15, scrollCost: 30, description: '暴击率+15%' }
    }
  },
  // 火焰伤害附魔
  fire_damage: {
    id: 'fire_damage',
    name: '烈焰',
    nameEn: 'Flame',
    type: 'elemental',
    element: 'fire',
    applicableTypes: ['WEAPON'],
    tiers: {
      basic: { value: 10, scrollCost: 5, description: '附加10点火焰伤害' },
      advanced: { value: 25, scrollCost: 15, description: '附加25点火焰伤害' },
      master: { value: 50, scrollCost: 30, description: '附加50点火焰伤害' }
    }
  },
  // 冰霜伤害附魔
  ice_damage: {
    id: 'ice_damage',
    name: '寒冰',
    nameEn: 'Frost',
    type: 'elemental',
    element: 'ice',
    applicableTypes: ['WEAPON'],
    tiers: {
      basic: { value: 10, scrollCost: 5, description: '附加10点冰霜伤害' },
      advanced: { value: 25, scrollCost: 15, description: '附加25点冰霜伤害' },
      master: { value: 50, scrollCost: 30, description: '附加50点冰霜伤害' }
    }
  },
  // 物理抗性附魔
  physical_resistance: {
    id: 'physical_resistance',
    name: '坚韧',
    nameEn: 'Fortitude',
    type: 'resistance',
    applicableTypes: ['ARMOR', 'HELM'],
    tiers: {
      basic: { value: 5, scrollCost: 5, description: '物理防御+5' },
      advanced: { value: 12, scrollCost: 15, description: '物理防御+12' },
      master: { value: 25, scrollCost: 30, description: '物理防御+25' }
    }
  },
  // 魔法抗性附魔
  magic_resistance: {
    id: 'magic_resistance',
    name: '魔抗',
    nameEn: 'Warding',
    type: 'resistance',
    applicableTypes: ['ARMOR', 'HELM'],
    tiers: {
      basic: { value: 5, scrollCost: 5, description: '魔法防御+5' },
      advanced: { value: 12, scrollCost: 15, description: '魔法防御+12' },
      master: { value: 25, scrollCost: 30, description: '魔法防御+25' }
    }
  },
  // 生命值附魔
  health_boost: {
    id: 'health_boost',
    name: '生命',
    nameEn: 'Vitality',
    type: 'stat_boost',
    applicableTypes: ['ARMOR', 'HELM', 'BOOTS'],
    tiers: {
      basic: { value: 20, scrollCost: 5, description: '最大生命+20' },
      advanced: { value: 50, scrollCost: 15, description: '最大生命+50' },
      master: { value: 100, scrollCost: 30, description: '最大生命+100' }
    }
  },
  // 速度附魔
  speed_boost: {
    id: 'speed_boost',
    name: '迅捷',
    nameEn: 'Swiftness',
    type: 'stat_boost',
    applicableTypes: ['BOOTS'],
    tiers: {
      basic: { value: 0.05, scrollCost: 5, description: '移动速度+5%' },
      advanced: { value: 0.10, scrollCost: 15, description: '移动速度+10%' },
      master: { value: 0.15, scrollCost: 30, description: '移动速度+15%' }
    }
  }
};

// ========================================
// 觉醒技能库配置 (Awakening Skills Library)
// ========================================
export const AWAKENING_SKILLS = {
  // 武器觉醒技能
  weapon: [
    {
      id: 'blade_storm',
      name: '剑刃风暴',
      nameEn: 'Blade Storm',
      type: 'active',
      description: '释放剑气攻击周围所有敌人，造成200%武器伤害',
      cooldown: 10,
      applicableTypes: ['WEAPON']
    },
    {
      id: 'critical_mastery',
      name: '暴击精通',
      nameEn: 'Critical Mastery',
      type: 'passive',
      description: '暴击率+15%，暴击伤害+30%',
      applicableTypes: ['WEAPON']
    },
    {
      id: 'life_drain',
      name: '生命汲取',
      nameEn: 'Life Drain',
      type: 'passive',
      description: '所有攻击吸取15%生命值',
      applicableTypes: ['WEAPON']
    },
    {
      id: 'elemental_fury',
      name: '元素之怒',
      nameEn: 'Elemental Fury',
      type: 'passive',
      description: '所有元素伤害+50%',
      applicableTypes: ['WEAPON']
    }
  ],
  // 护甲觉醒技能
  armor: [
    {
      id: 'iron_fortress',
      name: '钢铁堡垒',
      nameEn: 'Iron Fortress',
      type: 'passive',
      description: '受到伤害时有20%几率免疫',
      applicableTypes: ['ARMOR']
    },
    {
      id: 'thorns_aura',
      name: '荆棘光环',
      nameEn: 'Thorns Aura',
      type: 'passive',
      description: '反弹30%受到的伤害给攻击者',
      applicableTypes: ['ARMOR']
    },
    {
      id: 'regeneration',
      name: '快速再生',
      nameEn: 'Regeneration',
      type: 'passive',
      description: '每秒恢复最大生命值的2%',
      applicableTypes: ['ARMOR']
    }
  ],
  // 头盔觉醒技能
  helm: [
    {
      id: 'mind_shield',
      name: '心灵护盾',
      nameEn: 'Mind Shield',
      type: 'passive',
      description: '魔法防御+50%，免疫控制效果',
      applicableTypes: ['HELM']
    },
    {
      id: 'battle_focus',
      name: '战斗专注',
      nameEn: 'Battle Focus',
      type: 'passive',
      description: '所有伤害+20%，受到伤害-10%',
      applicableTypes: ['HELM']
    }
  ],
  // 靴子觉醒技能
  boots: [
    {
      id: 'wind_walker',
      name: '风行者',
      nameEn: 'Wind Walker',
      type: 'passive',
      description: '移动速度+30%，闪避率+15%',
      applicableTypes: ['BOOTS']
    },
    {
      id: 'shadow_step',
      name: '暗影步',
      nameEn: 'Shadow Step',
      type: 'active',
      description: '瞬移到目标位置，冷却8秒',
      cooldown: 8,
      applicableTypes: ['BOOTS']
    }
  ],
  // 饰品觉醒技能
  accessory: [
    {
      id: 'mana_surge',
      name: '魔力涌动',
      nameEn: 'Mana Surge',
      type: 'passive',
      description: '技能冷却速度+30%',
      applicableTypes: ['RING', 'AMULET', 'ACCESSORY']
    },
    {
      id: 'lucky_charm',
      name: '幸运符咒',
      nameEn: 'Lucky Charm',
      type: 'passive',
      description: '魔法发现+50%，金币获取+30%',
      applicableTypes: ['RING', 'AMULET', 'ACCESSORY']
    },
    {
      id: 'soul_link',
      name: '灵魂链接',
      nameEn: 'Soul Link',
      type: 'passive',
      description: '击杀敌人时恢复10%最大生命值',
      applicableTypes: ['RING', 'AMULET', 'ACCESSORY']
    }
  ]
};

// ========================================
// 成就系统配置 (Achievement System)
// ========================================
export const FORGE_ACHIEVEMENTS = [
  {
    id: 'first_enhance',
    name: '初次强化',
    nameEn: 'First Enhancement',
    description: '完成第一次装备强化',
    category: 'enhancement',
    maxProgress: 1,
    reward: { gold: 1000 }
  },
  {
    id: 'enhancement_master',
    name: '强化大师',
    nameEn: 'Enhancement Master',
    description: '成功强化100次',
    category: 'enhancement',
    maxProgress: 100,
    reward: { gold: 10000, title: '强化大师' }
  },
  {
    id: 'max_enhancement',
    name: '极限强化',
    nameEn: 'Max Enhancement',
    description: '将装备强化至+15',
    category: 'enhancement',
    maxProgress: 1,
    reward: { gold: 50000, blessing_stone: 10 }
  },
  {
    id: 'reforge_king',
    name: '重铸之王',
    nameEn: 'Reforge King',
    description: '成功重铸出神话品质装备',
    category: 'reforge',
    maxProgress: 1,
    reward: { gold: 100000, set_essence: 5 }
  },
  {
    id: 'awakening_pioneer',
    name: '觉醒先驱',
    nameEn: 'Awakening Pioneer',
    description: '完成第一次装备觉醒',
    category: 'awakening',
    maxProgress: 1,
    reward: { gold: 200000, awakening_stone: 1 }
  },
  {
    id: 'gem_master',
    name: '宝石大师',
    nameEn: 'Gem Master',
    description: '融合出10个完美品质宝石',
    category: 'gem',
    maxProgress: 10,
    reward: { gold: 50000 }
  },
  {
    id: 'big_spender',
    name: '挥金如土',
    nameEn: 'Big Spender',
    description: '在铁匠铺累计消费1,000,000金币',
    category: 'general',
    maxProgress: 1000000,
    reward: { discount: 0.05 }
  },
  {
    id: 'lucky_streak',
    name: '幸运连击',
    nameEn: 'Lucky Streak',
    description: '连续成功强化10次',
    category: 'enhancement',
    maxProgress: 10,
    reward: { blessing_stone: 20 }
  },
  {
    id: 'enchanter',
    name: '附魔师',
    nameEn: 'Enchanter',
    description: '完成50次附魔',
    category: 'enchantment',
    maxProgress: 50,
    reward: { gold: 30000, enchantment_dust: 100 }
  },
  {
    id: 'set_collector',
    name: '套装收藏家',
    nameEn: 'Set Collector',
    description: '完成10次套装强化',
    category: 'set',
    maxProgress: 10,
    reward: { gold: 50000, set_essence: 20 }
  }
];

// ========================================
// 铁匠对话库配置 (Blacksmith Dialogues)
// ========================================
export const BLACKSMITH_DIALOGUES = {
  greeting: [
    '欢迎光临！需要强化装备吗？',
    '又见面了，今天想打造什么？',
    '我的手艺可是一流的！',
    '有什么需要帮忙的吗？',
    '来看看我的新技术吧！'
  ],
  success: [
    '成功了！看这光泽，完美！',
    '不愧是我打造的，质量上乘！',
    '哈哈，又是一件杰作！',
    '这才是真正的工艺！',
    '你的装备现在更强了！'
  ],
  failure: [
    '唉，这次运气不太好...',
    '别灰心，下次一定成功！',
    '强化本就有风险，再试试吧。',
    '有时候就是这样，别放弃！',
    '失败是成功之母，继续努力！'
  ],
  level_up: [
    '我的技艺又精进了！',
    '感谢你的信任，我学到了新技术！',
    '这下我能做更多事情了！',
    '我变得更强了，你也是！'
  ],
  high_affinity: [
    '你是我最信赖的客人！',
    '老朋友，给你打个折扣！',
    '能为你服务是我的荣幸！',
    '我们的友谊比钢铁还坚固！'
  ],
  quest: [
    '我需要一些特殊材料...',
    '能帮我个忙吗？',
    '我有个想法，需要你的帮助。'
  ]
};
