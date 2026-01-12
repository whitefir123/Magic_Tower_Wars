// Loot and Quality System - 掉落与品质系统

// Rarity system for loot
export const RARITY = {
  COMMON: { id: 'COMMON', name: '普通', color: '#ffffff', weight: 50 },
  RARE: { id: 'RARE', name: '稀有', color: '#4a9eff', weight: 30 },
  EPIC: { id: 'EPIC', name: '史诗', color: '#a335ee', weight: 15 },
  LEGENDARY: { id: 'LEGENDARY', name: '传说', color: '#ff8000', weight: 5 }
};

// Item Quality System - 装备品质系统
export const ITEM_QUALITY = {
  COMMON: {
    id: 'COMMON',
    name: '普通',
    nameEn: 'Common',
    color: '#ffffff',
    multiplier: 1.0,
    weight: 40  // 40% 概率
  },
  UNCOMMON: {
    id: 'UNCOMMON',
    name: '优秀',
    nameEn: 'Uncommon',
    color: '#1eff00',
    multiplier: 1.0,
    weight: 30  // 30% 概率
  },
  RARE: {
    id: 'RARE',
    name: '稀有',
    nameEn: 'Rare',
    color: '#0070dd',
    multiplier: 1.0,
    weight: 15  // 15% 概率
  },
  EPIC: {
    id: 'EPIC',
    name: '史诗',
    nameEn: 'Epic',
    color: '#a335ee',
    multiplier: 1.2,
    weight: 10  // 10% 概率
  },
  LEGENDARY: {
    id: 'LEGENDARY',
    name: '传说',
    nameEn: 'Legendary',
    color: '#ff8000',
    multiplier: 1.5,
    weight: 4   // 4% 概率
  },
  MYTHIC: {
    id: 'MYTHIC',
    name: '神话',
    nameEn: 'Mythic',
    color: '#e6cc80',
    multiplier: 2.0,
    weight: 1   // 1% 概率
  }
};

// Loot table for chests
export const LOOT_TABLE = {
  GOLD: { weight: 30, minAmount: 10, maxAmount: 50, rarityScaling: true },
  POTION: { weight: 30 },
  EQUIPMENT: { weight: 20 },
  STAT_BOOST: { weight: 10 }, // HP or Rage boost
  RELIC: { weight: 5 }, // ✅ 遗物系统：稀有掉落（5% 概率）
  NOTHING: { weight: 5 } // Nothing or minor trap (降低权重以平衡遗物)
};

// Loot table for destructible objects
export const LOOT_TABLE_DESTRUCTIBLE = {
  EMPTY: { weight: 50, name: '空的', text: 'Empty' },
  GOLD_SMALL: { weight: 30, minAmount: 1, maxAmount: 5 },
  POTION: { weight: 10 },  // Small HP or Rage potion
  TRAP_BOMB: { weight: 5, minDamage: 15, maxDamage: 25 },  // Explodes immediately
  AMBUSH_SNAKE: { weight: 5, monsterType: 'SKELETON' }  // Spawns a monster
};

