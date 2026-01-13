// Basic Configuration - 基础配置

// Tile & Map
export const TILE_SIZE = 32;
export const MAP_WIDTH = 120;
export const MAP_HEIGHT = 120;

// Tile types
export const TILE = { 
  FLOOR: 0, 
  WALL: 1, 
  DOOR: 2, 
  STAIRS_DOWN: 3, 
  STAIRS_UP: 4 
};

// Equipment icons grid
export const ICON_GRID_COLS = 4;
export const ICON_GRID_ROWS = 4;

/**
 * DAILY_MODIFIERS - 每日挑战词缀系统
 * 正面词缀：提供增益效果
 * 负面词缀：增加挑战难度
 */
export const DAILY_MODIFIERS = {
  // ========== 正面词缀 (Positive Modifiers) ==========
  WEALTHY: {
    id: 'WEALTHY',
    name: '富饶',
    nameEn: 'Wealthy',
    type: 'positive',
    description: '初始金币 +500',
    descriptionEn: 'Start with +500 gold',
    apply: (player, game) => {
      if (player && player.stats) {
        player.stats.gold = (player.stats.gold || 0) + 500;
      }
    }
  },
  
  HASTE: {
    id: 'HASTE',
    name: '疾速',
    nameEn: 'Haste',
    type: 'positive',
    description: '移动速度 +20%',
    descriptionEn: 'Move speed +20%',
    apply: (player, game) => {
      if (player) {
        player.moveSpeed = (player.moveSpeed || 0.25) * 1.2;
      }
    }
  },
  
  VAMPIRISM: {
    id: 'VAMPIRISM',
    name: '吸血',
    nameEn: 'Vampirism',
    type: 'positive',
    description: '自带 10% 生命偷取',
    descriptionEn: 'Gain 10% lifesteal',
    apply: (player, game) => {
      if (player && player.stats) {
        // 通过符文系统或直接修改属性
        if (!player.runeState) {
          player.runeState = { effects: {}, bonusStats: {} };
        }
        if (!player.runeState.bonusStats) {
          player.runeState.bonusStats = {};
        }
        player.runeState.bonusStats.lifesteal = (player.runeState.bonusStats.lifesteal || 0) + 0.10;
      }
    }
  },
  
  FORTIFIED: {
    id: 'FORTIFIED',
    name: '加固',
    nameEn: 'Fortified',
    type: 'positive',
    description: '初始最大生命 +50',
    descriptionEn: 'Start with +50 max HP',
    apply: (player, game) => {
      if (player && player.stats) {
        player.stats.maxHp = (player.stats.maxHp || 100) + 50;
        player.stats.hp = (player.stats.hp || 100) + 50;
      }
    }
  },
  
  LUCKY: {
    id: 'LUCKY',
    name: '幸运',
    nameEn: 'Lucky',
    type: 'positive',
    description: '魔法发现 +50%',
    descriptionEn: 'Magic Find +50%',
    apply: (player, game) => {
      if (player) {
        player.dailyMagicFind = (player.dailyMagicFind || 0) + 0.5;
      }
    }
  },
  
  // ========== 负面词缀 (Negative Modifiers) ==========
  FRAGILE: {
    id: 'FRAGILE',
    name: '脆弱',
    nameEn: 'Fragile',
    type: 'negative',
    description: '最大生命 -30%',
    descriptionEn: 'Max HP -30%',
    apply: (player, game) => {
      if (player && player.stats) {
        const reduction = Math.floor((player.stats.maxHp || 100) * 0.3);
        player.stats.maxHp = Math.max(1, (player.stats.maxHp || 100) - reduction);
        player.stats.hp = Math.min(player.stats.hp || 100, player.stats.maxHp);
      }
    }
  },
  
  INFLATION: {
    id: 'INFLATION',
    name: '通胀',
    nameEn: 'Inflation',
    type: 'negative',
    description: '商店价格 x2',
    descriptionEn: 'Shop prices x2',
    apply: (player, game) => {
      if (game) {
        game.dailyShopPriceMultiplier = (game.dailyShopPriceMultiplier || 1.0) * 2.0;
      }
    }
  },
  
  ELITE_SQUAD: {
    id: 'ELITE_SQUAD',
    name: '精英小队',
    nameEn: 'Elite Squad',
    type: 'negative',
    description: '精英怪生成概率翻倍',
    descriptionEn: 'Elite monster spawn chance x2',
    apply: (player, game) => {
      if (game) {
        game.dailyEliteSpawnMultiplier = (game.dailyEliteSpawnMultiplier || 1.0) * 2.0;
      }
    }
  },
  
  CURSED: {
    id: 'CURSED',
    name: '诅咒',
    nameEn: 'Cursed',
    type: 'negative',
    description: '所有伤害 -20%',
    descriptionEn: 'All damage -20%',
    apply: (player, game) => {
      if (player && player.stats) {
        player.dailyDamageMultiplier = (player.dailyDamageMultiplier || 1.0) * 0.8;
      }
    }
  },
  
  SLOW: {
    id: 'SLOW',
    name: '迟缓',
    nameEn: 'Slow',
    type: 'negative',
    description: '移动速度 -25%',
    descriptionEn: 'Move speed -25%',
    apply: (player, game) => {
      if (player) {
        player.moveSpeed = (player.moveSpeed || 0.25) * 0.75;
      }
    }
  },
  
  STARVATION: {
    id: 'STARVATION',
    name: '饥荒',
    nameEn: 'Starvation',
    type: 'negative',
    description: '初始金币 -50%',
    descriptionEn: 'Start with -50% gold',
    apply: (player, game) => {
      if (player && player.stats) {
        player.stats.gold = Math.floor((player.stats.gold || 0) * 0.5);
      }
    }
  }
};

// Zone/Biomes Configuration
export const FLOOR_ZONES = [
  // Override: All floors are now "Dark Dungeon"
  { maxFloor: 9999, name: 'Dark Dungeon', nameZh: '暗黑地牢' }
];

/**
 * VISUAL_CONFIG - 视觉配置
 * 用于控制飘字系统等视觉效果的参数
 */
export const VISUAL_CONFIG = {
  // 玩家飘字偏移
  PLAYER_TEXT_OFFSET_X: -5,  // 用户后续会微调，建议尝试 -5
  PLAYER_TEXT_OFFSET_Y: -15,
  
  // 怪物飘字偏移
  MONSTER_TEXT_OFFSET_Y: -10,
  
  // 是否启用微小的垂直随机偏移（防止完全重叠）
  ENABLE_MICRO_SCATTER: true
};

