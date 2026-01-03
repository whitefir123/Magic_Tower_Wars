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
    MAX_LEVEL: 15,            // 最大强化等级
    SUCCESS_RATE: 1.0         // 成功率 (100% 暂时)
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
  }
};

// Gamble Configuration - 赌博配置（赌徒NPC）
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

